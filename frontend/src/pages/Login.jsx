import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, authRequest } from '../context/AuthContext';
import api from '../utils/api';
import OtpVerifyPanel from '../components/otp/OtpVerifyPanel';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, CheckCircleIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

function Login() {
  const [mode, setMode] = useState('password'); // 'password' | 'code'
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [challenge, setChallenge] = useState(null); // { maskedEmail, mfaToken?, devCode? }
  const { login, verifyLoginOtp, loginWithOtp } = useAuth();
  const [emailLoginAvailable, setEmailLoginAvailable] = useState(true);

  useEffect(() => {
    api.get('/auth/config', { silent: true })
      .then(({ data }) => setEmailLoginAvailable(data.emailLoginAvailable !== false))
      .catch(() => {});
  }, []);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const switchMode = (next) => {
    setMode(next);
    setStep('form');
    setError(null);
    setChallenge(null);
  };

  const done = () => navigate('/');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'password') {
        const result = await login(formData.email, formData.password);
        if (result?.otpRequired) {
          setChallenge(result);
          setStep('verify');
        } else if (result) {
          done();
        }
      } else {
        const result = await authRequest('/auth/otp/send', { email: formData.email, purpose: 'login' });
        setChallenge(result);
        setStep('verify');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code) => {
    if (mode === 'password') await verifyLoginOtp(challenge.mfaToken, code);
    else await loginWithOtp(formData.email, code);
    done();
  };

  const resend = () =>
    mode === 'password'
      ? authRequest('/auth/login/resend', { mfaToken: challenge.mfaToken })
      : authRequest('/auth/otp/send', { email: formData.email, purpose: 'login' });

  return (
    <div className="h-screen flex text-stone-900 dark:text-white bg-stone-50 dark:bg-[#0c0a09] overflow-hidden pt-20">
      {/* Left side Form */}
      <div className="flex-1 flex flex-col justify-center overflow-y-auto px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 h-full">
        <div className="w-full max-w-sm mx-auto lg:w-96 py-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            {step === 'verify' && challenge ? (
              <OtpVerifyPanel
                title={mode === 'password' ? '2-step verification' : 'Enter your login code'}
                maskedEmail={challenge.maskedEmail}
                devCode={challenge.devCode}
                initialResendSeconds={challenge.resendInSeconds || 60}
                onVerify={verify}
                onResend={resend}
                verifyLabel="Verify & sign in"
                onBack={() => setStep('form')}
              />
            ) : (
            <>
            <div>
              <h2 className="text-4xl font-black tracking-tight mt-6">Welcome Back</h2>
              <p className="mt-2 text-stone-500 font-medium">Log in to manage your bookings and services.</p>
            </div>

            {/* Login method */}
            {emailLoginAvailable && (
            <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1 dark:bg-stone-900" role="tablist">
              {[['password', 'Password', LockClosedIcon], ['code', 'Email code', KeyIcon]].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => switchMode(value)}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${mode === value ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-white' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Email Address</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {mode === 'password' ? (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Password</label>
                    <Link to="/forgot-password" className="font-bold text-sm text-primary-600 hover:text-primary-500 dark:text-primary-500 dark:hover:text-primary-400">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-stone-400" />
                    </div>
                    <input
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-800 dark:bg-primary-950/40 dark:text-primary-300">
                  No password needed - we will email you a one-time 6-digit code.
                </p>
              )}

              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full text-center mt-2">
                {loading ? (mode === 'password' ? 'Signing in...' : 'Sending code...') : (mode === 'password' ? 'Sign In' : 'Send login code')}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-400">
                <ShieldCheckIcon className="h-4 w-4" /> Protected by email verification
              </p>

              <div className="text-center">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  New to Near Me Pros?{' '}
                  <Link to="/register" className="font-black text-stone-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                    Create an account
                  </Link>
                </p>
              </div>
            </form>
            </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right side Visual */}
      <div className="hidden lg:flex relative w-0 flex-1 overflow-hidden">
        <img
          src="/login-technicians.png"
          alt="Professional service technicians with tools"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {/* Emerald-tinted overlay for brand consistency */}
        <div className="absolute inset-0 bg-primary-900/30 mix-blend-multiply" />
        {/* Bottom gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
             <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-300 mb-5">
               <CheckCircleIcon className="h-4 w-4" /> Trusted Platform
             </div>
             <h3 className="text-3xl font-black leading-tight">Trust the best<br/>professionals in town.</h3>
             <ul className="mt-6 space-y-3 font-semibold text-stone-200">
               <li className="flex items-center gap-3"><CheckCircleIcon className="h-5 w-5 text-primary-400 shrink-0" /> Vetted local talent</li>
               <li className="flex items-center gap-3"><CheckCircleIcon className="h-5 w-5 text-primary-400 shrink-0" /> Transparent pricing &amp; reviews</li>
               <li className="flex items-center gap-3"><CheckCircleIcon className="h-5 w-5 text-primary-400 shrink-0" /> Track jobs in real-time</li>
             </ul>
           </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Login;