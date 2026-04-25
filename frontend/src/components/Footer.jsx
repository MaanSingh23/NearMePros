import React from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, ShieldCheckIcon, PhoneIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="mt-auto bg-stone-50 border-t border-stone-200 text-stone-900 pt-24 pb-12 overflow-hidden relative transition-colors duration-500 dark:bg-[#0c0a09] dark:border-white/5 dark:text-white">
      {/* Decorative Glow - Only visible in dark mode */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -mb-[250px] pointer-events-none hidden dark:block" />

      <div className="section-shell relative z-10">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-4 border-b border-stone-200 pb-20 dark:border-white/5">
          
          {/* Brand Col */}
          <div className="lg:col-span-1">
            <Link to="/" className="group inline-flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-stone-950 shadow-lg shadow-emerald-500/20 transition-all duration-300 group-hover:scale-105">
                <SparklesIcon className="h-6 w-6 font-bold" />
              </span>
              <span className="block text-2xl font-black tracking-tighter text-stone-950 dark:text-white">Near Me Pros.</span>
            </Link>
            <p className="mt-8 text-base leading-relaxed text-stone-600 font-medium dark:text-stone-400">
              India's premier marketplace for premium home services. From salon treatments to technical repairs, we deliver excellence to your doorstep.
            </p>
            <div className="mt-10 flex gap-4">
              {[
                { icon: FaTwitter, link: '#' },
                { icon: FaInstagram, link: '#' },
                { icon: FaLinkedin, link: '#' }
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.link}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-200/50 text-stone-600 transition-all hover:bg-emerald-500 hover:text-stone-950 hover:-translate-y-1 dark:bg-white/5 dark:text-stone-400 dark:border dark:border-white/5 dark:hover:bg-emerald-500 dark:hover:text-stone-950"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Services */}
          <div className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-emerald-500">Popular Services</h3>
            <ul className="space-y-5">
              {[
                { label: 'Salon For Women', to: '/services?category=salon' },
                { label: "Men's Salon & Massage", to: '/services?category=salon' },
                { label: 'Home Deep Cleaning', to: '/services?category=cleaning' },
                { label: 'Appliance Repair', to: '/services?category=repair' },
                { label: 'Electrician & Plumbing', to: '/services?category=electrician' }
              ].map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="group flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-emerald-500 transition-colors dark:text-stone-400 dark:hover:text-white">
                    <ChevronRightIcon className="h-3 w-3 text-emerald-500/0 group-hover:text-emerald-500 transition-all -translate-x-2 group-hover:translate-x-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: For Partners */}
          <div className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-emerald-500">Join Near Me Pros</h3>
            <ul className="space-y-5">
              {[
                { label: 'Register as a Professional', to: '/register' },
                { label: 'Merchant Dashboard', to: '/login' },
                { label: 'Partner Guidelines', to: '/verification' }
              ].map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="group flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-emerald-500 transition-colors dark:text-stone-400 dark:hover:text-white">
                    <ChevronRightIcon className="h-3 w-3 text-emerald-500/0 group-hover:text-emerald-500 transition-all -translate-x-2 group-hover:translate-x-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Support & Admin */}
          <div className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-emerald-500">Company</h3>
            <ul className="space-y-5">
              <li><Link to="/profile" className="text-sm font-bold text-stone-600 hover:text-emerald-500 transition-colors dark:text-stone-400 dark:hover:text-white">About Near Me Pros</Link></li>
              <li><a href="mailto:support@nearmepros.com" className="flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-emerald-500 transition-colors dark:text-stone-400 dark:hover:text-white"><PhoneIcon className="h-4 w-4" /> support@nearmepros.com</a></li>
              <li className="pt-6 border-t border-stone-200 mt-6 dark:border-white/5">
                <Link to="/admin/login" className="flex items-center gap-3 text-xs font-black text-emerald-600 hover:text-emerald-500 transition-all uppercase tracking-widest group dark:text-emerald-500/80 dark:hover:text-emerald-400">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </span>
                  Platform Access
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex gap-10">
             <Link to="/services" className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-400 hover:text-emerald-500 transition-colors dark:text-stone-600 dark:hover:text-stone-300">Privacy Policy</Link>
             <Link to="/services" className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-400 hover:text-emerald-500 transition-colors dark:text-stone-600 dark:hover:text-stone-300">Terms of Service</Link>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-stone-400 dark:text-stone-600">
            &copy; {new Date().getFullYear()} Near Me Pros Hub. Built With Trust.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
