import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function Bookings() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    } else {
      fetchBookings();
    }
  }, [id]);

  const fetchBookings = async () => {
    try {
      const endpoint = user?.role === 'provider' 
        ? '/bookings/provider-bookings'
        : '/bookings/my-bookings';
      
      const response = await api.get(endpoint);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async () => {
    try {
      const response = await api.get(`/bookings/${id}`);
      setSelectedBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await api.put(
        `/bookings/${bookingId}/status`,
        { status }
      );
      
      toast.success(response.data?.message || `Booking ${status} successfully`);
      
      if (id) {
        fetchBookingDetails();
      } else {
        fetchBookings();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to update booking');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      confirmed: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400',
      rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
      'in-progress': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
    };
    return colors[status] || 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-rose-600 dark:text-rose-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-stone-600 dark:text-stone-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-amber-600 dark:text-amber-500" />;
    }
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  // If viewing single booking
  if (id && selectedBooking) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] py-8 text-stone-900 dark:text-stone-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/bookings" className="text-primary-600 hover:text-primary-700 dark:text-primary-500 dark:hover:text-primary-400 mb-6 inline-block font-bold">
            ← Back to Bookings
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-stone-900 dark:bg-stone-950 border-b border-stone-800 px-6 py-8 relative">
              <div className="absolute top-0 right-0 h-48 w-48 -translate-y-1/2 translate-x-1/4 rounded-full bg-primary-500/10 blur-3xl" />
              <div className="flex items-center justify-between relative z-10">
                <h1 className="text-2xl font-black text-white">Booking Details</h1>
                <span className={`px-4 py-2 rounded-full text-sm font-bold border border-current/10 ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Service Info */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-stone-900 dark:text-white">Service Information</h2>
                  <div className="bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                    <div className="flex items-start space-x-4">
                      <img
                        src={selectedBooking.serviceId?.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={selectedBooking.serviceId?.name}
                        className="h-20 w-20 rounded-[1rem] object-cover shadow-sm"
                      />
                      <div>
                        <h3 className="font-bold text-stone-900 dark:text-white text-lg">{selectedBooking.serviceId?.name}</h3>
                        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 mt-1">{selectedBooking.serviceId?.category}</p>
                        <p className="text-sm font-medium text-stone-600 dark:text-stone-300 mt-2">{selectedBooking.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provider/User Info */}
                <div className="space-y-4">
                  <h2 className="text-lg font-black text-stone-900 dark:text-white">
                    {user?.role === 'provider' ? 'Customer' : 'Provider'} Information
                  </h2>
                  <div className="bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                    <div className="flex items-start space-x-4">
                      <img
                        src={user?.role === 'provider' 
                          ? selectedBooking.userId?.avatar 
                          : selectedBooking.providerId?.avatar || 'https://via.placeholder.com/80'}
                        alt={user?.role === 'provider' ? selectedBooking.userId?.name : selectedBooking.providerId?.name}
                        className="h-16 w-16 rounded-full object-cover shadow-sm ring-2 ring-stone-200 dark:ring-stone-700"
                      />
                      <div className="pt-1">
                        <h3 className="font-bold text-stone-900 dark:text-white text-lg">
                          {user?.role === 'provider' ? selectedBooking.userId?.name : selectedBooking.providerId?.name}
                        </h3>
                        <p className="text-sm font-semibold text-stone-500 dark:text-stone-400 mt-1">
                          {user?.role === 'provider' ? selectedBooking.userId?.phone : selectedBooking.providerId?.phone}
                        </p>
                        <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-1">
                          {user?.role === 'provider' ? selectedBooking.userId?.email : selectedBooking.providerId?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="md:col-span-2 space-y-4">
                  <h2 className="text-lg font-black text-stone-900 dark:text-white">Booking Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                      <div className="flex items-center text-stone-500 dark:text-stone-400 mb-2 font-bold uppercase tracking-wider text-xs">
                        <CalendarIcon className="h-4 w-4 mr-2 text-primary-500" />
                        <span>Date & Time</span>
                      </div>
                      <p className="font-bold text-stone-900 dark:text-white text-lg">
                        {new Date(selectedBooking.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">{selectedBooking.time}</p>
                    </div>

                    <div className="bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                      <div className="flex items-center text-stone-500 dark:text-stone-400 mb-2 font-bold uppercase tracking-wider text-xs">
                        <ClockIcon className="h-4 w-4 mr-2 text-primary-500" />
                        <span>Duration</span>
                      </div>
                      <p className="font-bold text-stone-900 dark:text-white text-lg">{selectedBooking.duration} hour(s)</p>
                    </div>

                    <div className="bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                      <div className="flex items-center text-stone-500 dark:text-stone-400 mb-2 font-bold uppercase tracking-wider text-xs">
                        <CurrencyRupeeIcon className="h-4 w-4 mr-2 text-primary-500" />
                        <span>Total Amount</span>
                      </div>
                      <p className="font-black text-primary-600 dark:text-primary-400 text-2xl">₹{selectedBooking.totalAmount}</p>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedBooking.location && (
                    <div className="bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 mt-4">
                      <div className="flex items-center text-stone-500 dark:text-stone-400 mb-2 font-bold uppercase tracking-wider text-xs">
                        <MapPinIcon className="h-4 w-4 mr-2 text-amber-500" />
                        <span>Service Location</span>
                      </div>
                      <p className="font-medium text-stone-900 dark:text-white">{selectedBooking.location.address}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {user?.role === 'provider' && selectedBooking.status === 'pending' && (
                  <div className="md:col-span-2 flex space-x-4 mt-6">
                    <button
                      onClick={() => updateBookingStatus(selectedBooking._id, 'confirmed')}
                      className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-[1.5rem] font-bold shadow-md hover:bg-emerald-500 transition"
                    >
                      Accept Booking
                    </button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking._id, 'cancelled')}
                      className="flex-1 bg-rose-600 text-white py-3 px-4 rounded-[1.5rem] font-bold shadow-md hover:bg-rose-500 transition"
                    >
                      Decline Booking
                    </button>
                  </div>
                )}

                {user?.role === 'provider' && selectedBooking.status === 'confirmed' && (
                  <div className="md:col-span-2 mt-6">
                    <button
                      onClick={() => updateBookingStatus(selectedBooking._id, 'completed')}
                      className="w-full rounded-[1.5rem] bg-primary-600 text-white py-4 font-black transition hover:bg-primary-500"
                    >
                      Mark service completed
                    </button>
                  </div>
                )}

                {user?.role === 'user' && selectedBooking.status === 'confirmed' && (
                  <div className="md:col-span-2 mt-6">
                    <button
                      onClick={() => updateBookingStatus(selectedBooking._id, 'cancelled')}
                      className="w-full bg-rose-600 text-white py-4 px-4 rounded-[1.5rem] font-bold hover:bg-rose-500 shadow-md transition"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}

                {user?.role === 'user' && selectedBooking.status === 'completed' && (
                  <div className="md:col-span-2 mt-6">
                    <Link
                      to="/reviews"
                      className="block w-full rounded-[1.5rem] bg-amber-500 px-4 py-4 text-center font-black text-stone-950 shadow-md transition hover:bg-amber-400"
                    >
                      Rate this provider
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0c0a09] py-8 text-stone-900 dark:text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-black text-stone-950 dark:text-white tracking-tight">My Bookings</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium">View and manage your service timeline.</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
          {['all', 'pending', 'confirmed', 'rejected', 'in-progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-[1.5rem] text-sm font-bold capitalize whitespace-nowrap transition border ${
                filter === status
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md dark:bg-primary-500 dark:border-primary-500'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-primary-300 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800 dark:hover:border-primary-500/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-stone-200 dark:border-stone-800 p-16 text-center">
            <p className="text-stone-500 dark:text-stone-400 font-bold text-xl mb-6">No bookings found</p>
            <Link
              to="/services"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition"
            >
              Browse Services
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredBookings.map((booking) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-lg shadow-stone-900/5 overflow-hidden transition-all hover:shadow-xl hover:border-primary-200 dark:hover:border-stone-700"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start space-x-5">
                      <img
                        src={booking.serviceId?.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={booking.serviceId?.name}
                        className="h-24 w-24 rounded-[1.5rem] object-cover shadow-sm"
                      />
                      <div>
                        <h3 className="text-xl font-black text-stone-900 dark:text-white">
                          {booking.serviceId?.name}
                        </h3>
                        <p className="text-sm font-bold text-stone-500 dark:text-stone-400 mt-1">
                          with {user?.role === 'provider' ? booking.userId?.name : booking.providerId?.name}
                        </p>
                        <div className="flex items-center mt-3 space-x-4">
                          <span className="flex items-center text-sm font-semibold text-stone-600 dark:text-stone-400">
                            <CalendarIcon className="h-4 w-4 mr-1.5 text-primary-500" />
                            {new Date(booking.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center text-sm font-semibold text-stone-600 dark:text-stone-400">
                            <ClockIcon className="h-4 w-4 mr-1.5 text-primary-500" />
                            {booking.time}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 md:mt-0 flex flex-col items-start md:items-end space-y-4">
                      <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-current/10 ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          <span className="ml-1.5">{booking.status}</span>
                        </span>
                        <p className="text-2xl font-black text-stone-900 dark:text-white">₹{booking.totalAmount}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 w-full md:justify-end">
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="px-5 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-full font-bold text-sm hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                        >
                          View Details
                        </Link>
                        {user?.role === 'provider' && booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking._id, 'completed')}
                            className="rounded-full bg-stone-900 dark:bg-stone-100 px-5 py-2.5 text-sm font-bold text-white dark:text-stone-900 transition hover:scale-105"
                          >
                            Complete
                          </button>
                        )}
                        {user?.role === 'user' && booking.status === 'completed' && (
                          <Link
                            to="/reviews"
                            className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-amber-400 hover:scale-105 shadow-md"
                          >
                            Rate
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Bookings;
