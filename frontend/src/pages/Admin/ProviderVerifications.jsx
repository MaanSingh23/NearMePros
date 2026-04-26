import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  EyeIcon,
  DocumentMagnifyingGlassIcon,
  IdentificationIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon, ShieldCheckIcon as ShieldCheckIconSolid } from '@heroicons/react/24/solid';

function ProviderVerifications() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingProviders();
  }, []);


  const fetchPendingProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/pending-providers');
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Error fetching pending providers:', error);
      toast.error('Failed to load pending providers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (providerId) => {
    setActionLoading(providerId);
    try {
      await api.patch(`/admin/verify-provider/${providerId}`);
      toast.success('Provider verified successfully', { icon: '✅' });
      setIsModalOpen(false);
      await fetchPendingProviders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify provider');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (providerId) => {
    const reason = window.prompt('Reason for rejection:') || 'Documents unclear or invalid.';
    setActionLoading(providerId);
    try {
      await api.patch(`/admin/reject-provider/${providerId}`, { rejectionReason: reason });
      toast.success('Provider rejected successfully', { icon: '❌' });
      setIsModalOpen(false);
      await fetchPendingProviders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject provider');
    } finally {
      setActionLoading(null);
    }
  };

  const openDocViewer = (provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] transition-colors duration-300">
      {/* Back Navigation Bar */}
      <div className="section-shell pt-10 pb-4 relative z-[60]">
        <Link 
          to="/admin/dashboard"
          className="group inline-flex items-center gap-3 text-emerald-500 hover:text-emerald-400 transition-all font-black uppercase tracking-widest text-[10px]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all shadow-lg shadow-emerald-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </span>
          Back to Dashboard
        </Link>
      </div>

      {/* High-Aesthetic Header (Matched to Home Hero Style) */}
      <div className="section-shell pt-24 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-[#0c0a09] rounded-[3rem] px-10 py-16 overflow-hidden shadow-2xl border border-white/5"
        >
          {/* Background Glows */}
          <div className="absolute top-0 right-0 h-[30rem] w-[30rem] translate-x-1/3 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary-800/10 blur-[80px] pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">
                <ShieldCheckIconSolid className="h-4 w-4" /> Trust Governance
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-none text-white">
                Identity <span className="text-emerald-400">Audits.</span>
              </h1>
              <p className="mt-4 text-stone-400 text-sm sm:text-base font-bold max-w-xl">
                Manual verification of professional credentials to maintain platform integrity.
              </p>
            </div>
            <button
              onClick={fetchPendingProviders}
              className="group flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
              Sync Queue
            </button>
          </div>
        </motion.div>
      </div>

      <div className="section-shell mt-24 relative z-20 pb-32">
        <div className="grid gap-16">
          
          {/* Enhanced Spacing Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div 
              whileHover={{ y: -10 }}
              className="rounded-[2.5rem] bg-white border border-stone-200 p-10 shadow-2xl dark:bg-stone-900/50 dark:border-stone-800 dark:backdrop-blur-xl transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 dark:bg-amber-900/30">
                  <ClockIcon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1">Waiting for Approval</p>
                  <p className="text-4xl font-black text-stone-900 dark:text-white">{providers.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="rounded-[2.5rem] bg-emerald-500 p-10 text-stone-950 shadow-[0_20px_50px_rgba(16,185,129,0.3)]"
            >
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-400/20">
                  <ShieldCheckIcon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-950/60 uppercase tracking-widest mb-1">System Status</p>
                  <p className="text-4xl font-black italic uppercase tracking-tighter leading-none">Live & Online</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="rounded-[2.5rem] bg-stone-900 border border-stone-800 p-10 shadow-2xl dark:backdrop-blur-xl transition-all"
            >
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-stone-800 flex items-center justify-center text-stone-400">
                  <DocumentMagnifyingGlassIcon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-1">Review Mode</p>
                  <p className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Team Audit</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Providers List Container */}
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            {providers.map((provider) => (
              <motion.div
                key={provider._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-white/5 bg-white/5 p-6 sm:p-8 backdrop-blur-3xl hover:bg-white/[0.08] transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-6 relative z-10">
                  <div className="flex items-center sm:items-start gap-4 sm:gap-6">
                    <img
                      src={provider.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${provider.name}`}
                      alt={provider.name}
                      className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl border-2 border-white/10 bg-white/5 object-cover"
                    />
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">{provider.name}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest mt-1">Pending Approval</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                          Provider
                        </span>
                        <span className="inline-flex rounded-full bg-stone-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-stone-400">
                          {provider.location?.city || 'Ludhiana'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openDocViewer(provider)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-stone-950 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                  >
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                    Review Docs
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <AnimatePresence>
        {isModalOpen && selectedProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-[3.5rem] border border-white/10 bg-stone-950 p-6 sm:p-12 shadow-2xl backdrop-blur-2xl"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 sm:right-10 sm:top-10 h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-white/5 text-stone-400 hover:text-white transition-all"
              >
                <XCircleIcon className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 sm:mb-12">
                <img
                  src={selectedProvider.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${selectedProvider.name}`}
                  alt={selectedProvider.name}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl border-2 border-emerald-500/20 object-cover shadow-2xl"
                />
                <div>
                  <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">{selectedProvider.name}</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-widest mt-2">Audit Session ID: {selectedProvider._id.slice(-8)}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
                <div className="space-y-8 sm:space-y-12">
                  <div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-6 sm:mb-8">Identity Documents</h4>
                     <div className="group relative rounded-2xl sm:rounded-[2rem] overflow-hidden border-4 border-white shadow-xl dark:border-stone-800">
                        {selectedProvider.verificationDocs?.identityDocs?.find(d => d.docType === 'aadhar')?.url ? (
                          <img 
                            src={selectedProvider.verificationDocs.identityDocs.find(d => d.docType === 'aadhar').url.startsWith('http') 
                              ? selectedProvider.verificationDocs.identityDocs.find(d => d.docType === 'aadhar').url 
                              : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedProvider.verificationDocs.identityDocs.find(d => d.docType === 'aadhar').url}`} 
                            className="w-full h-auto min-h-[250px] object-cover" 
                            alt="Aadhar Card" 
                          />
                        ) : (
                          <div className="h-64 flex flex-col items-center justify-center bg-stone-200/50 dark:bg-stone-800/50">
                             <DocumentMagnifyingGlassIcon className="h-12 w-12 text-stone-300 mb-2" />
                             <p className="text-xs font-black text-stone-400 uppercase">Aadhar missing</p>
                          </div>
                        )}
                     </div>
                  </div>
                </div>

                <div className="space-y-8 sm:space-y-12">
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-6 sm:mb-8">Verification Verdict</h4>
                      <div className="rounded-2xl sm:rounded-[2rem] bg-white/5 p-6 sm:p-8 border border-white/5">
                        <p className="text-sm sm:text-base font-bold text-stone-400 mb-8 sm:mb-10 leading-relaxed italic">
                          "I have manually reviewed the identity documents provided. The Aadhar Card photo matches the profile, and the credentials appear valid for professional service listing."
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                          <button
                            onClick={() => handleApprove(selectedProvider._id)}
                            disabled={actionLoading === selectedProvider._id}
                            className="flex-1 rounded-xl sm:rounded-2xl bg-emerald-500 px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-black uppercase tracking-widest text-stone-950 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            {actionLoading === selectedProvider._id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckCircleIcon className="h-5 w-5" />}
                            Grant Access
                          </button>
                          <button
                            onClick={() => handleReject(selectedProvider._id)}
                            disabled={actionLoading === selectedProvider._id}
                            className="flex-1 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                          >
                            <XCircleIcon className="h-5 w-5" />
                            Decline
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProviderVerifications;
