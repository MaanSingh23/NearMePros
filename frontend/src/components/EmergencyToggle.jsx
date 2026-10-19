import React from 'react';
import { BoltIcon } from '@heroicons/react/24/solid';

/** Provider opt-in for Emergency Mode requests (used on Add/Edit Service). */
const EmergencyToggle = ({ checked, onChange }) => (
  <div className="rounded-[2.5rem] border border-red-200 bg-red-50/60 p-8 shadow-xl dark:border-red-900/50 dark:bg-red-950/20">
    <div className="flex items-start justify-between gap-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30">
          <BoltIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-black text-stone-950 dark:text-white">Available for emergencies (24×7)</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">
            Customers in Emergency Mode see you first with a <strong className="text-red-700 dark:text-red-400">24×7 emergency</strong> badge.
            You'll get urgent requests marked 🚨 - respond quickly to keep your ranking.
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Available for emergencies"
        onClick={() => onChange(!checked)}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? 'bg-red-600' : 'bg-stone-300 dark:bg-stone-700'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  </div>
);

export default EmergencyToggle;
