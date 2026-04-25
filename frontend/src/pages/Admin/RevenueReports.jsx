import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/admin`;

function RevenueReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueReport();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Admin session expired. Please log in again.');
    }

    return { 'x-auth-token': token };
  };

  const fetchRevenueReport = async () => {
    setLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/revenue`, {
        headers: getAuthHeaders()
      });

      setReport(response.data);
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to load revenue reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

  const monthlyChartData = {
    labels: report?.monthlyTrend?.map((item) => item.label) || [],
    datasets: [
      {
        label: 'Monthly Revenue',
        data: report?.monthlyTrend?.map((item) => item.revenue) || [],
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.18)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#0f766e'
      }
    ]
  };

  const dailyChartData = {
    labels: report?.dailyTrend?.map((item) => item.label) || [],
    datasets: [
      {
        label: 'Last 7 Days Revenue',
        data: report?.dailyTrend?.map((item) => item.revenue) || [],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.16)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb'
      }
    ]
  };

  const statusChartData = {
    labels: report?.statusBreakdown?.map((item) => item.status) || [],
    datasets: [
      {
        data: report?.statusBreakdown?.map((item) => item.revenue) || [],
        backgroundColor: ['#14b8a6', '#3b82f6', '#8b5cf6'],
        borderColor: '#ffffff',
        borderWidth: 3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, tone }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_48%,_#eef2ff)]">
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-600">Admin Panel</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Revenue Reports</h1>
            <p className="mt-1 text-sm text-slate-600">Track earnings with live revenue summaries and booking-based trends.</p>
          </div>
          <button
            onClick={fetchRevenueReport}
            disabled={loading}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <ArrowPathIcon className="h-10 w-10 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-3">
              <StatCard
                title="Total Earnings"
                value={formatCurrency(report?.summary?.totalEarnings)}
                subtitle="Revenue generated from active bookings"
                icon={CurrencyRupeeIcon}
                tone="bg-teal-100 text-teal-700"
              />
              <StatCard
                title="Today Earnings"
                value={formatCurrency(report?.summary?.todayEarnings)}
                subtitle="Revenue booked since midnight"
                icon={CalendarDaysIcon}
                tone="bg-blue-100 text-blue-700"
              />
              <StatCard
                title="Monthly Earnings"
                value={formatCurrency(report?.summary?.monthlyEarnings)}
                subtitle="Revenue booked in the current month"
                icon={ChartBarIcon}
                tone="bg-violet-100 text-violet-700"
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)]">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">Monthly Revenue Trend</h2>
                  <p className="mt-1 text-sm text-slate-500">Revenue movement across months based on booking creation dates.</p>
                </div>
                <div className="h-[320px]">
                  <Line data={monthlyChartData} options={chartOptions} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)]">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">Revenue By Status</h2>
                  <p className="mt-1 text-sm text-slate-500">How revenue is distributed across active booking states.</p>
                </div>
                <div className="mx-auto h-[320px] max-w-[320px]">
                  <Doughnut data={statusChartData} options={chartOptions} />
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)]">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Last 7 Days Earnings</h2>
                <p className="mt-1 text-sm text-slate-500">Daily revenue trend for the last seven days.</p>
              </div>
              <div className="h-[320px]">
                <Line data={dailyChartData} options={chartOptions} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RevenueReports;
