import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useLocation, searchPlaces, describeLocationError } from '../context/LocationContext';

const formatAccuracy = (meters) => {
  if (!Number.isFinite(meters)) return null;
  return meters >= 1000 ? `±${(meters / 1000).toFixed(1)} km` : `±${meters} m`;
};

const statusOf = (location) => {
  if (location.source === 'manual') return { text: 'Chosen by you', tone: 'green' };
  if (location.source === 'gps' && !location.isApproximate) {
    return { text: `Live location${location.accuracy ? ` · ${formatAccuracy(location.accuracy)}` : ''}`, tone: 'green' };
  }
  if (location.source === 'gps') return { text: `Approximate · ${formatAccuracy(location.accuracy)}`, tone: 'amber' };
  if (location.source === 'ip') return { text: 'Approximate (from your internet connection)', tone: 'amber' };
  return { text: 'Default location', tone: 'amber' };
};

const LocationPicker = ({ open, onClose }) => {
  const { location, loading, errorCode, refreshLocation, setManualLocation } = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const inputRef = useRef(null);

  const status = statusOf(location);
  const problem = errorCode !== null && errorCode !== undefined && location.source !== 'manual'
    ? describeLocationError(errorCode)
    : null;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset and focus the search each time the picker opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Search as they type (debounced)
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
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

  const useCurrentLocation = async () => {
    const result = await refreshLocation({ force: true });
    if (result && !result.isApproximate) onClose();
  };

  const choose = (place) => {
    setManualLocation(place);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-end justify-center bg-stone-950/50 backdrop-blur-sm sm:items-start sm:pt-24"
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
            className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl dark:bg-stone-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-stone-800">
              <h2 className="text-lg font-black text-stone-900 dark:text-white">Your location</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {/* Current location */}
              <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                <div className="min-w-0">
                  <p className="font-bold text-stone-900 dark:text-white">{location.label}</p>
                  {location.address && location.address !== location.label && (
                    <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">{location.address}</p>
                  )}
                  <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-bold ${status.tone === 'green' ? 'text-primary-600 dark:text-primary-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {status.tone === 'green' ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <ExclamationTriangleIcon className="h-3.5 w-3.5" />}
                    {status.text}
                  </p>
                </div>
              </div>

              {/* Use GPS */}
              <button
                onClick={useCurrentLocation}
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Finding your exact location…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="7" />
                    </svg>
                    Use my current location
                  </>
                )}
              </button>
              {loading && (
                <p className="mt-2 text-center text-xs font-medium text-stone-500 dark:text-stone-400">
                  Allow location if your browser asks. Getting a precise GPS fix can take up to 15 seconds.
                </p>
              )}

              {/* Why it failed + how to fix */}
              {problem && !loading && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {problem.title}
                  </p>
                  <p className="mt-1 font-medium leading-relaxed text-amber-800 dark:text-amber-300">{problem.fix}</p>
                </div>
              )}

              {/* Manual search */}
              <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
                or search
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              </div>

              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Area, street, landmark or pincode"
                  aria-label="Search for your area"
                  className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-12 pr-10 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-stone-700 dark:bg-stone-800 dark:text-white dark:focus:ring-primary-900/40"
                />
                {searching && <ArrowPathIcon className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />}
              </div>

              {searchError && <p className="mt-3 text-sm font-medium text-stone-500">{searchError}</p>}

              {results.length > 0 && (
                <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 dark:divide-stone-800 dark:border-stone-700">
                  {results.map((place) => (
                    <li key={place.id}>
                      <button
                        onClick={() => choose(place)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-800"
                      >
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-stone-900 dark:text-white">{place.label}</span>
                          <span className="block truncate text-xs font-medium text-stone-500 dark:text-stone-400">{place.fullName}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-5 text-center text-[11px] font-medium text-stone-400">
                Your location is only used to show professionals near you.
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
