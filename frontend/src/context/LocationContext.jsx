import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const LocationContext = createContext();
const LOCATION_STORAGE_KEY = 'localFinder:lastLocation_v2';
const DEFAULT_LOCATION = {
  lat: 30.9010,
  lng: 75.8573,
  label: 'Ludhiana, India',
  area: 'Ludhiana',
  city: 'Ludhiana',
  state: 'Punjab',
  country: 'India',
  source: 'default',
  isDefault: true
};

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.city) return parsed;
        // If it's a bad object (no city), clear it
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
      return DEFAULT_LOCATION;
    } catch (error) {
      return DEFAULT_LOCATION;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    const loadPermissionState = async () => {
      if (!navigator.permissions?.query) return;

      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(status.state);
        status.onchange = () => setPermissionState(status.state);
      } catch (error) {
        console.warn('Unable to read geolocation permission:', error);
      }
    };

    loadPermissionState();
  }, []);

  const saveLocation = (nextLocation) => {
    setLocation(nextLocation);

    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(nextLocation));
    } catch (error) {
      console.warn('Unable to save location:', error);
    }
  };

  const uniqueLocationParts = (parts) => {
    const normalized = new Set();

    return parts.filter((part) => {
      if (!part) return false;
      const key = part.toString().trim().toLowerCase();
      if (!key || normalized.has(key)) return false;
      normalized.add(key);
      return true;
    });
  };

  const buildOpenStreetMapPlace = (place) => {
    const address = place.address || {};
    const exactArea =
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.residential ||
      address.city_district ||
      address.hamlet ||
      address.village;
    const road = address.road || address.pedestrian || address.footway;
    const landmark =
      address.amenity ||
      address.shop ||
      address.building ||
      address.office ||
      address.tourism;
    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.county ||
      address.state_district;
    const state = address.state;
    const country = address.country;
    const labelParts = uniqueLocationParts([
      landmark,
      road,
      exactArea,
      city,
      state
    ]);
    const shortLabelParts = uniqueLocationParts([
      exactArea || road || landmark,
      city,
      state
    ]);

    return {
      area: exactArea || road || landmark || city,
      road,
      landmark,
      city,
      state,
      country,
      address: labelParts.join(', ') || place.display_name || 'Your current location',
      label: shortLabelParts.join(', ') || place.display_name || 'Your current location'
    };
  };

  const buildBigDataCloudPlace = (place) => {
    const informative = place.localityInfo?.informative || [];
    const administrative = place.localityInfo?.administrative || [];
    const area =
      informative.find((item) => ['neighbourhood', 'suburb', 'residential', 'village'].includes(item.description))?.name ||
      informative[0]?.name ||
      place.locality;
    const city = place.city || administrative[2]?.name || administrative[1]?.name;
    const state = place.principalSubdivision || administrative[1]?.name;
    const country = place.countryName;
    const labelParts = uniqueLocationParts([area, city, state]);

    return {
      area,
      road: null,
      landmark: null,
      city,
      state,
      country,
      address: labelParts.join(', ') || country || 'Your current location',
      label: labelParts.join(', ') || country || 'Your current location'
    };
  };

  const fetchOpenStreetMapPlace = async (lat, lng) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
    );

    if (!response.ok) throw new Error('OpenStreetMap reverse geocoding failed');

    const place = await response.json();
    return buildOpenStreetMapPlace(place);
  };

  const fetchBigDataCloudPlace = async (lat, lng) => {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );

    if (!response.ok) throw new Error('BigDataCloud reverse geocoding failed');

    const place = await response.json();
    return buildBigDataCloudPlace(place);
  };

  const reverseGeocodeLocation = async (lat, lng) => {
    try {
      return await fetchOpenStreetMapPlace(lat, lng);
    } catch (error) {
      console.warn('Unable to fetch precise area from OpenStreetMap:', error);

      try {
        return await fetchBigDataCloudPlace(lat, lng);
      } catch (fallbackError) {
        console.warn('Unable to fetch area name:', fallbackError);
        return {
          area: null,
          road: null,
          landmark: null,
          city: null,
          state: null,
          country: null,
          address: 'Your current location',
          label: 'Your current location'
        };
      }
    }
  };

  const useDefaultLocation = useCallback((message) => {
    saveLocation({
      ...DEFAULT_LOCATION,
      updatedAt: new Date().toISOString()
    });
    setError(message);
    setLoading(false);
  }, []);

  const fetchIpLocation = async () => {
    try {
      // Create a controller for a strict 3-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data.error) throw new Error(data.reason || 'IP Location Error');

      return {
        lat: data.latitude,
        lng: data.longitude,
        area: data.city,
        city: data.city,
        state: data.region,
        country: data.country_name,
        address: `${data.city}, ${data.region}, ${data.country_name}`,
        label: `${data.city}, ${data.region}`,
        source: 'ip',
        isDefault: false,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn('IP location fetch failed or timed out:', error);
      return null;
    }
  };

  const getUserLocation = useCallback(async (options = {}) => {
    const { silent = false, force = false } = options;

    if (hasRequestedLocation.current && !force) return;
    hasRequestedLocation.current = true;
    
    // Only show spinner for manual forced refreshes
    if (force) setLoading(true);

    // Automatic IP Detection (Background/Silent)
    const ipLocation = await fetchIpLocation();
    if (ipLocation && ipLocation.city) {
      saveLocation(ipLocation);
      setLoading(false);
      if (!silent) toast.success(`Located: ${ipLocation.city}`);
      return;
    }

    // Precise Geolocation (Only if forced)
    if (force && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const place = await reverseGeocodeLocation(position.coords.latitude, position.coords.longitude);
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            ...place,
            source: 'browser',
            isDefault: false,
            updatedAt: new Date().toISOString()
          };
          saveLocation(nextLocation);
          setLoading(false);
          if (!silent) toast.success('Location updated');
        },
        () => {
          setLoading(false);
          toast.error('Unable to get precise location');
        },
        { timeout: 8000 }
      );
    } else {
      setLoading(false);
    }
  }, [saveLocation]);



  useEffect(() => {
    getUserLocation({ silent: true });
  }, []); // Only run once on mount

  return (
    <LocationContext.Provider value={{
      location,
      loading,
      error,
      permissionState,
      isDefaultLocation: Boolean(location?.isDefault),
      refreshLocation: getUserLocation
    }}>
      {children}
    </LocationContext.Provider>
  );
};
