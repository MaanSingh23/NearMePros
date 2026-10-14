import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useLocation, searchPlaces, reverseGeocode, describeLocationError } from '../context/LocationContext';

const formatAccuracy = (meters) => {
  if (!Number.isFinite(meters)) return null;
  return meters >= 1000 ? `±${(meters / 1000).toFixed(1)} km` : `±${meters} m`;
};

const LocateIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    <circle cx="12" cy="12" r="7" />
  </svg>
);

const LocationPicker = ({ open, onClose }) => {
  const { location, loading, errorCode, refreshLocation, setManualLocation } = useLocation();

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Map pin + the address under it
  const [pin, setPin] = useState(null);
  const [pinPlace, setPinPlace] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const accuracyRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const problem = errorCode !== null && errorCode !== undefined && location.source !== 'manual'
    ? describeLocationError(errorCode)
    : null;

  const showAccuracy = (map, place) => {
    accuracyRef.current?.remove();
    accuracyRef.current = null;
    if (place.source === 'gps' && Number.isFinite(place.accuracy)) {
      accuracyRef.current = L.circle([place.lat, place.lng], {
        radius: place.accuracy,
        color: '#059669',
        weight: 1,
        fillColor: '#10b981',
        fillOpacity: 0.12
      }).addTo(map);
    }
  };

  // Open: reset the form and create the map at the current location
  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setResults([]);
    setSearchError(null);
    setHouseNo(location.source === 'manual' ? location.houseNo || '' : '');
    setLandmark(location.source === 'manual' ? location.landmarkNote || '' : '');
    setPin({ lat: location.lat, lng: location.lng });
    setPinPlace(location);

    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);

    // Wait for the dialog to render before attaching the map
    const timer = setTimeout(() => {
      if (!mapElRef.current || mapRef.current) return;
      const zoom = location.isApproximate ? 13 : 17;
      const map = L.map(mapElRef.current, { zoomControl: false }).setView([location.lat, location.lng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      map.on('moveend', () => {
        const center = map.getCenter();
        setPin({ lat: center.lat, lng: center.lng });
      });
      showAccuracy(map, location);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 250);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      mapRef.current?.remove();
      mapRef.current = null;
      accuracyRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Look up the address under the pin whenever it moves (debounced)
  useEffect(() => {
    if (!open || !pin) return undefined;
    // The pin is still on the saved location - reuse its address
    if (pinPlace && Math.abs(pinPlace.lat - pin.lat) < 0.00005 && Math.abs(pinPlace.lng - pin.lng) < 0.00005) return undefined;
    let cancelled = false;
    setResolving(true);
    const timer = setTimeout(async () => {
      const place = await reverseGeocode(pin.lat, pin.lng);
      if (!cancelled) {
        setPinPlace({ ...place, lat: pin.lat, lng: pin.lng });
        setResolving(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pin, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search as they type (debounced)
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      setSearchError(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(text, location);
        if (!cancelled) {
          setResults(found);
          setSearchError(found.length ? null : 'No places found. Try a nearby landmark, street or area name.');
        }
      } catch {
        if (!cancelled) setSearchError("Couldn't search right now. Please try again.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveMapTo = (place, zoom = 17) => {
    setPinPlace({ ...place });
    mapRef.current?.flyTo([place.lat, place.lng], zoom, { duration: 0.8 });
  };

  const useCurrentLocation = async () => {
    const found = await refreshLocation({ force: true });
    if (found && mapRef.current) {
      showAccuracy(mapRef.current, found);
      moveMapTo(found, found.isApproximate ? 14 : 18);
    }
  };

  const chooseResult = (place) => {
    setQuery('');
    setResults([]);
    moveMapTo(place, 17);
  };

  const confirm = () => {
    if (!pin || !pinPlace) return;
    setManualLocation({ ...pinPlace, lat: pin.lat, lng: pin.lng }, { houseNo, landmark });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-end justify-center bg-stone-950/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Choose your location"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl dark:bg-stone-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
              <div>
                <h2 className="text-lg font-black text-stone-900 dark:text-white">Set your location</h2>
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Move the map so the pin is on your house</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto">
              {/* Search */}
              <div className="relative px-5 pt-4">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-9 top-1/2 mt-2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search area, street, landmark or pincode"
                  aria-label="Search for your area"
                  className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-10 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:ring-primary-900/40"
                />
                {searching && <ArrowPathIcon className="absolute right-9 top-1/2 mt-2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />}

                {(results.length > 0 || searchError) && (
                  <div className="absolute left-5 right-5 top-full z-[1000] mt-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-800">
                    {searchError && <p className="px-4 py-3 text-sm font-medium text-stone-500">{searchError}</p>}
                    {results.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => chooseResult(place)}
                        className="flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3 text-left last:border-0 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-700/50"
                      >
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-stone-900 dark:text-white">{place.label}</span>
                          <span className="block truncate text-xs font-medium text-stone-500 dark:text-stone-400">{place.fullName}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map with a fixed centre pin */}
              <div className="relative mx-5 mt-4 h-60 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
                <div ref={mapElRef} className="h-full w-full" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
                  <MapPinIcon className="h-10 w-10 text-primary-600 drop-shadow-lg" />
                </div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-[499] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-900/40" />
                <button
                  onClick={useCurrentLocation}
                  disabled={loading}
                  className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-primary-700 shadow-lg transition hover:bg-primary-50 disabled:opacity-70 dark:bg-stone-800 dark:text-primary-400"
                >
                  {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <LocateIcon className="h-4 w-4" />}
                  {loading ? 'Locating…' : 'Use current location'}
                </button>
              </div>

              {loading && (
                <p className="mx-5 mt-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                  Allow location if your browser asks. A precise GPS fix can take up to 10 seconds.
                </p>
              )}

              {/* Why GPS failed + how to fix */}
              {problem && !loading && (
                <div className="mx-5 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {problem.title}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-300">{problem.fix}</p>
                </div>
              )}

              {/* Address under the pin */}
              <div className="mx-5 mt-4 flex items-start gap-3">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                <div className="min-w-0">
                  {resolving ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-500">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" /> Finding address…
                    </p>
                  ) : (
                    <>
                      <p className="font-bold text-stone-900 dark:text-white">{pinPlace?.label || 'Selected location'}</p>
                      <p className="mt-0.5 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">{pinPlace?.address}</p>
                    </>
                  )}
                  {location.source === 'gps' && Number.isFinite(location.accuracy) && (
                    <p className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold ${location.isApproximate ? 'text-amber-600' : 'text-primary-600 dark:text-primary-400'}`}>
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      Device location found ({formatAccuracy(location.accuracy)}) - fine-tune the pin if needed
                    </p>
                  )}
                </div>
              </div>

              {/* Details the map can't know */}
              <div className="mx-5 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300">House / Flat / Floor no.</span>
                  <input
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value.slice(0, 60))}
                    placeholder="e.g. H.No 245, 2nd floor"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Landmark (optional)</span>
                  <input
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value.slice(0, 80))}
                    placeholder="e.g. Opposite Gurudwara"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </label>
              </div>
            </div>

            {/* Confirm */}
            <div className="border-t border-stone-100 p-4 dark:border-stone-800">
              <button
                onClick={confirm}
                disabled={!pinPlace || resolving}
                className="w-full rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm location
              </button>
              <p className="mt-2 text-center text-[11px] font-medium text-stone-400">
                Your location is only used to show professionals near you and for your bookings.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LocationPicker;
