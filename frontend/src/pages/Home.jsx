import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import {
  ArrowRightIcon,
  ArrowPathIcon,
  BoltIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  HomeModernIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import axios from 'axios';
import { useLocation } from '../context/LocationContext';
import ServiceCard from '../components/ServiceCard';

const heroImage = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=85';

const categories = [
  { name: 'Cleaning', label: 'Deep cleaning, moves', icon: SparklesIcon, tone: 'bg-primary-500', surface: 'border-primary-500/20 bg-primary-50/50 hover:bg-primary-50 dark:bg-primary-950/20 dark:hover:bg-primary-900/30' },
  { name: 'Plumbing', label: 'Leaks, taps, fittings', icon: WrenchScrewdriverIcon, tone: 'bg-emerald-600', surface: 'border-emerald-500/20 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30' },
  { name: 'Electrical', label: 'Switches, wiring', icon: BoltIcon, tone: 'bg-amber-500', surface: 'border-amber-500/20 bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-900/30' },
  { name: 'Painting', label: 'Rooms, touch-ups', icon: PaintBrushIcon, tone: 'bg-rose-500', surface: 'border-rose-500/20 bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-900/30' },
  { name: 'Carpentry', label: 'Furniture assembly', icon: HomeModernIcon, tone: 'bg-stone-700', surface: 'border-stone-500/20 bg-stone-100/50 hover:bg-stone-100 dark:bg-stone-800/40 dark:hover:bg-stone-800/60' },
  { name: 'AC Repair', label: 'Cooling, service', icon: ShieldCheckIcon, tone: 'bg-fuchsia-600', surface: 'border-fuchsia-500/20 bg-fuchsia-50/50 hover:bg-fuchsia-50 dark:bg-fuchsia-950/20 dark:hover:bg-fuchsia-900/30' }
];

const popularSearches = ['Deep cleaning', 'AC Repair', 'Plumbing', 'Electrical'];

const trustStats = [
  { value: '2K+', label: 'Jobs Done' },
  { value: '4.8', label: 'Avg Rating' },
  { value: '30m', label: 'Avg Arrival' }
];

function Home() {
  const { location, loading: locationLoading, error: locationError, refreshLocation } = useLocation();
  const navigate = useNavigate();
  const [nearbyServices, setNearbyServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchLatestReviews();
    if (location) fetchNearbyServices();
  }, [location]);

  const fetchNearbyServices = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/services/nearby', {
        params: { lat: location.lat, lng: location.lng, radius: 10 }
      });
      setNearbyServices(response.data.slice(0, 3)); // Focus on top 3 for clean aesthetic
    } catch (error) {
      setNearbyServices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestReviews = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reviews/latest?limit=6');
      setReviews(response.data);
    } catch (error) {
      // Silently handle - reviews are non-critical
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchTerm.trim()) navigate(`/services?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <div className="min-h-screen text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-[#0c0a09]">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 h-[40rem] w-[40rem] translate-x-1/3 -translate-y-1/4 rounded-full bg-primary-100 blur-3xl dark:bg-primary-900/20" />
          <div className="absolute bottom-0 left-0 h-[30rem] w-[30rem] -translate-x-1/4 translate-y-1/4 rounded-full bg-amber-100 blur-3xl dark:bg-amber-900/10" />
        </div>
        
        <div className="section-shell relative z-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-700 dark:border-primary-800/50 dark:bg-primary-900/20 dark:text-primary-400">
                <SparklesIcon className="h-4 w-4" />
                Premium Local Expertise
              </div>
              <h1 className="mt-8 text-5xl font-black leading-[1.05] tracking-tight text-stone-950 dark:text-white sm:text-6xl lg:text-7xl">
                Book verified pros with <span className="text-primary-600 dark:text-primary-500">absolute confidence.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600 dark:text-stone-400 sm:text-xl">
                Skip the guesswork. We curate the highest-rated service professionals in your area for an effortless booking experience.
              </p>

              <form onSubmit={handleSearch} className="mt-10 max-w-xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="What service do you need?"
                      className="h-14 w-full rounded-[2rem] border border-stone-200 bg-white pl-12 pr-6 font-bold text-stone-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 dark:border-stone-800 dark:bg-stone-900 dark:text-white dark:focus:border-primary-500/50"
                    />
                  </div>
                  <button type="submit" className="btn-primary h-14 whitespace-nowrap">
                    Search Now
                  </button>
                </div>
              </form>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-stone-500">Popular:</span>
                {popularSearches.map((item) => (
                  <button key={item} onClick={() => navigate(`/services?search=${encodeURIComponent(item)}`)} className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-bold text-stone-600 transition hover:border-primary-500 hover:text-primary-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-primary-500">
                    {item}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative hidden lg:block">
              <div className="absolute inset-0 -translate-x-4 translate-y-4 rounded-[2rem] border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900"></div>
              <img src={heroImage} alt="Premium Service" className="relative z-10 w-full rounded-[2rem] object-cover shadow-2xl h-[36rem]" />
            </motion.div>

          </div>
        </div>
      </section>

      {/* Categories Bento Box */}
      <section className="py-20 bg-white dark:bg-[#0c0a09] border-y border-stone-200/50 dark:border-stone-800/50">
        <div className="section-shell">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-stone-950 dark:text-white sm:text-4xl">Essential Services</h2>
              <p className="mt-3 text-stone-600 dark:text-stone-400">Tailored categories for seamless discovery.</p>
            </div>
            <Link to="/services" className="text-sm font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400">
              View all categories &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.name}
                  onClick={() => navigate(`/services?category=${encodeURIComponent(cat.name)}`)}
                  className={`group flex items-center gap-5 rounded-[2rem] border p-5 text-left transition-all duration-300 ${cat.surface}`}
                >
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] text-white shadow-md ${cat.tone}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white">{cat.name}</h3>
                    <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-0.5">{cat.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recommended Local - Clean Grid */}
      <section className="py-24 relative overflow-hidden">
        <div className="section-shell relative z-10">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end p-8 rounded-[2rem] bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-2">
                <MapPinIcon className="h-5 w-5" />
                Near You
              </div>
              <h2 className="text-3xl font-black tracking-tight text-stone-950 dark:text-white">Top Rated Providers</h2>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => refreshLocation({ force: true })} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-stone-700 shadow-sm transition hover:shadow-md dark:bg-stone-800 dark:text-stone-300">
                {locationLoading ? 'Updating...' : 'Update Location'}
              </button>
              <Link to="/services" className="btn-primary py-2.5 text-sm">See all</Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-80 rounded-[2rem] bg-stone-200 animate-pulse dark:bg-stone-800/50" />
              ))}
            </div>
          ) : nearbyServices.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {nearbyServices.map(service => (
                <ServiceCard key={service._id} service={service} className="shadow-lg shadow-stone-900/5 dark:shadow-black/20" />
              ))}
            </div>
          ) : (
             <div className="flex min-h-[16rem] items-center justify-center rounded-[2rem] border border-stone-200 border-dashed bg-white/50 dark:border-stone-800 dark:bg-stone-900/20">
               <p className="text-stone-500 font-medium">Allow location to see nearby recommendations.</p>
             </div>
          )}
        </div>
      </section>

      {/* Customer Reviews Section */}
      {reviews.length > 0 && (
        <section className="py-24 relative overflow-hidden bg-white dark:bg-[#0c0a09]">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-200 dark:via-stone-800 to-transparent" />
          
          <div className="section-shell relative z-10">
            {/* Header */}
            <div className="text-center mb-16">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 rounded-full border border-stone-100 bg-stone-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-6 dark:border-white/5 dark:bg-white/5 dark:text-emerald-400"
              >
                <StarIconSolid className="h-3 w-3" /> Testimonials
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-white">
                Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500 dark:from-emerald-400 dark:to-amber-400">customers.</span>
              </h2>
              <p className="mt-4 text-stone-500 dark:text-stone-400 max-w-xl mx-auto text-lg font-medium">
                Hear from our community about their experiences with local professionals.
              </p>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review, idx) => {
                const gradients = [
                  'from-emerald-50 via-emerald-100 to-teal-50',
                  'from-amber-50 via-amber-100 to-orange-50',
                  'from-sky-50 via-sky-100 to-blue-50',
                  'from-rose-50 via-rose-100 to-pink-50',
                  'from-indigo-50 via-indigo-100 to-purple-50',
                  'from-stone-50 via-stone-100 to-stone-200/50'
                ];
                const cardGradient = gradients[idx % gradients.length];

                return (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative flex flex-col h-full rounded-[2.5rem] border border-stone-200 bg-white p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 dark:bg-stone-900/40 dark:border-white/5 dark:backdrop-blur-xl"
                  >
                    {/* Top: Profile Header */}
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-primary-500 blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
                        <img 
                          src={review.userId?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${review.userId?.name}`} 
                          className="relative h-24 w-24 rounded-full object-cover ring-4 ring-stone-50 dark:ring-stone-800 shadow-xl" 
                          alt={review.userId?.name}
                        />
                        <div className="absolute -bottom-1 -right-1 bg-primary-500 rounded-full p-1.5 border-4 border-white dark:border-stone-900 shadow-lg">
                          <CheckBadgeIcon className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight uppercase">
                        {review.userId?.name}
                      </h3>
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 dark:bg-emerald-500/10">
                        <div className="h-1 w-1 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                          Verified Client
                        </span>
                      </div>
                    </div>

                    {/* Middle: Elite Rating Section */}
                    <div className="mt-8 flex justify-center">
                      <div className="flex items-center gap-1.5 px-6 py-4 rounded-3xl bg-stone-50 dark:bg-stone-950/40 border border-stone-100 dark:border-white/5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <StarIconSolid
                            key={star}
                            className={`h-10 w-10 ${star <= review.rating ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'text-stone-200 dark:text-stone-800'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Bottom: The Content */}
                    <div className="mt-10 flex flex-col flex-grow text-center">
                      <div className="relative mb-10">
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-6xl text-stone-100 dark:text-white/5 font-serif pointer-events-none">"</span>
                        <p className="text-xl font-bold text-stone-700 dark:text-stone-200 leading-relaxed italic relative z-10 px-4">
                          {review.comment || 'Outstanding service from start to finish. Highly professional approach and attention to detail.'}
                        </p>
                        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-6xl text-stone-100 dark:text-white/5 font-serif rotate-180 pointer-events-none">"</span>
                      </div>
                      
                      <div className="mt-auto pt-8 border-t border-stone-100 dark:border-white/5 space-y-4">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Service:</span>
                          <span className="text-[11px] font-black text-stone-900 dark:text-white uppercase tracking-wider">
                            {review.serviceId?.name}
                          </span>
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <p className="text-[12px] font-black text-stone-900 dark:text-white uppercase tracking-[0.1em]">
                            EXPERT: <span className="text-primary-600 dark:text-primary-400 font-black">{review.providerId?.name || 'Professional'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-white dark:bg-[#0c0a09]">
        <div className="section-shell">
          <div className="overflow-hidden rounded-[3rem] bg-[#0c0a09] text-white shadow-2xl relative">
             {/* Emerald gradient glow matching hero section */}
             <div className="absolute top-0 right-0 h-[30rem] w-[30rem] translate-x-1/3 -translate-y-1/4 rounded-full bg-primary-900/30 blur-3xl" />
             <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] -translate-x-1/4 translate-y-1/4 rounded-full bg-primary-800/20 blur-3xl" />
             
             <div className="relative z-10 p-12 md:p-20 grid gap-8 md:grid-cols-2 items-center">
                <div>
                  <h2 className="text-4xl font-black tracking-tight sm:text-5xl leading-tight">Elevate your home services.</h2>
                  <p className="mt-4 text-stone-400 text-lg max-w-md">Join thousands of users who have streamlined their local booking experience.</p>
                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link to="/register" className="rounded-full bg-primary-500 px-8 py-4 font-bold text-stone-950 hover:bg-primary-400 transition transform hover:-translate-y-1 shadow-lg shadow-primary-500/20">
                      Join Near Me Pros
                    </Link>
                    <Link to="/services" className="rounded-full bg-white/10 border border-white/10 px-8 py-4 font-bold text-white hover:bg-white/15 transition backdrop-blur-sm">
                      Browse Services
                    </Link>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 md:justify-self-end mt-8 md:mt-0">
                  {trustStats.map(stat => (
                    <div key={stat.label} className="rounded-[1.5rem] bg-white/5 p-6 backdrop-blur-md border border-white/10">
                      <p className="text-3xl font-black text-primary-400">{stat.value}</p>
                      <p className="mt-2 text-sm font-bold uppercase tracking-wider text-stone-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
