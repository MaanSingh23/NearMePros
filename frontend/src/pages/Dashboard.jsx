import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    'in-progress': 0
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/bookings/my-bookings`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setBookings(response.data);
      
      const statsObj = response.data.reduce((acc, booking) => {
        acc.total++;
        if (acc[booking.status] !== undefined) {
           acc[booking.status]++;
        }
        return acc;
      }, { total: 0, completed: 0, pending: 0, cancelled: 0, 'in-progress': 0 });
      
      setStats(statsObj);
    } catch (error) {
       // Silent error for dashboard fetch in UI
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'in-progress': return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400';
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-10 dark:bg-[#0c0a09]">
      <div className="section-shell">
        {/* Welcome Header */}
        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary-700 dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-400 mb-3">
              <SparklesIcon className="h-3.5 w-3.5" /> Client Portal
            </div>
            <h1 className="text-4xl font-black text-stone-950 dark:text-white">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-lg text-stone-500 font-medium mt-2 dark:text-stone-400">
              Manage your bookings and discover new services.
            </p>
          </div>
          <Link to="/services" className="btn-primary inline-flex">
             Book New Service
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {[
            { label: 'Total Bookings', value: stats.total, icon: CalendarIcon, color: 'text-stone-700 dark:text-stone-300', bg: 'bg-stone-100 dark:bg-stone-800' },
            { label: 'Completed', value: stats.completed, icon: CheckCircleIcon, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30' },
            { label: 'Pending', value: stats.pending, icon: ClockIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30' },
            { label: 'In Progress', value: stats['in-progress'], icon: UserGroupIcon, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-100 dark:border-fuchsia-900/30' }
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`rounded-[2rem] p-6 shadow-sm ${stat.bg}`}>
              <div className="flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className={`p-3 rounded-xl bg-white/60 dark:bg-stone-950/40 ${stat.color} shadow-sm`}>
                    <stat.icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-stone-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mt-1">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Bookings Area */}
          <div className="lg:col-span-2">
            <div className="rounded-[2.5rem] border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
                <h2 className="text-xl font-black text-stone-950 dark:text-white">Recent Activity</h2>
                <Link to="/bookings" className="text-sm font-bold text-primary-600 hover:text-primary-500 dark:text-primary-400">View all</Link>
              </div>
              
              {loading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent shadow-md"></div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-10 text-center rounded-[2rem] border border-stone-200 border-dashed dark:border-stone-800">
                  <p className="text-stone-500 font-medium mb-4">You haven't made any bookings yet.</p>
                  <Link to="/services" className="btn-secondary text-sm">Explore Services</Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bookings.slice(0, 5).map((booking) => (
                    <Link to={`/bookings/${booking._id}`} key={booking._id} className="group flex items-center justify-between rounded-2xl p-4 border border-stone-100 bg-stone-50 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
                      <div className="flex items-center gap-4">
                        <img src={booking.serviceId?.images?.[0] || 'https://via.placeholder.com/100'} alt="Service" className="h-16 w-16 rounded-xl object-cover shadow-sm group-hover:shadow-md transition" />
                        <div>
                          <h3 className="font-bold text-stone-900 dark:text-white">{booking.serviceId?.name || 'Service'}</h3>
                          <p className="text-sm font-medium text-stone-500">with {booking.providerId?.name || 'Provider'}</p>
                          <div className="flex items-center mt-1.5 gap-3">
                            <span className="text-xs font-semibold text-stone-400">{new Date(booking.date).toLocaleDateString()}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-stone-900 dark:text-white">₹{booking.totalAmount}</p>
                        <ArrowRightIcon className="h-5 w-5 text-stone-400 group-hover:text-primary-500 transition ml-auto mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions sidebar */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-500 ml-2 mb-2">Quick Actions</h3>
            
            <Link to="/services" className="flex items-center gap-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:border-primary-200 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <CalendarIcon className="h-6 w-6" />
              </span>
              <div>
                <h4 className="font-black text-stone-900 dark:text-white">Book a Service</h4>
                <p className="text-xs font-medium text-stone-500 mt-1">Find nearby pros</p>
              </div>
            </Link>

            <Link to="/profile" className="flex items-center gap-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:border-primary-200 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <UserGroupIcon className="h-6 w-6" />
              </span>
              <div>
                <h4 className="font-black text-stone-900 dark:text-white">Update Profile</h4>
                <p className="text-xs font-medium text-stone-500 mt-1">Manage details</p>
              </div>
            </Link>

            <Link to="/reviews" className="flex items-center gap-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm transition hover:scale-[1.02] hover:shadow-md hover:border-amber-200 dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <StarIcon className="h-6 w-6" />
              </span>
              <div>
                <h4 className="font-black text-stone-900 dark:text-white">Write a Review</h4>
                <p className="text-xs font-medium text-stone-500 mt-1">Share experience</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;