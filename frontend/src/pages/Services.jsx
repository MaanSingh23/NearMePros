import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import ServiceCard from '../components/ServiceCard';
import CategoryFilter from '../components/CategoryFilter';
import api from '../utils/api';
import { AdjustmentsHorizontalIcon, ArrowPathIcon, ExclamationTriangleIcon, FunnelIcon, MagnifyingGlassIcon, MapPinIcon, SparklesIcon } from '@heroicons/react/24/outline';

function Services() {
  const [searchParams] = useSearchParams();
  const {
    location,
    loading: locationLoading,
    error: locationError,
    isDefaultLocation,
    refreshLocation
  } = useLocation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    search: searchParams.get('search') || '',
    radius: 10,
    minPrice: '',
    maxPrice: '',
    rating: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const locationDetails = location?.lat && location?.lng
    ? `${location.address || location.area || location.city || 'Detected area'} • ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.accuracy ? ` • accuracy around ${Math.round(location.accuracy)} meters` : ''}`
    : null;

  // Debounced filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (location) {
        fetchServices();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [location, filters.category, filters.radius, filters.minPrice, filters.maxPrice, filters.rating]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/services/nearby', {
        params: {
          lat: location.lat,
          lng: location.lng,
          radius: filters.radius, 
          minPrice: filters.minPrice || undefined, 
          maxPrice: filters.maxPrice || undefined, 
          rating: filters.rating > 0 ? filters.rating : undefined,
          category: filters.category !== 'all' ? filters.category : undefined
        }
      });
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const search = filters.search.trim().toLowerCase();
    if (!search) return true;
    
    return [service.name, service.category, service.description, service.providerId?.name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search));
  });

  return (
    <div className="min-h-screen py-10 bg-stone-50 dark:bg-[#0c0a09] text-stone-900 dark:text-stone-100">
      <div className="section-shell">
        <div className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-[#0c0a09] p-6 text-white shadow-2xl sm:p-10">
          {/* Emerald gradient glows - matching CTA section */}
          <div className="absolute top-0 right-0 h-[28rem] w-[28rem] translate-x-1/3 -translate-y-1/4 rounded-full bg-primary-900/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] -translate-x-1/4 translate-y-1/4 rounded-full bg-primary-800/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-2 text-sm font-black text-primary-400">
                <SparklesIcon className="h-4 w-4" />
                Curated local services near you
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl text-white">Find the right expert for the job.</h1>
              {locationLoading ? (
                <div className="mt-5 flex items-center text-stone-400">
                  <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin text-amber-500" />
                  <span>Detecting your current location...</span>
                </div>
              ) : location ? (
                <div className="mt-5 flex flex-wrap items-center gap-3 text-stone-300">
                  <span className="inline-flex items-center font-bold">
                    <MapPinIcon className="mr-2 h-5 w-5 text-amber-500" />
                    Showing services within {filters.radius} km of {location.label || (isDefaultLocation ? 'Delhi, India' : 'your current location')}
                  </span>
                  {locationError && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-sm font-bold text-amber-400">
                      <ExclamationTriangleIcon className="mr-1 h-4 w-4" />
                      Default location active
                    </span>
                  )}
                  {locationDetails && (
                    <span className="text-sm font-medium text-stone-500">{locationDetails}</span>
                  )}
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-3 text-stone-400">
                  <p className="font-bold">Enable location to discover nearby providers.</p>
                  <button
                    type="button"
                    onClick={() => refreshLocation({ force: true })}
                    className="rounded-full bg-primary-500 px-4 py-2 text-sm font-black text-stone-950 transition hover:bg-primary-400"
                  >
                    Detect location
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <label className="sr-only" htmlFor="service-search">Search services</label>
              <div className="flex items-center gap-3 rounded-[1.5rem] bg-white/5 border border-white/5 px-4 py-3 text-white">
                <MagnifyingGlassIcon className="h-5 w-5 text-primary-400" />
                <input
                  id="service-search"
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search service, category, provider..."
                  className="w-full bg-transparent font-bold outline-none placeholder:text-stone-500 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mb-4 flex items-center rounded-2xl bg-white dark:bg-stone-900 p-3 font-bold text-stone-800 dark:text-stone-200 shadow-sm ring-1 ring-stone-200 dark:ring-stone-800 lg:hidden"
        >
          <FunnelIcon className="mr-2 h-5 w-5" />
          Filters
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-28 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-5 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900">
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-black text-stone-900 dark:text-white">Filters</h3>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Refine your results</p>
                </div>
              </div>
              
              <CategoryFilter
                selected={filters.category}
                onChange={(category) => setFilters({ ...filters, category })}
              />

              <div className="mt-6">
                <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-300">
                  Distance (km)
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={filters.radius}
                  onChange={(e) => setFilters({ ...filters, radius: e.target.value })}
                  className="w-full accent-primary-600 dark:accent-primary-500"
                />
                <div className="mt-1 text-sm font-bold text-stone-600 dark:text-stone-400">{filters.radius} km</div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-300">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="rounded-2xl border border-stone-200 bg-white dark:bg-stone-950 dark:border-stone-800 px-3 py-3 text-sm font-bold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:focus:border-primary-500/50"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="rounded-2xl border border-stone-200 bg-white dark:bg-stone-950 dark:border-stone-800 px-3 py-3 text-sm font-bold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:focus:border-primary-500/50"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-stone-300">
                  Minimum Rating
                </label>
                <select
                  value={filters.rating}
                  onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:bg-stone-950 dark:border-stone-800 dark:text-white"
                >
                  <option value="0">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-5 flex flex-col justify-between gap-3 rounded-[1.75rem] border border-stone-200 bg-white px-6 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center">
              <p className="font-black text-stone-900 dark:text-white">
                {loading ? 'Finding trusted services...' : `${filteredServices.length} service${filteredServices.length === 1 ? '' : 's'} found`}
              </p>
              <p className="text-sm font-bold text-stone-500 dark:text-stone-400">Sort and booking details stay connected to your current backend data.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-lg shadow-stone-900/5 dark:border-stone-800 dark:bg-stone-900">
                    <div className="mb-4 h-64 animate-pulse rounded-[1.5rem] bg-stone-200 dark:bg-stone-800"></div>
                    <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
                    <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
                  </div>
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white py-16 text-center dark:border-stone-800 dark:bg-stone-900">
                <p className="text-lg font-black text-stone-900 dark:text-white">No services found for these filters</p>
                <p className="mt-2 text-stone-500 font-medium dark:text-stone-400">Try a wider distance, lower rating, or different category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                {filteredServices.map((service) => (
                  <ServiceCard key={service._id} service={service} className="shadow-lg shadow-stone-900/5 dark:shadow-black/20" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Services;
