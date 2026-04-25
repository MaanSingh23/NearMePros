import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        navigate('/');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex text-stone-900 dark:text-white bg-stone-50 dark:bg-[#0c0a09] overflow-hidden pt-20">
      {/* Left side Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 h-full">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div>
              <h2 className="text-4xl font-black tracking-tight mt-6">Welcome Back</h2>
              <p className="mt-2 text-stone-500 font-medium">Log in to manage your bookings and services.</p>
            </div>
            
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Password</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-stone-300 text-primary-600 focus:ring-primary-600 dark:border-stone-700 dark:bg-stone-900" />
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Remember me</span>
                </label>
                <a href="#" className="font-bold text-sm text-primary-600 hover:text-primary-500 dark:text-primary-500 dark:hover:text-primary-400">
                  Forgot password?
                </a>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full text-center mt-6">
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="text-center mt-6">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  New to Near Me Pros?{' '}
                  <Link to="/register" className="font-black text-stone-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                    Create an account
                  </Link>
                </p>
              </div>

            </form>
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