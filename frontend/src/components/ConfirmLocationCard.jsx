import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { useLocation } from '../context/LocationContext';

const DISMISS_KEY = 'nmp-location-confirm-dismissed';

/**
 * After automatic detection, asks the visitor to confirm the place when the
 * device position isn't GPS-precise (laptops estimate it from Wi-Fi).
 */
const ConfirmLocationCard = ({ onAdjust }) => {
  const { location, loading, needsConfirmation, confirmLocation, isDesktop } = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const visible = needsConfirmation && !loading && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          role="dialog"
          aria-label="Confirm your location"
          className="fixed left-4 right-4 top-24 z-[60] mx-auto max-w-sm rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl sm:left-auto sm:right-6 dark:border-stone-700 dark:bg-stone-900"
        >
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-950/50">
              <MapPinIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-stone-900 dark:text-white">Is this your location?</p>
              <p className="mt-0.5 truncate text-sm font-bold text-stone-700 dark:text-stone-200">{location.label}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">
                {isDesktop
                  ? 'Computers estimate location from Wi-Fi, so it can be off by a few hundred metres.'
                  : 'Your phone gave an approximate position.'}{' '}
                Adjust it on the map for accurate distances and bookings.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmLocation}
              className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Yes, correct
            </button>
            <button
              onClick={() => {
                dismiss();
                onAdjust();
              }}
              className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-700"
            >
              Adjust on map
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmLocationCard;
