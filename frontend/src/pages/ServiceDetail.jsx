import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  StarIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { location: userLocation } = useLocation();
  
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: new Date(),
    time: '10:00',
    duration: 1,
    description: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  // Backup images in case uploaded images fail
  const fallbackImages = [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800'
  ];

  useEffect(() => {
    fetchServiceDetails();
    fetchReviews();
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/services/${id}`);
      setService(response.data);
      setProvider(response.data.providerId);
    } catch (error) {
      console.error('Error fetching service details:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/reviews/service/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to book this service');
      navigate('/login');
      return;
    }

    if (user?.role === 'provider') {
      toast.error('Providers cannot book services');
      return;
    }

    setBookingLoading(true);

    try {
      const bookingPayload = {
        serviceId: id,
        date: bookingData.date,
        time: bookingData.time,
        duration: bookingData.duration,
        description: bookingData.description,
        location: {
          address: userLocation?.address || 'Address not provided',
          coordinates: userLocation ? [userLocation.lng, userLocation.lat] : [77.1025, 28.7041]
        }
      };

      const response = await axios.post(
        'http://localhost:5000/api/bookings',
        bookingPayload,
        { headers: { 'x-auth-token': localStorage.getItem('token') } }
      );

      toast.success('Booking request sent successfully!');
      setShowBookingModal(false);
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  // COMPLETE IMAGE URL FUNCTION - Handles all cases
  const getImageUrl = (imagePath, index = 0) => {
    // If no image path, return fallback
    if (!imagePath) return fallbackImages[index % fallbackImages.length];
    
    // If it's already a full URL (http, https)
    if (imagePath.startsWith('http')) return imagePath;
    
    // If path already has 'uploads/'
    if (imagePath.includes('uploads/')) {
      // Extract just the filename
      const filename = imagePath.split('uploads/')[1].split('\\').pop().split('/').pop();
      return `http://localhost:5000/uploads/${filename}`;
    }
    
    // If it's just a filename
    return `http://localhost:5000/uploads/${imagePath}`;
  };

  // Error handler for images
  const handleImageError = (e, index = 0) => {
    console.log('Image failed to load:', e.target.src);
    e.target.src = fallbackImages[index % fallbackImages.length];
  };

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-stone-50 dark:bg-[#0c0a09] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-stone-50 dark:bg-[#0c0a09] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-black text-stone-900 dark:text-white mb-2">Service Not Found</h2>
          <p className="text-stone-500 font-medium dark:text-stone-400 mb-6">The service you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/services')}
            className="btn-primary"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  // Prepare images array - mix of uploaded and fallback
  const displayImages = service.images?.length > 0 
    ? service.images 
    : fallbackImages;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-stone-50 dark:bg-[#0c0a09] py-8 text-stone-900 dark:text-stone-100">
      <div className="section-shell">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-500 dark:hover:text-primary-400 font-bold mb-6 transition"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1 font-bold" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden mb-8"
            >
              <div className="relative h-[550px]">
                <img
                  src={getImageUrl(displayImages[selectedImage], selectedImage)}
                  alt={service.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => handleImageError(e, selectedImage)}
                />
                
                {displayImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage(prev => (prev - 1 + displayImages.length) % displayImages.length)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-xl transition"
                    >
                      <ChevronLeftIcon className="h-6 w-6 text-stone-800" />
                    </button>
                    <button
                      onClick={() => setSelectedImage(prev => (prev + 1) % displayImages.length)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-xl transition"
                    >
                      <ChevronRightIcon className="h-6 w-6 text-stone-800" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>

            {/* Service Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl p-8 mb-8"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
                <div>
                  <h1 className="text-4xl font-black text-stone-900 dark:text-white mb-3">{service.name}</h1>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="px-4 py-1.5 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 rounded-full text-sm font-bold tracking-wide">
                      {service.category}
                    </span>
                    <div className="flex items-center">
                      <StarIconSolid className="h-5 w-5 text-amber-500" />
                      <span className="ml-1.5 font-black text-stone-900 dark:text-white">{service.rating?.toFixed(1) || '0.0'}</span>
                      <span className="ml-1.5 font-semibold text-stone-500 dark:text-stone-400">({service.totalReviews || 0} reviews)</span>
                    </div>
                  </div>
                </div>
                
                {service.isVerified && (
                  <div className="flex items-center shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 px-4 py-2 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheckIcon className="h-5 w-5 mr-1.5" />
                    <span className="text-sm font-bold">Verified Service</span>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-black text-stone-900 dark:text-white mb-3 block">Description</h3>
                <p className="text-stone-600 dark:text-stone-400 font-medium leading-relaxed">{service.description}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-stone-50 dark:bg-stone-800/50 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 p-5 text-center">
                  <CurrencyRupeeIcon className="h-7 w-7 mx-auto text-primary-600 dark:text-primary-500 mb-3" />
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-1">Price</p>
                  <p className="font-black text-lg text-stone-900 dark:text-white">₹{service.price}/{service.priceType}</p>
                </div>
                
                <div className="bg-stone-50 dark:bg-stone-800/50 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 p-5 text-center">
                  <ClockIcon className="h-7 w-7 mx-auto text-primary-600 dark:text-primary-500 mb-3" />
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-1">Duration</p>
                  <p className="font-black text-lg text-stone-900 dark:text-white">{service.duration || '1'} hour</p>
                </div>
                
                <div className="bg-stone-50 dark:bg-stone-800/50 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 p-5 text-center">
                  <MapPinIcon className="h-7 w-7 mx-auto text-primary-600 dark:text-primary-500 mb-3" />
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-1">Distance</p>
                  <p className="font-black text-lg text-stone-900 dark:text-white">Within {service.location?.serviceRadius || 10} km</p>
                </div>
                
                <div className="bg-stone-50 dark:bg-stone-800/50 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 p-5 text-center">
                  <CalendarIcon className="h-7 w-7 mx-auto text-primary-600 dark:text-primary-500 mb-3" />
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-1">Available</p>
                  <p className="font-black text-lg text-stone-900 dark:text-white">Today</p>
                </div>
              </div>
            </motion.div>

            {/* Reviews Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl p-8"
            >
              <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-8">
                Customer Reviews ({reviews.length})
              </h2>

              {reviews.length === 0 ? (
                <p className="text-stone-500 dark:text-stone-400 text-center font-bold py-8">No reviews yet</p>
              ) : (
                <div className="space-y-8">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-b border-stone-200 dark:border-stone-800 last:border-0 pb-8 last:pb-0">
                      <div className="flex items-start space-x-4">
                        <img
                          src={review.userId?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
                          alt={review.userId?.name}
                          className="h-12 w-12 rounded-full object-cover shadow-sm"
                          onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-black text-stone-900 dark:text-white text-lg">{review.userId?.name}</h4>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <StarIconSolid
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating ? 'text-amber-500' : 'text-stone-200 dark:text-stone-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-stone-500 dark:text-stone-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-stone-600 dark:text-stone-300 font-medium mt-3">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Provider Info & Booking */}
          <div className="lg:col-span-1">
            {/* Provider Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-xl p-8 mb-6 sticky top-28"
            >
              <h2 className="text-xl font-black text-stone-900 dark:text-white mb-6">Service Provider</h2>
              
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={provider?.avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
                  alt={provider?.name}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-stone-100 dark:ring-stone-800 shadow-sm"
                  onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
                />
                <div>
                  <h3 className="font-black text-stone-900 dark:text-white text-lg">{provider?.name}</h3>
                  <div className="flex items-center mt-1">
                    <StarIconSolid className="h-4 w-4 text-amber-500" />
                    <span className="ml-1 font-bold text-stone-700 dark:text-stone-300 text-sm">{provider?.rating || '0.0'}</span>
                  </div>
                  {provider?.isVerified && (
                    <span className="inline-flex items-center mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-500">
                      <ShieldCheckIcon className="h-4 w-4 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8 bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 border border-stone-200 dark:border-stone-800">
                <div className="flex items-center text-stone-600 dark:text-stone-300 font-medium text-sm">
                  <PhoneIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-500 shrink-0" />
                  <span>{provider?.phone}</span>
                </div>
                <div className="flex items-center text-stone-600 dark:text-stone-300 font-medium text-sm">
                  <EnvelopeIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-500 shrink-0" />
                  <span className="truncate">{provider?.email}</span>
                </div>
                <div className="flex items-center text-stone-600 dark:text-stone-300 font-medium text-sm">
                  <MapPinIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-500 shrink-0" />
                  <span className="line-clamp-2">{provider?.location?.address || 'Address not available'}</span>
                </div>
              </div>

              {/* Booking Button */}
              <button
                onClick={() => setShowBookingModal(true)}
                className="btn-primary w-full text-center"
              >
                Book Now
              </button>

              <p className="text-xs font-bold text-stone-400 dark:text-stone-500 text-center mt-4 uppercase tracking-widest">
                You won't be charged yet
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-stone-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <h2 className="text-2xl font-black text-stone-900 dark:text-white">Book This Service</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                >
                  <XCircleIcon className="h-7 w-7" />
                </button>
              </div>

              <form onSubmit={handleBooking} className="space-y-5">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                    Select Date
                  </label>
                  <DatePicker
                    selected={bookingData.date}
                    onChange={(date) => setBookingData({ ...bookingData, date })}
                    minDate={new Date()}
                    className="input-field"
                    dateFormat="MMMM d, yyyy"
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                    Select Time
                  </label>
                  <select
                    value={bookingData.time}
                    onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                    className="input-field text-stone-900 dark:text-white"
                  >
                    {timeSlots.map((time) => (
                      <option key={time} value={time} className="text-stone-900 bg-white dark:bg-stone-900 dark:text-white">{time}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                    Duration (hours)
                  </label>
                  <select
                    value={bookingData.duration}
                    onChange={(e) => setBookingData({ ...bookingData, duration: parseInt(e.target.value) })}
                    className="input-field text-stone-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => (
                      <option key={hours} value={hours} className="text-stone-900 bg-white dark:bg-stone-900 dark:text-white">{hours} hour{hours > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={bookingData.description}
                    onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                    rows="3"
                    className="input-field resize-none"
                    placeholder="Tell the provider more about your requirements..."
                  />
                </div>

                {/* Price Summary */}
                <div className="bg-stone-50 dark:bg-stone-800/50 rounded-[1.5rem] border border-stone-200 dark:border-stone-800 p-5 mt-6">
                  <div className="flex justify-between mb-3 text-sm font-bold">
                    <span className="text-stone-500 dark:text-stone-400">Price per hour</span>
                    <span className="text-stone-900 dark:text-white">₹{service.price}</span>
                  </div>
                  <div className="flex justify-between mb-3 text-sm font-bold">
                    <span className="text-stone-500 dark:text-stone-400">Duration</span>
                    <span className="text-stone-900 dark:text-white">{bookingData.duration} hour(s)</span>
                  </div>
                  <div className="border-t border-stone-200 dark:border-stone-700 mt-4 pt-4">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-black text-stone-900 dark:text-white">Total Amount</span>
                      <span className="font-black text-primary-600 dark:text-primary-400 text-2xl">₹{service.price * bookingData.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="btn-primary w-full mt-6 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetail;