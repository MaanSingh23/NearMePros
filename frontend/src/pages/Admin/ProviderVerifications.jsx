import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin`;

function ProviderVerifications() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingProviders();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Admin session expired. Please log in again.');
    return { 'x-auth-token': token };
  };

  const fetchPendingProviders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/pending-providers`, {
        headers: getAuthHeaders()
      });
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
      await axios.patch(`${API_BASE_URL}/verify-provider/${providerId}`, {}, { headers: getAuthHeaders() });
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
      await axios.patch(`${API_BASE_URL}/reject-provider/${providerId}`, { rejectionReason: reason }, { headers: getAuthHeaders() });
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
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6 transition-all hover:bg-emerald-500/20">
                <ShieldCheckIconSolid className="h-4 w-4" /> Security & Trust Protocol
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Provider <span className="text-emerald-400">Verification</span> Center.
              </h1>
              <p className="mt-4 text-stone-400 text-lg font-bold leading-relaxed">
                Review and approve provider documents here. Once approved, providers can begin listing their services on the platform.
              </p>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchPendingProviders}
              disabled={loading}
              className="inline-flex items-center gap-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-8 py-4 text-sm font-black text-white hover:bg-white/10 transition-all disabled:opacity-50 shadow-2xl group"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin text-emerald-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              Sync Dashboard
            </motion.button>
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

          {/* Providers List Container - Added more spacing above */}
          <div className="rounded-[3rem] overflow-hidden bg-white border border-stone-200 shadow-2xl dark:bg-stone-900/50 dark:border-stone-800 mt-8">
            <div className="px-8 py-8 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
               <h2 className="text-2xl font-black text-stone-950 dark:text-white">Verification Queue</h2>
               <div className="px-4 py-2 rounded-full bg-stone-100 text-[10px] font-black uppercase text-stone-500 dark:bg-stone-800">
                 {providers.length} provider{providers.length !== 1 ? 's' : ''} waiting
               </div>
            </div>

            {loading ? (
              <div className="p-20 text-center">
                <ArrowPathIcon className="h-12 w-12 animate-spin mx-auto text-emerald-500 mb-4" />
                <p className="text-stone-400 font-bold tracking-widest uppercase text-xs">Loading Data...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="p-20 text-center bg-stone-50 dark:bg-transparent">
                <CheckBadgeIcon className="h-20 w-20 text-emerald-500/20 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-stone-900 dark:text-white">All Caught Up!</h3>
                <p className="text-stone-500 font-medium font-bold">There are no pending documents to review right now.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-950/30">
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">Provider Name</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">Contact Details</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">ID Status</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {providers.map((provider) => (
                      <motion.tr 
                        key={provider._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-all duration-300"
                      >
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="relative group/avatar">
                                <img src={provider.avatar || `https://ui-avatars.com/api/?name=${provider.name}&background=random`} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-stone-100 dark:ring-stone-800 group-hover/avatar:ring-emerald-500/50 transition-all" />
                                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 border-2 border-white dark:border-stone-900 group-hover/avatar:scale-110 transition-transform" />
                              </div>
                              <div>
                                <p className="font-black text-stone-950 dark:text-white text-lg">{provider.name}</p>
                                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Member</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-sm font-bold text-stone-600 dark:text-stone-300">{provider.email}</p>
                           <p className="text-xs font-medium text-stone-400 mt-1">{provider.phone}</p>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                               <span className={`h-2 w-2 rounded-full ${provider.isVerified ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-amber-500 shadow-lg shadow-amber-500/50'}`} />
                               <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">
                                 {provider.isVerified ? 'Fully Verified' : 'Checking Documents'}
                               </span>
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center justify-end gap-3">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => openDocViewer(provider)}
                                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600 hover:bg-emerald-500 hover:text-white transition-all dark:bg-stone-800 dark:text-stone-400"
                              >
                                <EyeIcon className="h-6 w-6" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleApprove(provider._id)}
                                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                              >
                                {actionLoading === provider._id ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <><CheckCircleIcon className="h-5 w-5" /> Approve</>}
                              </motion.button>
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl rounded-[3rem] bg-white dark:bg-stone-900 overflow-hidden shadow-2xl border border-stone-100 dark:border-stone-800"
            >
              <div className="flex h-[85vh] flex-col md:flex-row">
                
                <div className="flex-1 overflow-y-auto p-10 bg-stone-50 dark:bg-[#0c0a09]">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                       <h2 className="text-3xl font-black text-stone-950 dark:text-white tracking-tight">Manual ID Check</h2>
                       <p className="text-stone-500 font-bold mt-1 uppercase tracking-widest text-[10px]">Reviewing {selectedProvider.name}'s identity documents</p>
                     </div>
                     <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 dark:border-stone-800 dark:hover:bg-stone-800 transition-all">
                       <XCircleIcon className="h-6 w-6 text-stone-400" />
                     </button>
                  </div>

                  <div className="grid gap-10">
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 text-stone-900 dark:text-white font-black uppercase tracking-widest text-xs">
                         <IdentificationIcon className="h-6 w-6 text-emerald-500" /> Government ID (Aadhar)
                       </div>
                       <div className="group relative rounded-[2rem] overflow-hidden border-4 border-white shadow-xl dark:border-stone-800">
                          {selectedProvider.verificationDocs?.identityDocs?.find(d => d.docType === 'aadhar')?.url ? (
                            <img 
                              src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedProvider.verificationDocs.identityDocs.find(d => d.docType === 'aadhar').url}`} 
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
                </div>

                <div className="w-full md:w-[350px] flex flex-col border-l border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
                   <div className="flex-1 overflow-y-auto p-10">
                     <div className="text-center mb-10">
                       <img src={selectedProvider.avatar || `https://ui-avatars.com/api/?name=${selectedProvider.name}`} className="h-24 w-24 rounded-3xl mx-auto object-cover mb-4 ring-4 ring-stone-50 dark:ring-stone-800 shadow-lg" />
                       <h3 className="text-2xl font-black text-stone-950 dark:text-white leading-tight">{selectedProvider.name}</h3>
                       <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">Status: Pending Review</p>
                     </div>

                     <div className="space-y-6">
                        <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/50 p-6 border border-stone-100 dark:border-stone-800">
                          <p className="text-[10px] font-black text-stone-400 uppercase mb-2">Audit Instruction</p>
                          <p className="text-xs font-bold text-stone-600 dark:text-stone-300 leading-relaxed">
                            Verify the authenticity of the uploaded documents to ensure platform security and provider legitimacy.
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                           <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
                           <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Identity Verified on Upload</p>
                        </div>
                     </div>
                   </div>

                   <div className="p-8 bg-stone-50 dark:bg-stone-950/20 border-t border-stone-100 dark:border-stone-800 grid gap-4">
                     <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApprove(selectedProvider._id)}
                        className="w-full py-5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
                     >
                       <CheckCircleIcon className="h-5 w-5" /> Approve Provider
                     </motion.button>
                     <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleReject(selectedProvider._id)}
                        className="w-full py-5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 font-black uppercase tracking-widest text-[11px] hover:bg-rose-100 transition-all flex items-center justify-center gap-3 dark:bg-rose-900/10 dark:border-rose-900/30 dark:text-rose-400"
                     >
                       <XCircleIcon className="h-5 w-5" /> Reject Application
                     </motion.button>
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
