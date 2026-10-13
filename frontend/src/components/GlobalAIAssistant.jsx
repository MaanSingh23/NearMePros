import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  PhoneIcon,
  MicrophoneIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  PhotoIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  StopCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon, MapPinIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import api, { getUploadsUrl } from '../utils/api';

const STORAGE_KEY = 'nmp-assistant-chat';
const TEASER_KEY = 'nmp-assistant-teaser-seen';
const LANGUAGE_KEY = 'nmp-assistant-language';

// "auto" replies in whatever language the customer writes in
const languageOptions = [
  { value: 'auto', label: 'Auto', speech: 'en-IN' },
  { value: 'en', label: 'English', speech: 'en-IN' },
  { value: 'hi', label: 'हिंदी', speech: 'hi-IN' },
  { value: 'pa', label: 'ਪੰਜਾਬੀ', speech: 'pa-IN' }
];

const loadLanguage = () => {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return languageOptions.some(o => o.value === saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
};
const MAX_INPUT = 1000;

const quickCategories = [
  { emoji: '❄️', label: 'AC Repair', prompt: 'I need AC repair' },
  { emoji: '🔧', label: 'Plumber', prompt: 'I need a plumber' },
  { emoji: '⚡', label: 'Electrician', prompt: 'I need an electrician' },
  { emoji: '🧹', label: 'Cleaning', prompt: 'I need house cleaning' },
  { emoji: '💇', label: 'Haircut', prompt: 'I want a haircut' },
  { emoji: '💄', label: 'Beauty', prompt: 'Beauty and makeup services' }
];

const helpTopics = [
  'How much does AC repair cost?',
  'Top rated services near me',
  'How does booking work?',
  'Is payment taken online?'
];

// Suggestion chips that should navigate instead of sending a message
const chipRoutes = {
  'browse services': '/services',
  'my bookings': '/bookings'
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const loadMessages = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// Renders **bold** and "- " bullet lists as React elements (no raw HTML)
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold text-stone-900 dark:text-white">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );

const FormattedText = ({ text }) => {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((line, i) => {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) {
      if (!list) {
        list = [];
        blocks.push({ type: 'list', items: list, key: i });
      }
      list.push(bullet[1]);
    } else {
      list = null;
      if (line.trim()) blocks.push({ type: 'p', text: line, key: i });
    }
  });

  return (
    <div className="space-y-2">
      {blocks.map(block =>
        block.type === 'list' ? (
          <ul key={block.key} className="space-y-1.5">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                <span>{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={block.key}>{renderInline(block.text)}</p>
        )
      )}
    </div>
  );
};

const AssistantAvatar = ({ size = 'sm' }) => (
  <div className={`${size === 'sm' ? 'h-7 w-7' : 'h-11 w-11'} shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center shadow-sm`}>
    <SparklesIcon className={`${size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'} text-white`} />
  </div>
);

const formatKm = (km) => (km < 0.1 ? '<100 m' : `${km} km`);

// Marks the nearest, cheapest and best-rated result when there's a choice
const getBadges = (services) => {
  const badges = {};
  if (!services || services.length < 2) return badges;
  const add = (service, label) => {
    if (!service) return;
    badges[service._id] = [...(badges[service._id] || []), label];
  };
  const withDistance = services.filter(s => s.distanceKm != null);
  if (withDistance.length > 1) add([...withDistance].sort((a, b) => a.distanceKm - b.distanceKm)[0], 'Nearest');
  add([...services].sort((a, b) => a.price - b.price)[0], 'Lowest price');
  const rated = services.filter(s => s.rating > 0);
  if (rated.length) add([...rated].sort((a, b) => b.rating - a.rating || (b.totalReviews || 0) - (a.totalReviews || 0))[0], 'Top rated');
  return badges;
};

const badgeStyles = {
  'Nearest': 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  'Lowest price': 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300',
  'Top rated': 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
};

const ResultSummary = ({ summary }) => {
  if (!summary || summary.count < 1) return null;
  const price = summary.minPrice === summary.maxPrice ? `₹${summary.minPrice}` : `₹${summary.minPrice}–₹${summary.maxPrice}`;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-stone-100 px-3 py-2 text-[11px] font-semibold text-stone-600 dark:bg-stone-800/70 dark:text-stone-300">
      <span>{summary.count} {summary.count === 1 ? 'professional' : 'professionals'}</span>
      <span className="text-stone-300 dark:text-stone-600">•</span>
      <span>{price}</span>
      {summary.nearestKm != null && (
        <>
          <span className="text-stone-300 dark:text-stone-600">•</span>
          <span className="flex items-center gap-0.5"><MapPinIcon className="h-3 w-3" />nearest {formatKm(summary.nearestKm)}</span>
        </>
      )}
      {summary.bestRating && (
        <>
          <span className="text-stone-300 dark:text-stone-600">•</span>
          <span className="flex items-center gap-0.5"><StarIcon className="h-3 w-3 text-amber-400" />up to {summary.bestRating.toFixed(1)}</span>
        </>
      )}
    </div>
  );
};

const ServiceResultCard = ({ service, badges = [], onNavigate }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const image = service.images?.[0] ? getUploadsUrl(service.images[0]) : null;
  const provider = service.providerId;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-2.5 shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:hover:border-primary-700">
      {badges.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {badges.map(label => (
            <span key={label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeStyles[label]}`}>
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-700">
          {image && !imageFailed ? (
            <img src={image} alt={service.name} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-400">
              <PhotoIcon className="h-7 w-7" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="truncate text-[13px] font-bold text-stone-900 dark:text-white">{service.name}</p>
            {provider?.name && (
              <p className="flex items-center gap-1 truncate text-[11px] font-medium text-stone-500 dark:text-stone-400">
                by {provider.name}
                {provider.isVerified && <CheckBadgeIcon className="h-3.5 w-3.5 shrink-0 text-primary-500" title="Verified" />}
              </p>
            )}
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-0.5">
                <StarIcon className="h-3 w-3 text-amber-400" />
                {service.rating > 0 ? service.rating.toFixed(1) : 'New'}
                {service.totalReviews > 0 && <span className="font-medium">({service.totalReviews})</span>}
              </span>
              {service.distanceKm != null && (
                <span className="flex items-center gap-0.5">
                  <MapPinIcon className="h-3 w-3 text-stone-400" />
                  {formatKm(service.distanceKm)}
                </span>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-sm font-black text-stone-900 dark:text-white">
              ₹{service.price}
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                {service.priceType === 'hourly' ? '/hr' : ' fixed'}
              </span>
            </p>
            <Link
              to={`/service/${service._id}`}
              onClick={onNavigate}
              className="rounded-full bg-primary-600 px-3.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary-700"
            >
              Book
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const GlobalAIAssistant = () => {
  const navigate = useNavigate();
  const { location, isDefaultLocation, refreshLocation, loading: locationLoading } = useLocation();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [language, setLanguage] = useState(loadLanguage);
  const [speakingId, setSpeakingId] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Voice call mode
  const [isCallMode, setIsCallMode] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [callText, setCallText] = useState('');
  const callActiveRef = useRef(false);
  const callRecognitionRef = useRef(null);

  const firstName = user?.name?.split(' ')[0];
  const hasConversation = messages.length > 0;
  const voiceLang = languageOptions.find(o => o.value === language)?.speech || 'en-IN';
  const hasLocation = Number.isFinite(location?.lat) && Number.isFinite(location?.lng);

  const changeLanguage = (value) => {
    setLanguage(value);
    try {
      localStorage.setItem(LANGUAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  // Read a reply aloud in the language it was written in
  const toggleSpeak = (msg) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingId === msg.id) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(msg.text.replaceAll('**', '').replace(/^\s*[-*•]\s+/gm, ''));
    utterance.lang = msg.speechLang || voiceLang;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  // Persist the conversation for this browser tab
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // Storage unavailable (private mode) - chat still works
    }
  }, [messages]);

  // Show a one-time teaser bubble next to the launcher
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(TEASER_KEY) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    const timer = setTimeout(() => setShowTeaser(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismissTeaser = () => {
    setShowTeaser(false);
    try {
      localStorage.setItem(TEASER_KEY, '1');
    } catch {
      // ignore
    }
  };

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isTyping, isOpen, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // Auto-grow the textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    callRecognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  const openChat = () => {
    dismissTeaser();
    setIsOpen(true);
  };

  const buildHistory = (list) =>
    list
      .filter(m => !m.isError)
      .slice(-10)
      .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', text: m.text }));

  const askAssistant = async (text, history) => {
    const response = await api.post('/ai/chat', {
      message: text,
      history,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      area: location?.address || '',
      language
    });
    return response.data;
  };

  const sendMessage = async (rawText) => {
    const text = rawText.trim().slice(0, MAX_INPUT);
    if (!text || isTyping) return;

    const history = buildHistory(messages);
    const userMessage = { id: Date.now(), sender: 'user', text, time: Date.now() };
    setMessages(prev => [...prev.filter(m => !m.isError), userMessage]);
    setIsTyping(true);

    try {
      const data = await askAssistant(text, history);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.reply,
        services: data.services || [],
        suggestions: data.suggestions || [],
        summary: data.summary,
        speechLang: data.speechLang,
        time: Date.now()
      }]);
    } catch (error) {
      const serverMessage = error.response?.data?.error;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        isError: true,
        retryText: text,
        text: serverMessage || "I couldn't reach the server. If the site was idle it may be waking up — please try again in a few seconds.",
        time: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const retry = (text) => {
    setMessages(prev => {
      // Drop the failed exchange so it can be sent again cleanly
      const withoutError = prev.filter(m => !m.isError);
      const last = withoutError[withoutError.length - 1];
      return last?.sender === 'user' && last.text === text ? withoutError.slice(0, -1) : withoutError;
    });
    setTimeout(() => sendMessage(text), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = input;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChip = (chip) => {
    const route = chipRoutes[chip.toLowerCase()];
    if (route) {
      setIsOpen(false);
      navigate(route);
    } else {
      sendMessage(chip);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setInput('');
  };

  const copyMessage = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.text.replace(/\*\*/g, ''));
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard blocked - ignore
    }
  };

  // --- Voice input (dictation) ---
  const getRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SpeechRecognition ? new SpeechRecognition() : null;
  };

  const showNotice = (text) => {
    setMessages(prev => [...prev.filter(m => !m.isNotice), {
      id: Date.now(), sender: 'ai', isError: true, isNotice: true, time: Date.now(), text
    }]);
  };

  // Explains why the microphone couldn't be used instead of failing silently
  const voiceErrorText = (code) => {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Microphone access is blocked. Click the 🔒 icon next to the website address, set **Microphone** to **Allow**, then reload the page and try again.';
      case 'audio-capture':
      case 'NotFoundError':
        return 'No microphone was found. Please connect a microphone (or check your headset) and try again.';
      case 'NotReadableError':
        return 'Your microphone is being used by another app. Close that app and try again.';
      case 'network':
        return 'Voice recognition needs an internet connection to Google. Check your connection, or use Google Chrome (some browsers like Brave block it).';
      case 'no-speech':
        return 'I didn\'t hear anything. Tap the mic and start speaking when it turns red.';
      case 'unsupported':
        return 'Voice input isn\'t supported in this browser. Please use **Google Chrome** or **Microsoft Edge**, or type your message.';
      default:
        return 'Voice input stopped unexpectedly. Please try again or type your message.';
    }
  };

  // Ask for microphone permission up front so the browser shows its prompt
  const ensureMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return null;
    } catch (error) {
      return error.name || 'not-allowed';
    }
  };

  const toggleVoiceInput = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = getRecognition();
    if (!recognition) {
      showNotice(voiceErrorText('unsupported'));
      return;
    }
    const micError = await ensureMicrophone();
    if (micError) {
      showNotice(voiceErrorText(micError));
      return;
    }
    setMessages(prev => prev.filter(m => !m.isNotice));
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setInput('');
        sendMessage(transcript);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'aborted') showNotice(voiceErrorText(event.error));
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // --- Voice call mode ---
  const endCall = () => {
    callActiveRef.current = false;
    callRecognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setIsCallMode(false);
    setCallStatus('');
  };

  const listenInCall = () => {
    if (!callActiveRef.current) return;
    window.speechSynthesis?.cancel();
    setCallStatus('Listening');
    setCallText('Go ahead, I\'m listening…');

    const recognition = getRecognition();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    callRecognitionRef.current = recognition;
    let finalHeard = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setCallText(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        finalHeard = true;
        recognition.stop();
        answerInCall(transcript);
      }
    };
    let fatalError = false;
    recognition.onend = () => {
      // Silence: keep the line open (but not after a permission/device error)
      if (!finalHeard && !fatalError && callActiveRef.current) setTimeout(listenInCall, 400);
    };
    recognition.onerror = (event) => {
      if (['no-speech', 'aborted'].includes(event.error)) return;
      fatalError = true;
      setCallStatus('Microphone problem');
      setCallText(voiceErrorText(event.error).replaceAll('**', ''));
    };
    try {
      recognition.start();
    } catch {
      // already started
    }
  };

  const answerInCall = async (transcript) => {
    if (!callActiveRef.current) return;
    setCallStatus('Thinking');
    try {
      const data = await askAssistant(transcript, buildHistory(messages));
      if (!callActiveRef.current) return;
      const spoken = data.reply.replace(/\*\*/g, '').replace(/^\s*[-*•]\s+/gm, '');
      setMessages(prev => [
        ...prev,
        { id: Date.now(), sender: 'user', text: transcript, time: Date.now() },
        { id: Date.now() + 1, sender: 'ai', text: data.reply, services: data.services || [], suggestions: data.suggestions || [], summary: data.summary, speechLang: data.speechLang, time: Date.now() }
      ]);
      setCallStatus('Speaking');
      setCallText(spoken);
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = data.speechLang || voiceLang;
      utterance.onend = () => setTimeout(listenInCall, 500);
      window.speechSynthesis.speak(utterance);
    } catch {
      setCallStatus('Reconnecting');
      setCallText('Connection lost. Trying again…');
      setTimeout(listenInCall, 2000);
    }
  };

  const startCall = async () => {
    if (!getRecognition() || !('speechSynthesis' in window)) {
      showNotice(voiceErrorText('unsupported'));
      return;
    }
    const micError = await ensureMicrophone();
    if (micError) {
      showNotice(voiceErrorText(micError));
      return;
    }
    callActiveRef.current = true;
    setIsCallMode(true);
    setCallStatus('Connecting');
    setCallText('Connecting you to Pro Assistant…');
    setTimeout(listenInCall, 1200);
  };

  const lastAiId = [...messages].reverse().find(m => m.sender === 'ai' && !m.isError)?.id;

  return (
    <>
      {/* Voice call overlay */}
      <AnimatePresence>
        {isCallMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-stone-950/95 p-6 text-center backdrop-blur-2xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-stone-500">Voice call</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Pro Assistant</h2>
            <p className={`mt-2 text-sm font-bold ${callStatus === 'Listening' ? 'text-primary-400' : 'text-stone-400'}`}>
              {callStatus}{callStatus !== 'Speaking' && callStatus !== 'Listening' ? '…' : ''}
            </p>

            <div className="relative my-14 flex h-40 w-40 items-center justify-center">
              {(callStatus === 'Listening' || callStatus === 'Speaking') && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary-500/20" />
                  <span className="absolute inset-4 animate-pulse rounded-full bg-primary-500/20" />
                </>
              )}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-emerald-700 shadow-2xl shadow-primary-500/40">
                <SparklesIcon className="h-12 w-12 text-white" />
              </div>
            </div>

            <p className="min-h-[5rem] max-w-lg text-lg font-medium leading-relaxed text-stone-300 md:text-xl">{callText}</p>

            <button
              onClick={endCall}
              aria-label="End call"
              className="mt-10 rounded-full bg-red-500 p-5 text-white shadow-xl transition hover:scale-105 hover:bg-red-600 active:scale-95"
            >
              <PhoneIcon className="h-7 w-7 rotate-[135deg]" />
            </button>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-stone-500">End call</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher + teaser */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3"
          >
            <AnimatePresence>
              {showTeaser && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="relative max-w-[240px] rounded-2xl rounded-br-md border border-stone-200 bg-white p-4 pr-8 shadow-xl dark:border-stone-700 dark:bg-stone-900"
                >
                  <button
                    onClick={dismissTeaser}
                    aria-label="Dismiss"
                    className="absolute right-2 top-2 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={openChat} className="text-left">
                    <p className="text-sm font-bold text-stone-900 dark:text-white">Hi{firstName ? ` ${firstName}` : ''} 👋</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-stone-500 dark:text-stone-400">
                      Need a pro? Tell me what's wrong and I'll find verified help nearby.
                    </p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={openChat}
              aria-label="Open chat assistant"
              className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-emerald-700 text-white shadow-xl shadow-primary-600/30 transition hover:scale-105 hover:shadow-2xl active:scale-95"
            >
              <ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7" />
              {showTeaser && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[9px] font-black dark:border-stone-900">1</span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Pro Assistant chat"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-40px))] sm:w-[400px] sm:rounded-3xl sm:border sm:border-stone-200 sm:shadow-2xl sm:shadow-stone-900/20 dark:sm:border-stone-800"
          >
            {/* Header */}
            <div className="relative shrink-0 bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 px-4 py-3.5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <AssistantAvatar size="lg" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-stone-900 bg-green-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold leading-tight">Pro Assistant</h3>
                    <p className="text-xs font-medium text-stone-400">AI support · Replies instantly</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={startCall} title="Voice call" aria-label="Start voice call" className="rounded-full p-2 text-stone-300 transition hover:bg-white/10 hover:text-white">
                    <PhoneIcon className="h-5 w-5" />
                  </button>
                  {hasConversation && (
                    <button onClick={newConversation} title="New conversation" aria-label="New conversation" className="rounded-full p-2 text-stone-300 transition hover:bg-white/10 hover:text-white">
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} title="Close" aria-label="Close chat" className="rounded-full p-2 text-stone-300 transition hover:bg-white/10 hover:text-white">
                    <ChevronDownIcon className="h-5 w-5 sm:hidden" />
                    <XMarkIcon className="hidden h-5 w-5 sm:block" />
                  </button>
                </div>
              </div>

              {/* Language + location */}
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold">
                <div className="flex min-w-0 items-center gap-1.5 text-stone-300">
                  <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-primary-400" />
                  {hasLocation && !isDefaultLocation && !location.isApproximate ? (
                    <span className="truncate" title={location.address}>Near {location.label || location.address || 'your location'}</span>
                  ) : (
                    <button
                      onClick={() => refreshLocation({ force: true })}
                      disabled={locationLoading}
                      className="truncate text-left underline decoration-dotted underline-offset-2 hover:text-white disabled:opacity-60"
                    >
                      {locationLoading ? 'Finding your location…' : `${location?.label ? `${location.label} · ` : ''}Use my exact location`}
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label="Reply language">
                  {languageOptions.map(option => (
                    <button
                      key={option.value}
                      role="radio"
                      aria-checked={language === option.value}
                      onClick={() => changeLanguage(option.value)}
                      className={`rounded-full px-2 py-0.5 transition ${language === option.value ? 'bg-white text-stone-900' : 'text-stone-300 hover:text-white'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Body */}
            <div ref={scrollRef} onScroll={handleScroll} className="custom-scrollbar relative flex-1 overflow-y-auto">
              {!hasConversation ? (
                <div className="p-5">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                      {greeting()}{firstName ? `, ${firstName}` : ''} 👋
                    </h2>
                    <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                      How can we help you today? Describe the problem in your own words — English, Hindi or Punjabi.
                    </p>
                  </div>

                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">Popular services</p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickCategories.map(cat => (
                      <button
                        key={cat.label}
                        onClick={() => sendMessage(cat.prompt)}
                        className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2 py-3.5 text-xs font-bold text-stone-700 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-primary-700"
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <p className="mb-2.5 mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-400">Quick help</p>
                  <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                    {helpTopics.map((topic, i) => (
                      <button
                        key={topic}
                        onClick={() => sendMessage(topic)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-stone-700 transition hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800 ${i > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''}`}
                      >
                        {topic}
                        <PaperAirplaneIcon className="h-4 w-4 text-stone-300 dark:text-stone-600" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 p-4">
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && <div className="mt-0.5"><AssistantAvatar /></div>}

                      <div className={`flex min-w-0 max-w-[85%] flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`group relative px-4 py-2.5 text-[13.5px] leading-relaxed ${
                            msg.sender === 'user'
                              ? 'whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary-600 text-white shadow-sm'
                              : msg.isError
                                ? 'rounded-2xl rounded-tl-md border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
                                : 'rounded-2xl rounded-tl-md border border-stone-200 bg-white text-stone-700 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300'
                          }`}
                        >
                          {msg.isError && <ExclamationTriangleIcon className="mb-1 h-4 w-4" />}
                          {msg.sender === 'user' ? msg.text : <FormattedText text={msg.text} />}
                          {msg.isError && msg.retryText && (
                            <button
                              onClick={() => retry(msg.retryText)}
                              className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" /> Try again
                            </button>
                          )}
                        </div>

                        {msg.services?.length > 0 && (
                          <div className="w-full" style={{ minWidth: 'min(300px, 75vw)' }}>
                            <ResultSummary summary={msg.summary} />
                            <div className="mt-2 space-y-2">
                              {msg.services.map(service => (
                                <ServiceResultCard
                                  key={service._id}
                                  service={service}
                                  badges={getBadges(msg.services)[service._id]}
                                  onNavigate={() => setIsOpen(false)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-1 flex items-center gap-2 px-1 text-[10.5px] font-medium text-stone-400">
                          <span>{msg.sender === 'ai' ? 'Pro Assistant' : 'You'} · {formatTime(msg.time)}</span>
                          {msg.sender === 'ai' && !msg.isError && (
                            <>
                              <button onClick={() => copyMessage(msg)} title="Copy" aria-label="Copy message" className="rounded p-0.5 hover:text-stone-600 dark:hover:text-stone-200">
                                {copiedId === msg.id ? <CheckIcon className="h-3.5 w-3.5 text-primary-500" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => toggleSpeak(msg)}
                                title={speakingId === msg.id ? 'Stop' : 'Listen'}
                                aria-label={speakingId === msg.id ? 'Stop reading' : 'Read aloud'}
                                className={`rounded p-0.5 hover:text-stone-600 dark:hover:text-stone-200 ${speakingId === msg.id ? 'text-primary-500' : ''}`}
                              >
                                {speakingId === msg.id ? <StopCircleIcon className="h-3.5 w-3.5" /> : <SpeakerWaveIcon className="h-3.5 w-3.5" />}
                              </button>
                            </>
                          )}
                        </div>

                        {msg.id === lastAiId && !isTyping && msg.suggestions?.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {msg.suggestions.map(chip => (
                              <button
                                key={chip}
                                onClick={() => handleChip(chip)}
                                className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950/50 dark:text-primary-400 dark:hover:bg-primary-900/50"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                      <AssistantAvatar />
                      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-stone-200 bg-white px-4 py-3.5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full bg-stone-400"
                            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {showScrollDown && (
              <button
                onClick={() => scrollToBottom()}
                aria-label="Scroll to latest"
                className="absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-full border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-800"
              >
                <ChevronDownIcon className="h-4 w-4 text-stone-600 dark:text-stone-300" />
              </button>
            )}

            {/* Composer */}
            <div className="shrink-0 border-t border-stone-200 bg-white px-3 pb-2.5 pt-3 dark:border-stone-800 dark:bg-stone-900">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className={`flex flex-1 items-end rounded-2xl border bg-stone-50 transition dark:bg-stone-800 ${isListening ? 'border-red-300 ring-2 ring-red-100 dark:border-red-800 dark:ring-red-900/30' : 'border-stone-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-stone-700 dark:focus-within:border-primary-600 dark:focus-within:ring-primary-900/40'}`}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    maxLength={MAX_INPUT}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? 'Listening…' : 'Type your message…'}
                    aria-label="Message"
                    className="max-h-[120px] flex-1 resize-none bg-transparent py-3 pl-4 pr-1 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    title="Voice input"
                    aria-label="Voice input"
                    className={`m-1.5 rounded-xl p-2 transition ${isListening ? 'animate-pulse bg-red-100 text-red-500 dark:bg-red-900/40' : 'text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-200'}`}
                  >
                    <MicrophoneIcon className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  aria-label="Send message"
                  className="mb-0.5 rounded-2xl bg-primary-600 p-3 text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 dark:disabled:bg-stone-800 dark:disabled:text-stone-600"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
              <p className="mt-2 text-center text-[10.5px] font-medium text-stone-400">
                AI assistant · Answers may be imperfect, check details before booking
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalAIAssistant;
