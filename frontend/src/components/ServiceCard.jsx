import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/solid';
import { ArrowRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

function ServiceCard({ service }) {
  const { _id, name, category, description, price, priceType, rating, totalReviews, providerId, images, isVerified } = service;

  const fallbackImages = [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400'
  ];

  const fallbackIndex = _id ? _id.length % fallbackImages.length : 0;

  const getImageUrl = (imagePath) => {
    if (!imagePath) return fallbackImages[fallbackIndex];
    
    // If the backend returns a localhost URL, we MUST replace it with the live Render URL
    let cleanPath = imagePath;
    if (typeof cleanPath === 'string' && cleanPath.includes('localhost:5000')) {
      cleanPath = cleanPath.split('uploads/').pop();
    } else if (typeof cleanPath === 'string' && cleanPath.startsWith('http')) {
      return cleanPath;
    }

    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    // Ensure we don't have double 'uploads/' and fix backslashes
    const finalPath = cleanPath.includes('uploads/') ? cleanPath.split('uploads/').pop() : cleanPath;
    return `${baseUrl}/uploads/${finalPath.replace(/\\/g, '/')}`;
  };

  const serviceImage = images && images.length > 0 
    ? getImageUrl(images[0])
    : fallbackImages[fallbackIndex];

  return (
    <Link to={`/service/${_id}`} className="block group">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-stone-200 bg-white shadow-xl shadow-stone-900/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/20 dark:group-hover:shadow-black/40">
        <div className="absolute inset-x-5 top-5 z-10 flex items-center justify-between">
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-stone-700 shadow-sm backdrop-blur dark:bg-stone-900/90 dark:text-stone-200">
            {category}
          </span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-primary-500/25">
              <ShieldCheckIcon className="h-4 w-4" />
              Verified
            </span>
          )}
        </div>

        <div className="relative h-72 w-full overflow-hidden">
          <img
            src={serviceImage}
            alt={name}
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-110"
            onError={(e) => {
              e.target.src = fallbackImages[fallbackIndex];
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent dark:from-stone-950 dark:via-stone-950/40" />
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
            <div>
              <h3 className="line-clamp-2 text-2xl font-black leading-tight text-white">{name}</h3>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-sm font-black text-amber-700 backdrop-blur dark:bg-stone-900/90 dark:text-amber-400">
                <StarIcon className="h-4 w-4 text-amber-500" />
                {rating?.toFixed(1) || '0.0'}
                <span className="font-bold text-stone-500 dark:text-stone-400">({totalReviews || 0})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="mb-5 line-clamp-2 min-h-[3rem] text-sm leading-6 text-stone-600 dark:text-stone-400 font-medium">{description}</p>

          <div className="flex items-center justify-between rounded-3xl bg-stone-50 p-4 dark:bg-stone-800/50">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-stone-400 dark:text-stone-500">Starting at</span>
              <div>
                <span className="text-2xl font-black text-stone-950 dark:text-white">₹{price}</span>
                <span className="text-sm font-bold text-stone-500 dark:text-stone-400">/{priceType === 'hourly' ? 'hr' : 'fixed'}</span>
              </div>
            </div>
            
            <div className="flex items-center rounded-full bg-white px-3 py-2 text-sm font-bold text-stone-600 shadow-sm dark:bg-stone-800 dark:text-stone-300">
              <UserIcon className="mr-1 h-4 w-4 text-primary-600 dark:text-primary-500" />
              <span>{providerId?.name?.split(' ')[0] || 'Provider'}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            {providerId?.location?.address ? (
              <div className="min-w-0 flex items-center text-xs font-bold text-stone-500 dark:text-stone-400">
                <MapPinIcon className="mr-1 h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">{providerId.location.address}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-stone-400 dark:text-stone-500">Location details available after booking</span>
            )}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition group-hover:bg-primary-600 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:bg-primary-500 dark:group-hover:text-stone-900">
              <ArrowRightIcon className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ServiceCard;
