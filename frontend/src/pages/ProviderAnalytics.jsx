import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  PresentationChartLineIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api';

function ProviderAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalBookings: 0,
    completionRate: 0,
    averageRating: 4.8,
    bookingGrowth: 12,
    revenueGrowth: 18
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAnalytics(token);
  }, [navigate]);

  const fetchAnalytics = async (token) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings/provider-bookings`, {
        headers: { 'x-auth-token': token }
      }).catch(() => axios.get(`${API_BASE_URL}/provider/bookings`, { 
        headers: { 'x-auth-token': token } 
      }));
      
      const bookingsArray = Array.isArray(response.data) ? response.data : (response.data.bookings || []);
      
      const completed = bookingsArray.filter(b => b.status === 'completed');
      const totalEarnings = completed.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const completionRate = bookingsArray.length > 0 ? (completed.length / bookingsArray.length) * 100 : 0;
      
      const currentMonth = new Date().getMonth();
      const monthlyEarnings = completed
        .filter(b => b.date && new Date(b.date).getMonth() === currentMonth)
        .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

      setData(prev => ({
        ...prev,
        totalEarnings: totalEarnings || 0,
        monthlyEarnings: monthlyEarnings || 0,
        totalBookings: bookingsArray.length,
        completionRate: Math.round(completionRate)
      }));
    } catch (error) {
      console.error('Analytics Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => Number(val || 0).toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex flex-col items-center justify-center">
        <ArrowPathIcon className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">Generating Intelligence Report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] pt-24 pb-20 transition-colors duration-500 overflow-x-hidden">
      <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-emerald-500/5 blur-[120px] rounded-full -mr-[300px] -mt-[200px] pointer-events-none" />
      
      <div className="section-shell relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <Link to="/provider/dashboard" className="group inline-flex items-center gap-2 text-emerald-500 font-black uppercase tracking-widest text-[10px] mb-4">
              <ChevronLeftIcon className="h-4 w-4" /> Exit Intelligence
            </Link>
            <h1 className="text-4xl md:text-6xl font-black text-stone-950 dark:text-white tracking-tighter">Business <span className="text-emerald-500">Performance.</span></h1>
            <p className="text-stone-500 font-bold mt-2 dark:text-stone-400">Merchant Analytics Core • Live Sync Active</p>
          </div>
          
          <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm hidden lg:flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-stone-950 shadow-lg shadow-emerald-500/20">
                <PresentationChartLineIcon className="h-6 w-6" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest leading-none mb-1">Status</p>
                <p className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tighter">Live Audit</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           {[
             { title: "Gross Revenue", value: `₹${formatCurrency(data.totalEarnings)}`, change: `+${data.revenueGrowth}%`, icon: CurrencyRupeeIcon, theme: "emerald" },
             { title: "Monthly Pulse", value: `₹${formatCurrency(data.monthlyEarnings)}`, change: "Active", icon: ChartBarIcon, theme: "fuchsia" },
             { title: "Market Reach", value: data.totalBookings, change: `+${data.bookingGrowth}%`, icon: UserGroupIcon, theme: "amber" },
             { title: "Service Score", value: data.averageRating, change: "Elite", icon: StarIcon, theme: "primary" }
           ].map((stat, i) => (
             <motion.div key={stat.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-[2.5rem] bg-white border border-stone-200 p-8 dark:bg-stone-900/60 dark:border-stone-800 shadow-xl shadow-stone-900/5 relative overflow-hidden group">
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-8">
                      <span className="p-3 rounded-2xl bg-stone-50 text-stone-600 dark:bg-stone-950/40 dark:text-stone-400 group-hover:scale-110 transition-transform">
                        <stat.icon className="h-6 w-6" />
                      </span>
                      <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">{stat.change}</span>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">{stat.title}</p>
                   <p className="text-4xl font-black text-stone-950 dark:text-white tracking-tighter">{stat.value}</p>
                </div>
                <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-stone-50 dark:bg-stone-950/10 rounded-full group-hover:scale-110 transition-transform" />
             </motion.div>
           ))}
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
           <div className="rounded-[3rem] bg-stone-950 p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-[30rem] w-[30rem] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="relative z-10 h-full flex flex-col">
                 <div className="flex items-center justify-between mb-12">
                   <div>
                      <h3 className="text-2xl font-black tracking-tight">Growth Trajectory</h3>
                      <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Market conversion audit</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                        <ArrowUpIcon className="h-3 w-3" /> Alpha Performance
                      </span>
                   </div>
                 </div>

                 <div className="flex-1 flex items-end justify-between gap-3 min-h-[300px] pb-6">
                    {[45, 60, 52, 85, 78, 92, 100].map((height, i) => (
                      <div key={i} className="flex-1 group relative">
                         <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: i * 0.1 + 0.5, duration: 1 }} className="w-full bg-gradient-to-t from-emerald-500/50 to-emerald-400 rounded-2xl relative">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-stone-950 py-1.5 px-3 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                               {height}%
                            </div>
                         </motion.div>
                         <p className="text-[10px] font-black text-stone-600 mt-4 text-center">Batch {i+1}</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="space-y-8">
              <div className="rounded-[2.5rem] bg-white border border-stone-200 p-8 dark:bg-stone-900/40 dark:border-stone-800 shadow-xl shadow-stone-900/5">
                 <h3 className="text-xl font-black text-stone-950 dark:text-white mb-6 flex items-center gap-3">
                   <CalendarIcon className="h-6 w-6 text-emerald-500" /> Operational Health
                 </h3>
                 <div className="space-y-6">
                    <div>
                       <div className="flex justify-between items-end mb-2">
                         <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Completion Rate</p>
                         <p className="text-sm font-black text-stone-950 dark:text-white">{data.completionRate}%</p>
                       </div>
                       <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${data.completionRate}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500" />
                       </div>
                    </div>
                    <div>
                       <div className="flex justify-between items-end mb-2">
                         <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Retention Index</p>
                         <p className="text-sm font-black text-stone-950 dark:text-white">92%</p>
                       </div>
                       <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.5, delay: 0.2 }} className="h-full bg-fuchsia-500" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="rounded-[2.5rem] bg-emerald-500 p-8 text-stone-950 shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                 <div className="relative z-10">
                    <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      <SparklesIcon className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight leading-tight">Verified Alpha Performance.</h3>
                    <p className="mt-2 text-stone-950/60 font-bold leading-relaxed">Your professional telemetry is synchronized with global trust signals. Premium conversion active.</p>
                    <button onClick={() => window.location.reload()} className="mt-8 w-full py-4 rounded-2xl bg-stone-950 text-white font-black uppercase tracking-widest text-[10px] hover:bg-stone-900 transition-all">
                       System Audit Refresh
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default ProviderAnalytics;
