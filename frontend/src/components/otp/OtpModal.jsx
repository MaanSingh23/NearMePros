import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import OtpVerifyPanel from './OtpVerifyPanel';

/** The verify-code step in a dialog, for confirming sensitive account actions. */
const OtpModal = ({ open, onClose, ...panelProps }) =>
  createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={panelProps.title || 'Verify'}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl dark:bg-stone-900"
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <OtpVerifyPanel {...panelProps} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

export default OtpModal;
