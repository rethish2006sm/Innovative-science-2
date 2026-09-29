import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronDown,
  Flame,
  Info,
  LogIn,
  Home,
  MessageCircleMore,
  PhoneCall,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  User,
  Menu,
  MoreHorizontal,
  X,
  FlaskConical,
  FileText,
} from 'lucide-react';
import { assetUrl } from '../api';
import { authEvents, getStoredAuth } from '../authStorage';
import logo from '../assets/logo.svg';

const navItems = [
  {
    name: 'Home',
    path: '/',
    icon: <Home size={18} />,
  },
  {
    name: 'Weightage',
    path: '/chapter-weightage',
    icon: <BarChart3 size={18} />,
  },
  {
    name: 'Chapters',
    path: '/chapters',
    icon: <BookOpen size={18} />,
  },
  {
    name: 'Test Builder',
    path: '/test-builder',
    icon: <FlaskConical size={18} />,
  },
  {
    name: 'PYQs',
    path: '/pyqs',
    icon: <FileText size={18} />,
  },
  {
    name: 'Leaderboard',
    path: '/leaderboard',
    icon: <Trophy size={18} />,
  },
  {
    name: 'Battle Mode',
    path: '/battle-mode',
    icon: <Swords size={18} />,
  },
  {
    name: 'Contact',
    path: '/contact',
    icon: <PhoneCall size={18} />,
  },
  {
    name: 'Feedback',
    path: '/feedback',
    icon: <MessageCircleMore size={18} />,
  },
];

const aboutNavItem = {
  name: 'About',
  path: '/about',
  icon: <Info size={18} />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: -30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
};

// The drawer itself provides the entrance animation. Keeping its contents
// static prevents a noticeable stagger every time the menu is opened.
const drawerVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const drawerItemVariants = {
  hidden: { y: 0, opacity: 1 },
  visible: { y: 0, opacity: 1 },
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isScienceMenuOpen, setIsScienceMenuOpen] = useState(false);
  const [selectedScience, setSelectedScience] = useState('Science 2');
  const moreMenuRef = useRef(null);
  const scienceMenuRef = useRef(null);
  const mobileScienceMenuRef = useRef(null);
  const [auth, setAuth] = useState(() => getStoredAuth());
  const location = useLocation();
  const navigate = useNavigate();
  const isProfilePage = location.pathname === '/profile';
  const isAdminPage = location.pathname === '/admin' || location.pathname === '/dashboard';
  const classButtonPath = auth?.user?.classId ? `/class/${auth.user.classId}` : '';
  const classButtonLabel = auth?.user?.className?.trim() || 'Class';
  const profileInitial = (auth?.user?.name || auth?.user?.email || 'U').trim().charAt(0).toUpperCase();
  const hasClassButton = Boolean(classButtonPath);
  const hideContactForStudent = Boolean(auth?.user?.classId) && !auth?.user?.isAdmin;
  const homeNavItem = navItems.find((item) => item.name === 'Home');
  const battleModeNavItem = navItems.find((item) => item.name === 'Battle Mode');
  const desktopNavItems = navItems.filter(
    (item) =>
      item.name !== 'About' &&
      item.name !== 'Home' &&
      item.name !== 'Feedback' &&
      (!hideContactForStudent || item.name !== 'Contact'),
  );
  const primaryDesktopNavItems = desktopNavItems.filter((item) => ['Chapters', 'PYQs', 'Battle Mode'].includes(item.name));
  const moreDesktopNavItems = [
    aboutNavItem,
    ...navItems.filter(
      (item) => !['Chapters', 'PYQs', 'Battle Mode'].includes(item.name)
        && (!hideContactForStudent || item.name !== 'Contact'),
    ),
  ];
  const mobileNavItems = [
    homeNavItem,
    {
      name: 'About',
      path: '/about',
      icon: <Info size={18} />,
    },
    battleModeNavItem,
    ...navItems.filter(
      (item) => item.name !== 'Home' && item.name !== 'Battle Mode' && item.name !== 'About',
    ),
  ];

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsScienceMenuOpen(false);
    setAuth(getStoredAuth());
  }, [location]);

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());

    window.addEventListener(authEvents.changed, syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMoreOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMoreOpen]);

  useEffect(() => {
    if (!isScienceMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      const clickedDesktopMenu = scienceMenuRef.current?.contains(event.target);
      const clickedMobileMenu = mobileScienceMenuRef.current?.contains(event.target);

      if (!clickedDesktopMenu && !clickedMobileMenu) {
        setIsScienceMenuOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isScienceMenuOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed top-0 left-0 z-[100] w-full overflow-visible border-b border-teal-500/10 bg-[#0a0c1a]/70 backdrop-blur-2xl"
      >
        {/* Animated Gradient Background */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <motion.div
            animate={{
              x: ['0%', '100%', '0%'],
              y: ['0%', '50%', '0%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="mobile-static-decoration absolute left-[-150px] top-[-150px] h-96 w-96 rounded-full bg-gradient-to-r from-teal-400/20 to-cyan-400/20 blur-3xl"
          />
          <motion.div
            animate={{
              x: ['0%', '-80%', '0%'],
              y: ['0%', '30%', '0%'],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="mobile-static-decoration absolute right-[-120px] bottom-[-120px] h-96 w-96 rounded-full bg-gradient-to-r from-rose-400/20 to-amber-400/20 blur-3xl"
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'dotPattern\' x=\'0\' y=\'0\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle fill=\'rgba(255,255,255,0.02)\' cx=\'2\' cy=\'2\' r=\'1.5\'%3E%3C/circle%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23dotPattern)\'%3E%3C/rect%3E%3C/svg%3E')] opacity-30" />
        </div>

        {/* Removed max-w restriction and padded the edges for edge-to-edge view */}
        <div className="relative z-10 mx-auto flex h-24 w-full min-w-0 items-center gap-3 overflow-visible px-3 sm:px-5 lg:px-6 xl:px-10">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3 lg:flex-[0_1_auto]">
            {/* Mobile Menu Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuOpen(true)}
              className="relative block shrink-0 rounded-full bg-white/5 p-2 text-slate-300 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-teal-300 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </motion.button>

            {/* Logo Section */}
            <NavLink to="/" className="group flex min-w-0 max-w-[clamp(13rem,32vw,25rem)] items-center gap-2 sm:gap-3">
              <motion.div
                whileHover={{
                  scale: 1.08,
                  rotate: 5,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 15,
                }}
                className="relative"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 opacity-40 blur-xl"
                />
                <img
                  src={logo}
                  alt="Innovative Science 2 Logo"
                  className="relative h-10 w-10 rounded-full border border-white/10 object-cover shadow-2xl transition-all duration-500 group-hover:border-teal-400/50 sm:h-12 sm:w-12 md:h-16 md:w-16"
                />
              </motion.div>

              {/* Website title now remains visible in mobile views with adjusted sizing */}
              <div className="min-w-0">
                <h1 className="flex min-w-0 items-center gap-1 truncate text-sm font-black tracking-tight text-white sm:text-lg md:text-2xl">
                  Innovative Science 2
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                  >
                    <Sparkles size={14} className="text-teal-400 sm:size-[18px]" />
                  </motion.span>
                </h1>
                <p className="text-[10px] tracking-wide text-slate-400 sm:text-xs md:text-sm">
                  Mr. Rethish Mudaliar
                </p>
                <div
                  ref={mobileScienceMenuRef}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                  className="relative z-[110] mt-0.5 lg:hidden"
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setIsScienceMenuOpen((current) => !current)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 backdrop-blur-sm transition hover:bg-white/10 hover:text-white sm:text-[10px]"
                    aria-expanded={isScienceMenuOpen}
                    aria-haspopup="menu"
                  >
                    {selectedScience}
                    <ChevronDown className={`h-3 w-3 transition-transform ${isScienceMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isScienceMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        className="absolute left-0 top-[calc(100%+0.35rem)] z-[120] w-24 rounded-xl border border-white/10 bg-[#101426] p-1 shadow-2xl backdrop-blur-xl"
                        role="menu"
                      >
                        {['Science 1', 'Science 2'].map((science) => (
                          <button
                            key={science}
                            type="button"
                            onClick={() => {
                              setSelectedScience(science);
                              setIsScienceMenuOpen(false);
                            }}
                            className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold transition ${selectedScience === science ? 'bg-teal-500/20 text-teal-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                            role="menuitem"
                          >
                            {science}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </NavLink>
          </div>

          {/* Right Section: Nav items grouped tightly next to the profile button */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:gap-4">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (isProfilePage) {
                  navigate(-1);
                } else {
                  navigate(auth ? '/profile' : '/signin');
                }
              }}
              className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border backdrop-blur-xl transition-all duration-300 lg:hidden ${
                isProfilePage
                  ? 'border-teal-400/70 bg-teal-500/20 text-teal-300 shadow-[0_0_18px_rgba(20,184,166,0.45)]'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-teal-400/40 hover:bg-white/10 hover:text-teal-300'
              }`}
              aria-label={isProfilePage ? 'Go back' : auth ? 'Open profile' : 'Sign in'}
            >
              {isProfilePage ? (
                <ArrowLeft className="h-5 w-5" />
              ) : auth?.user?.profileImageUrl ? (
                <img
                  src={assetUrl(auth.user.profileImageUrl)}
                  alt={auth.user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : !auth ? (
                <LogIn className="h-5 w-5" />
              ) : (
                <span className="text-base font-black text-white">{profileInitial}</span>
              )}
            </motion.button>

            {/* Desktop Navigation Links */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="hidden min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:flex lg:gap-1.5 xl:justify-end xl:gap-2"
            >
              {primaryDesktopNavItems.map((item) => (
                <motion.div key={item.name} variants={itemVariants} className="shrink-0">
                  <NavLink to={item.path}>
                    {({ isActive }) => {
                      const isBattleMode = item.name === 'Battle Mode'

                      return (
                        <motion.div
                        whileHover={{
                          y: -3,
                          transition: { type: 'spring', stiffness: 300 },
                        }}
                        whileTap={{ scale: 0.95 }}
                        className={`group relative flex shrink-0 whitespace-nowrap overflow-hidden rounded-2xl px-2.5 py-2 text-xs transition-all duration-300 sm:px-3 sm:py-2.5 sm:text-sm xl:px-4 ${
                          isBattleMode
                            ? 'desktop-battle-pill'
                            : isActive
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_0_25px_rgba(20,184,166,0.5)]'
                            : 'bg-white/5 text-slate-300 backdrop-blur-sm hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          <div className="absolute left-[-120%] top-0 h-full w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:left-[120%]" />
                        </div>
                        {isActive && !isBattleMode && (
                          <motion.div
                            layoutId="activeNavIndicator"
                            className="absolute inset-x-4 bottom-0 h-0.5 bg-gradient-to-r from-teal-300 to-cyan-300 rounded-full"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        )}
                        <div className="relative flex items-center gap-2 font-semibold whitespace-nowrap">
                          {isBattleMode ? (
                            <>
                              <Flame className="h-[18px] w-[18px]" strokeWidth={2.4} />
                              <span>Battle Mode</span>
                              <Swords className="h-[18px] w-[18px]" strokeWidth={2.2} />
                            </>
                          ) : (
                            <>
                              {item.icon}
                              {item.name}
                            </>
                          )}
                        </div>
                      </motion.div>
                      )
                    }}
                  </NavLink>
                </motion.div>
              ))}
            </motion.div>

            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <div
                ref={scienceMenuRef}
                onClick={(event) => event.stopPropagation()}
                className="relative order-2"
              >
                <button
                  type="button"
                  onClick={() => setIsScienceMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-300 backdrop-blur-sm transition hover:bg-white/10 hover:text-white xl:px-4"
                  aria-expanded={isScienceMenuOpen}
                  aria-haspopup="menu"
                >
                  {selectedScience}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isScienceMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isScienceMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-36 rounded-2xl border border-white/10 bg-[#151827]/95 p-2 shadow-2xl backdrop-blur-xl"
                      role="menu"
                    >
                      {['Science 1', 'Science 2'].map((science) => (
                        <button
                          key={science}
                          type="button"
                          onClick={() => {
                            setSelectedScience(science);
                            setIsScienceMenuOpen(false);
                          }}
                          className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${selectedScience === science ? 'bg-teal-500/20 text-teal-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                          role="menuitem"
                        >
                          {science}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div ref={moreMenuRef} className="relative order-1">
              <button
                type="button"
                onClick={() => setIsMoreOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-slate-300 backdrop-blur-sm transition hover:bg-white/10 hover:text-white xl:px-4"
                aria-expanded={isMoreOpen}
                aria-haspopup="menu"
              >
                <MoreHorizontal className="h-5 w-5" />
                More
              </button>
              <AnimatePresence>
                {isMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute right-0 top-[calc(100%+0.75rem)] z-[70] w-56 rounded-2xl border border-white/10 bg-[#151827]/95 p-2 shadow-2xl backdrop-blur-xl"
                    role="menu"
                  >
                    {moreDesktopNavItems.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMoreOpen(false)}
                        className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-teal-500/20 text-teal-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                        role="menuitem"
                      >
                        {item.icon}
                        {item.name}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>

            {hasClassButton && (
              <NavLink to={classButtonPath} aria-label={`Open ${classButtonLabel}`}>
                {({ isActive }) => (
                    <motion.div
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      className={`hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border px-2.5 py-2 text-xs font-semibold backdrop-blur-sm transition-all duration-300 sm:px-3 sm:py-2.5 sm:text-sm xl:px-4 lg:flex ${
                        isActive
                          ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                          : 'border-emerald-400/20 bg-white/5 text-slate-200 hover:border-emerald-400/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                    <Users size={18} className="text-emerald-300" />
                    <span className="max-w-[11rem] truncate">{classButtonLabel}</span>
                  </motion.div>
                )}
              </NavLink>
            )}

            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="hidden shrink-0 items-center gap-2 lg:flex"
            >
              {auth?.user?.isAdmin && (
                <NavLink to="/admin" aria-label="Open admin panel">
                  {({ isActive }) => (
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl transition-all duration-300 ${
                        isActive || isAdminPage
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:bg-white/10 hover:text-amber-300'
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                    </motion.div>
                  )}
                </NavLink>
              )}

              {auth ? (
                <NavLink to="/profile">
                  {({ isActive }) => (
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 3,
                      }}
                      whileTap={{
                        scale: 0.9,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 12,
                      }}
                      className={`group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border backdrop-blur-xl transition-all duration-300 sm:h-11 sm:w-11 md:h-14 md:w-14 ${
                        isActive
                          ? 'border-teal-400/70 bg-teal-500/20 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.5)]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-teal-400/40 hover:bg-white/10 hover:text-teal-300'
                      }`}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/0 via-teal-400/40 to-teal-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      {auth.user.profileImageUrl ? (
                        <img
                          src={assetUrl(auth.user.profileImageUrl)}
                          alt={auth.user.name}
                          className="relative z-10 h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="relative z-10 text-lg font-black text-white sm:text-xl md:text-2xl">
                          {profileInitial}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full border border-teal-400"
                        />
                      )}
                    </motion.div>
                  )}
                </NavLink>
              ) : (
                <NavLink
                  to="/signin"
                  aria-label="Sign in"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-teal-400/40 hover:bg-white/10 hover:text-teal-300"
                >
                  <LogIn className="h-5 w-5" />
                </NavLink>
              )}
            </motion.div>
          </div>
        </div>

        {/* Animated Bottom Border Glow */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
      </motion.nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'linear' }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-menu-backdrop fixed inset-0 z-[190] bg-black/60 backdrop-blur-md"
            />

            {/* Drawer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'tween', duration: 0.18, ease: 'ease-out' }}
              className="mobile-drawer fixed inset-0 z-[200] m-auto flex h-[min(42rem,calc(100dvh-1.5rem))] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border border-teal-500/20 bg-gradient-to-b from-[#0a0c1a] to-[#0f1225] shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              {/* Drawer Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-5">
                <div className="flex items-center gap-3">
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-10 w-10 rounded-full border border-teal-400/30"
                  />
                  <span className="text-lg font-bold text-white">Menu</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                >
                  <X size={22} />
                </motion.button>
              </div>

              {/* Drawer Navigation Items */}
              <motion.div
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                className="flex-1 overflow-y-auto px-5 py-5"
              >
                <div className="flex flex-col gap-3">
                  {mobileNavItems.map((item) => (
                    <motion.div key={item.name} variants={drawerItemVariants}>
                      <NavLink to={item.path} onClick={() => setIsMenuOpen(false)}>
                        {({ isActive }) => {
                          const isBattleMode = item.name === 'Battle Mode'
                          const baseClasses = isBattleMode
                            ? 'mobile-battle-pill relative overflow-hidden text-white'
                            : isActive
                              ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border-l-4 border-teal-400'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'

                          return (
                            <div
                              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${baseClasses}`}
                            >
                              {isBattleMode && (
                                <motion.div
                                  aria-hidden="true"
                                  animate={{ x: ['-30%', '130%'] }}
                                  transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                                  className="mobile-menu-live-effect absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)]"
                                />
                              )}
                              <div className={`relative ${isBattleMode ? 'text-white' : 'text-teal-400'}`}>
                                {isBattleMode ? (
                                  <Flame size={18} strokeWidth={2.4} />
                                ) : (
                                  item.icon
                                )}
                              </div>
                              <span className="relative flex-1">{item.name}</span>
                              {isBattleMode && (
                                <Swords className="relative h-[18px] w-[18px] text-white" strokeWidth={2.2} />
                              )}
                            </div>
                          )
                        }}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Account Links + Footer */}
              <div className="shrink-0 border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="grid gap-2">
                  {auth ? (
                    <>
                      {hasClassButton && (
                        <NavLink to={classButtonPath} onClick={() => setIsMenuOpen(false)}>
                          {({ isActive }) => (
                            <div
                              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-l-4 border-emerald-400'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <Users size={20} className="text-emerald-400" />
                              {classButtonLabel}
                            </div>
                          )}
                        </NavLink>
                      )}
                      {auth.user.isAdmin && (
                        <NavLink to="/admin" onClick={() => setIsMenuOpen(false)}>
                          {({ isActive }) => (
                            <div
                              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-l-4 border-amber-400'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <Shield size={20} className="text-amber-400" />
                              Admin
                            </div>
                          )}
                        </NavLink>
                      )}
                      <NavLink to="/profile" onClick={() => setIsMenuOpen(false)}>
                        {({ isActive }) => (
                          <div
                            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border-l-4 border-teal-400'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {auth.user.profileImageUrl ? (
                              <img
                                src={assetUrl(auth.user.profileImageUrl)}
                                alt={auth.user.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-teal-500/20 text-sm font-black text-teal-300">
                                {profileInitial}
                              </span>
                            )}
                            Profile
                          </div>
                        )}
                      </NavLink>
                    </>
                  ) : (
                    <>
                      <NavLink
                        to="/signin"
                        onClick={() => setIsMenuOpen(false)}
                        className="rounded-xl bg-white/5 px-4 py-3 text-base font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        Sign in
                      </NavLink>
                      <NavLink
                        to="/signup"
                        onClick={() => setIsMenuOpen(false)}
                        className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-base font-semibold text-white"
                      >
                        Sign up
                      </NavLink>
                    </>
                  )}
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 text-center">
                  <p className="text-xs text-slate-500">Innovative Science 2</p>
                  <p className="text-xs text-slate-600">by Rethish Sir</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
