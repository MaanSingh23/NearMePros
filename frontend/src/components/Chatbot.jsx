import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

const Chatbot = ({ service, provider }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hi! I'm the AI assistant for this service. I can answer questions about the service details, pricing, or availability. How can I help you today?`,
      sender: 'ai'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (provider && service) {
      setMessages([
        {
          id: 1,
          text: `Hi! I'm the AI assistant for ${provider?.name || 'this provider'}. I can answer questions about the ${service?.name || 'service'}, pricing, or availability. How can I help you today?`,
          sender: 'ai'
        }
      ]);
    }
  }, [provider, service]);

  const generateAIResponse = (userMessage) => {
    const lowerMsg = userMessage.toLowerCase();
    
    if (!service || !provider) {
      return "I'm currently unable to access the provider's details. Please try again later.";
    }

    // Keyword based simulation
    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('much') || lowerMsg.includes('fee')) {
      return `The price for ${service.name} is ₹${service.price} per ${service.priceType}. You can book it directly from this page!`;
    }
    
    if (lowerMsg.includes('duration') || lowerMsg.includes('time') || lowerMsg.includes('long')) {
      return `This service typically takes about ${service.duration || '1'} hour(s) to complete.`;
    }
    
    if (lowerMsg.includes('category') || lowerMsg.includes('type')) {
      return `This service falls under the "${service.category}" category.`;
    }

    if (lowerMsg.includes('verified') || lowerMsg.includes('trust') || lowerMsg.includes('safe') || lowerMsg.includes('genuine')) {
      if (service.isVerified || provider.isVerified) {
        return `Yes, this is a verified service provider! You can trust them for quality work.`;
      } else {
        return `While this provider hasn't earned the verified badge yet, you can read customer reviews on this page to check their reputation.`;
      }
    }

    if (lowerMsg.includes('who') || lowerMsg.includes('provider') || lowerMsg.includes('about')) {
      return `This service is provided by ${provider.name}. They have a rating of ${provider.rating || '0.0'} stars.`;
    }

    if (lowerMsg.includes('contact') || lowerMsg.includes('phone') || lowerMsg.includes('email') || lowerMsg.includes('number')) {
      return `You can reach ${provider.name} at ${provider.phone} or email them at ${provider.email}.`;
    }

    if (lowerMsg.includes('location') || lowerMsg.includes('where') || lowerMsg.includes('address') || lowerMsg.includes('city')) {
      return `${provider.name} is based at ${provider.location?.address || 'their registered address'}. The service is available within a ${service.location?.serviceRadius || 10} km radius.`;
    }

    if (lowerMsg.includes('hello') || lowerMsg.includes('hi ') || lowerMsg.includes('hey') || lowerMsg.includes('hi')) {
        return `Hello! Feel free to ask me anything about ${provider.name}'s services.`;
    }
    
    if (lowerMsg.includes('what') || lowerMsg.includes('describe') || lowerMsg.includes('details')) {
        return `Sure! ${service.name} is described as: ${service.description}`;
    }

    // Default fallback
    return `That's a great question about ${service.name}. Based on the provider's details: ${service.description}. Please let me know if you need to know anything specific like price, duration, or contact info!`;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate network delay for AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: generateAIResponse(userMessage.text),
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-40 bg-gradient-to-r from-primary-600 to-primary-500 text-white ${isOpen ? 'hidden' : 'flex'} items-center justify-center cursor-pointer`}
      >
        <SparklesIcon className="h-7 w-7 animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 bg-white dark:bg-stone-900 rounded-[2rem] shadow-2xl border border-stone-200 dark:border-stone-800 z-50 overflow-hidden flex flex-col h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight">Provider AI</h3>
                  <p className="text-xs text-primary-100 font-medium">Ask me anything!</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-stone-50 dark:bg-black/50 custom-scrollbar">
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] p-4 rounded-2xl ${
                      msg.sender === 'user' 
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 rounded-tr-sm' 
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-2xl rounded-tl-sm shadow-sm flex space-x-2 items-center h-[52px]">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shrink-0">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this service..."
                  className="w-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-full py-3 pl-5 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all border border-transparent focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </form>
              <div className="text-center mt-3">
                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center justify-center">
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  AI Generated Responses
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
