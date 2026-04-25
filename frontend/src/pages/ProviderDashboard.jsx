import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  BriefcaseIcon,
  CurrencyRupeeIcon,
  StarIcon,
  UserGroupIcon,
  CalendarIcon,
  PlusCircleIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api';

function ProviderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalServices: 0
  });
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchProviderServices();
  }, []);

  const getAuthHeaders = () => ({
    'x-auth-token': localStorage.getItem('token')
  });

  const fetchDashboardData = async () => {
    try {
      const bookingsResponse = await axios.get(`${API_BASE_URL}/bookings/provider-bookings`, {
        headers: getAuthHeaders()
      }).catch(() => axios.get(`${API_BASE_URL}/provider/bookings`, { headers: getAuthHeaders() }));
      
      const providerBookings = Array.isArray(bookingsResponse.data) ? bookingsResponse.data : (bookingsResponse.data.bookings || []);
      setBookings(providerBookings);

      const completed = providerBookings.filter((booking) => booking.status === 'completed');
      const earnings = completed.reduce((sum, b) => sum + b.totalAmount, 0);
      
      setStats({
        totalBookings: providerBookings.length,
        completedBookings: completed.length,
        totalEarnings: earnings,
        averageRating: 4.8, // Replace with actual ratings logic later
        totalServices: services.length
      });
    } catch (error) {
       // Silently handle to not spam toast unless user requested data
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderServices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/services/provider`, {
        headers: getAuthHeaders()
      });
      setServices(response.data);
      setStats(prev => ({ ...prev, totalServices: response.data.length }));
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'in-progress': return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'rejected': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return <CheckCircleIcon className="h-4 w-4 mr-1" />;
      case 'rejected': return <XCircleIcon className="h-4 w-4 mr-1" />;
      case 'completed': return <CheckCircleIcon className="h-4 w-4 mr-1" />;
      case 'cancelled': return <XCircleIcon className="h-4 w-4 mr-1" />;
      default: return <ClockIcon className="h-4 w-4 mr-1" />;
    }
  };

  const handleBookingStatusUpdate = async (bookingId, status) => {
    setActionLoading(`${bookingId}-${status}`);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/provider/bookings/${bookingId}/status`,
        { status },
        { headers: getAuthHeaders() }
      );
      toast.success(response.data.message || `Booking ${status} successfully`);
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking._id === bookingId ? { ...booking, status, ...(response.data.booking || {}) } : booking
        )
      );
      await fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update booking');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10 dark:bg-[#0c0a09]">
      <div className="section-shell">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary-700 dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-400 mb-3">
              <SparklesIcon className="h-3.5 w-3.5" /> Provider Center
            </div>
            <h1 className="text-4xl font-black text-stone-950 dark:text-white">Provider Dashboard</h1>
            <p className="text-lg text-stone-500 font-medium mt-2 dark:text-stone-400">Welcome back, {user?.name}</p>
          </div>
        </div>

        {!user?.isVerified && (
          <div className="mb-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/30 dark:bg-amber-900/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-400 text-lg">Complete Your Verification</h3>
                <p className="text-sm font-medium text-amber-700/80 mt-1 dark:text-amber-500/80">Get verified to increase your booking chances by 70%.</p>
              </div>
              <Link to="/verification" className="btn-primary shrink-0 bg-amber-500 hover:bg-amber-600 border-amber-500 ring-amber-500 text-stone-950 shadow-amber-500/20">
                Verify Now
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[
            { title: "Total Bookings", value: stats.totalBookings, icon: CalendarIcon, theme: "text-primary-600 bg-primary-50 border-primary-100" },
            { title: "Completed", value: stats.completedBookings, icon: CheckCircleIcon, theme: "text-emerald-600 bg-emerald-50 border-emerald-100" },
            { title: "Earnings", value: `₹${stats.totalEarnings}`, icon: CurrencyRupeeIcon, theme: "text-amber-600 bg-amber-50 border-amber-100" },
            { title: "Rating", value: stats.averageRating.toFixed(1), icon: StarIcon, theme: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100" },
            { title: "Services", value: stats.totalServices, icon: BriefcaseIcon, theme: "text-stone-700 bg-stone-100 border-stone-200" }
          ].map((stat, i) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`rounded-[2rem] p-5 shadow-sm border ${stat.theme} dark:bg-stone-900/40 dark:border-stone-800`}>
              <div className="flex justify-between items-start">
                <span className={`p-2.5 rounded-xl bg-white/50 shadow-sm dark:bg-stone-950/40 ${stat.theme.split(" ")[0]}`}>
                  <stat.icon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-stone-900 dark:text-white">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mt-1">{stat.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          {/* Quick Actions */}
          <div className="grid grid-rows-3 gap-4 lg:col-span-1">
            <Link to="/provider/services/new" className="flex items-center gap-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:border-primary-200 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <PlusCircleIcon className="h-6 w-6" />
              </span>
              <div>
                <h4 className="font-black text-stone-900 dark:text-white">Add New Service</h4>
                <p className="text-xs font-medium text-stone-500 mt-1">List a new offering</p>
              </div>
            </Link>

            <Link to="/provider/services" className="flex items-center gap-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:border-primary-200 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                <BriefcaseIcon className="h-6 w-6" />
              </span>
              <div>
                <h4 className="font-black text-stone-900 dark:text-white">Manage Services</h4>
                <p className="text-xs font-medium text-stone-500 mt-1">Edit or update existing</p>
              </div>
            </Link>

            <Link to="/provider/analytics" className="flex items-center gap-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:border-fuchsia-200 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400">
                <ChartBarIcon className="h-6 w-6" />
              </span>
              <div>
                <h4 className="font-black text-stone-900 dark:text-white">Analytics</h4>
                <p className="text-xs font-medium text-stone-500 mt-1">View performance</p>
              </div>
            </Link>
          </div>

          {/* Your Services Mini-list */}
          <div className="lg:col-span-2 rounded-[2.5rem] border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
              <h2 className="text-xl font-black text-stone-950 dark:text-white">Your Services</h2>
              <Link to="/provider/services" className="text-sm font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400">View all</Link>
            </div>
            
            {services.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-stone-200 rounded-[2rem] dark:border-stone-800">
                <p className="text-stone-500 font-medium mb-4">You haven't added any services yet.</p>
                <Link to="/provider/services/new" className="btn-secondary text-sm inline-flex items-center gap-2">
                  <PlusCircleIcon className="h-5 w-5" /> Add Service
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {services.slice(0, 4).map((service) => (
                  <div key={service._id} className="flex items-center justify-between rounded-2xl p-3 border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/50">
                     <div className="flex items-center gap-3">
                        <img src={service.images?.[0] || 'https://via.placeholder.com/60'} alt={service.name} className="h-12 w-12 rounded-xl object-cover" />
                        <div>
                           <h3 className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1">{service.name}</h3>
                           <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">{service.category}</p>
                        </div>
                     </div>
                     <span className="text-sm font-black text-stone-900 dark:text-white">₹{service.price}</span>
                  </div>
                ))}
              </div>
            )}
           </div>
        </div>

        {/* Booking Requests */}
        <div className="rounded-[2.5rem] border border-stone-200 bg-white shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/20 overflow-hidden">
          <div className="px-8 py-6 border-b border-stone-100 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-900/30">
            <h2 className="text-xl font-black text-stone-900 dark:text-white">Booking Requests & Tasks</h2>
            <p className="mt-1 text-sm font-medium text-stone-500">Accept requests and complete your scheduled jobs.</p>
          </div>
          
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 mb-4">
                <CalendarIcon className="h-8 w-8 text-stone-400" />
              </div>
              <p className="text-stone-500 font-medium">When customers book your services, they'll appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-stone-50/80 text-xs font-black uppercase tracking-widest text-stone-500 dark:bg-stone-900/50 dark:text-stone-400">
                  <tr>
                    <th className="px-8 py-5">Customer</th>
                    <th className="px-8 py-5">Service</th>
                    <th className="px-8 py-5">Schedule</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                  {bookings.map((booking) => {
                    const acceptKey = `${booking._id}-confirmed`;
                    const rejectKey = `${booking._id}-rejected`;
                    const completeKey = `${booking._id}-completed`;
                    const canRespond = booking.status === 'pending';
                    const canComplete = booking.status === 'confirmed';

                    return (
                      <tr key={booking._id} className="transition hover:bg-stone-50 md:hover:bg-transparent dark:hover:bg-stone-900/30">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-stone-100 dark:bg-stone-800">
                              <UserGroupIcon className="h-5 w-5 text-stone-500" />
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 dark:text-white">{booking.userId?.name}</p>
                              <p className="text-xs font-medium text-stone-500">{booking.userId?.phone || booking.userId?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-stone-900 dark:text-white">{booking.serviceId?.name}</p>
                          <p className="text-xs font-medium text-stone-500 mt-0.5">{booking.serviceId?.category}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-stone-900 dark:text-white">{new Date(booking.date).toLocaleDateString()}</p>
                          <p className="text-xs font-medium text-stone-500 mt-0.5">{booking.time}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {canRespond ? (
                              <>
                                <button onClick={() => handleBookingStatusUpdate(booking._id, 'confirmed')} disabled={actionLoading === acceptKey || actionLoading === rejectKey} className="rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 text-xs font-bold transition disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50">
                                  {actionLoading === acceptKey ? 'Accepting...' : 'Accept'}
                                </button>
                                <button onClick={() => handleBookingStatusUpdate(booking._id, 'rejected')} disabled={actionLoading === acceptKey || actionLoading === rejectKey} className="rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 text-xs font-bold transition disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40">
                                  {actionLoading === rejectKey ? 'Rejecting...' : 'Reject'}
                                </button>
                              </>
                            ) : canComplete ? (
                              <button onClick={() => handleBookingStatusUpdate(booking._id, 'completed')} disabled={actionLoading === completeKey} className="btn-primary py-2 px-4 text-xs shrink-0">
                                {actionLoading === completeKey ? 'Completing...' : 'Mark Done'}
                              </button>
                            ) : (
                              <Link to={`/bookings/${booking._id}`} className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white transition py-2 px-3 bg-stone-100 rounded-xl dark:bg-stone-800">
                                View
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
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

export default ProviderDashboard;
