import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PhotoIcon,
  XCircleIcon,
  CurrencyRupeeIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  BriefcaseIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

function AddService() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Salon for Women',
    description: '',
    price: '',
    priceType: 'hourly'
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired. Please log in.');
      navigate('/login');
      return;
    }
    checkProviderStatus(token);
  }, []);

  const checkProviderStatus = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/verification/status`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.data.isVerified) {
        setVerificationStatus('approved');
      } else {
        setVerificationStatus(response.data.verificationStatus || 'pending');
      }
    } catch (error) {
       console.error('Verification check failed:', error);
       toast.error('Failed to sync security status.');
    } finally {
      // Ensure we always stop the loading state
      setIsCheckingStatus(false);
    }
  };

  const categories = [
    'Salon for Women', 'Salon for Men', 'Home deep cleaning', 'Appliance Repair',
    'Electrician & Plumbing', 'AC Repair', 'Pest Control', 'House Painting'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (verificationStatus !== 'approved') {
      toast.error('Security audit must be complete to list services.');
      return;
    }
    if (!formData.name || !formData.price || !formData.description) {
      toast.error('Please fill all mandatory fields.');
      return;
    }
    setLoading(true);

    try {
      const serviceFormData = new FormData();
      Object.keys(formData).forEach(key => serviceFormData.append(key, formData[key]));
      images.forEach(image => serviceFormData.append('images', image));

      await axios.post(`${API_BASE_URL}/services`, serviceFormData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Professional service is now live!');
      navigate('/provider/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to list service');
    } finally {
      setLoading(false);
    }
  };

  // 1. Initial State: Background Check
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center">
        <ArrowPathIcon className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">Synchronizing Security Status</p>
      </div>
    );
  }

  // 2. Gated State: Document Verification Required
  if (verificationStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center p-6 bg-gradient-to-br from-stone-950 via-[#0c0a09] to-stone-950">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl w-full bg-stone-900 border border-stone-800 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          <div className="h-20 w-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <LockClosedIcon className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Identity Audit Required.</h2>
          <p className="text-stone-400 font-bold leading-relaxed mb-10">To maintain Nearify's quality standards, all professionals must pass a manual document audit before launching services.</p>
          <div className="flex flex-col sm:flex-row gap-4">
             <Link to="/verification" className="flex-1 bg-emerald-500 text-stone-950 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">Protocol Center <ArrowRightIcon className="h-4 w-4" /></Link>
             <Link to="/provider/dashboard" className="flex-1 bg-stone-800 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-stone-700 transition-all">Go Back</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Main State: Professional Builder
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] pt-24 pb-32 transition-colors duration-500">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-emerald-500/5 blur-[120px] rounded-full -mr-[300px] -mt-[200px] pointer-events-none" />
      
      <div className="section-shell relative z-10">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="text-center md:text-left">
              <Link to="/provider/dashboard" className="group inline-flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-[10px] mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </span>
                Esc Dashboard
              </Link>
              <h1 className="text-4xl md:text-6xl font-black text-stone-950 dark:text-white tracking-tighter">Business <span className="text-emerald-500">Launch.</span></h1>
              <p className="text-stone-500 font-bold mt-2 dark:text-stone-400">Add a high-performance professional service to your inventory.</p>
           </div>
           
           <div className="hidden lg:flex items-center gap-3 rounded-2xl bg-white/5 border border-stone-200 dark:border-stone-800 p-4 px-6 backdrop-blur-sm">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-stone-400">Account Access</p>
                <p className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tighter">Trusted Verified Pro</p>
              </div>
           </div>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-16 items-start">
          {/* Main Form Area */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <form onSubmit={handleSubmit} className="space-y-10">
              
              {/* Basic Intel Card */}
              <div className="rounded-[2.5rem] bg-white border border-stone-200 p-10 dark:bg-stone-900/40 dark:border-stone-800 shadow-2xl">
                 <div className="flex items-center gap-3 mb-8">
                    <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-stone-950 dark:bg-white text-white dark:text-stone-950 shadow-lg">
                       <InformationCircleIcon className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-black text-stone-950 dark:text-white uppercase tracking-tighter">Basic Intelligence</h2>
                 </div>
                 
                 <div className="grid gap-8">
                    <div className="space-y-3">
                       <label className="text-xs font-black text-stone-400 uppercase tracking-widest pl-2">Service Title</label>
                       <input
                         type="text"
                         name="name"
                         value={formData.name}
                         onChange={handleChange}
                         required
                         className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black text-xl dark:text-white"
                         placeholder="e.g., Luxury Spa & Massage Session"
                       />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-xs font-black text-stone-400 uppercase tracking-widest pl-2">Category Sector</label>
                         <div className="relative">
                           <select
                             name="category"
                             value={formData.category}
                             onChange={handleChange}
                             className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-black dark:text-white appearance-none"
                           >
                             {categories.map(cat => <option key={cat} value={cat} className="bg-stone-900">{cat}</option>)}
                           </select>
                           <AdjustmentsHorizontalIcon className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-xs font-black text-stone-400 uppercase tracking-widest pl-2">Base Pricing (₹)</label>
                         <div className="relative">
                           <CurrencyRupeeIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
                           <input
                             type="number"
                             name="price"
                             value={formData.price}
                             onChange={handleChange}
                             required
                             className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl pl-16 pr-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-black text-xl dark:text-white"
                             placeholder="500"
                           />
                         </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Narrative Card */}
              <div className="rounded-[2.5rem] bg-white border border-stone-200 p-10 dark:bg-stone-900/40 dark:border-stone-800 shadow-2xl">
                 <div className="flex items-center gap-3 mb-8">
                    <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-stone-950 dark:bg-white text-white dark:text-stone-950 shadow-lg">
                       <BriefcaseIcon className="h-6 w-6" />
                    </span>
                    <h2 className="text-xl font-black text-stone-950 dark:text-white uppercase tracking-tighter">Professional Narrative</h2>
                 </div>
                 <textarea
                   name="description"
                   value={formData.description}
                   onChange={handleChange}
                   required
                   rows="6"
                   className="w-full bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800/50 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 outline-none font-bold dark:text-white resize-none leading-relaxed"
                   placeholder="Outline your expertise, toolset, and unique service offering..."
                 />
              </div>

              {/* Portfolio Deep Card */}
              <div className="rounded-[3rem] bg-stone-950 p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 blur-[60px] rounded-full" />
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/10 text-emerald-400">
                          <PhotoIcon className="h-5 w-5" />
                        </span>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Media Portfolio</h2>
                      </div>
                      <span className="text-[10px] font-black uppercase text-stone-500 tracking-widest">{images.length}/5 UPLOADED</span>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group rounded-2xl overflow-hidden aspect-square border-2 border-white/5">
                          <img src={URL.createObjectURL(image)} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                          <button type="button" onClick={() => removeImage(index)} className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <XCircleIcon className="h-7 w-7 text-white" />
                          </button>
                        </div>
                      ))}
                      {images.length < 5 && (
                        <label className="relative flex flex-col items-center justify-center rounded-2xl aspect-square border-2 border-dashed border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group">
                           <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                           <PhotoIcon className="h-6 w-6 text-stone-600 group-hover:text-emerald-500 transition-colors" />
                           <span className="text-[8px] font-black uppercase text-stone-600 tracking-widest mt-2">Add Gallery</span>
                        </label>
                      )}
                   </div>
                </div>
              </div>

              {/* Action Suite */}
              <div className="flex flex-col sm:flex-row gap-5 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-500 text-stone-950 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 focus:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? 'Processing Mission...' : <><SparklesIcon className="h-5 w-5" /> Launch Live Service</>}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/provider/dashboard')}
                  className="px-12 py-5 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-black uppercase tracking-widest text-xs hover:bg-stone-200 transition-all"
                >
                  Discard
                </button>
              </div>
            </form>
          </motion.div>

          {/* Real-time Preview Engine */}
          <div className="sticky top-28 space-y-8 hidden lg:block">
             <div className="flex items-center gap-3 pl-4">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-stone-500">Live View System</h3>
             </div>
             
             <div className="rounded-[3rem] overflow-hidden bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 shadow-2xl">
                <div className="relative h-64 bg-stone-100 dark:bg-stone-800 flex items-center justify-center group overflow-hidden">
                   {images.length > 0 ? (
                     <img src={URL.createObjectURL(images[0])} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                   ) : (
                     <div className="text-center p-8 opacity-30">
                       <PhotoIcon className="h-16 w-16 mx-auto" />
                       <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Main Imagery</p>
                     </div>
                   )}
                   <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-stone-950/80 backdrop-blur-md border border-white/10 text-[10px] font-black text-white tracking-widest uppercase">
                      {formData.category}
                   </div>
                </div>
                
                <div className="p-10">
                   <h4 className="text-3xl font-black text-stone-900 dark:text-white truncate tracking-tighter">
                      {formData.name || 'Untitled Service'}
                   </h4>
                   <div className="flex items-center gap-1 mt-3 text-amber-500">
                      {[1,2,3,4,5].map(i => <StarIcon key={i} className="h-3.5 w-3.5" />)}
                      <span className="text-[10px] font-black text-stone-400 ml-2 uppercase tracking-widest">5.0 (0 Reviews)</span>
                   </div>
                   
                   <p className="mt-8 text-stone-500 font-medium dark:text-stone-400 line-clamp-3 leading-relaxed text-sm">
                      {formData.description || 'Your professional description will appear here. Focus on quality, inclusions, and what makes your service elite.'}
                   </p>
                   
                   <div className="mt-10 pt-10 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Base Investment</p>
                        <p className="text-3xl font-black text-stone-950 dark:text-white tracking-tighter">₹{formData.price || '0'}</p>
                      </div>
                      <div className="h-14 w-14 rounded-[1.25rem] bg-emerald-500 text-stone-950 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                         <ArrowRightIcon className="h-6 w-6" />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 p-8">
                <div className="flex items-center gap-3 mb-3">
                   <SparklesIcon className="h-5 w-5 text-emerald-500" />
                   <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Pro Strategy</p>
                </div>
                <p className="text-sm font-bold text-stone-600 dark:text-stone-300 leading-relaxed italic">
                  "Detailed narratives and multi-image portfolios increase customer trust by 65%. Be thorough to sell faster."
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddService;
