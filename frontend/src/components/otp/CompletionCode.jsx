import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheckIcon, XMarkIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import OtpInput from './OtpInput';

const OPEN = ['pending', 'confirmed', 'in-progress'];

/** Customer side: the 4-digit code they give the professional only when the job is done. */
export const CompletionCodeBadge = ({ code, status, compact = false }) => {
  if (!code || !OPEN.includes(status)) return null;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-dashed border-primary-300 bg-primary-50 ${compact ? 'px-3 py-2' : 'px-4 py-3'} dark:border-primary-800 dark:bg-primary-950/40`}>
      <ShieldCheckIcon className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} shrink-0 text-primary-600`} />
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wider text-primary-700 dark:text-primary-300">Job completion code</p>
        <p className="text-[11px] font-medium leading-snug text-primary-800/80 dark:text-primary-300/80">Share it with the professional only after the work is done.</p>
      </div>
      <span className={`ml-auto shrink-0 font-black tracking-[0.3em] text-stone-900 dark:text-white ${compact ? 'text-xl' : 'text-2xl'}`}>{code}</span>
    </div>
  );
};

/**
 * Provider side: enter the customer's code to mark a job completed.
 * onSubmit(code) should reject with { message } when the code is wrong.
 */
export const CompleteJobModal = ({ open, booking, onClose, onSubmit }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (value = code) => {
    if (value.length < 4 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(value);
      setCode('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Could not complete the job');
      setCode('');
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setCode('');
    setError(null);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[250] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-label="Complete job"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-stone-900"
          >
            <button onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
              <CheckCircleIcon className="h-7 w-7 text-primary-600" />
            </div>
            <h3 className="mt-4 text-2xl font-black text-stone-900 dark:text-white">Complete this job</h3>
            <p className="mt-1.5 text-sm font-medium text-stone-500 dark:text-stone-400">
              Ask {booking?.userId?.name || 'the customer'} for the <strong>4-digit completion code</strong> shown in their booking. It confirms they're happy the work is done.
            </p>
            <form className="mt-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <OtpInput length={4} value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={submit} invalid={Boolean(error)} disabled={saving} />
              {error && <p role="alert" className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
              <button type="submit" disabled={code.length < 4 || saving} className="btn-primary mt-6 flex w-full items-center justify-center gap-2 disabled:opacity-60">
                {saving && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                {saving ? 'Checking…' : 'Verify & complete job'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
