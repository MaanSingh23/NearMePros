import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, LockClosedIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useAuth, authRequest } from '../context/AuthContext';
import OtpModal from './otp/OtpModal';

/** Profile -> Security: 2-step verification and password change, each confirmed by email code. */
const SecuritySettings = () => {
  const { user, updateUser } = useAuth();
  const [pending, setPending] = useState(null); // { kind, maskedEmail, devCode, ... }
  const [busy, setBusy] = useState(null);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState(null);

  const twoFactorOn = Boolean(user?.twoFactorEnabled);

  const requestCode = async (kind, purpose, extra = {}) => {
    setBusy(kind);
    try {
      const result = await authRequest('/users/me/otp', { purpose });
      setPending({ kind, purpose, ...result, ...extra });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  const startPasswordChange = (e) => {
    e.preventDefault();
    setPasswordError(null);
    if (passwords.next.length < 6) return setPasswordError('New password must be at least 6 characters');
    if (passwords.next !== passwords.confirm) return setPasswordError('New passwords do not match');
    if (passwords.next === passwords.current) return setPasswordError('Choose a password different from your current one');
    requestCode('password', 'change-password');
  };

  const verify = async (code) => {
    if (pending.kind === 'two-factor') {
      const data = await authRequest('/users/me/two-factor', { enabled: !twoFactorOn, otp: code });
      updateUser({ ...user, twoFactorEnabled: data.twoFactorEnabled, emailVerified: true });
      toast.success(data.message);
    } else if (pending.kind === 'password') {
      try {
        const data = await authRequest('/users/me/password', { currentPassword: passwords.current, newPassword: passwords.next, otp: code });
        toast.success(data.message);
        setPasswords({ current: '', next: '', confirm: '' });
      } catch (error) {
        // A wrong current password isn't a code problem - show it on the form
        if (/current password/i.test(error.message)) {
          setPending(null);
          setPasswordError(error.message);
          return;
        }
        throw error;
      }
    }
    setPending(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
          <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
        </span>
        <div>
          <h2 className="text-xl font-black text-stone-900 dark:text-white">Security</h2>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Important changes are confirmed with a code sent to your email.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Email status */}
        <div className="rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
          <p className="flex items-center gap-2 text-sm font-bold text-stone-500 dark:text-stone-400"><EnvelopeIcon className="h-4 w-4" /> Email</p>
          <p className="mt-1 truncate font-black text-stone-900 dark:text-white">{user?.email}</p>
          {user?.emailVerified ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
              <CheckBadgeIcon className="h-4 w-4" /> Verified
            </p>
          ) : (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-4 w-4" /> Not verified yet - turning on 2-step verification verifies it
            </p>
          )}
        </div>

        {/* 2-step verification */}
        <div className="rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-stone-500 dark:text-stone-400"><KeyIcon className="h-4 w-4" /> 2-step verification</p>
              <p className="mt-1 font-black text-stone-900 dark:text-white">{twoFactorOn ? 'On' : 'Off'}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">
                {twoFactorOn
                  ? 'Every login needs your password and a code from your email.'
                  : 'Add a second step: after your password, enter a code from your email.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={twoFactorOn}
              aria-label="2-step verification"
              disabled={busy === 'two-factor'}
              onClick={() => requestCode('two-factor', 'toggle-2fa')}
              className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60 ${twoFactorOn ? 'bg-primary-600' : 'bg-stone-300 dark:bg-stone-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${twoFactorOn ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={startPasswordChange} className="mt-4 rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
        <p className="flex items-center gap-2 text-sm font-bold text-stone-500 dark:text-stone-400"><LockClosedIcon className="h-4 w-4" /> Change password</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ['current', 'Current password', 'current-password'],
            ['next', 'New password', 'new-password'],
            ['confirm', 'Confirm new password', 'new-password']
          ].map(([key, label, autoComplete]) => (
            <input
              key={key}
              type="password"
              required
              autoComplete={autoComplete}
              placeholder={label}
              aria-label={label}
              value={passwords[key]}
              onChange={(e) => {
                setPasswords({ ...passwords, [key]: e.target.value });
                setPasswordError(null);
              }}
              className="input-field"
            />
          ))}
        </div>
        {passwordError && <p role="alert" className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">{passwordError}</p>}
        <button type="submit" disabled={busy === 'password'} className="mt-4 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-stone-900">
          {busy === 'password' ? 'Sending code...' : 'Change password'}
        </button>
      </form>

      <OtpModal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={pending?.kind === 'two-factor' ? `Turn 2-step verification ${twoFactorOn ? 'off' : 'on'}` : 'Confirm password change'}
        maskedEmail={pending?.maskedEmail}
        devCode={pending?.devCode}
        onVerify={verify}
        onResend={() => authRequest('/users/me/otp', { purpose: pending.purpose })}
        verifyLabel="Confirm"
      />
    </motion.section>
  );
};

export default SecuritySettings;
