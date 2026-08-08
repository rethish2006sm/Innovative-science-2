import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
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

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [auth, setAuth] = useState(() => getStoredAuth());
  const location = useLocation();
  const navigate = useNavigate();
  const isProfilePage = location.pathname === '/profile';
  const isAdminPage = location.pathname === '/admin' || location.pathname === '/dashboard';
  const classButtonPath = auth?.user?.classId ? `/class/${auth.user.classId}` : '';
  const classButtonLabel = auth?.user?.className?.trim() || 'Class';
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

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed top-0 left-0 z-50 w-full border-b border-teal-500/10 bg-[#0a0c1a]/70 backdrop-blur-2xl"
      >
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 overflow-hidden">
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
            className="absolute left-[-150px] top-[-150px] h-96 w-96 rounded-full bg-gradient-to-r from-teal-400/20 to-cyan-400/20 blur-3xl"
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
            className="absolute right-[-120px] bottom-[-120px] h-96 w-96 rounded-full bg-gradient-to-r from-rose-400/20 to-amber-400/20 blur-3xl"
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'dotPattern\' x=\'0\' y=\'0\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle fill=\'rgba(255,255,255,0.02)\' cx=\'2\' cy=\'2\' r=\'1.5\'%3E%3C/circle%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23dotPattern)\'%3E%3C/rect%3E%3C/svg%3E')] opacity-30" />
        </div>

        {/* Removed max-w restriction and padded the edges for edge-to-edge view */}
        <div className="relative mx-auto flex h-24 w-full items-center justify-between px-6 min-[309.4mm]:px-10">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex shrink-0 items-center gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMenuOpen(true)}
              className="relative block rounded-full bg-white/5 p-2 text-slate-300 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-teal-300 min-[309.4mm]:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </motion.button>

            {/* Logo Section */}
            <NavLink to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
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
                <h1 className="flex items-center gap-1 text-sm font-black tracking-tight text-white sm:text-lg md:text-2xl">
                  Innovative Science 2
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                  >
                    <Sparkles size={14} className="text-teal-400 sm:size-[18px]" />
                  </motion.span>
                </h1>
                <p className="text-[10px] tracking-wide text-slate-400 sm:text-xs md:text-sm">
                  by Rethish Sir
                </p>
              </div>
            </NavLink>
          </div>

          {/* Right Section: Nav items grouped tightly next to the profile button */}
          <div className="flex min-w-0 items-center gap-4 justify-end">
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
              className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border backdrop-blur-xl transition-all duration-300 min-[309.4mm]:hidden ${
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
                <User className="h-5 w-5" />
              )}
            </motion.button>

            {/* Desktop Navigation Links */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="hidden shrink-0 items-center gap-2 overflow-x-auto min-[309.4mm]:flex"
            >
              {desktopNavItems.map((item) => (
                <motion.div key={item.name} variants={itemVariants} className="shrink-0">
                  <NavLink to={item.path}>
                    {({ isActive }) => (
                      <motion.div
                        whileHover={{
                          y: -3,
                          transition: { type: 'spring', stiffness: 300 },
                        }}
                        whileTap={{ scale: 0.95 }}
                        className={`group relative flex shrink-0 whitespace-nowrap overflow-hidden rounded-2xl px-5 py-2.5 transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_0_25px_rgba(20,184,166,0.5)]'
                            : 'bg-white/5 text-slate-300 backdrop-blur-sm hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          <div className="absolute left-[-120%] top-0 h-full w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:left-[120%]" />
                        </div>
                        {isActive && (
                          <motion.div
                            layoutId="activeNavIndicator"
                            className="absolute inset-x-4 bottom-0 h-0.5 bg-gradient-to-r from-teal-300 to-cyan-300 rounded-full"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        )}
                        <div className="relative flex items-center gap-2 font-semibold whitespace-nowrap">
                          {item.icon}
                          {item.name}
                        </div>
                      </motion.div>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </motion.div>

            {hasClassButton && (
              <NavLink to={classButtonPath} aria-label={`Open ${classButtonLabel}`}>
                {({ isActive }) => (
                    <motion.div
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      className={`hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition-all duration-300 min-[309.4mm]:flex ${
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
              className="hidden min-w-0 items-center gap-2 min-[309.4mm]:flex"
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
                        <motion.div
                          animate={{
                            y: [0, -2, 0],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 2.5,
                            ease: 'easeInOut',
                          }}
                          className="relative z-10"
                        >
                          <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                        </motion.div>
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
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: -32, opacity: 0, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -32, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}
              className="fixed top-0 left-0 z-50 flex h-[100dvh] w-[min(22rem,100vw)] origin-left transform-gpu flex-col overflow-hidden border-r border-teal-500/20 bg-gradient-to-b from-[#0a0c1a] to-[#0f1225] shadow-2xl shadow-black/30 backdrop-blur-xl"
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
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex-1 overflow-y-auto px-5 py-5"
              >
                <div className="flex flex-col gap-3">
                  {mobileNavItems.map((item) => (
                    <motion.div key={item.name} variants={itemVariants}>
                      <NavLink to={item.path} onClick={() => setIsMenuOpen(false)}>
                        {({ isActive }) => {
                          const isBattleMode = item.name === 'Battle Mode'
                          const baseClasses = isBattleMode
                            ? 'relative overflow-hidden border border-amber-400/30 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 text-amber-100 shadow-[0_0_22px_rgba(251,146,60,0.28)]'
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
                                  className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)]"
                                />
                              )}
                              <div className={`relative ${isBattleMode ? 'text-amber-200' : 'text-teal-400'}`}>
                                {isBattleMode ? (
                                  <motion.div
                                    animate={{ y: [0, -2, 0], rotate: [-6, 8, -6], scale: [1, 1.05, 1] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                  >
                                    <Flame size={18} />
                                  </motion.div>
                                ) : (
                                  item.icon
                                )}
                              </div>
                              <span className="relative flex-1">{item.name}</span>
                              {isBattleMode && (
                                <motion.span
                                  animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                                  className="relative rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100"
                                >
                                  Hot
                                </motion.span>
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
                              <User size={20} className="text-teal-400" />
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
