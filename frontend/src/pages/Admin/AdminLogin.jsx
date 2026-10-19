import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, authRequest } from '../../context/AuthContext';
import OtpVerifyPanel from '../../components/otp/OtpVerifyPanel';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function AdminLogin() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, verifyLoginOtp } = useAuth();
  const [mfa, setMfa] = useState(null);

  const afterLogin = (loggedInUser) => {
    if (loggedInUser?.role === 'admin') {
      navigate('/admin/dashboard');
    } else if (loggedInUser) {
      toast.error('Access denied. Admin only.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await login(credentials.email, credentials.password);
      if (result?.otpRequired) setMfa(result);
      else afterLogin(result);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-stone-50 dark:bg-[#0c0a09] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] shadow-2xl p-10 relative z-10"
      >
        <div>
          <div className="flex justify-center">
            <div className="bg-primary-100 dark:bg-primary-900/40 p-4 rounded-[1.5rem] ring-4 ring-primary-50 dark:ring-primary-900/10">
              <ShieldCheckIcon className="h-10 w-10 text-primary-600 dark:text-primary-500" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-4xl font-black text-stone-900 dark:text-white tracking-tight">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm font-bold text-stone-500 dark:text-stone-400">
            Secure access for administrators only
          </p>
        </div>
        
        {mfa ? (
          <OtpVerifyPanel
            title="2-step verification"
            maskedEmail={mfa.maskedEmail}
            devCode={mfa.devCode}
            onVerify={async (code) => afterLogin(await verifyLoginOtp(mfa.mfaToken, code))}
            onResend={() => authRequest('/auth/login/resend', { mfaToken: mfa.mfaToken })}
            verifyLabel="Verify & sign in"
            onBack={() => setMfa(null)}
          />
        ) : (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-stone-700 dark:text-stone-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field mt-1.5"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-stone-700 dark:text-stone-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field mt-1.5"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </div>
        </form>
        )}
      </motion.div>
    </div>
  );
}

export default AdminLogin;
