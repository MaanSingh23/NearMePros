import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'user',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { location: userLocation } = useLocation();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        location: userLocation ? {
          type: 'Point',
          coordinates: [userLocation.lng, userLocation.lat],
          address: formData.address || 'Address not provided'
        } : null
      };

      const success = await register(userData);
      if (success) {
        navigate('/');
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex text-stone-900 dark:text-white bg-stone-50 dark:bg-[#0c0a09] overflow-hidden pt-20">
      {/* Right side Visual (Swapped side for variety) */}
      <div className="hidden lg:flex relative w-0 flex-1 overflow-hidden h-full">
        <img
          src="/salon-signup.png"
          alt="Woman hairstylist washing client hair at a modern salon"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {/* Emerald-tinted overlay for brand consistency */}
        <div className="absolute inset-0 bg-primary-900/30 mix-blend-multiply" />
        {/* Bottom gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
             <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-300 mb-5">
               <CheckCircleIcon className="h-4 w-4" /> Join Us Today
             </div>
             <h3 className="text-3xl font-black leading-tight">Join a network of<br/>verified professionals.</h3>
             <ul className="mt-6 space-y-3 font-semibold text-stone-200">
               <li className="flex items-center gap-3"><CheckCircleIcon className="h-5 w-5 text-primary-400 shrink-0" /> Hassle-free booking setup</li>
               <li className="flex items-center gap-3"><CheckCircleIcon className="h-5 w-5 text-primary-400 shrink-0" /> Grow your customer base</li>
               <li className="flex items-center gap-3"><CheckCircleIcon className="h-5 w-5 text-primary-400 shrink-0" /> Real-time provider analytics</li>
             </ul>
           </motion.div>
        </div>
      </div>

      {/* Left side Form */}
      <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 py-12 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 scrollbar-hide h-full">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div>
              <h2 className="text-4xl font-black tracking-tight">Create Account</h2>
              <p className="mt-2 text-stone-500 font-medium">Join Nearify today to explore or offer services.</p>
            </div>
            
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              
              <div className="grid grid-cols-2 gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'user' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                    formData.role === 'user'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:bg-stone-900'
                  }`}
                >
                  <UserIcon className={`h-6 w-6 mb-2 ${formData.role === 'user' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                  <span className="text-sm font-bold">Find Services</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'provider' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                    formData.role === 'provider'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:hover:border-stone-700 dark:hover:bg-stone-900'
                  }`}
                >
                  <BriefcaseIcon className={`h-6 w-6 mb-2 ${formData.role === 'provider' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                  <span className="text-sm font-bold">Provide Services</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Full Name</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <input name="name" type="text" required value={formData.name} onChange={handleChange} className="input-field pl-10" placeholder="John Doe" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Email Address</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <input name="email" type="email" required value={formData.email} onChange={handleChange} className="input-field pl-10" placeholder="name@company.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Phone</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PhoneIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} className="input-field pl-10" placeholder="+1 123 456 7890" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Address (Optional)</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPinIcon className="h-5 w-5 text-stone-400" />
                  </div>
                  <input name="address" type="text" value={formData.address} onChange={handleChange} className="input-field pl-10" placeholder="Your street address" />
                </div>
                {userLocation && (
                  <p className="mt-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" /> Nearby location detected
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Password</label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-stone-400" />
                    </div>
                    <input name="password" type="password" required value={formData.password} onChange={handleChange} className="input-field pl-10" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300">Confirm</label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-stone-400" />
                    </div>
                    <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full text-center mt-8">
                {loading ? 'Setting up account...' : 'Create Account'}
              </button>

              <div className="text-center mt-6">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-black text-stone-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                    Sign in
                  </Link>
                </p>
              </div>

            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Register;