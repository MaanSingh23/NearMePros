import React, { useEffect, useState, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  CalendarIcon,
  HomeIcon,
  Bars3Icon,
  MoonIcon,
  SunIcon,
  ShieldCheckIcon,
  XMarkIcon,
  SparklesIcon,
  MapPinIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [scrolled, setScrolled] = useState(false);
  const { location: userLoc, loading: locLoading, refreshLocation } = useLocation();
  const isAdminUser = user?.role === 'admin';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldHideUserNav = isAdminUser || isAdminRoute;

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClass = (path) =>
    `rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
      location.pathname === path
        ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20 dark:bg-primary-500 dark:text-stone-950 dark:shadow-primary-900/30'
        : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white'
    }`;

  return (
    <div className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'pt-2' : 'pt-0 md:pt-4'}`}>
      <nav className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-500 ${scrolled ? 'md:max-w-full md:px-0' : ''}`}>
        <div className={`mx-auto flex h-[4.5rem] max-w-full items-center justify-between transition-all duration-500
          ${scrolled 
            ? 'w-full rounded-none border-b border-stone-200/50 bg-white/80 px-4 shadow-sm backdrop-blur-2xl dark:border-stone-800/50 dark:bg-stone-950/80' 
            : 'rounded-[2rem] border border-white/60 bg-white/60 px-6 shadow-xl shadow-stone-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-stone-900/60 dark:shadow-black/20'}`}
        >
          <div className="flex items-center gap-4 lg:gap-8">
            <Link to="/" className="group flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-[1.25rem] bg-stone-900 text-white shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:bg-primary-600 dark:bg-primary-500 dark:text-stone-950">
                <HomeIcon className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400">
                  <SparklesIcon className="h-2.5 w-2.5 text-stone-950" />
                </span>
              </span>
              <span className="hidden sm:block">
                <span className="block text-xl font-black tracking-tight text-stone-950 dark:text-white">Near Me Pros</span>
              </span>
            </Link>

            {/* Professional Location Display */}
            {!isAdminRoute && (
              <div className="hidden h-10 items-center gap-3 border-l border-stone-200 pl-4 lg:flex dark:border-stone-800">
                <div className="flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 transition hover:bg-stone-50 dark:hover:bg-white/5"
                  onClick={() => refreshLocation({ force: true })}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400">
                    {locLoading ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPinIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Service Area</span>
                    <span className="text-xs font-black text-stone-900 dark:text-white">
                      {userLoc?.city ? (
                        `${userLoc.city}${userLoc.state ? `, ${userLoc.state}` : ''}`
                      ) : (
                        'Ludhiana, Punjab'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {!shouldHideUserNav && (
              <Link to="/services" className={linkClass('/services')}>
                Find Services
              </Link>
            )}

            {isAuthenticated && !shouldHideUserNav && (
              <>
                <Link to="/bookings" className={linkClass('/bookings')}>
                  My Bookings
                </Link>
                {user?.role !== 'provider' && (
                  <Link to="/reviews" className={linkClass('/reviews')}>
                    Ratings
                  </Link>
                )}
                {user?.role === 'provider' && (
                  <Link to="/provider/dashboard" className={linkClass('/provider/dashboard')}>
                    Dashboard
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-stone-800 dark:text-amber-300 dark:ring-stone-700 dark:hover:bg-stone-700"
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 py-1.5 pl-1.5 pr-4 shadow-sm transition hover:shadow-md focus:outline-none dark:border-stone-700 dark:bg-stone-800">
                  <img
                    src={user?.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + user?.name}
                    alt={user?.name}
                    className="h-8 w-8 rounded-full border border-stone-100 bg-stone-50 object-cover dark:border-stone-600 dark:bg-stone-900"
                  />
                  <span className="hidden text-sm font-bold text-stone-800 dark:text-stone-100 sm:block">
                    {user?.name}
                  </span>
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95 translate-y-2"
                  enterTo="transform opacity-100 scale-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="transform opacity-100 scale-100 translate-y-0"
                  leaveTo="transform opacity-0 scale-95 translate-y-2"
                >
                  <Menu.Items className="absolute right-0 mt-3 w-56 origin-top-right overflow-hidden rounded-[1.5rem] border border-stone-100 bg-white p-2 shadow-2xl shadow-stone-900/15 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40">
                    <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 mb-2 sm:hidden">
                      <p className="text-sm font-black text-stone-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 capitalize">{user?.role}</p>
                    </div>
                  
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={`${
                            active ? 'bg-primary-50 text-stone-950 dark:bg-stone-800 dark:text-white' : 'text-stone-700 dark:text-stone-300'
                          } flex items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-colors`}
                        >
                          <UserCircleIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-400" />
                          Profile
                        </Link>
                      )}
                    </Menu.Item>

                    {!shouldHideUserNav && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/bookings"
                            className={`${
                              active ? 'bg-primary-50 text-stone-950 dark:bg-stone-800 dark:text-white' : 'text-stone-700 dark:text-stone-300'
                            } flex items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-colors`}
                          >
                            <CalendarIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-400" />
                            My Bookings
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    {!shouldHideUserNav && user?.role !== 'provider' && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/reviews"
                            className={`${
                              active ? 'bg-primary-50 text-stone-950 dark:bg-stone-800 dark:text-white' : 'text-stone-700 dark:text-stone-300'
                            } flex items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-colors`}
                          >
                            <SparklesIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-400" />
                            Ratings
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    {user?.role === 'admin' && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/admin/dashboard"
                            className={`${
                              active ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-300'
                            } flex items-center rounded-xl px-4 py-2.5 text-sm font-black transition-colors`}
                          >
                            <ShieldCheckIcon className="mr-3 h-5 w-5 text-emerald-500" />
                            Admin Dashboard
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    {!shouldHideUserNav && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/verification"
                            className={`${
                              active ? 'bg-primary-50 text-stone-950 dark:bg-stone-800 dark:text-white' : 'text-stone-700 dark:text-stone-300'
                            } flex items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-colors`}
                          >
                            <Cog6ToothIcon className="mr-3 h-5 w-5 text-primary-600 dark:text-primary-400" />
                            Verification
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    <div className="my-1 border-t border-stone-100 dark:border-stone-800"></div>

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'text-stone-700 dark:text-stone-300'
                          } flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-bold transition-colors`}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-500" />
                          Logout
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <Link
                  to="/login"
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-stone-900/20 transition hover:-translate-y-0.5 hover:bg-stone-800 dark:bg-primary-500 dark:text-stone-950 dark:hover:bg-primary-400"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-900 shadow-sm ring-1 ring-stone-200 md:hidden dark:bg-stone-800 dark:text-white dark:ring-stone-700"
            >
              {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="mt-4 overflow-hidden rounded-[2rem] border border-stone-200/50 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/95 md:hidden">
            <div className="grid gap-2">
              {!shouldHideUserNav && (
                <Link onClick={() => setIsOpen(false)} to="/services" className="rounded-2xl px-5 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                  Find Services
                </Link>
              )}
              {isAuthenticated && !shouldHideUserNav && (
                <Link onClick={() => setIsOpen(false)} to="/bookings" className="rounded-2xl px-5 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                  My Bookings
                </Link>
              )}
              {isAuthenticated && user?.role !== 'provider' && !shouldHideUserNav && (
                <Link onClick={() => setIsOpen(false)} to="/reviews" className="rounded-2xl px-5 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                  Ratings
                </Link>
              )}
              {isAuthenticated && user?.role === 'provider' && !shouldHideUserNav && (
                <Link onClick={() => setIsOpen(false)} to="/provider/dashboard" className="rounded-2xl px-5 py-3.5 text-sm font-bold text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                  Dashboard
                </Link>
              )}
              {!isAuthenticated && (
                <div className="grid grid-cols-2 gap-3 mt-2 border-t border-stone-100 pt-4 dark:border-stone-800">
                  <Link onClick={() => setIsOpen(false)} to="/login" className="flex items-center justify-center rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold text-stone-900 dark:bg-stone-800 dark:text-white">
                    Login
                  </Link>
                  <Link onClick={() => setIsOpen(false)} to="/register" className="flex items-center justify-center rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white dark:bg-primary-500 dark:text-stone-950">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}

export default Navbar;
