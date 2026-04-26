import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  IdentificationIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  InformationCircleIcon,
  CheckBadgeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckIconSolid } from '@heroicons/react/24/solid';


function Verification() {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState({
    isVerified: false,
    verificationStatus: 'pending',
    hasAadharDoc: false
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await api.get('/verification/status');
      setVerificationStatus(response.data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleDocumentUpload = async (type, file) => {
    if (!file) return;
    
    setUploading(true);
    const loadingToast = toast.loading(`Uploading Aadhar...`);
    
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await api.post('/verification/verify-aadhar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        toast.success(response.data.message, { duration: 6000 });
        fetchVerificationStatus();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const VerificationStep = ({ title, status, hasDoc, icon: Icon, onUpload, description }) => {
    const isPending = hasDoc && !status;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-stone-200 bg-white p-8 shadow-xl dark:border-stone-800 dark:bg-stone-900/50"
      >
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className={`flex h-16 w-16 items-center justify-center rounded-3xl ${
              status ? 'bg-emerald-100 text-emerald-600' : 
              isPending ? 'bg-amber-100 text-amber-600' :
              'bg-stone-100 text-stone-400'
            }`}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900 dark:text-white">{title}</h3>
              <p className={`mt-1 text-sm font-bold ${
                status ? 'text-emerald-500' : 
                isPending ? 'text-amber-500' : 
                'text-stone-500'
              }`}>
                {status ? 'Document Approved' : isPending ? 'Waiting for Team' : description}
              </p>
            </div>
          </div>
          {status && <CheckCircleIcon className="h-10 w-10 text-emerald-500" />}
          {isPending && <ClockIcon className="h-10 w-10 text-amber-500 animate-pulse" />}
        </div>

        {!status && !isPending && (
          <div className="mt-8">
            <label className="group relative block cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files[0])} disabled={uploading} />
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-200 py-10 transition-all hover:border-emerald-500 hover:bg-emerald-50/10 dark:border-stone-800">
                <CameraIcon className="h-10 w-10 text-stone-400 group-hover:text-emerald-500" />
                <p className="mt-4 text-sm font-black text-stone-700 dark:text-stone-300 uppercase tracking-tighter">Click to upload photo</p>
              </div>
            </label>
          </div>
        )}

        {isPending && (
          <div className="mt-6 rounded-2xl bg-amber-50 p-6 dark:bg-amber-900/10">
             <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2">Team Status</p>
             <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed italic">
               "We have received your documents! Our team is checking them now. You can add your services as soon as we approve your ID."
             </p>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09]">
      {/* Back Navigation */}
      <div className="absolute top-8 left-8 z-[100]">
        <button 
          onClick={() => window.history.back()}
          className="group flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-all font-black uppercase tracking-widest text-[10px]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-white/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-all backdrop-blur-xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </span>
          Back
        </button>
      </div>

      <section className="bg-[#0c0a09] pt-24 pb-20 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 bg-emerald-500/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/2" />
        <div className="section-shell relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-2 text-xs font-black text-emerald-400 uppercase tracking-widest">
            <ShieldCheckIconSolid className="h-5 w-5" /> Account Verification
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl mb-6">Become a <span className="text-emerald-400">Verified Pro.</span></h1>
          <p className="mx-auto max-w-2xl text-lg text-stone-400 font-bold">Upload your identity documents to start selling services. Our team manually checks every provider to keep the platform safe.</p>
        </div>
      </section>

      <div className="section-shell mt-32 mb-40 relative z-20">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-20">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="rounded-[3rem] bg-white p-8 shadow-2xl dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className={`h-14 w-14 flex items-center justify-center rounded-2xl ${verificationStatus.isVerified ? 'bg-emerald-500' : 'bg-amber-500'} text-white`}>
                     <ShieldCheckIcon className="h-8 w-8" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-stone-900 dark:text-white">Profile Status</h2>
                     <p className="text-sm font-bold text-stone-500">Manual ID Checking</p>
                   </div>
                 </div>
                 <div className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest ${verificationStatus.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                   {verificationStatus.isVerified ? 'Verified Provider' : 'Waiting for Review'}
                 </div>
               </div>
            </motion.div>

            <div className="grid gap-10 sm:grid-cols-1 max-w-xl">
              <VerificationStep title="Aadhar ID" status={verificationStatus.isVerified} hasDoc={verificationStatus.hasAadharDoc} icon={IdentificationIcon} description="Upload your Aadhar Card" onUpload={(f) => handleDocumentUpload('aadhar', f)} />
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-950 p-10 text-white shadow-2xl">
               {/* Premium Glow effect */}
               <div className="absolute top-0 right-0 h-[20rem] w-[20rem] translate-x-1/3 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-[80px]" />
               <div className="absolute bottom-0 left-0 h-[15rem] w-[15rem] -translate-x-1/3 translate-y-1/3 rounded-full bg-amber-500/10 blur-[60px]" />

               <div className="relative z-10">
                 <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-400 backdrop-blur mb-8">
                   <ShieldCheckIcon className="h-4 w-4" />
                   Process Protocol
                 </span>
                 
                 <h3 className="text-3xl font-black mb-10 tracking-tight">How It Works</h3>
                 
                 <div className="grid gap-12 sm:grid-cols-2">
                    <div className="space-y-8">
                       <div className="group">
                         <p className="font-black text-emerald-500 uppercase text-[10px] tracking-widest mb-1 group-hover:translate-x-1 transition-transform inline-block">Step 01</p>
                         <p className="font-black text-xl text-white">Upload Identity</p>
                         <p className="text-stone-400 text-sm font-bold mt-2 leading-relaxed">Upload clear photo of your Aadhar card document for vetting.</p>
                       </div>
                       <div className="group">
                         <p className="font-black text-emerald-500 uppercase text-[10px] tracking-widest mb-1 group-hover:translate-x-1 transition-transform inline-block">Step 02</p>
                         <p className="font-black text-xl text-white">Team Review</p>
                         <p className="text-stone-400 text-sm font-bold mt-2 leading-relaxed">Our executive moderation team will check your identity manually.</p>
                       </div>
                    </div>
                    <div className="space-y-8">
                       <div className="group">
                         <p className="font-black text-emerald-500 uppercase text-[10px] tracking-widest mb-1 group-hover:translate-x-1 transition-transform inline-block">Step 03</p>
                         <p className="font-black text-xl text-white">Get Approved</p>
                         <p className="text-stone-400 text-sm font-bold mt-2 leading-relaxed">Once verified, your profile earns a "Trust-Badge" for customer visibility.</p>
                       </div>
                       <div className="group">
                         <p className="font-black text-emerald-500 uppercase text-[10px] tracking-widest mb-1 group-hover:translate-x-1 transition-transform inline-block">Step 04</p>
                         <p className="font-black text-xl text-white">Start Selling</p>
                         <p className="text-stone-400 text-sm font-bold mt-2 leading-relaxed">Instantly list your professional services and begin receiving bookings.</p>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          <div className="space-y-20">
            <div className="rounded-[2.5rem] bg-emerald-500 p-10 text-stone-950 shadow-xl shadow-emerald-500/20">
               <CheckBadgeIcon className="h-12 w-12 mb-4" />
               <h3 className="text-2xl font-black leading-tight">Verified Trust Badge</h3>
               <p className="mt-4 font-bold opacity-80">Only verified professionals can list services. This helps us build a safe community for our customers.</p>
            </div>
            <div className="rounded-[2.5rem] bg-white p-8 dark:bg-stone-900 border border-stone-100 dark:border-stone-800">
               <p className="font-black text-stone-950 dark:text-white uppercase text-xs tracking-widest mb-4">Support</p>
               <p className="text-sm font-bold text-stone-500 leading-relaxed">If you have any issues uploading, please contact support. Review usually takes 24 hours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Verification;