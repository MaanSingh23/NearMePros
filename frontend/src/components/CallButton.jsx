import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PhoneIcon, XMarkIcon, ClipboardDocumentIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// Indian numbers -> international format for WhatsApp (e.g. 9806563214 -> 919806563214)
const toInternational = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
};

const formatForDisplay = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const WhatsAppIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 01-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 01-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 016.7 2.78 9.42 9.42 0 012.77 6.7c0 5.22-4.25 9.47-9.47 9.47zm8.06-17.53A11.33 11.33 0 0012.04.62C5.76.62.65 5.73.65 12.01c0 2 .52 3.96 1.52 5.69L.55 23.6l6.04-1.58a11.36 11.36 0 005.44 1.38h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.33-8.05z" />
  </svg>
);

/**
 * "Call" that works everywhere: dials straight away on phones; on computers
 * (which can't place phone calls) shows the number with WhatsApp / copy options.
 */
const CallButton = ({ phone, name, className, children, message }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!phone) return null;

  const tel = `tel:${String(phone).replace(/[^\d+]/g, '')}`;
  const whatsapp = `https://wa.me/${toInternational(phone)}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  const handleClick = (e) => {
    if (isMobileDevice()) return; // let the phone dial normally
    e.preventDefault();
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatForDisplay(phone));
      toast.success('Number copied');
    } catch {
      toast.error("Couldn't copy - please note the number down");
    }
  };

  return (
    <>
      <a href={tel} onClick={handleClick} className={className}>
        {children}
      </a>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
            >
              <motion.div
                role="dialog"
                aria-label={`Call ${name || 'professional'}`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
                    <PhoneIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-4 text-sm font-bold text-stone-500 dark:text-stone-400">Call {name || 'the professional'}</p>
                <p className="mt-1 select-all text-3xl font-black tracking-tight text-stone-900 dark:text-white">{formatForDisplay(phone)}</p>
                <p className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">
                  <DevicePhoneMobileIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  Computers can't make phone calls. Dial this number on your mobile, or message on WhatsApp.
                </p>

                <div className="mt-5 grid gap-2">
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
                  >
                    <WhatsAppIcon className="h-5 w-5" /> Chat / call on WhatsApp
                  </a>
                  <button
                    onClick={copy}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-800 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" /> Copy number
                  </button>
                  <a
                    href={tel}
                    className="text-center text-xs font-bold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline dark:hover:text-stone-200"
                  >
                    Call from this computer (Phone Link / Skype)
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default CallButton;
