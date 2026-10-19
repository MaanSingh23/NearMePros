import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon, KeyIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authRequest } from '../context/AuthContext';
import OtpVerifyPanel from '../components/otp/OtpVerifyPanel';

const passwordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return [
    { label: 'Too weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-amber-500' },
    { label: 'Good', color: 'bg-lime-500' },
    { label: 'Strong', color: 'bg-primary-500' }
  ][score];
};

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const strength = passwordStrength(newPassword);

  const sendCode = () => authRequest('/auth/otp/send', { email, purpose: 'reset-password' });

  const requestCode = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    setError(null);
    try {
      setChallenge(await sendCode());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async (otp) => {
    const data = await authRequest('/auth/reset-password', { email, otp, newPassword });
    toast.success(data.message || 'Password changed');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 pb-12 pt-28 dark:bg-[#0c0a09]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-xl dark:border-stone-800 dark:bg-stone-900"
      >
        {challenge ? (
          <OtpVerifyPanel
            title="Confirm it's you"
            maskedEmail={challenge.maskedEmail}
            devCode={challenge.devCode}
            initialResendSeconds={challenge.resendInSeconds || 60}
            onVerify={reset}
            onResend={sendCode}
            verifyLabel="Verify & change password"
            onBack={() => setChallenge(null)}
          />
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
              <KeyIcon className="h-7 w-7 text-primary-600" />
            </div>
            <h1 className="mt-4 text-center text-3xl font-black text-stone-900 dark:text-white">Reset your password</h1>
            <p className="mt-1.5 text-center text-sm font-medium text-stone-500 dark:text-stone-400">
              Enter your email and a new password. We'll send a code to confirm it's really you.
            </p>

            <form onSubmit={requestCode} className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Email address</span>
                <div className="relative mt-1.5">
                  <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} className="input-field pl-10" placeholder="name@company.com" />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">New password</span>
                <div className="relative mt-1.5">
                  <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input type="password" required autoComplete="new-password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(null); }} className="input-field pl-10" placeholder="At least 6 characters" />
                </div>
                {newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(['Too weak', 'Weak', 'Fair', 'Good', 'Strong'].indexOf(strength.label) + 1) * 20}%` }} />
                    </div>
                    <span className="text-xs font-bold text-stone-500">{strength.label}</span>
                  </div>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Confirm new password</span>
                <div className="relative mt-1.5">
                  <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} className="input-field pl-10" placeholder="Type it again" />
                  {confirmPassword && confirmPassword === newPassword && <CheckCircleIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-500" />}
                </div>
              </label>

              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending code...' : 'Send verification code'}</button>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-stone-500">
              Remembered it? <Link to="/login" className="font-black text-stone-900 hover:text-primary-600 dark:text-white">Back to login</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
