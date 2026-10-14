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
// Readings worse than this are treated as approximate (e.g. PC without Wi-Fi positioning)
const APPROXIMATE_ACCURACY_M = 1500;
// Stop refining once the device is this accurate, or after this long
const GOOD_ACCURACY_M = 50;
const REFINE_FOR_MS = 15000;

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

const distanceMeters = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const fetchJson = async (url, timeoutMs = 6000) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

// --- Place names (coordinates <-> "Gurudev Nagar, Ludhiana") ----------------
export const placeFromOpenStreetMap = (place) => {
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
    label: uniqueParts([area || road || landmark, city]).join(', ') || city || place.name || 'Your location'
  };
};

const placeFromBigDataCloud = (place) => {
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

const reverseGeocode = async (lat, lng) => {
  try {
    const place = await fetchJson(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
    );
    if (place.error) throw new Error(place.error);
    return placeFromOpenStreetMap(place);
  } catch (error) {
    console.warn('OpenStreetMap reverse geocoding failed:', error);
  }
  try {
    const place = await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    return placeFromBigDataCloud(place);
  } catch (error) {
    console.warn('BigDataCloud reverse geocoding failed:', error);
  }
  return { area: null, city: null, state: null, country: null, address: 'Your current location', label: 'Your current location' };
};

/** Search areas, streets and landmarks in India (for the location picker). */
export const searchPlaces = async (query, near) => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    countrycodes: 'in',
    addressdetails: '1',
    limit: '6',
    'accept-language': 'en'
  });
  // Prefer results around the visitor's current area
  if (near && Number.isFinite(near.lat)) {
    params.set('viewbox', `${near.lng - 0.5},${near.lat + 0.5},${near.lng + 0.5},${near.lat - 0.5}`);
  }
  const results = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`);
  return results.map((place) => ({
    id: place.place_id,
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    ...placeFromOpenStreetMap(place),
    fullName: place.display_name
  }));
};

// --- Approximate location from the internet connection ----------------------
const ipProviders = [
  async () => {
    const d = await fetchJson('https://ipapi.co/json/', 3500);
    if (d.error) throw new Error(d.reason);
    return { lat: d.latitude, lng: d.longitude, city: d.city, state: d.region, country: d.country_name };
  },
  async () => {
    // Without coordinates BigDataCloud falls back to the visitor's IP address
    const d = await fetchJson('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en', 3500);
    return { lat: d.latitude, lng: d.longitude, city: d.city || d.locality, state: d.principalSubdivision, country: d.countryName };
  }
];

const fetchIpLocation = async () => {
  for (const provider of ipProviders) {
    try {
      const d = await provider();
      if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) continue;
      return {
        lat: d.lat,
        lng: d.lng,
        area: d.city,
        city: d.city,
        state: d.state,
        country: d.country,
        address: uniqueParts([d.city, d.state, d.country]).join(', '),
        label: uniqueParts([d.city, d.state]).join(', ') || 'Your area',
        source: 'ip',
        isDefault: false,
        isApproximate: true,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('IP location provider failed:', error);
    }
  }
  return null;
};

// --- Precise location from the device (GPS / Wi-Fi) -------------------------
/**
 * Watches the device position for up to REFINE_FOR_MS and keeps the most accurate
 * reading. Phones usually report a rough fix first and a precise GPS fix a few
 * seconds later; onFix is called for the first fix so the UI updates quickly.
 */
const getBestDevicePosition = (fresh, onFix) =>
  new Promise((resolve, reject) => {
    let best = null;
    let settled = false;
    let watchId = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (best) resolve(best);
      else reject(error || { code: 3 });
    };

    const timer = setTimeout(() => finish(), REFINE_FOR_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) {
          const isFirst = !best;
          best = position;
          if (isFirst) onFix?.(position);
        }
        if (position.coords.accuracy <= GOOD_ACCURACY_M) finish();
      },
      (error) => {
        // Permission denied or no position at all: stop. Otherwise keep the best we have.
        if (error.code === 1 || !best) finish(error);
      },
      { enableHighAccuracy: true, maximumAge: fresh ? 0 : 30000, timeout: REFINE_FOR_MS }
    );
  });

const platform = () => {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh/i.test(ua)) return 'mac';
  return 'other';
};

/** A short reason plus how to fix it, tailored to the visitor's device. */
export const describeLocationError = (code) => {
  const device = platform();
  if (code === 1) {
    return {
      title: 'Location permission is blocked',
      fix: device === 'android'
        ? 'Tap ⋮ → Settings → Site settings → Location and allow this site, then try again.'
        : device === 'ios'
          ? 'Open Settings → Privacy & Security → Location Services → Safari Websites → "While Using the App", then try again.'
          : 'Click the 🔒 icon left of the website address → Location → Allow, then try again.'
    };
  }
  if (code === 2) {
    return {
      title: "Your device couldn't find its location",
      fix: device === 'windows'
        ? 'Turn on Location in Windows: Settings → Privacy & security → Location → "Location services" On (and allow desktop apps). Also make sure Wi-Fi is on.'
        : device === 'mac'
          ? 'Turn on Location: System Settings → Privacy & Security → Location Services, and allow your browser.'
          : device === 'android'
            ? 'Turn on Location (GPS) from the quick settings panel, then try again.'
            : device === 'ios'
              ? 'Turn on Location Services in Settings → Privacy & Security, then try again.'
              : "Turn on your device's location service, then try again."
    };
  }
  if (code === 'unsupported') {
    return { title: "This browser can't share your location", fix: 'Search for your area below instead.' };
  }
  return {
    title: 'Finding your exact location took too long',
    fix: 'Move closer to a window or turn on Wi-Fi/GPS and try again, or search for your area below.'
  };
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(loadCachedLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
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

  const saveSeqRef = useRef(0);

  const saveDevicePosition = useCallback(async (position) => {
    const seq = ++saveSeqRef.current;
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    const previous = locationRef.current;
    // Reuse the place name if we've barely moved (saves a lookup)
    const samePlace = previous.source === 'gps' && previous.label && distanceMeters(previous, { lat, lng }) < 75;
    const place = samePlace ? previous : await reverseGeocode(lat, lng);
    // A newer (more accurate) reading was saved while we looked up this one
    if (seq !== saveSeqRef.current) return locationRef.current;
    const next = {
      lat,
      lng,
      area: place.area,
      road: place.road,
      landmark: place.landmark,
      city: place.city,
      state: place.state,
      country: place.country,
      postcode: place.postcode,
      address: place.address,
      label: place.label,
      accuracy: Math.round(accuracy),
      source: 'gps',
      isDefault: false,
      isApproximate: accuracy > APPROXIMATE_ACCURACY_M,
      updatedAt: new Date().toISOString()
    };
    saveLocation(next);
    return next;
  }, [saveLocation]);

  /**
   * Gets the visitor's live location.
   * - Shows an approximate (internet-based) area straight away if we have nothing better
   * - Asks the device for its position (browser shows its permission prompt once) and
   *   keeps refining for a few seconds until GPS is accurate
   * Options: { force: true } for an explicit "use my current location" click.
   */
  const getUserLocation = useCallback((options = {}) => {
    const force = options?.force === true;
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setLoading(true);
      const current = locationRef.current;

      // 1. Quick approximate area while the device works out the exact position
      let deviceFound = false;
      const ipPromise = (current.isDefault || current.source === 'ip')
        ? fetchIpLocation().then((ipLocation) => {
            if (ipLocation && !deviceFound && locationRef.current.source !== 'gps') saveLocation(ipLocation);
          })
        : Promise.resolve();

      // 2. Precise device location
      if (!navigator.geolocation) {
        await ipPromise;
        setErrorCode('unsupported');
        setError(describeLocationError('unsupported').title);
        return null;
      }

      try {
        const best = await getBestDevicePosition(force, (firstFix) => {
          deviceFound = true;
          saveDevicePosition(firstFix);
        });
        deviceFound = true;
        const saved = await saveDevicePosition(best);
        setError(null);
        setErrorCode(null);
        if (force) {
          toast.success(saved.isApproximate
            ? `Approximate location: ${saved.label}`
            : `Location updated: ${saved.label}`);
        }
        return saved;
      } catch (geoError) {
        await ipPromise;
        const code = geoError?.code ?? 3;
        const { title, fix } = describeLocationError(code);
        setErrorCode(code);
        setError(`${title}. ${fix}`);
        if (force) toast.error(`${title}. ${fix}`, { duration: 8000 });
        return null;
      }
    })().finally(() => {
      setLoading(false);
      inFlightRef.current = null;
    });

    inFlightRef.current = run;
    return run;
  }, [saveLocation, saveDevicePosition]);

  /** Location chosen by hand from the search box - kept until they ask for GPS again. */
  const setManualLocation = useCallback((place) => {
    saveLocation({
      lat: place.lat,
      lng: place.lng,
      area: place.area,
      road: place.road,
      landmark: place.landmark,
      city: place.city,
      state: place.state,
      country: place.country,
      postcode: place.postcode,
      address: place.address,
      label: place.label,
      source: 'manual',
      isDefault: false,
      isApproximate: false,
      updatedAt: new Date().toISOString()
    });
    setError(null);
    setErrorCode(null);
    toast.success(`Location set: ${place.label}`);
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
            if (permissionStatus.state === 'granted' && locationRef.current.source !== 'manual') getUserLocation();
          };
        }
      } catch {
        // Permissions API not available (older Safari) - just try
      }

      const cached = locationRef.current;
      // Respect a location the visitor picked by hand
      if (cached.source === 'manual') return;

      if (state === 'denied') {
        // Don't keep asking - use the approximate area
        if (cached.isDefault || cached.source === 'ip') {
          const ipLocation = await fetchIpLocation();
          if (ipLocation) saveLocation(ipLocation);
        }
        const { title, fix } = describeLocationError(1);
        setErrorCode(1);
        setError(`${title}. ${fix}`);
        return;
      }

      const isFresh = cached.source === 'gps' && Date.now() - new Date(cached.updatedAt).getTime() < REFRESH_AFTER_MS;
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
      errorCode,
      permissionState,
      isDefaultLocation: Boolean(location?.isDefault),
      isApproximate: Boolean(location?.isApproximate),
      isPrecise: (location?.source === 'gps' && !location?.isApproximate) || location?.source === 'manual',
      refreshLocation: getUserLocation,
      setManualLocation
    }}>
      {children}
    </LocationContext.Provider>
  );
};
