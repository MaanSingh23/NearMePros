import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  TrashIcon,
  UserGroupIcon,
  PowerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

function ManageProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchProviders();
  }, []);


  const fetchProviders = async () => {
    setLoading(true);

    try {
      const response = await api.get('/admin/providers');

      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (provider) => {
    const actionKey = `toggle-${provider._id}`;
    setActionLoading(actionKey);

    try {
      const response = await api.patch(
        `/admin/provider/${provider._id}/toggle-status`,
        { isActive: !provider.isActive }
      );

      toast.success(response.data.message || 'Provider status updated');
      await fetchProviders();
    } catch (error) {
      console.error('Error updating provider status:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update provider');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (provider) => {
    const confirmed = window.confirm(`Delete provider "${provider.name}"? This will remove the provider and related records.`);
    if (!confirmed) {
      return;
    }

    const actionKey = `delete-${provider._id}`;
    setActionLoading(actionKey);

    try {
      const response = await api.delete(`/admin/provider/${provider._id}`);

      toast.success(response.data.message || 'Provider deleted successfully');
      await fetchProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to delete provider');
    } finally {
      setActionLoading(null);
    }
  };

  const activeProviders = providers.filter((provider) => provider.isActive !== false).length;
  const inactiveProviders = providers.length - activeProviders;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_45%,#f8fafc_100%)]">
      {/* Back Navigation Bar */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
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
      <div className="border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center justify-between px-4 py-6 sm:px-6 lg:px-8 gap-6">
          <div>
            <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Admin Panel</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">Manage Providers</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">Review provider accounts, activate or deactivate access.</p>
          </div>
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Total Providers</p>
                <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">{providers.length}</p>
              </div>
              <div className="rounded-xl sm:rounded-2xl bg-blue-100 p-2.5 sm:p-3 text-blue-700">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Active Accounts</p>
                <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">{activeProviders}</p>
              </div>
              <div className="rounded-xl sm:rounded-2xl bg-emerald-100 p-2.5 sm:p-3 text-emerald-700">
                <PowerIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500">Verified Pros</p>
                <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
                  {providers.filter((provider) => provider.isVerified).length}
                </p>
              </div>
              <div className="rounded-xl sm:rounded-2xl bg-violet-100 p-2.5 sm:p-3 text-violet-700">
                <ShieldCheckIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 px-4 sm:px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Provider Directory</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Manage provider access and status.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center px-6 py-20">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : providers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserGroupIcon className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">No providers found</h3>
              <p className="mt-2 text-sm text-slate-500">Provider accounts will appear here as soon as they register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Provider</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Contact</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Stats</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {providers.map((provider, index) => {
                    const toggleActionKey = `toggle-${provider._id}`;
                    const deleteActionKey = `delete-${provider._id}`;
                    const isToggling = actionLoading === toggleActionKey;
                    const isDeleting = actionLoading === deleteActionKey;

                    return (
                      <motion.tr
                        key={provider._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="px-4 sm:px-6 py-5">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <img
                              src={provider.avatar || 'https://via.placeholder.com/150'}
                              alt={provider.name}
                              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl object-cover ring-1 ring-slate-200"
                            />
                            <div className="max-w-[120px] sm:max-w-none">
                              <p className="font-semibold text-slate-900 truncate">{provider.name}</p>
                              <p className="text-xs text-slate-500 truncate">{provider.email}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400 whitespace-nowrap">
                                Joined {provider.createdAt ? new Date(provider.createdAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-5 text-xs sm:text-sm text-slate-600">
                          <p className="whitespace-nowrap">{provider.phone}</p>
                          <p className="mt-1 text-slate-500 truncate max-w-[150px]">{provider.location?.city || 'N/A'}</p>
                        </td>

                        <td className="px-4 sm:px-6 py-5 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                          <p>{provider.serviceCount || 0} services</p>
                          <p className="mt-1">{provider.bookingCount || 0} bookings</p>
                        </td>

                        <td className="px-4 sm:px-6 py-5">
                          <div className="flex flex-col gap-1.5">
                            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap ${
                              provider.isActive === false
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {provider.isActive === false ? 'Inactive' : 'Active'}
                            </span>
                            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold whitespace-nowrap ${
                              provider.isVerified
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {provider.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 sm:px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(provider)}
                              disabled={isToggling || isDeleting}
                              className={`inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center rounded-xl sm:px-3 sm:py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                provider.isActive === false
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                              title={provider.isActive === false ? 'Activate' : 'Deactivate'}
                            >
                              <PowerIcon className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">{isToggling ? '...' : provider.isActive === false ? 'Activate' : 'Deactivate'}</span>
                            </button>

                            <button
                              onClick={() => handleDelete(provider)}
                              disabled={isDeleting || isToggling}
                              className="inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center rounded-xl border border-red-200 bg-red-50 sm:px-3 sm:py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">{isDeleting ? '...' : 'Delete'}</span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageProviders;
