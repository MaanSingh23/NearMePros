import React, { useEffect, useState } from 'react';
import { ArrowPathIcon, EnvelopeOpenIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import OtpInput from './OtpInput';

/**
 * Enter-the-code step used everywhere (sign-up, login, password reset, security settings).
 * onVerify(code) -> resolves on success, throws/rejects with a message on failure.
 * onResend() -> resolves with { resendInSeconds, devCode? }.
 */
const OtpVerifyPanel = ({
  maskedEmail,
  title = 'Check your email',
  description,
  initialResendSeconds = 60,
  devCode,
  onVerify,
  onResend,
  verifyLabel = 'Verify',
  children,
  onBack
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialResendSeconds);
  const [hint, setHint] = useState(devCode || null);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const verify = async (value = code) => {
    if (value.length < 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await onVerify(value);
    } catch (err) {
      setError(err?.message || 'Verification failed. Please try again.');
      if (err?.expired) setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const result = await onResend();
      setSecondsLeft(result?.resendInSeconds || 60);
      setCode('');
      if (result?.devCode) setHint(result.devCode);
    } catch (err) {
      setError(err?.message || "Couldn't send a new code.");
      if (err?.resendInSeconds) setSecondsLeft(err.resendInSeconds);
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/50">
        <EnvelopeOpenIcon className="h-7 w-7 text-primary-600" />
      </div>
      <h3 className="mt-4 text-center text-2xl font-black text-stone-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-center text-sm font-medium text-stone-500 dark:text-stone-400">
        {description || <>We sent a 6-digit code to <strong className="text-stone-800 dark:text-stone-200">{maskedEmail}</strong>. It expires in 10 minutes.</>}
      </p>

      {hint && (
        <p className="mx-auto mt-3 max-w-xs rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Test mode: your code is {hint}
        </p>
      )}

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
      >
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={verify} invalid={Boolean(error)} disabled={verifying} />

        {error && <p role="alert" className="mt-3 text-center text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}

        {children}

        <button type="submit" disabled={code.length < 6 || verifying} className="btn-primary mt-6 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          {verifying ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ShieldCheckIcon className="h-5 w-5" />}
          {verifying ? 'Verifying…' : verifyLabel}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm font-semibold">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">← Back</button>
        ) : <span />}
        {secondsLeft > 0 ? (
          <span className="text-stone-400">Resend code in 0:{String(secondsLeft).padStart(2, '0')}</span>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="font-bold text-primary-600 hover:text-primary-700 disabled:opacity-60 dark:text-primary-400">
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-[11px] font-medium text-stone-400">Didn't get it? Check your spam folder. Never share this code with anyone.</p>
    </div>
  );
};

export default OtpVerifyPanel;
