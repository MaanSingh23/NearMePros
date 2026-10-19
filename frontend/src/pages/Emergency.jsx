import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import {
  PhoneIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { StarIcon, MapPinIcon, BoltIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import api, { getUploadsUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import LocationPicker from '../components/LocationPicker';
import CallButton from '../components/CallButton';
import { BOOKINGS_CHANGED } from '../utils/socket';

const POLL_MS = 8000;

const typeVisuals = {
  electrical: { emoji: '⚡', ring: 'ring-amber-400', tint: 'bg-amber-50 dark:bg-amber-950/30' },
  plumbing: { emoji: '💧', ring: 'ring-sky-400', tint: 'bg-sky-50 dark:bg-sky-950/30' },
  appliance: { emoji: '❄️', ring: 'ring-cyan-400', tint: 'bg-cyan-50 dark:bg-cyan-950/30' },
  lock: { emoji: '🚪', ring: 'ring-stone-400', tint: 'bg-stone-100 dark:bg-stone-800/60' },
  pest: { emoji: '🐝', ring: 'ring-yellow-400', tint: 'bg-yellow-50 dark:bg-yellow-950/30' },
  cleaning: { emoji: '🧹', ring: 'ring-emerald-400', tint: 'bg-emerald-50 dark:bg-emerald-950/30' }
};

// Official Indian helplines for life-threatening situations
const helplines = [
  { label: 'Emergency', number: '112', icon: '🚓' },
  { label: 'Fire', number: '101', icon: '🔥' },
  { label: 'Ambulance', number: '108', icon: '🚑' },
  { label: 'LPG gas leak', number: '1906', icon: '🛢️' }
];

const statusSteps = [
  { key: 'pending', label: 'Request sent' },
  { key: 'confirmed', label: 'Accepted · on the way' },
  { key: 'in-progress', label: 'Work in progress' },
  { key: 'completed', label: 'Completed' }
];

const formatKm = (km) => (km == null ? '' : km < 0.1 ? '<100 m' : `${km} km`);

const elapsedText = (since) => {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  return m > 0 ? `${m} min ${secs % 60}s ago` : `${secs}s ago`;
};

// ---------------------------------------------------------------------------
// Map of the customer and nearby professionals
// ---------------------------------------------------------------------------
const pinIcon = (html, size = 34) => L.divIcon({
  className: '',
  html,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2]
});

const EmergencyMap = ({ center, results, highlightId, onSelect }) => {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return undefined;
    const map = L.map(elRef.current, { zoomControl: false, scrollWheelZoom: false }).setView([center.lat, center.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const you = L.marker([center.lat, center.lng], {
      icon: pinIcon('<div style="width:22px;height:22px;border-radius:50%;background:#dc2626;border:4px solid white;box-shadow:0 0 0 6px rgba(220,38,38,.25)"></div>', 22),
      zIndexOffset: 1000
    }).bindTooltip('You are here', { direction: 'top' });
    layer.addLayer(you);

    const bounds = [[center.lat, center.lng]];
    results.forEach((r, index) => {
      if (r.lat == null) return;
      const active = r._id === highlightId;
      const marker = L.marker([r.lat, r.lng], {
        icon: pinIcon(
          `<div style="width:30px;height:30px;border-radius:50%;background:${active ? '#059669' : '#1c1917'};color:white;display:flex;align-items:center;justify-content:center;font:800 12px system-ui;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3)">${index + 1}</div>`,
          30
        )
      })
        .bindTooltip(`${r.name} · ~${r.etaMinutes} min`, { direction: 'top' })
        .on('click', () => onSelect?.(r._id));
      layer.addLayer(marker);
      bounds.push([r.lat, r.lng]);
    });

    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    else map.setView([center.lat, center.lng], 14);
    setTimeout(() => map.invalidateSize(), 100);
  }, [center.lat, center.lng, results, highlightId, onSelect]);

  return <div ref={elRef} className="h-full w-full" />;
};

// ---------------------------------------------------------------------------
// Live status of a sent request
// ---------------------------------------------------------------------------
const OPEN_STATUSES = ['pending', 'confirmed', 'in-progress'];

const ActiveRequest = ({ active, onClear, onChooseAnother }) => {
  const [booking, setBooking] = useState(active.booking);
  const [, setTick] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  // Poll for the professional's response
  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      try {
        const { data } = await api.get(`/bookings/${active.booking._id}`, { silent: true });
        if (!stopped) setBooking(data);
      } catch (error) {
        // Not this account's request (or deleted) - stop showing it
        if (!stopped && [403, 404].includes(error.response?.status)) onClear();
        // otherwise keep showing the last known status (e.g. server waking up)
      }
    };
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    // Instant update when the professional responds (live alerts)
    const onChange = (e) => {
      if (!e.detail?.bookingId || String(e.detail.bookingId) === String(active.booking._id)) refresh();
    };
    window.addEventListener(BOOKINGS_CHANGED, onChange);
    const clock = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      stopped = true;
      clearInterval(poll);
      clearInterval(clock);
      window.removeEventListener(BOOKINGS_CHANGED, onChange);
    };
  }, [active.booking._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = booking.status;
  const stepIndex = statusSteps.findIndex((s) => s.key === status);
  const ended = ['rejected', 'cancelled'].includes(status);
  const provider = booking.providerId || {};

  const cancel = async () => {
    setCancelling(true);
    try {
      const { data } = await api.put(`/bookings/${booking._id}/status`, { status: 'cancelled' });
      setBooking(data.booking);
      toast.success('Emergency request cancelled');
    } catch {
      // API interceptor already shows the error
    } finally {
      setCancelling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-900"
    >
      <div className={`flex items-center justify-between px-5 py-4 text-white ${ended ? 'bg-stone-700' : status === 'completed' ? 'bg-primary-600' : 'bg-gradient-to-r from-red-600 to-rose-600'}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Your emergency request</p>
          <p className="text-lg font-black">
            {status === 'pending' && 'Waiting for the professional to accept…'}
            {status === 'confirmed' && `${provider.name || 'Professional'} accepted · on the way`}
            {status === 'in-progress' && 'Work in progress'}
            {status === 'completed' && 'Job completed ✓'}
            {status === 'rejected' && 'The professional is unavailable'}
            {status === 'cancelled' && 'Request cancelled'}
          </p>
        </div>
        {status === 'pending' && <span className="h-3 w-3 animate-ping rounded-full bg-white" />}
      </div>

      <div className="p-5">
        {/* Progress */}
        {!ended && (
          <ol className="mb-5 grid grid-cols-4 gap-2">
            {statusSteps.map((step, i) => (
              <li key={step.key} className="flex flex-col items-center text-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${i <= stepIndex ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-400 dark:bg-stone-800'}`}>
                  {i < stepIndex || status === 'completed' ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </span>
                <span className={`mt-1.5 text-[11px] font-bold leading-tight ${i <= stepIndex ? 'text-stone-900 dark:text-white' : 'text-stone-400'}`}>{step.label}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60">
          <div className="min-w-0">
            <p className="truncate font-bold text-stone-900 dark:text-white">{booking.serviceId?.name || 'Service'}</p>
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
              {provider.name}
              {booking.etaMinutes ? ` · ETA ~${booking.etaMinutes} min` : ''}
              {' · sent '}{elapsedText(booking.createdAt)}
            </p>
          </div>
          {provider.phone && !ended && (
            <CallButton
              phone={provider.phone}
              name={provider.name}
              message={`Hi ${provider.name || ''}, I sent you an emergency request on Near Me Pros for "${booking.serviceId?.name || 'your service'}". Please call me back.`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
            >
              <PhoneIcon className="h-4 w-4" /> Call {provider.name?.split(' ')[0] || 'now'}
            </CallButton>
          )}
        </div>

        {status === 'pending' && (
          <p className="mt-3 text-sm font-medium text-stone-500 dark:text-stone-400">
            The professional has been alerted. If they don't respond in a few minutes, call them directly or choose another professional.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {['pending', 'confirmed'].includes(status) && (
            <button onClick={cancel} disabled={cancelling} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
              {cancelling ? 'Cancelling…' : 'Cancel request'}
            </button>
          )}
          {(ended || status === 'pending') && (
            <button onClick={onChooseAnother} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              Choose another professional
            </button>
          )}
          {(ended || status === 'completed') && (
            <button onClick={onClear} className="rounded-xl px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
              Close
            </button>
          )}
          <Link to="/bookings" className="rounded-xl px-4 py-2 text-sm font-bold text-primary-700 hover:underline dark:text-primary-400">
            View in My Bookings →
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const Emergency = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  // Providers and admins can look but not request - requests are for customers
  const isStaffAccount = isAuthenticated && user?.role && user.role !== 'user';
  const isCustomer = !isStaffAccount;
  const { location, loading: locating } = useLocation();

  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState(searchParams.get('type') || null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [requestingId, setRequestingId] = useState(null);
  const [active, setActive] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const resultsRef = useRef(null);

  const selectedType = types.find((t) => t.id === typeId);

  useEffect(() => {
    api.get('/emergency/types').then(({ data }) => setTypes(data)).catch(() => {});
  }, []);

  // Show the logged-in customer's latest open emergency request (from any device)
  useEffect(() => {
    setActive(null);
    if (!isAuthenticated || isStaffAccount) return;
    let cancelled = false;
    api.get('/bookings/my-bookings', { silent: true })
      .then(({ data }) => {
        const open = (data || []).find((b) => b.isEmergency && OPEN_STATUSES.includes(b.status));
        if (!cancelled && open) setActive({ booking: open, typeId: open.emergencyType });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(async () => {
    if (!typeId || !location) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { data } = await api.get('/emergency/nearby', {
        params: { lat: location.lat, lng: location.lng, type: typeId }
      });
      setResults(data.results || []);
      setHighlightId(data.results?.[0]?._id || null);
    } catch (error) {
      setResults([]);
      setSearchError(error.response?.data?.message || 'Could not search for nearby help.');
    } finally {
      setSearching(false);
    }
  }, [typeId, location?.lat, location?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    search();
  }, [search]);

  const chooseType = (id) => {
    setTypeId(id);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const sendRequest = async (result) => {
    if (isStaffAccount) {
      toast.error('Emergency requests can only be sent from a customer account.');
      return;
    }
    if (!isAuthenticated) {
      toast('Please log in to send an emergency request - or call the professional directly.', { icon: '🔐' });
      navigate('/login');
      return;
    }
    if (String(phone).replace(/[^\d]/g, '').length < 10) {
      toast.error('Enter your phone number so the professional can call you back');
      document.getElementById('emergency-phone')?.focus();
      return;
    }
    setRequestingId(result._id);
    try {
      const { data } = await api.post('/emergency/request', {
        serviceId: result._id,
        emergencyType: typeId,
        description,
        contactPhone: phone,
        location: { lat: location.lat, lng: location.lng, address: location.address || location.label }
      });
      setActive({ booking: data.booking, typeId });
      if (data.duplicate) {
        toast('You already have an open request with this professional - showing its live status.', { icon: 'ℹ️' });
      } else {
        toast.success(`Emergency request sent to ${result.provider?.name || 'the professional'}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // API interceptor shows the error
    } finally {
      setRequestingId(null);
    }
  };

  const clearActive = () => {
    setActive(null);
  };

  const chooseAnother = () => {
    clearActive();
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const fastest = results[0];

  return (
    <div className="min-h-screen bg-stone-50 pb-20 dark:bg-[#0c0a09]">
      <LocationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-600 to-rose-600 pb-16 pt-28 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="section-shell relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Emergency Mode
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">Urgent help, from the nearest verified pro.</h1>
          <p className="mt-3 max-w-xl text-base font-medium text-red-50">
            Tell us what's wrong - we'll show who can reach you fastest, so you can call or send an urgent request in one tap.
          </p>

          <button
            onClick={() => setPickerOpen(true)}
            className="mt-6 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-left text-sm font-bold backdrop-blur transition hover:bg-white/25"
          >
            <MapPinIcon className="h-5 w-5 shrink-0" />
            <span className="truncate">{locating ? 'Finding your location…' : `Help will come to: ${location?.label || 'your location'}`}</span>
            <span className="shrink-0 underline decoration-dotted underline-offset-2">Change</span>
          </button>
        </div>
      </section>

      <div className="section-shell -mt-10 space-y-6">
        {/* Life-threatening helplines */}
        <div className="rounded-3xl border border-red-200 bg-white p-4 shadow-lg dark:border-red-900/50 dark:bg-stone-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              Fire, gas leak, injury or danger to life? Call the official helpline first.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {helplines.map((h) => (
                <a
                  key={h.number}
                  href={`tel:${h.number}`}
                  className="flex flex-col items-center rounded-2xl bg-red-50 px-3 py-2 text-center transition hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70"
                >
                  <span className="text-lg leading-none">{h.icon}</span>
                  <span className="mt-1 text-base font-black text-red-700 dark:text-red-300">{h.number}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-red-600/80 dark:text-red-400/80">{h.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {isStaffAccount && (
          <div className="flex flex-col gap-3 rounded-3xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/50 dark:bg-sky-950/30">
            <div>
              <p className="font-black text-sky-900 dark:text-sky-200">You're signed in as a {user.role === 'admin' ? 'admin' : 'service provider'}</p>
              <p className="mt-0.5 text-sm font-medium text-sky-800 dark:text-sky-300">
                Emergency requests are sent by customers. {user.role === 'provider' ? 'Requests sent to you appear at the top of your dashboard in red - turn on "Available for emergencies (24×7)" on your services to receive them.' : 'You can view this page, but requests must come from a customer account.'}
              </p>
            </div>
            {user.role === 'provider' && (
              <Link to="/provider/dashboard" className="shrink-0 rounded-xl bg-sky-700 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-800">
                Go to my dashboard
              </Link>
            )}
          </div>
        )}

        {/* Active request */}
        <AnimatePresence>
          {active && <ActiveRequest key={active.booking._id} active={active} onClear={clearActive} onChooseAnother={chooseAnother} />}
        </AnimatePresence>

        {/* Step 1: what's wrong */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Step 1</p>
          <h2 className="mt-1 text-2xl font-black text-stone-900 dark:text-white">What's the emergency?</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            {(types.length ? types : Object.keys(typeVisuals).map((id) => ({ id, title: '…', description: '' }))).map((type) => {
              const visual = typeVisuals[type.id] || { emoji: '🚨', ring: 'ring-red-400', tint: 'bg-red-50' };
              const selected = type.id === typeId;
              return (
                <button
                  key={type.id}
                  onClick={() => chooseType(type.id)}
                  aria-pressed={selected}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected ? `border-transparent ring-2 ${visual.ring} ${visual.tint}` : 'border-stone-200 dark:border-stone-800'}`}
                >
                  <span className="text-3xl">{visual.emoji}</span>
                  <p className="mt-2 font-black text-stone-900 dark:text-white">{type.title}</p>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">{type.description}</p>
                </button>
              );
            })}
          </div>

          {selectedType && (
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="flex items-center gap-1.5 text-sm font-black text-amber-900 dark:text-amber-200">
                  <ShieldCheckIcon className="h-5 w-5" /> Stay safe while help arrives
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-amber-800 dark:text-amber-300">{selectedType.safety}</p>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Your phone number (the professional will call you)</span>
                  <input
                    id="emergency-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.slice(0, 15))}
                    placeholder="98XXXXXXXX"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Describe the problem (optional)</span>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                    placeholder="e.g. Sparks from kitchen switchboard"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: nearest professionals */}
        {typeId && (
          <div ref={resultsRef} className="scroll-mt-28 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">Step 2</p>
                <h2 className="mt-1 text-2xl font-black text-stone-900 dark:text-white">Nearest professionals</h2>
                {!searching && results.length > 0 && (
                  <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                    {results.length} found within 30 km · fastest first
                    {fastest?.etaMinutes ? ` · quickest arrival ~${fastest.etaMinutes} min` : ''}
                  </p>
                )}
              </div>
              <button onClick={search} disabled={searching} className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                <ArrowPathIcon className={`h-4 w-4 ${searching ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {searching ? (
              <div className="mt-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />)}
              </div>
            ) : searchError ? (
              <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{searchError}</p>
            ) : results.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
                <p className="text-4xl">😟</p>
                <p className="mt-2 text-lg font-black text-stone-900 dark:text-white">No {selectedType?.title?.toLowerCase() || 'emergency'} professionals within 30 km right now</p>
                <p className="mx-auto mt-1 max-w-md text-sm font-medium text-stone-500 dark:text-stone-400">
                  Try a different emergency type, check your location, or browse all services. If anyone is in danger, call 112.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link to="/services" className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-stone-900">Browse all services</Link>
                  <button onClick={() => setPickerOpen(true)} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700 dark:border-stone-700 dark:text-stone-200">Change location</button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_380px]">
                <ul className="order-2 space-y-3 lg:order-1">
                  {results.map((r, index) => (
                    <li
                      key={r._id}
                      onMouseEnter={() => setHighlightId(r._id)}
                      className={`rounded-2xl border p-4 transition ${highlightId === r._id ? 'border-primary-300 shadow-md dark:border-primary-700' : 'border-stone-200 dark:border-stone-800'}`}
                    >
                      <div className="flex gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800">
                          {r.image ? (
                            <img src={getUploadsUrl(r.image)} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : null}
                          <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-black text-white">{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {index === 0 && <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-700 dark:bg-primary-950 dark:text-primary-300">Fastest</span>}
                            {r.emergencyAvailable && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
                                <BoltIcon className="h-3 w-3" /> 24×7 emergency
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate font-black text-stone-900 dark:text-white">{r.name}</p>
                          <p className="flex items-center gap-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                            {r.provider?.name}
                            {r.provider?.isVerified && <CheckBadgeIcon className="h-4 w-4 text-primary-500" />}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-stone-600 dark:text-stone-300">
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><ClockIcon className="h-4 w-4" /> ~{r.etaMinutes} min away</span>
                            <span className="flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5 text-stone-400" /> {formatKm(r.distanceKm)}</span>
                            <span className="flex items-center gap-1"><StarIcon className="h-3.5 w-3.5 text-amber-400" /> {r.rating > 0 ? `${r.rating.toFixed(1)} (${r.totalReviews})` : 'New'}</span>
                            <span>₹{r.price}{r.priceType === 'hourly' ? '/hr' : ' fixed'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {r.provider?.phone ? (
                          <CallButton
                            phone={r.provider.phone}
                            name={r.provider.name}
                            message={`Hi ${r.provider.name || ''}, I found you on Near Me Pros Emergency Mode - I need urgent help (${selectedType?.title || 'emergency'}). Are you available now?`}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-bold text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800 ${isCustomer ? '' : 'col-span-2'}`}
                          >
                            <PhoneIcon className="h-4 w-4" /> Call now
                          </CallButton>
                        ) : (
                          <Link to={`/service/${r._id}`} className="inline-flex items-center justify-center rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-bold text-stone-800 dark:border-stone-700 dark:text-stone-100">View details</Link>
                        )}
                        {isCustomer && (
                        <button
                          onClick={() => sendRequest(r)}
                          disabled={requestingId !== null || Boolean(active && ['pending', 'confirmed', 'in-progress'].includes(active.booking.status) && active.booking.serviceId?._id === r._id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {requestingId === r._id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <BoltIcon className="h-4 w-4" />}
                          {requestingId === r._id ? 'Sending…' : 'Request urgent help'}
                        </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="order-1 h-64 overflow-hidden rounded-2xl border border-stone-200 lg:sticky lg:top-28 lg:order-2 lg:h-[460px] dark:border-stone-800">
                  {location && (
                    <EmergencyMap center={location} results={results} highlightId={highlightId} onSelect={setHighlightId} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI help */}
        <div className="flex flex-col items-start gap-3 rounded-3xl bg-stone-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between dark:bg-stone-800">
          <div>
            <p className="font-black">Not sure what to do?</p>
            <p className="text-sm font-medium text-stone-300">Ask our AI assistant - it gives instant safety guidance in English, Hindi or Punjabi.</p>
          </div>
          <button
            onClick={() => document.querySelector('[aria-label="Open chat assistant"]')?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-stone-900 hover:bg-stone-100"
          >
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" /> Ask AI assistant
          </button>
        </div>
      </div>

      {isCustomer && !active && typeId && results.length > 0 && (
        <button
          onClick={() => fastest && sendRequest(fastest)}
          className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3.5 text-sm font-black text-white shadow-2xl shadow-red-600/40 transition hover:bg-red-700 sm:hidden"
        >
          <BoltIcon className="h-5 w-5" /> Request fastest (~{fastest?.etaMinutes} min)
        </button>
      )}
    </div>
  );
};

export default Emergency;
