
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ClipboardList,
  Check,
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
  Menu,
  MoreHorizontal,
  X,
  FlaskConical,
  FileText,
} from 'lucide-react';

import { apiRequest, assetUrl } from '../api';
import { authEvents, getStoredAuth } from '../authStorage';

import {
  getActiveScience,
  SCIENCE_CHANGED_EVENT,
  setActiveScience,
} from '../science';

import logo from '../assets/logo.svg';

// ============================================================
// NAVIGATION DATA
// ============================================================

const navItems = [
  { name: 'Home', path: '/', icon: <Home size={18} /> },
  { name: 'Weightage', path: '/chapter-weightage', icon: <BarChart3 size={18} /> },
  { name: 'Chapters', path: '/chapters', icon: <BookOpen size={18} /> },
  { name: 'Question Bank', path: '/questions', icon: <ClipboardList size={18} /> },
  { name: 'Test Builder', path: '/test-builder', icon: <FlaskConical size={18} /> },
  { name: 'PYQs', path: '/pyqs', icon: <FileText size={18} /> },
  { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={18} /> },
  { name: 'Daily Streak', path: '/daily-streak', icon: <Flame size={18} /> },
  { name: 'Battle Mode', path: '/battle-mode', icon: <Swords size={18} /> },
  { name: 'Contact', path: '/contact', icon: <PhoneCall size={18} /> },
  { name: 'Feedback', path: '/feedback', icon: <MessageCircleMore size={18} /> },
];

const aboutNavItem = {
  name: 'About',
  path: '/about',
  icon: <Info size={18} />,
};

const scienceOptions = ['Science 1', 'Science 2'];

const getScienceName = () =>
  getActiveScience() === 'science1' ? 'Science 1' : 'Science 2';

// ============================================================
// PERFORMANCE-OPTIMIZED CSS ANIMATIONS
// ============================================================

const NavbarAnimationStyles = memo(function NavbarAnimationStyles() {
  return (
    <style>{`
      @keyframes navbarAurora {
        0%, 100% {
          transform: translate3d(-8%, 0, 0) scale(1);
          opacity: .35;
        }
        50% {
          transform: translate3d(12%, 3%, 0) scale(1.12);
          opacity: .65;
        }
      }

      @keyframes navbarAuroraReverse {
        0%, 100% {
          transform: translate3d(8%, 0, 0) scale(1);
          opacity: .2;
        }
        50% {
          transform: translate3d(-12%, 4%, 0) scale(1.1);
          opacity: .5;
        }
      }

      @keyframes navbarEnergyRotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes navbarLightBeam {
        0% {
          transform: translate3d(-150%, 0, 0) skewX(-28deg);
        }
        100% {
          transform: translate3d(450%, 0, 0) skewX(-28deg);
        }
      }

      @keyframes navbarParticleFloat {
        0%, 100% {
          transform: translate3d(0, 0, 0) scale(.7);
          opacity: .2;
        }
        50% {
          transform: translate3d(5px, -13px, 0) scale(1.3);
          opacity: .9;
        }
      }

      @keyframes navbarLogoGlow {
        0%, 100% {
          opacity: .3;
          transform: scale(1);
        }
        50% {
          opacity: .7;
          transform: scale(1.2);
        }
      }

      @keyframes navbarBadgeGlow {
        0%, 100% {
          box-shadow: 0 0 8px var(--badge-glow);
        }
        50% {
          box-shadow: 0 0 22px var(--badge-glow);
        }
      }

      @keyframes navbarBadgeRing {
        to { transform: rotate(360deg); }
      }

      @keyframes navbarBadgeReflection {
        0% { transform: translateX(-150%) skewX(-25deg); }
        100% { transform: translateX(250%) skewX(-25deg); }
      }

      @keyframes navbarSparkle {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(12deg); }
      }

      @keyframes navbarBattleShine {
        from { transform: translateX(-150%); }
        to { transform: translateX(250%); }
      }

      .navbar-aurora {
        position: absolute;
        pointer-events: none;
        border-radius: 9999px;
        filter: blur(65px);
        will-change: transform, opacity;
        contain: strict;
      }

      .navbar-aurora-one {
        left: -10%;
        top: -90%;
        width: 65%;
        height: 250%;
        animation: navbarAurora 14s ease-in-out infinite;
      }

      .navbar-aurora-two {
        right: -15%;
        top: -100%;
        width: 65%;
        height: 260%;
        animation: navbarAuroraReverse 17s ease-in-out infinite;
      }

      .navbar-energy-field {
        position: absolute;
        top: -12rem;
        right: -6rem;
        width: 28rem;
        height: 28rem;
        border-radius: 50%;
        filter: blur(35px);
        animation: navbarEnergyRotate 45s linear infinite;
        will-change: transform;
      }

      .navbar-floating-glow {
        position: absolute;
        left: 35%;
        top: -150%;
        width: 30%;
        height: 300%;
        border-radius: 50%;
        filter: blur(60px);
        animation: navbarAurora 12s ease-in-out infinite;
      }

      .navbar-particle {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        animation: navbarParticleFloat 4s ease-in-out infinite;
        will-change: transform, opacity;
      }

      .navbar-light-beam {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 28%;
        animation: navbarLightBeam 9s ease-in-out infinite;
        animation-delay: 1s;
        will-change: transform;
      }

      .navbar-logo-aura {
        animation: navbarLogoGlow 3.5s ease-in-out infinite;
      }

      .navbar-sparkle {
        animation: navbarSparkle 4s ease-in-out infinite;
      }

      .navbar-badge-ring {
        animation: navbarBadgeRing 12s linear infinite;
        will-change: transform;
      }

      .navbar-badge-glow {
        animation: navbarBadgeGlow 3.5s ease-in-out infinite;
      }

      .navbar-badge-reflection {
        animation: navbarBadgeReflection 3.5s ease-in-out infinite;
        animation-delay: 1s;
      }

      .navbar-battle-shine {
        animation: navbarBattleShine 2.8s linear infinite;
      }

      .science-number-animation {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .navbar-scroll::-webkit-scrollbar {
        display: none;
      }

      .navbar-scroll {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      /* RESPONSIVE BRANDING */

      .navbar-brand-name {
        font-size: clamp(10px, 2.4vw, 24px);
        line-height: 1.15;
        white-space: nowrap;
        letter-spacing: -0.035em;
      }

      .navbar-teacher-name {
        font-size: clamp(8px, 1.15vw, 14px);
        line-height: 1.2;
        white-space: nowrap;
      }

      @media (max-width: 360px) {
        .navbar-brand-name {
          font-size: clamp(9px, 3.1vw, 11px);
          letter-spacing: -0.045em;
        }

        .navbar-teacher-name {
          font-size: 8px;
          letter-spacing: 0;
        }
      }

      @media (min-width: 361px) and (max-width: 640px) {
        .navbar-brand-name {
          font-size: clamp(11px, 3.3vw, 17px);
        }

        .navbar-teacher-name {
          font-size: 10px;
        }
      }

      @media (min-width: 641px) and (max-width: 1023px) {
        .navbar-brand-name {
          font-size: clamp(16px, 2.5vw, 22px);
        }

        .navbar-teacher-name {
          font-size: 12px;
        }
      }

      @media (min-width: 1024px) {
        .navbar-brand-name {
          font-size: clamp(18px, 1.7vw, 24px);
        }

        .navbar-teacher-name {
          font-size: 13px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .navbar-aurora,
        .navbar-energy-field,
        .navbar-floating-glow,
        .navbar-particle,
        .navbar-light-beam,
        .navbar-logo-aura,
        .navbar-sparkle,
        .navbar-badge-ring,
        .navbar-badge-glow,
        .navbar-badge-reflection,
        .navbar-battle-shine {
          animation: none !important;
        }
      }
    `}</style>
  );
});

// ============================================================
// SCIENCE NUMBER
// ============================================================

const ScienceNumber = memo(function ScienceNumber({ science }) {
  const number = science === 'Science 1' ? '1' : '2';
  const shouldReduceMotion = useReducedMotion();

  return (
    <span
      className="relative inline-flex h-[1.1em] w-[.7em] items-center justify-center overflow-hidden align-middle"
      aria-live="polite"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={number}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {number}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});

// ============================================================
// PREMIUM STREAK BACKGROUND
// ============================================================

const StreakEffects = memo(function StreakEffects({
  tier,
  reducedMotion,
}) {
  if (tier === 'default') return null;

  const gold = tier === 'gold';

  const particlePositions = [
    ['8%', '25%'],
    ['22%', '72%'],
    ['39%', '18%'],
    ['55%', '78%'],
    ['72%', '24%'],
    ['89%', '65%'],
  ];

  const particleColor = gold
    ? 'bg-amber-200 shadow-[0_0_12px_3px_rgba(251,191,36,.45)]'
    : 'bg-slate-100 shadow-[0_0_12px_3px_rgba(226,232,240,.4)]';

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

      <div
        className={`absolute inset-0 ${
          gold ? 'bg-[#100d08]' : 'bg-[#0b111b]'
        }`}
      />

      <div
        className={`absolute inset-0 ${
          gold
            ? 'bg-[radial-gradient(ellipse_at_20%_100%,rgba(183,120,28,.27),transparent_48%),radial-gradient(ellipse_at_75%_0%,rgba(255,208,105,.20),transparent_42%),radial-gradient(ellipse_at_50%_50%,rgba(130,86,24,.10),transparent_65%)]'
            : 'bg-[radial-gradient(ellipse_at_15%_100%,rgba(148,163,184,.25),transparent_48%),radial-gradient(ellipse_at_80%_0%,rgba(226,232,240,.17),transparent_42%),radial-gradient(ellipse_at_50%_50%,rgba(100,116,139,.13),transparent_65%)]'
        }`}
      />

      {!reducedMotion && (
        <>
          <div
            className={`navbar-aurora navbar-aurora-one ${
              gold ? 'bg-amber-400/15' : 'bg-slate-300/15'
            }`}
          />

          <div
            className={`navbar-aurora navbar-aurora-two ${
              gold ? 'bg-yellow-200/10' : 'bg-cyan-100/10'
            }`}
          />

          <div
            className={`navbar-energy-field ${
              gold
                ? 'bg-[conic-gradient(from_0deg,transparent,rgba(251,191,36,.15),transparent,rgba(217,163,74,.18),transparent)]'
                : 'bg-[conic-gradient(from_0deg,transparent,rgba(226,232,240,.15),transparent,rgba(148,163,184,.18),transparent)]'
            }`}
          />

          <div
            className={`navbar-floating-glow ${
              gold ? 'bg-amber-300/10' : 'bg-slate-200/10'
            }`}
          />

          <div
            className={`navbar-light-beam bg-gradient-to-r ${
              gold
                ? 'from-transparent via-amber-200/20 to-transparent'
                : 'from-transparent via-white/20 to-transparent'
            }`}
          />

          {particlePositions.map(([left, top], index) => (
            <span
              key={index}
              className={`navbar-particle ${particleColor}`}
              style={{
                left,
                top,
                animationDelay: `${index * 0.6}s`,
                animationDuration: `${3 + (index % 3)}s`,
              }}
            />
          ))}
        </>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.35)_0.6px,transparent_0.6px)] [background-size:17px_17px] opacity-[.12]" />

      <div
        className={`absolute bottom-0 h-[2px] w-full bg-gradient-to-r ${
          gold
            ? 'from-transparent via-amber-300/80 to-transparent'
            : 'from-transparent via-slate-200/80 to-transparent'
        }`}
      />
    </div>
  );
});

// ============================================================
// PREMIUM STREAK BADGE
// ============================================================

const StreakBadge = memo(function StreakBadge({
  tier,
  milestone,
  reducedMotion,
}) {
  if (!milestone) return null;

  const gold = tier === 'gold';

  return (
    <div className="relative ml-1 flex shrink-0 items-center">

      {!reducedMotion && (
        <div
          className={`navbar-badge-ring absolute -inset-[3px] rounded-full p-[1.5px] ${
            gold
              ? 'bg-[conic-gradient(from_0deg,transparent,#fff0ad,transparent,#d69b36,transparent,#fff0ad)]'
              : 'bg-[conic-gradient(from_0deg,transparent,#ffffff,transparent,#94a3b8,transparent,#ffffff)]'
          }`}
        >
          <div
            className={`h-full w-full rounded-full ${
              gold ? 'bg-[#21170a]' : 'bg-[#18212d]'
            }`}
          />
        </div>
      )}

      <div
        className={`navbar-badge-glow relative flex items-center gap-1 overflow-hidden rounded-full border px-2 py-1 sm:px-3 sm:py-1.5 ${
          gold
            ? 'border-amber-200/50 bg-gradient-to-br from-[#67491d] via-[#38260f] to-[#171006] text-[#ffe8a3]'
            : 'border-slate-200/50 bg-gradient-to-br from-[#687586] via-[#303c4b] to-[#111a26] text-[#f1f5f9]'
        }`}
        style={{
          '--badge-glow': gold
            ? 'rgba(245,158,11,.4)'
            : 'rgba(203,213,225,.35)',
          animationPlayState: reducedMotion ? 'paused' : 'running',
        }}
        aria-label={`${milestone}-day streak milestone`}
      >
        {!reducedMotion && (
          <span className="navbar-badge-reflection absolute inset-y-0 left-0 w-1/2 -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}

        <span className="relative text-[.95rem] leading-none sm:text-base">
          🔥
        </span>

        <span className="relative text-[10px] font-black tracking-wider sm:text-xs">
          {milestone}
        </span>
      </div>
    </div>
  );
});

// ============================================================
// MAIN NAVBAR
// ============================================================

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isScienceMenuOpen, setIsScienceMenuOpen] = useState(false);

  const [selectedScience, setSelectedScience] = useState(getScienceName);
  const [scienceToast, setScienceToast] = useState('');

  const scienceToastTimerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const scienceMenuRef = useRef(null);
  const mobileScienceMenuRef = useRef(null);

  const [auth, setAuth] = useState(() => getStoredAuth());
  const [currentStreak, setCurrentStreak] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  const shouldReduceMotion = useReducedMotion();

  // ==========================================================
  // PAGE CONDITIONS
  // ==========================================================

  const isProfilePage = location.pathname === '/profile';

  const isAdminPage = [
    '/admin',
    '/dashboard',
    '/admin/analysis',
    '/admin/questions',
  ].includes(location.pathname);

  const classButtonPath = auth?.user?.classId
    ? `/class/${auth.user.classId}`
    : '';

  const classButtonLabel =
    auth?.user?.className?.trim() || 'Class';

  const profileInitial = (
    auth?.user?.name || auth?.user?.email || 'U'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const hasClassButton = Boolean(classButtonPath);

  const hideContactForStudent =
    Boolean(auth?.user?.classId) && !auth?.user?.isAdmin;

  // ==========================================================
  // STREAK TIER
  // ==========================================================

  const streakTier =
    currentStreak >= 100
      ? 'gold'
      : currentStreak >= 50
        ? 'silver'
        : 'default';

  const isGold = streakTier === 'gold';
  const isSilver = streakTier === 'silver';

  const streakMilestone = isGold
    ? 100
    : isSilver
      ? 50
      : null;

  // ==========================================================
  // NAVIGATION ARRAYS
  // ==========================================================

  const homeNavItem = navItems.find(
    (item) => item.name === 'Home'
  );

  const battleModeNavItem = navItems.find(
    (item) => item.name === 'Battle Mode'
  );

  const desktopNavItems = navItems.filter(
    (item) =>
      item.name !== 'About' &&
      item.name !== 'Home' &&
      item.name !== 'Feedback' &&
      (!hideContactForStudent || item.name !== 'Contact')
  );

  const primaryDesktopNavItems = desktopNavItems.filter(
    (item) =>
      [
        'Chapters',
        'Question Bank',
        'PYQs',
        'Battle Mode',
      ].includes(item.name)
  );

  const moreDesktopNavItems = [
    aboutNavItem,
    ...navItems.filter(
      (item) =>
        ![
          'Chapters',
          'Question Bank',
          'PYQs',
          'Daily Streak',
          'Battle Mode',
        ].includes(item.name) &&
        (!hideContactForStudent || item.name !== 'Contact')
    ),
  ];

  const mobileNavItems = [
    homeNavItem,
    aboutNavItem,
    battleModeNavItem,
    ...navItems.filter(
      (item) =>
        item.name !== 'Home' &&
        item.name !== 'Battle Mode'
    ),
  ];

  // ==========================================================
  // LOAD STREAK
  // ==========================================================

  const loadNavbarStreak = useCallback(async () => {
    if (!auth?.token || auth?.user?.isAdmin) {
      setCurrentStreak(0);
      return;
    }

    try {
      const result = await apiRequest('/api/daily-challenge', {
        cache: 'no-store',
      });

      setCurrentStreak(
        Math.max(
          0,
          Number(result?.streak?.currentStreak || 0)
        )
      );
    } catch {
      // Keep the existing streak when the request fails.
    }
  }, [auth?.token, auth?.user?.isAdmin]);

  useEffect(() => {
    loadNavbarStreak();

    const refresh = () => loadNavbarStreak();

    window.addEventListener('focus', refresh);
    window.addEventListener('daily-streak:updated', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('daily-streak:updated', refresh);
    };
  }, [loadNavbarStreak]);

  // ==========================================================
  // LOCATION EFFECTS
  // ==========================================================

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsScienceMenuOpen(false);
    setAuth(getStoredAuth());
  }, [location]);

  // ==========================================================
  // AUTH SYNC
  // ==========================================================

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());

    window.addEventListener(authEvents.changed, syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  // ==========================================================
  // MOBILE SCROLL LOCK
  // ==========================================================

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  // ==========================================================
  // MORE MENU OUTSIDE CLICK
  // ==========================================================

  useEffect(() => {
    if (!isMoreOpen) return;

    const handleOutsideClick = (event) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target)
      ) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isMoreOpen]);

  // ==========================================================
  // SCIENCE MENU OUTSIDE CLICK
  // ==========================================================

  useEffect(() => {
    if (!isScienceMenuOpen) return;

    const handleOutsideClick = (event) => {
      const clickedDesktop =
        scienceMenuRef.current?.contains(event.target);

      const clickedMobile =
        mobileScienceMenuRef.current?.contains(event.target);

      if (!clickedDesktop && !clickedMobile) {
        setIsScienceMenuOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isScienceMenuOpen]);

  // ==========================================================
  // CLEANUP TOAST TIMER
  // ==========================================================

  useEffect(() => {
    return () => {
      window.clearTimeout(scienceToastTimerRef.current);
    };
  }, []);

  // ==========================================================
  // SCIENCE SYNC
  // ==========================================================

  useEffect(() => {
    const syncScience = () => {
      setSelectedScience(getScienceName());
    };

    window.addEventListener(SCIENCE_CHANGED_EVENT, syncScience);

    return () => {
      window.removeEventListener(
        SCIENCE_CHANGED_EVENT,
        syncScience
      );
    };
  }, []);

  // ==========================================================
  // SCIENCE SWITCHING
  // ==========================================================

  const handleScienceChange = (science) => {
    setIsScienceMenuOpen(false);

    if (science === selectedScience) return;

    setSelectedScience(science);

    setActiveScience(
      science === 'Science 1' ? 'science1' : 'science2'
    );

    setScienceToast(`Switched to ${science} ✓`);

    window.clearTimeout(scienceToastTimerRef.current);

    scienceToastTimerRef.current = window.setTimeout(() => {
      setScienceToast('');
    }, 2300);
  };

  // ==========================================================
  // SHARED THEME CLASSES
  // ==========================================================

  const themeButtonClass = isGold
    ? 'border-amber-200/20 bg-amber-100/10 text-amber-100 hover:bg-amber-100/20'
    : isSilver
      ? 'border-slate-200/20 bg-white/10 text-slate-100 hover:bg-white/20'
      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white';

  const brandTextClass = isGold
    ? 'bg-gradient-to-r from-[#fff4d0] via-[#e7b956] to-[#fff0bd] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(245,190,85,.25)]'
    : isSilver
      ? 'bg-gradient-to-r from-white via-[#cbd5e1] to-[#94a3b8] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(203,213,225,.25)]'
      : 'text-white';

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <NavbarAnimationStyles />

      {/* ======================================================
          MAIN NAVBAR
      ====================================================== */}

      <motion.nav
        initial={shouldReduceMotion ? false : { y: -35, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`navbar-shell isolate fixed left-0 top-0 z-[100] w-full overflow-visible border-b backdrop-blur-3xl transition-colors duration-500 ${
          isGold
            ? 'border-amber-200/30 bg-[#100d08]/95 shadow-[0_8px_45px_rgba(217,160,60,.18),inset_0_-1px_0_rgba(255,220,150,.12)]'
            : isSilver
              ? 'border-slate-200/30 bg-[#0b111b]/95 shadow-[0_8px_45px_rgba(203,213,225,.15),inset_0_-1px_0_rgba(255,255,255,.12)]'
              : 'border-teal-500/10 bg-[#0a0c1a]/70'
        }`}
      >

        <StreakEffects
          tier={streakTier}
          reducedMotion={shouldReduceMotion}
        />

        {/* ==================================================
            CONTENT CONTAINER
        ================================================== */}

        <div className="relative z-10 mx-auto flex min-h-24 w-full min-w-0 items-center gap-2 overflow-visible px-2 sm:gap-3 sm:px-5 lg:h-24 lg:px-6 xl:px-10">

          {/* ==================================================
              LEFT SECTION - RESPONSIVE BRANDING
          ================================================== */}

          <div className="flex min-w-0 flex-[1_1_0%] items-center gap-1.5 sm:gap-3 lg:flex-[0_1_auto]">

            {/* MOBILE MENU BUTTON */}

            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
              onClick={() => setIsMenuOpen(true)}
              className={`relative shrink-0 rounded-full border p-1.5 sm:p-2 backdrop-blur-xl transition-all lg:hidden ${themeButtonClass}`}
              aria-label="Open menu"
            >
              <Menu size={19} />
            </motion.button>

            {/* LOGO AND BRAND */}

            <NavLink
              to="/"
              className="group flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3 lg:flex-initial lg:max-w-[clamp(13rem,32vw,25rem)]"
            >

              {/* LOGO */}

              <div className="relative shrink-0">

                {!shouldReduceMotion && (
                  <div
                    className={`navbar-logo-aura absolute -inset-1.5 rounded-full blur-xl ${
                      isGold
                        ? 'bg-amber-300/35'
                        : isSilver
                          ? 'bg-slate-200/30'
                          : 'bg-gradient-to-r from-teal-400 to-cyan-400'
                    }`}
                  />
                )}

                <div
                  className={`relative rounded-full p-[1.5px] ${
                    isGold
                      ? 'bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-900'
                      : isSilver
                        ? 'bg-gradient-to-br from-white via-slate-400 to-slate-700'
                        : 'bg-gradient-to-br from-teal-400/70 to-cyan-400/30'
                  }`}
                >
                  <img
                    src={logo}
                    alt="Innovative Science Logo"
                    className="h-9 w-9 rounded-full border border-white/10 object-cover shadow-2xl sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16"
                  />
                </div>
              </div>

              {/* BRAND CONTENT */}

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-visible">

                {/* WEBSITE NAME - ALWAYS ONE LINE */}

                <h1
                  className={`navbar-brand-name flex min-w-0 items-center gap-1 whitespace-nowrap font-black transition-colors duration-500 ${brandTextClass}`}
                >
                  <span className="shrink-0 whitespace-nowrap">
                    Innovative Science{' '}
                    {selectedScience === 'Science 1' ? '1' : '2'}
                  </span>

                  <Sparkles
                    className={`shrink-0 ${
                      isGold
                        ? 'text-amber-300'
                        : isSilver
                          ? 'text-slate-200'
                          : 'text-teal-400'
                    } ${shouldReduceMotion ? '' : 'navbar-sparkle'}`}
                    style={{
                      width: 'clamp(11px, 1.5vw, 18px)',
                      height: 'clamp(11px, 1.5vw, 18px)',
                    }}
                  />
                </h1>

                {/* TEACHER NAME - ALWAYS ONE LINE */}

                <p
                  className={`navbar-teacher-name font-medium tracking-wide ${
                    isGold
                      ? 'text-amber-100/65'
                      : isSilver
                        ? 'text-slate-300/75'
                        : 'text-slate-400'
                  }`}
                >
                  Mr. Rethish Mudaliar
                </p>

                {/* MOBILE AND TABLET SCIENCE SELECTOR */}

                <div
                  ref={mobileScienceMenuRef}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className="relative z-[110] flex min-w-0 items-center lg:hidden"
                >

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      setIsScienceMenuOpen((current) => !current);
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold transition-all sm:px-2 sm:py-1 sm:text-[10px] ${
                      isGold
                        ? 'border-amber-200/30 bg-amber-100/10 text-amber-100 hover:bg-amber-100/20'
                        : isSilver
                          ? 'border-slate-200/30 bg-white/10 text-slate-100 hover:bg-white/20'
                          : 'border-teal-400/20 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20'
                    }`}
                    aria-expanded={isScienceMenuOpen}
                    aria-haspopup="menu"
                  >
                    {selectedScience}

                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        isScienceMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isScienceMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute left-0 top-[calc(100%+.4rem)] z-[120] w-32 overflow-hidden rounded-xl border p-1 shadow-2xl backdrop-blur-2xl ${
                          isGold
                            ? 'border-amber-200/20 bg-[#1b1409]/95'
                            : isSilver
                              ? 'border-slate-200/20 bg-[#17202d]/95'
                              : 'border-teal-500/20 bg-[#101426]/95'
                        }`}
                        role="menu"
                      >
                        {scienceOptions.map((science) => (
                          <button
                            key={science}
                            type="button"
                            onClick={() => handleScienceChange(science)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
                              selectedScience === science
                                ? isGold
                                  ? 'bg-amber-400/15 text-amber-300'
                                  : isSilver
                                    ? 'bg-slate-300/15 text-slate-100'
                                    : 'bg-teal-500/20 text-teal-300'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                            role="menuitem"
                          >
                            {science}

                            {selectedScience === science && (
                              <Check size={13} />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </NavLink>
          </div>

          {/* ==================================================
              RIGHT SECTION
          ================================================== */}

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3 lg:flex-1 lg:gap-4">

            {/* MOBILE PROFILE */}

            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
              onClick={() => {
                if (isProfilePage) {
                  navigate(-1);
                } else {
                  navigate(auth ? '/profile' : '/signin');
                }
              }}
              className={`relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border backdrop-blur-xl transition-all sm:h-10 sm:w-10 lg:hidden ${
                isProfilePage
                  ? 'border-teal-400/70 bg-teal-500/20 text-teal-300 shadow-[0_0_18px_rgba(20,184,166,.45)]'
                  : themeButtonClass
              }`}
              aria-label={
                isProfilePage
                  ? 'Go back'
                  : auth
                    ? 'Open profile'
                    : 'Sign in'
              }
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
                <span className="text-base font-black text-white">
                  {profileInitial}
                </span>
              )}
            </motion.button>

            {/* DESKTOP NAVIGATION */}

            <div className="navbar-scroll hidden min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto lg:flex lg:gap-1.5 xl:justify-end xl:gap-2">

              {primaryDesktopNavItems.map((item) => (
                <div key={item.name} className="shrink-0">

                  <NavLink to={item.path}>
                    {({ isActive }) => {
                      const isBattleMode =
                        item.name === 'Battle Mode';

                      return (
                        <motion.div
                          whileHover={
                            shouldReduceMotion ? undefined : { y: -2 }
                          }
                          whileTap={
                            shouldReduceMotion ? undefined : { scale: 0.96 }
                          }
                          className={`group relative flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl px-2.5 py-2 text-xs font-semibold transition-colors duration-300 sm:px-3 sm:py-2.5 sm:text-sm xl:px-4 ${
                            isBattleMode
                              ? 'desktop-battle-pill'
                              : isActive
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(20,184,166,.35)]'
                                : isGold
                                  ? 'bg-amber-100/[.06] text-amber-100/80 hover:bg-amber-100/15 hover:text-amber-50'
                                  : isSilver
                                    ? 'bg-white/[.06] text-slate-200/80 hover:bg-white/15 hover:text-white'
                                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="absolute inset-0 overflow-hidden rounded-2xl">
                            <div className="absolute left-[-120%] top-0 h-full w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-700 group-hover:left-[120%]" />
                          </div>

                          {isActive && !isBattleMode && (
                            <motion.div
                              layoutId="activeNavIndicator"
                              className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-teal-300 to-cyan-300"
                              transition={{ duration: 0.2 }}
                            />
                          )}

                          <span className="relative flex items-center gap-2 whitespace-nowrap">
                            {isBattleMode ? (
                              <>
                                <Flame
                                  className="h-[18px] w-[18px]"
                                  strokeWidth={2.4}
                                />
                                Battle Mode
                                <Swords
                                  className="h-[18px] w-[18px]"
                                  strokeWidth={2.2}
                                />
                              </>
                            ) : (
                              <>
                                {item.icon}
                                {item.name}
                              </>
                            )}
                          </span>
                        </motion.div>
                      );
                    }}
                  </NavLink>
                </div>
              ))}
            </div>

            {/* ==================================================
                DESKTOP SCIENCE / MORE
            ================================================== */}

            <div className="hidden shrink-0 items-center gap-2 lg:flex">

              {/* DESKTOP SCIENCE SELECTOR */}

              <div
                ref={scienceMenuRef}
                onClick={(event) => event.stopPropagation()}
                className="relative order-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsScienceMenuOpen((current) => !current)
                  }
                  className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition xl:px-4 ${themeButtonClass}`}
                  aria-expanded={isScienceMenuOpen}
                  aria-haspopup="menu"
                >
                  {selectedScience}

                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isScienceMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isScienceMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute right-0 top-[calc(100%+.75rem)] z-[70] w-36 rounded-2xl border p-2 shadow-2xl ${
                        isGold
                          ? 'border-amber-200/20 bg-[#1b1409]'
                          : isSilver
                            ? 'border-slate-200/20 bg-[#17202d]'
                            : 'border-white/10 bg-[#151827]'
                      }`}
                      role="menu"
                    >
                      {scienceOptions.map((science) => (
                        <button
                          key={science}
                          type="button"
                          onClick={() => handleScienceChange(science)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                            selectedScience === science
                              ? isGold
                                ? 'bg-amber-400/15 text-amber-300'
                                : isSilver
                                  ? 'bg-slate-300/15 text-slate-100'
                                  : 'bg-teal-500/20 text-teal-300'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                          role="menuitem"
                        >
                          {science}

                          {selectedScience === science && (
                            <Check size={14} />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MORE MENU */}

              <div ref={moreMenuRef} className="relative order-1">

                <button
                  type="button"
                  onClick={() =>
                    setIsMoreOpen((current) => !current)
                  }
                  className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition xl:px-4 ${
                    isGold
                      ? 'bg-amber-100/[.06] text-amber-100/80 hover:bg-amber-100/15'
                      : isSilver
                        ? 'bg-white/[.06] text-slate-200/80 hover:bg-white/15'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-expanded={isMoreOpen}
                  aria-haspopup="menu"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  More
                </button>

                <AnimatePresence>
                  {isMoreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute right-0 top-[calc(100%+.75rem)] z-[70] w-56 rounded-2xl border p-2 shadow-2xl ${
                        isGold
                          ? 'border-amber-200/20 bg-[#1b1409]'
                          : isSilver
                            ? 'border-slate-200/20 bg-[#17202d]'
                            : 'border-white/10 bg-[#151827]'
                      }`}
                      role="menu"
                    >
                      {moreDesktopNavItems.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          onClick={() => setIsMoreOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? 'bg-teal-500/20 text-teal-300'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`
                          }
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

            {/* ==================================================
                CLASS BUTTON
            ================================================== */}

            {hasClassButton && (
              <NavLink
                to={classButtonPath}
                aria-label={`Open ${classButtonLabel}`}
              >
                {({ isActive }) => (
                  <motion.div
                    whileHover={
                      shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97 }
                    }
                    className={`hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border px-2.5 py-2 text-xs font-semibold backdrop-blur-sm transition-all sm:px-3 sm:py-2.5 sm:text-sm xl:px-4 lg:flex ${
                      isActive
                        ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,.25)]'
                        : 'border-emerald-400/20 bg-white/5 text-slate-200 hover:border-emerald-400/40 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Users
                      size={18}
                      className="text-emerald-300"
                    />

                    <span className="max-w-[11rem] truncate">
                      {classButtonLabel}
                    </span>
                  </motion.div>
                )}
              </NavLink>
            )}

            {/* ==================================================
                DESKTOP PROFILE AND ADMIN
            ================================================== */}

            <div className="hidden shrink-0 items-center gap-2 lg:flex">

              {/* ADMIN */}

              {auth?.user?.isAdmin && (
                <NavLink
                  to="/admin"
                  aria-label="Open admin panel"
                >
                  {({ isActive }) => (
                    <motion.div
                      whileHover={
                        shouldReduceMotion ? undefined : { scale: 1.06 }
                      }
                      className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                        isActive || isAdminPage
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,.35)]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:text-amber-300'
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                    </motion.div>
                  )}
                </NavLink>
              )}

              {/* PROFILE */}

              {auth ? (
                <NavLink to="/profile">
                  {({ isActive }) => (
                    <motion.div
                      whileHover={
                        shouldReduceMotion ? undefined : { scale: 1.06 }
                      }
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.95 }
                      }
                      className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-all sm:h-11 sm:w-11 md:h-14 md:w-14 ${
                        isActive
                          ? 'border-teal-400/70 bg-teal-500/20 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,.5)]'
                          : isGold
                            ? 'border-amber-200/30 bg-amber-100/10 text-amber-100'
                            : isSilver
                              ? 'border-slate-200/30 bg-white/10 text-slate-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-teal-400/40'
                      }`}
                    >
                      {auth.user.profileImageUrl ? (
                        <img
                          src={assetUrl(auth.user.profileImageUrl)}
                          alt={auth.user.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-black text-white sm:text-xl md:text-2xl">
                          {profileInitial}
                        </span>
                      )}

                      {isActive && !shouldReduceMotion && (
                        <div className="pointer-events-none absolute inset-0 rounded-full border border-teal-400 opacity-70" />
                      )}
                    </motion.div>
                  )}
                </NavLink>
              ) : (
                <NavLink
                  to="/signin"
                  aria-label="Sign in"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-teal-400/40 hover:text-teal-300"
                >
                  <LogIn className="h-5 w-5" />
                </NavLink>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================
            BOTTOM BORDER
        ====================================================== */}

        <div
          className={`relative z-10 h-[1px] w-full bg-gradient-to-r ${
            isGold
              ? 'from-transparent via-amber-300/70 to-transparent'
              : isSilver
                ? 'from-transparent via-slate-200/70 to-transparent'
                : 'from-transparent via-teal-400/60 to-transparent'
          }`}
        />

      </motion.nav>

      {/* ======================================================
          MOBILE DRAWER
      ====================================================== */}

      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* BACKDROP */}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMenuOpen(false)}
              className="mobile-menu-backdrop fixed inset-0 z-[190] bg-black/60 backdrop-blur-md"
            />

            {/* DRAWER */}

            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96 }
              }
              transition={{ duration: 0.17 }}
              className={`mobile-drawer fixed inset-0 z-[200] m-auto flex h-[min(42rem,calc(100dvh-1.5rem))] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border shadow-2xl shadow-black/40 ${
                isGold
                  ? 'border-amber-300/20 bg-gradient-to-b from-[#1b1409] to-[#0f0c07]'
                  : isSilver
                    ? 'border-slate-300/20 bg-gradient-to-b from-[#17202d] to-[#0b111b]'
                    : 'border-teal-500/20 bg-gradient-to-b from-[#0a0c1a] to-[#0f1225]'
              }`}
            >

              {/* DRAWER HEADER */}

              <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-5">

                <div className="flex items-center gap-3">
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-10 w-10 rounded-full border border-teal-400/30"
                  />

                  <div>
                    <span
                      className={`text-lg font-bold ${
                        isGold
                          ? 'text-amber-100'
                          : isSilver
                            ? 'text-slate-100'
                            : 'text-white'
                      }`}
                    >
                      Menu
                    </span>

                    {streakMilestone && (
                      <p
                        className={`text-[9px] font-black tracking-widest ${
                          isGold
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {isGold ? 'LEGENDARY 100+' : 'PLATINUM 50+'}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* DRAWER NAVIGATION */}

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex flex-col gap-3">

                  {mobileNavItems.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {({ isActive }) => {
                        const isBattleMode =
                          item.name === 'Battle Mode';

                        const baseClasses = isBattleMode
                          ? 'mobile-battle-pill relative overflow-hidden text-white'
                          : isActive
                            ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 border-l-4 border-teal-400'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white';

                        return (
                          <div
                            className={`relative flex items-center gap-4 overflow-hidden rounded-xl px-4 py-3 text-base font-medium transition-all ${baseClasses}`}
                          >
                            {isBattleMode && !shouldReduceMotion && (
                              <div className="navbar-battle-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,.18),transparent)]" />
                            )}

                            <div
                              className={`relative ${
                                isBattleMode
                                  ? 'text-white'
                                  : 'text-teal-400'
                              }`}
                            >
                              {isBattleMode ? (
                                <Flame
                                  size={18}
                                  strokeWidth={2.4}
                                />
                              ) : (
                                item.icon
                              )}
                            </div>

                            <span className="relative flex-1">
                              {item.name}
                            </span>

                            {isBattleMode && (
                              <Swords
                                className="relative h-[18px] w-[18px] text-white"
                                strokeWidth={2.2}
                              />
                            )}
                          </div>
                        );
                      }}
                    </NavLink>
                  ))}

                </div>
              </div>

              {/* ACCOUNT LINKS */}

              <div className="shrink-0 border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">

                <div className="grid gap-2">

                  {auth ? (
                    <>
                      {/* CLASS */}

                      {hasClassButton && (
                        <NavLink
                          to={classButtonPath}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {({ isActive }) => (
                            <div
                              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition ${
                                isActive
                                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-l-4 border-emerald-400'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <Users
                                size={20}
                                className="text-emerald-400"
                              />
                              {classButtonLabel}
                            </div>
                          )}
                        </NavLink>
                      )}

                      {/* ADMIN */}

                      {auth.user.isAdmin && (
                        <NavLink
                          to="/admin"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {({ isActive }) => (
                            <div
                              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition ${
                                isActive
                                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-l-4 border-amber-400'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <Shield
                                size={20}
                                className="text-amber-400"
                              />
                              Admin
                            </div>
                          )}
                        </NavLink>
                      )}

                      {/* PROFILE */}

                      <NavLink
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {({ isActive }) => (
                          <div
                            className={`flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition ${
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ======================================================
          SCIENCE SWITCH TOAST
      ====================================================== */}

      <AnimatePresence>
        {scienceToast && (
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -8 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`fixed left-1/2 top-[6.5rem] z-[130] flex -translate-x-1/2 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-[0_12px_35px_rgba(8,145,178,.2)] backdrop-blur-xl sm:text-sm ${
              isGold
                ? 'border-amber-300/20 bg-[#21170a]/95 text-amber-100'
                : isSilver
                  ? 'border-slate-300/20 bg-[#18212d]/95 text-slate-100'
                  : 'border-teal-300/20 bg-[#101426]/95 text-teal-100'
            }`}
            role="status"
            aria-live="polite"
          >
            <Check
              className={`h-4 w-4 ${
                isGold
                  ? 'text-amber-300'
                  : isSilver
                    ? 'text-slate-200'
                    : 'text-teal-300'
              }`}
              strokeWidth={2.5}
            />

            <span>{scienceToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
