import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { StarIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { MicrophoneIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import axios from 'axios';

const GlobalAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm the NearMe Pros AI Assistant. Looking for a service? Just tell me what you need! (e.g. 'I need an AC repair' or 'Find me a plumber')",
      sender: 'ai',
      services: null
    }
  ]);
  const { location } = useLocation();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Voice Call Mode States ---
  const [isCallMode, setIsCallMode] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [callText, setCallText] = useState('');
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const quickReplies = [
    "AC Repair",
    "Plumbing Issue",
    "House Cleaning",
    "Haircut at home"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const playPopSound = (type = 'send') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.log('Audio playback prevented by browser');
    }
  };

  const processMessage = async (msgText) => {
    if (!msgText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: msgText,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    playPopSound('send');
    setIsTyping(true);

    try {
      const payload = {
        message: msgText,
        lat: location?.lat || null,
        lng: location?.lng || null
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/chat`, payload);
      
      const aiResponse = {
        id: Date.now() + 1,
        text: response.data.reply,
        sender: 'ai',
        services: response.data.services
      };

      setMessages(prev => [...prev, aiResponse]);
      playPopSound('receive');
    } catch (error) {
      console.error('Error with AI Assistant:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "I'm having a little trouble connecting right now. Please try again later!",
        sender: 'ai'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const currentInput = input;
    setInput('');
    await processMessage(currentInput);
  };

  const handleQuickReply = (reply) => {
    processMessage(reply);
  };

  const toggleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice search is not supported in your browser. Please try Chrome.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      processMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // --- Voice Call Mode Functions ---
  const endCall = () => {
    setIsCallMode(false);
    setCallStatus('');
    if (recognitionRef.current) recognitionRef.current.stop();
    if (synthRef.current) synthRef.current.cancel();
  };

  const startCall = () => {
    if (!('webkitSpeechRecognition' in window) || !('speechSynthesis' in window)) {
      alert("Voice Call AI is not fully supported in your browser. Try Chrome.");
      return;
    }
    setIsOpen(false);
    setIsCallMode(true);
    setCallStatus('Connecting...');
    setCallText('Establishing secure line to Pro Assistant...');
    
    setTimeout(() => {
      startListeningPhase();
    }, 1500);
  };

  const startListeningPhase = () => {
    if (synthRef.current) synthRef.current.cancel();
    setCallStatus('Listening...');
    setCallText('Speak now...');

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(res => res[0].transcript)
        .join('');
      setCallText(transcript);
      
      if (event.results[0].isFinal) {
        recognition.stop();
        processCallMessage(transcript);
      }
    };

    recognition.onerror = () => {
      setCallStatus('Error');
      setCallText('Could not hear you properly. Retrying...');
      setTimeout(startListeningPhase, 2000);
    };

    recognition.onend = () => {
      // If it ends without final result and status is still listening, restart it
      if (callStatus === 'Listening...') {
         // Prevent infinite loop if stopped manually
      }
    };

    try {
      recognition.start();
    } catch (e) {}
  };

  const processCallMessage = async (transcript) => {
    setCallStatus('AI is thinking...');
    
    try {
      const payload = {
        message: transcript,
        lat: location?.lat || null,
        lng: location?.lng || null
      };
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/chat`, payload);
      
      const textResponse = response.data.reply.replace(/\*\*(.*?)\*\*/g, '$1'); // Clean markdown
      
      setCallStatus('AI Speaking...');
      setCallText(textResponse);
      
      const utterance = new SpeechSynthesisUtterance(textResponse);
      utterance.lang = 'en-IN';
      utterance.pitch = 1;
      utterance.rate = 1;
      
      utterance.onend = () => {
        // Start listening again if still in call mode
        setCallStatus('Reconnecting...');
        setTimeout(() => {
           startListeningPhase();
        }, 1000);
      };

      synthRef.current.speak(utterance);

    } catch (e) {
      setCallStatus('Network Error');
      setCallText('Lost connection. Trying to reconnect...');
      setTimeout(startListeningPhase, 2000);
    }
  };

  return (
    <>
      {/* Voice Call Overlay UI */}
      <AnimatePresence>
        {isCallMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-stone-900/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="flex flex-col items-center max-w-md w-full">
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Pro Assistant</h2>
              <p className={`text-sm font-bold uppercase tracking-widest ${callStatus === 'Listening...' ? 'text-green-400' : 'text-indigo-400'} mb-12`}>
                {callStatus}
              </p>

              {/* Pulsing Avatar/Wave */}
              <div className="relative w-40 h-40 flex items-center justify-center mb-12">
                {(callStatus === 'Listening...' || callStatus === 'AI Speaking...') && (
                  <>
                    <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20 animation-delay-500"></div>
                  </>
                )}
                <div className="relative w-28 h-28 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                  <SparklesIcon className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Real-time transcript */}
              <div className="h-32 flex items-center justify-center w-full mb-12">
                <p className="text-xl md:text-2xl font-medium text-stone-300 leading-relaxed max-w-lg">
                  {callText}
                </p>
              </div>

              {/* End Call Button */}
              <button 
                onClick={endCall}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-5 shadow-xl transition-transform hover:scale-110 active:scale-95"
              >
                <XMarkIcon className="w-8 h-8" />
              </button>
              <p className="text-stone-500 font-bold mt-4 text-xs uppercase tracking-widest">End Call</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Premium Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(79, 70, 229, 0.5)" }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 animate-gradient-x text-white ${isOpen ? 'hidden' : 'flex'} items-center justify-center cursor-pointer`}
      >
        <SparklesIcon className="h-8 w-8 animate-pulse" />
      </motion.button>

      {/* Premium Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className="fixed bottom-6 right-6 w-[360px] md:w-[400px] bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 dark:border-stone-800 z-[100] overflow-hidden flex flex-col h-[600px] max-h-[85vh]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex justify-between items-center shrink-0 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-inner">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight tracking-tight">Pro Assistant</h3>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <p className="text-xs text-indigo-100 font-medium">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={startCall}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer backdrop-blur-sm group relative"
                >
                  <PhoneIcon className="h-5 w-5 text-green-300 group-hover:text-green-400" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer backdrop-blur-sm"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-stone-50/50 dark:bg-black/40 custom-scrollbar relative">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-4 text-sm font-medium leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm shadow-md' 
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200/50 dark:border-stone-700/50 rounded-2xl rounded-tl-sm shadow-sm backdrop-blur-sm'
                    }`}
                    dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                  
                  {/* Inline Service Cards Rendered by AI */}
                  {msg.services && msg.services.length > 0 && (
                    <div className="w-[90%] mt-3 space-y-3">
                      {msg.services.map((service, idx) => (
                        <motion.div 
                          key={service._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white dark:bg-stone-800 p-3 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700 flex items-center space-x-3 group hover:shadow-md transition-all cursor-pointer"
                        >
                          <img 
                            src={service.images?.[0] || 'https://via.placeholder.com/60'} 
                            alt={service.name}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate">{service.name}</h4>
                            <div className="flex items-center text-xs text-stone-500 mt-1">
                              <StarIcon className="w-3 h-3 text-yellow-400 mr-1" />
                              <span className="font-medium mr-2">{service.rating || 'New'}</span>
                              <span className="truncate">₹{service.price}</span>
                            </div>
                          </div>
                          <Link 
                            to={`/service/${service._id}`}
                            className="shrink-0 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                          >
                            Book
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start space-y-3"
                >
                  <div className="bg-white dark:bg-stone-800 border border-stone-200/50 dark:border-stone-700/50 p-4 rounded-2xl rounded-tl-sm shadow-sm flex space-x-2 items-center h-[52px]">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75" />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150" />
                  </div>
                  
                  {/* Beautiful Shimmering Skeleton */}
                  <div className="w-[90%] space-y-3 pl-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-white/50 dark:bg-stone-800/50 p-3 rounded-xl shadow-sm border border-stone-100 dark:border-stone-700 flex items-center space-x-3 backdrop-blur-sm animate-pulse">
                        <div className="w-14 h-14 bg-stone-200 dark:bg-stone-700 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-stone-200 dark:bg-stone-700 rounded-full w-3/4"></div>
                          <div className="h-2.5 bg-stone-200 dark:bg-stone-700 rounded-full w-1/2"></div>
                        </div>
                        <div className="w-12 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-t border-stone-200/50 dark:border-stone-800/50 shrink-0">
              {/* Quick Replies */}
              <div className="flex overflow-x-auto p-3 space-x-2 custom-scrollbar hide-scroll-indicator">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(reply)}
                    className="whitespace-nowrap px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-stone-700 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold rounded-full border border-stone-200 dark:border-stone-700 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="p-4 pt-0">
                <form onSubmit={handleSend} className="relative flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Describe what you need..."}
                      className="w-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-2xl py-3.5 pl-5 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-transparent focus:border-indigo-500 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={toggleVoiceSearch}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                        isListening 
                          ? 'bg-red-100 text-red-500 animate-pulse' 
                          : 'text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                      }`}
                    >
                      <MicrophoneIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalAIAssistant;
