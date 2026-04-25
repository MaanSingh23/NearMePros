import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  StarIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400';
  if (imagePath.startsWith('http')) return imagePath;
  return `http://localhost:5000/uploads/${imagePath}`;
};

const StarRating = ({ value, onChange, readOnly = false, size = 'h-8 w-8' }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => {
      const Icon = star <= value ? StarIconSolid : StarIcon;
      return (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`${readOnly ? 'cursor-default' : 'transition hover:scale-110'} text-amber-500 disabled:opacity-100`}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Icon className={size} />
        </button>
      );
    })}
  </div>
);

function CustomerReviews() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [formData, setFormData] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchReviewData();
  }, []);

  const fetchReviewData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-auth-token': token };
      const [bookingsResponse, reviewsResponse] = await Promise.all([
        axios.get(`${API_URL}/reviews/reviewable-bookings`, { headers }),
        axios.get(`${API_URL}/reviews/my-reviews`, { headers })
      ]);
      setBookings(bookingsResponse.data);
      setReviews(reviewsResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load rating page');
    } finally {
      setLoading(false);
    }
  };

  const pendingBookings = useMemo(() => bookings.filter((booking) => !booking.review), [bookings]);
  const reviewedBookings = useMemo(() => bookings.filter((booking) => booking.review), [bookings]);

  const openCreateReview = (booking) => {
    setSelectedBooking(booking);
    setSelectedReview(null);
    setFormData({ rating: 5, comment: '' });
  };

  const openEditReview = (review) => {
    setSelectedBooking(null);
    setSelectedReview(review);
    setFormData({ rating: review.rating, comment: review.comment || '' });
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setSelectedReview(null);
    setFormData({ rating: 5, comment: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) return toast.error('Please log in again');
    if (!formData.rating) return toast.error('Please select a rating');
    setSubmitting(true);
    try {
      const headers = { 'x-auth-token': token };
      const payload = { rating: formData.rating, comment: formData.comment.trim() };

      if (selectedReview) {
        await axios.put(`${API_URL}/reviews/${selectedReview._id}`, payload, { headers });
        toast.success('Review updated successfully');
      } else {
        await axios.post(`${API_URL}/reviews`, { ...payload, bookingId: selectedBooking._id }, { headers });
        toast.success('Thank you for rating this provider');
      }
      closeModal();
      fetchReviewData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save review');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review? This will update the provider rating.')) return;
    try {
      await axios.delete(`${API_URL}/reviews/${reviewId}`, { headers: { 'x-auth-token': token } });
      toast.success('Review deleted');
      fetchReviewData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete review');
    }
  };

  if (user?.role === 'provider') {
    return (
      <div className="section-shell py-16">
        <div className="glass-card rounded-[2rem] p-10 text-center dark:bg-stone-900/50">
          <h1 className="text-3xl font-black text-stone-950 dark:text-white">Customer Rating Hub</h1>
          <p className="mt-3 font-medium text-stone-500">Accessible only to customers for rating services.</p>
          <Link to="/provider/dashboard" className="btn-primary mt-6 inline-flex">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 bg-stone-50 dark:bg-[#0c0a09]">
      <div className="section-shell">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-950 p-8 sm:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 h-[30rem] w-[30rem] translate-x-1/3 -translate-y-1/2 rounded-full bg-primary-500/20 blur-[80px]" />
          <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] -translate-x-1/3 translate-y-1/3 rounded-full bg-amber-500/10 blur-[60px]" />
          
          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary-300 backdrop-blur">
                <StarIcon className="h-4 w-4" />
                Customer Ratings
              </span>
              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                Shape the quality of your community.
              </h1>
              <p className="mt-4 text-lg font-medium text-stone-400">
                Your feedback ensures only the best professionals thrive on Nearify. Rate your recent bookings below.
              </p>
            </div>
            <button onClick={fetchReviewData} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-stone-900 shadow-xl transition hover:scale-105">
              <ArrowPathIcon className="h-5 w-5" />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Ready to rate', value: pendingBookings.length, icon: StarIcon },
            { label: 'Reviews submitted', value: reviews.length, icon: ChatBubbleBottomCenterTextIcon },
            { label: 'Completed bookings', value: reviewedBookings.length, icon: CheckBadgeIcon }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
                <Icon className="h-7 w-7 text-primary-500" />
                <p className="mt-4 text-4xl font-black text-stone-950 dark:text-white">{item.value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-stone-500">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex gap-2 overflow-x-auto pb-4">
          {[
            { id: 'pending', label: `Pending ratings (${pendingBookings.length})` },
            { id: 'submitted', label: `My reviews (${reviews.length})` },
            { id: 'completed', label: `Completed (${reviewedBookings.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-full px-6 py-3 text-sm font-bold transition duration-300 ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white shadow-lg dark:bg-primary-500 dark:text-stone-950'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center">
            <ArrowPathIcon className="h-10 w-10 animate-spin text-primary-500" />
            <p className="mt-4 font-bold text-stone-500">Loading your rating workspace...</p>
          </div>
        ) : (
          <div className="mt-6">
            {activeTab === 'pending' && (
              <div className="grid gap-6 lg:grid-cols-2">
                {pendingBookings.length === 0 ? <EmptyState title="All caught up!" text="You have no pending ratings. Book a service and complete it to leave a rating." /> : pendingBookings.map((b) => <BookingReviewCard key={b._id} booking={b} onRate={openCreateReview} />)}
              </div>
            )}

            {activeTab === 'submitted' && (
              <div className="grid gap-6 lg:grid-cols-2">
                {reviews.length === 0 ? <EmptyState title="No reviews yet" text="Your submitted reviews will appear here where you can manage or edit them." /> : reviews.map((r) => <ReviewCard key={r._id} review={r} onEdit={openEditReview} onDelete={deleteReview} />)}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="grid gap-6 lg:grid-cols-2">
                {reviewedBookings.length === 0 ? <EmptyState title="No past data" text="Bookings you have already rated will be archived here." /> : reviewedBookings.map((b) => <BookingReviewCard key={b._id} booking={b} reviewed />)}
              </div>
            )}
          </div>
        )}
      </div>

      {(selectedBooking || selectedReview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:border dark:border-stone-800 dark:bg-stone-950">
            <form onSubmit={handleSubmit}>
              <div className="bg-stone-900 p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-primary-600/20 mix-blend-overlay" />
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-widest text-primary-400 mb-2">
                    {selectedReview ? 'Update review' : 'Rate provider'}
                  </p>
                  <h2 className="text-3xl font-black">
                    {selectedReview?.serviceId?.name || selectedBooking?.serviceId?.name}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-stone-300">
                    Provider: <span className="text-white font-bold">{selectedReview?.providerId?.name || selectedBooking?.providerId?.name}</span>
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <label className="mb-4 block text-xs font-black uppercase tracking-widest text-stone-500">Your rating</label>
                  <StarRating value={formData.rating} onChange={(rating) => setFormData({ ...formData, rating })} size="h-10 w-10" />
                </div>

                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-widest text-stone-500">Share details (Optional)</label>
                  <textarea
                    value={formData.comment}
                    onChange={(event) => setFormData({ ...formData, comment: event.target.value })}
                    rows="4"
                    maxLength="1000"
                    className="input-field resize-none"
                    placeholder="Tell others what went well, or what could be improved..."
                  />
                  <p className="mt-3 text-xs font-bold text-stone-400 text-right">
                    {formData.comment.length}/1000
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-900/50 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary min-w-[140px] disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[2rem] border border-stone-200 border-dashed bg-stone-50/50 p-12 text-center dark:border-stone-800 dark:bg-stone-900/20 lg:col-span-2">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
        <StarIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="mt-5 text-xl font-black text-stone-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-stone-500 dark:text-stone-400 font-medium">{text}</p>
    </div>
  );
}

function BookingReviewCard({ booking, onRate, reviewed = false }) {
  const service = booking.serviceId || {};
  const provider = booking.providerId || {};

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
      <img src={getImageUrl(service.images?.[0])} alt={service.name} className="h-48 w-full object-cover sm:h-auto sm:w-48" />
      <div className="flex flex-1 flex-col p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary-600 dark:text-primary-500 mb-1">{service.category}</p>
          <h3 className="text-xl font-black text-stone-900 dark:text-white">{service.name}</h3>
        </div>

        <div className="mt-4 grid gap-2 text-sm font-bold text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-2"><UserCircleIcon className="h-5 w-5" /> {provider.name || 'Provider'}</span>
          <span className="flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5" /> {new Date(booking.date).toLocaleDateString()}</span>
        </div>

        {booking.review && (
          <div className="mt-5 rounded-xl bg-stone-50 p-4 border border-stone-100 dark:border-stone-800 dark:bg-stone-900">
            <StarRating value={booking.review.rating} readOnly size="h-4 w-4" />
            {booking.review.comment && <p className="mt-2 text-sm font-medium text-stone-600 dark:text-stone-300 line-clamp-2">"{booking.review.comment}"</p>}
          </div>
        )}

        <div className="mt-6">
          {reviewed ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 dark:text-primary-400">
              <CheckBadgeIcon className="h-5 w-5" /> Rating submitted
            </span>
          ) : (
            <button onClick={() => onRate(booking)} className="btn-primary w-full text-center">
              Rate Provider
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ReviewCard({ review, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary-600 dark:text-primary-500 mb-1">{review.serviceId?.category}</p>
          <h3 className="text-lg font-black text-stone-900 dark:text-white">{review.serviceId?.name}</h3>
          <p className="text-sm font-bold text-stone-500 mt-1">Provider: {review.providerId?.name}</p>
        </div>
        <StarRating value={review.rating} readOnly size="h-5 w-5" />
      </div>
      
      {review.comment && (
        <p className="text-stone-600 dark:text-stone-300 font-medium italic bg-stone-50 dark:bg-stone-900 rounded-xl p-4 border border-stone-100 dark:border-stone-800">
          "{review.comment}"
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
        <span className="text-xs font-bold text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
        <div className="flex gap-2">
          <button onClick={() => onEdit(review)} className="btn-secondary px-4 py-2 text-xs">Edit</button>
          <button onClick={() => onDelete(review._id)} className="rounded-full bg-red-50 text-red-600 font-bold px-4 py-2 text-xs hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition">Delete</button>
        </div>
      </div>
    </motion.div>
  );
}

export default CustomerReviews;
