import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapPinIcon, ClockIcon, XMarkIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';
import { getSocket, notifyBookingsChanged } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import CallButton from './CallButton';

// Backup check in case the live connection is down (e.g. server waking up)
const FALLBACK_POLL_MS = 20000;

// --- Sounds (generated, no audio files needed) ------------------------------
const playTone = (pattern) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    let t = ctx.currentTime;
    pattern.forEach(([freq, duration]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
      t += duration + 0.05;
    });
    setTimeout(() => ctx.close(), (t - ctx.currentTime + 0.5) * 1000);
  } catch {
    // Browser blocked audio until the user interacts - the visual alert still shows
  }
};

const playEmergencySound = () => playTone([[880, 0.18], [660, 0.18], [880, 0.18], [660, 0.18], [880, 0.3]]);
const playChime = () => playTone([[660, 0.15], [990, 0.25]]);

// Flash the browser tab title until the page is looked at
const useTitleAlert = () => {
  const timerRef = useRef(null);
  const originalRef = useRef(document.title);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    document.title = originalRef.current;
  }, []);

  const start = useCallback((text) => {
    stop();
    originalRef.current = document.title;
    let on = false;
    timerRef.current = setInterval(() => {
      on = !on;
      document.title = on ? text : originalRef.current;
    }, 1000);
  }, [stop]);

  useEffect(() => stop, [stop]);
  return useMemo(() => ({ start, stop }), [start, stop]);
};

const showDesktopNotification = (title, body) => {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(title, { body, tag: 'nmp-booking' });
    }
  } catch {
    // not supported
  }
};

const statusMessages = {
  confirmed: '✅ Your booking was accepted - the professional is on the way',
  rejected: '❌ The professional declined your booking',
  'in-progress': '🔧 Work on your booking has started',
  completed: '🎉 Your booking is completed',
  cancelled: 'Booking cancelled'
};

/**
 * Real-time booking alerts for the logged-in user.
 * - Providers: new requests appear instantly (emergencies as a full alert with Accept/Reject)
 * - Customers: instant updates when a provider accepts, declines or completes
 * Any open page listening for "nmp:bookings-changed" refreshes itself.
 */
const LiveNotifications = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [acting, setActing] = useState(null);
  const seenRef = useRef(null);
  const titleAlert = useTitleAlert();
  const isProvider = user?.role === 'provider';

  const showEmergency = useCallback(async (bookingId) => {
    if (!bookingId) return;
    try {
      const { data } = await api.get(`/bookings/${bookingId}`, { silent: true });
      if (data.status !== 'pending') return;
      setAlerts((prev) => (prev.some((b) => b._id === data._id) ? prev : [...prev, data]));
      playEmergencySound();
      titleAlert.start('🚨 NEW EMERGENCY REQUEST');
      showDesktopNotification('🚨 New emergency request', `${data.userId?.name || 'A customer'} needs ${data.serviceId?.name || 'urgent help'}`);
    } catch {
      // ignore - the dashboard still lists it
    }
  }, [titleAlert]);

  // Live connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!isAuthenticated || !token) return undefined;

    const socket = getSocket();
    const join = () => socket.emit('join', { token });

    const onNewBooking = (payload) => {
      if (seenRef.current) seenRef.current.add(String(payload.bookingId));
      notifyBookingsChanged({ type: 'new', ...payload });
      if (payload.isEmergency) {
        showEmergency(payload.bookingId);
      } else {
        playChime();
        toast.success('📅 New booking request received', { duration: 6000 });
        showDesktopNotification('New booking request', payload.message || 'Open your dashboard to respond');
      }
    };

    const onBookingUpdate = (payload) => {
      notifyBookingsChanged({ type: 'update', ...payload });
      const text = statusMessages[payload.status];
      if (text && !isProvider) {
        playChime();
        toast(text, { duration: 7000 });
        showDesktopNotification('Booking update', text);
      }
      if (isProvider && payload.status === 'cancelled') {
        toast('A customer cancelled a booking', { icon: 'ℹ️' });
        setAlerts((prev) => prev.filter((b) => String(b._id) !== String(payload.bookingId)));
      }
    };

    socket.on('connect', join);
    socket.on('newBooking', onNewBooking);
    socket.on('bookingUpdate', onBookingUpdate);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off('connect', join);
      socket.off('newBooking', onNewBooking);
      socket.off('bookingUpdate', onBookingUpdate);
      socket.disconnect();
    };
  }, [isAuthenticated, user?._id, isProvider, showEmergency]);

  // Backup: providers check for new emergency requests every 20s
  useEffect(() => {
    if (!isAuthenticated || !isProvider) return undefined;
    seenRef.current = null;
    let stopped = false;

    const check = async () => {
      try {
        const { data } = await api.get('/bookings/provider-bookings', { silent: true });
        // A check from an earlier (cancelled) run must not mark requests as seen
        if (stopped) return;
        const pendingEmergencies = (data || []).filter((b) => b.isEmergency && b.status === 'pending');
        if (seenRef.current === null) {
          // First load: remember what's already there; alert only if something is waiting
          seenRef.current = new Set((data || []).map((b) => String(b._id)));
          if (!stopped && pendingEmergencies[0]) showEmergency(pendingEmergencies[0]._id);
          return;
        }
        const fresh = pendingEmergencies.filter((b) => !seenRef.current.has(String(b._id)));
        (data || []).forEach((b) => seenRef.current.add(String(b._id)));
        if (!stopped && fresh.length) {
          notifyBookingsChanged({ type: 'new' });
          fresh.forEach((b) => showEmergency(b._id));
        }
      } catch {
        // offline / server waking up - try again next time
      }
    };

    check();
    const timer = setInterval(check, FALLBACK_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [isAuthenticated, isProvider, user?._id, showEmergency]);

  // Stop flashing the title once nothing is waiting
  useEffect(() => {
    if (alerts.length === 0) titleAlert.stop();
  }, [alerts.length, titleAlert]);

  const respond = async (booking, status) => {
    setActing(`${booking._id}-${status}`);
    try {
      await api.patch(`/provider/bookings/${booking._id}/status`, { status });
      toast.success(status === 'confirmed' ? 'Accepted - the customer has been notified. Call them now.' : 'Request declined');
      setAlerts((prev) => prev.filter((b) => b._id !== booking._id));
      notifyBookingsChanged({ type: 'update', bookingId: booking._id, status });
    } catch {
      // API interceptor shows the error
    } finally {
      setActing(null);
    }
  };

  const dismiss = (id) => setAlerts((prev) => prev.filter((b) => b._id !== id));

  const enableDesktopAlerts = async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') toast.success('Desktop alerts turned on');
    } catch {
      // not supported
    }
  };

  const current = alerts[0];

  return createPortal(
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            role="alertdialog"
            aria-label="New emergency request"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-stone-900"
          >
            <div className="relative bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-white">
              <span className="absolute right-5 top-5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-100">🚨 Emergency request</p>
              <p className="mt-1 text-2xl font-black">{current.userId?.name || 'A customer'} needs help now</p>
              {alerts.length > 1 && <p className="mt-1 text-xs font-bold text-red-100">+{alerts.length - 1} more waiting</p>}
            </div>

            <div className="space-y-3 p-6">
              <div className="rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/60">
                <p className="font-black text-stone-900 dark:text-white">{current.serviceId?.name}</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-300">
                  {current.description?.replace(/^\[EMERGENCY: [^\]]+\]\s*/, '') || 'No description given'}
                </p>
                <div className="mt-3 space-y-1.5 text-sm font-semibold text-stone-600 dark:text-stone-300">
                  {current.etaMinutes && (
                    <p className="flex items-center gap-2"><ClockIcon className="h-4 w-4 text-red-500" /> About {current.etaMinutes} min from you</p>
                  )}
                  {current.location?.address && (
                    <p className="flex items-start gap-2"><MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> {current.location.address}</p>
                  )}
                </div>
              </div>

              {current.contactPhone && (
                <CallButton
                  phone={current.contactPhone}
                  name={current.userId?.name}
                  message={`Hi ${current.userId?.name || ''}, I received your emergency request on Near Me Pros. I'm on my way.`}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                  📞 Call customer · {current.contactPhone}
                </CallButton>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => respond(current, 'rejected')}
                  disabled={Boolean(acting)}
                  className="rounded-2xl border border-stone-200 px-4 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {acting === `${current._id}-rejected` ? 'Declining…' : "Can't go"}
                </button>
                <button
                  onClick={() => respond(current, 'confirmed')}
                  disabled={Boolean(acting)}
                  className="rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700 disabled:opacity-60"
                >
                  {acting === `${current._id}-confirmed` ? 'Accepting…' : 'Accept & go'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                {'Notification' in window && Notification.permission === 'default' ? (
                  <button onClick={enableDesktopAlerts} className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
                    <BellAlertIcon className="h-4 w-4" /> Turn on desktop alerts
                  </button>
                ) : <span />}
                <button
                  onClick={() => {
                    dismiss(current._id);
                    navigate('/provider/dashboard');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  <XMarkIcon className="h-4 w-4" /> Decide later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default LiveNotifications;
