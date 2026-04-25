import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/dashboard`, {
        headers: { 'x-auth-token': localStorage.getItem('token') }
      });
      setStats(response.data.stats);
      setRecentBookings(response.data.recentBookings);
    } catch (error) {
       // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
      case 'in-progress': return 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400';
      case 'cancelled': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
      default: return 'bg-stone-100 text-stone-700 dark:bg-stone-500/10 dark:text-stone-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase text-emerald-500">Sync</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white selection:bg-emerald-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-amber-500/5 blur-[120px]" />
      </div>

      {/* Hero Header */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="section-shell relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-6"
          >
            <SparklesIcon className="h-4 w-4" /> Command Center
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-4">
                Platform <span className="text-emerald-500">Overview.</span>
              </h1>
              <p className="text-stone-400 text-lg font-bold max-w-xl">
                Real-time governance and growth metrics for your local service marketplace.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchDashboardData}
                className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all backdrop-blur-xl"
              >
                <ArrowPathIcon className="h-6 w-6 text-stone-400 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="section-shell relative z-20 pb-40">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            { title: "Network Users", value: stats?.totalUsers || 0, icon: UsersIcon, color: "emerald" },
            { title: "Service Pros", value: stats?.totalProviders || 0, icon: UserGroupIcon, color: "amber" },
            { title: "Pending Audits", value: stats?.pendingVerifications || 0, icon: ClipboardDocumentCheckIcon, color: "emerald" },
            { title: "Total Bookings", value: stats?.totalBookings || 0, icon: CalendarIcon, color: "amber" }
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/5 p-8 backdrop-blur-3xl hover:bg-white/[0.08] transition-all"
            >
              <div className={`absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px] opacity-20 ${stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              
              <div className="relative z-10">
                <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-4xl font-black tracking-tighter mb-1">{stat.value}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-500">{stat.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Recent Activity Table */}
          <div className="lg:col-span-8 order-2 lg:order-1">
            <div className="rounded-[3rem] border border-white/5 bg-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl">
              <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Recent Activity</h2>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-1">Live booking stream</p>
                </div>
                <Link to="/admin/bookings" className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">View All Bookings</Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-stone-500">
                    <tr>
                      <th className="px-10 py-5">Customer / Service</th>
                      <th className="px-10 py-5">Date</th>
                      <th className="px-10 py-5">Status</th>
                      <th className="px-10 py-5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-10 py-20 text-center text-stone-500 font-bold italic">"No recent booking activity detected."</td>
                      </tr>
                    ) : (
                      recentBookings.map((booking) => (
                        <tr key={booking._id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-10 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-white group-hover:text-emerald-400 transition-colors">{booking.userId?.name}</span>
                              <span className="text-xs font-bold text-stone-500">{booking.serviceId?.name}</span>
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-xs font-black text-stone-400">{new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </td>
                          <td className="px-10 py-6">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <span className="text-sm font-black text-white">₹{booking.totalAmount}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Governance Links */}
          <div className="lg:col-span-4 order-1 lg:order-2 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-stone-500 px-2">Management</h2>
            
            {[
              { to: "/admin/verifications", title: "Identity Audits", desc: "Review provider credentials", icon: ClipboardDocumentCheckIcon, color: "emerald", count: stats?.pendingVerifications },
              { to: "/admin/providers", title: "Network Registry", desc: "Manage service professionals", icon: UserGroupIcon, color: "amber", count: stats?.totalProviders },
              { to: "/admin/revenue", title: "Financial Reports", desc: "Platform revenue analytics", icon: CurrencyRupeeIcon, color: "emerald", revenue: stats?.revenueToday }
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group relative block overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/5 p-8 transition-all hover:bg-white/[0.08] hover:scale-[1.02]"
              >
                <div className={`absolute bottom-0 right-0 h-24 w-24 translate-x-1/2 translate-y-1/2 rounded-full blur-[40px] opacity-10 ${action.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex gap-5">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      <action.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight">{action.title}</h3>
                      <p className="text-xs font-bold text-stone-500 mt-1">{action.desc}</p>
                    </div>
                  </div>
                  {action.count !== undefined && (
                    <span className="flex h-8 px-4 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-stone-300">
                      {action.count}
                    </span>
                  )}
                  {action.revenue !== undefined && (
                    <span className="text-xs font-black text-emerald-500">
                      ₹{action.revenue}
                    </span>
                  )}
                </div>
              </Link>
            ))}

            <div className="rounded-[2.5rem] bg-emerald-500 p-10 text-stone-950 shadow-2xl shadow-emerald-500/20">
               <h3 className="text-2xl font-black leading-none mb-4">Platform Health</h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-end border-b border-stone-950/10 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                    <span className="text-xs font-black uppercase tracking-widest">Active</span>
                 </div>
                 <div className="flex justify-between items-end border-b border-stone-950/10 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System</span>
                    <span className="text-xs font-black uppercase tracking-widest">Nominal</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
