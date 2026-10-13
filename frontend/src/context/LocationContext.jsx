import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const LocationContext = createContext();
const LOCATION_STORAGE_KEY = 'localFinder:lastLocation_v3';
const DEFAULT_LOCATION = {
  lat: 30.9010,
  lng: 75.8573,
  label: 'Ludhiana, Punjab',
  address: 'Ludhiana, Punjab, India',
  area: 'Ludhiana',
  city: 'Ludhiana',
  state: 'Punjab',
  country: 'India',
  source: 'default',
  isDefault: true,
  isApproximate: true
};

// How old a GPS fix may be before we quietly refresh it
const REFRESH_AFTER_MS = 10 * 60 * 1000;
// GPS readings worse than this are treated as approximate (e.g. laptop Wi-Fi positioning)
const APPROXIMATE_ACCURACY_M = 1500;

export const useLocation = () => useContext(LocationContext);

const loadCachedLocation = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) || 'null');
    if (stored && Number.isFinite(stored.lat) && Number.isFinite(stored.lng)) return stored;
  } catch {
    // ignore unreadable cache
  }
  return DEFAULT_LOCATION;
};

const uniqueParts = (parts) => {
  const seen = new Set();
  return parts.filter((part) => {
    const key = part?.toString().trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// --- Reverse geocoding (coordinates -> "Model Town, Ludhiana") ---------------
const fromOpenStreetMap = (place) => {
  const a = place.address || {};
  const area = a.neighbourhood || a.suburb || a.quarter || a.residential || a.city_district || a.hamlet || a.village;
  const road = a.road || a.pedestrian || a.footway;
  const landmark = a.amenity || a.shop || a.building || a.office || a.tourism;
  const city = a.city || a.town || a.municipality || a.county || a.state_district;
  return {
    area: area || road || city,
    road,
    landmark,
    city,
    state: a.state,
    country: a.country,
    postcode: a.postcode,
    address: uniqueParts([landmark, road, area, city, a.state]).join(', ') || place.display_name,
    label: uniqueParts([area || road, city]).join(', ') || city || 'Your location'
  };
};

const fromBigDataCloud = (place) => {
  const informative = place.localityInfo?.informative || [];
  const area = informative.find((item) => ['neighbourhood', 'suburb', 'residential', 'village'].includes(item.description))?.name || place.locality;
  const city = place.city || place.locality;
  return {
    area: area || city,
    road: null,
    landmark: null,
    city,
    state: place.principalSubdivision,
    country: place.countryName,
    postcode: place.postcode,
    address: uniqueParts([area, city, place.principalSubdivision]).join(', ') || place.countryName,
    label: uniqueParts([area, city]).join(', ') || city || 'Your location'
  };
};

const fetchJson = async (url, timeoutMs = 6000) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

const reverseGeocode = async (lat, lng) => {
  try {
    const place = await fetchJson(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
    );
    if (place.error) throw new Error(place.error);
    return fromOpenStreetMap(place);
  } catch (error) {
    console.warn('OpenStreetMap reverse geocoding failed:', error);
  }
  try {
    const place = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    return fromBigDataCloud(place);
  } catch (error) {
    console.warn('BigDataCloud reverse geocoding failed:', error);
  }
  return { area: null, city: null, state: null, country: null, address: 'Your current location', label: 'Your current location' };
};

// --- Approximate location from the internet connection ----------------------
const fetchIpLocation = async () => {
  try {
    const data = await fetchJson('https://ipapi.co/json/', 3500);
    if (data.error || !Number.isFinite(data.latitude)) throw new Error(data.reason || 'No location');
    return {
      lat: data.latitude,
      lng: data.longitude,
      area: data.city,
      city: data.city,
      state: data.region,
      country: data.country_name,
      address: uniqueParts([data.city, data.region, data.country_name]).join(', '),
      label: uniqueParts([data.city, data.region]).join(', '),
      source: 'ip',
      isDefault: false,
      isApproximate: true,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.warn('IP location lookup failed:', error);
    return null;
  }
};

// --- Precise location from the device (GPS / Wi-Fi) -------------------------
const getPosition = (options) =>
  new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

const getDevicePosition = async (fresh) => {
  try {
    // High accuracy first (phone GPS)
    return await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: fresh ? 0 : 60000 });
  } catch (error) {
    if (error.code === 1) throw error; // permission denied - don't retry
    // Timed out / unavailable: accept a faster, lower-accuracy fix
    return getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 });
  }
};

const geoErrorMessage = (error) => {
  if (error?.code === 1) return 'Location access is blocked. Click the 🔒 icon in the address bar and allow Location to see professionals nearest to you.';
  if (error?.code === 3) return 'Finding your exact location took too long. Showing your approximate area instead.';
  return "Couldn't get your exact location. Showing your approximate area instead.";
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(loadCachedLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const locationRef = useRef(location);
  const inFlightRef = useRef(null);

  const saveLocation = useCallback((next) => {
    locationRef.current = next;
    setLocation(next);
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable - location still works for this visit
    }
  }, []);

  /**
   * Gets the visitor's live location.
   * - Shows an approximate (IP-based) area straight away if we have nothing better
   * - Then asks the device for its precise position (browser shows its permission prompt once)
   * Options: { force: true } for an explicit "update my location" click (fresh reading + feedback toasts)
   */
  const getUserLocation = useCallback((options = {}) => {
    const force = options?.force === true;
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setLoading(true);
      const current = locationRef.current;

      // 1. Quick approximate area while the device works out the exact position
      let preciseFound = false;
      const ipPromise = (current.isDefault || current.source === 'ip')
        ? fetchIpLocation().then((ipLocation) => {
            if (ipLocation && !preciseFound && locationRef.current.source !== 'gps') saveLocation(ipLocation);
          })
        : Promise.resolve();

      // 2. Precise device location
      if (!navigator.geolocation) {
        await ipPromise;
        setError('Your browser does not support location. Showing your approximate area.');
        return;
      }

      try {
        const position = await getDevicePosition(force);
        preciseFound = true;
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const place = await reverseGeocode(lat, lng);
        saveLocation({
          lat,
          lng,
          ...place,
          accuracy: Math.round(accuracy),
          source: 'gps',
          isDefault: false,
          isApproximate: accuracy > APPROXIMATE_ACCURACY_M,
          updatedAt: new Date().toISOString()
        });
        setError(null);
        if (force) toast.success(`Location updated: ${place.label}`);
      } catch (geoError) {
        await ipPromise;
        const message = geoErrorMessage(geoError);
        setError(message);
        if (force) toast.error(message, { duration: 6000 });
      }
    })().finally(() => {
      setLoading(false);
      inFlightRef.current = null;
    });

    inFlightRef.current = run;
    return run;
  }, [saveLocation]);

  // Detect the visitor's location automatically when they arrive
  useEffect(() => {
    let permissionStatus;

    const start = async () => {
      let state = 'prompt';
      try {
        permissionStatus = await navigator.permissions?.query({ name: 'geolocation' });
        if (permissionStatus) {
          state = permissionStatus.state;
          setPermissionState(state);
          // If they allow location later (e.g. from the address bar), update straight away
          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state);
            if (permissionStatus.state === 'granted') getUserLocation();
          };
        }
      } catch {
        // Permissions API not available (older Safari) - just try
      }

      const cached = locationRef.current;
      const isFresh = cached.source === 'gps' && Date.now() - new Date(cached.updatedAt).getTime() < REFRESH_AFTER_MS;

      if (state === 'denied') {
        // Don't keep asking - use the approximate area
        if (cached.isDefault || cached.source === 'ip') {
          const ipLocation = await fetchIpLocation();
          if (ipLocation) saveLocation(ipLocation);
        }
        setError(geoErrorMessage({ code: 1 }));
        return;
      }
      if (!isFresh) getUserLocation();
    };

    start();

    // Refresh when they come back to the tab after a while (they may have moved)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const cached = locationRef.current;
      const age = Date.now() - new Date(cached.updatedAt || 0).getTime();
      if (cached.source === 'gps' && age > REFRESH_AFTER_MS) getUserLocation();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [getUserLocation, saveLocation]);

  return (
    <LocationContext.Provider value={{
      location,
      loading,
      error,
      permissionState,
      isDefaultLocation: Boolean(location?.isDefault),
      isApproximate: Boolean(location?.isApproximate),
      isPrecise: location?.source === 'gps' && !location?.isApproximate,
      refreshLocation: getUserLocation
    }}>
      {children}
    </LocationContext.Provider>
  );
};
