import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  GraduationCap,
  Layers3,
  LineChart,
  LockKeyhole,
  Medal,
  MessageCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
  FileText,
  Swords,
  Gauge,
  ChartNoAxesCombined,
  Lightbulb,
  History,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useInView,
  animate,
} from "framer-motion";

// --------------------------------------------------
// GLOBAL STYLES (scoped helpers for this page)
// --------------------------------------------------

const pageStyles = `
  html { scroll-behavior: smooth; }

  .ab-gradient-text {
    background-image: linear-gradient(100deg, #ea580c 0%, #f97316 28%, #f59e0b 62%, #fbbf24 100%);
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: ab-gradient-shift 9s ease-in-out infinite;
  }

  @keyframes ab-gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  .ab-grid-bg {
    background-image:
      linear-gradient(to right, rgba(15, 23, 42, 0.055) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(15, 23, 42, 0.055) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 32%, transparent 80%);
    mask-image: radial-gradient(ellipse 78% 58% at 50% 0%, #000 32%, transparent 80%);
  }

  .ab-dots-bg {
    background-image: radial-gradient(rgba(249, 115, 22, 0.16) 1px, transparent 1px);
    background-size: 22px 22px;
  }

  .ab-spotlight {
    position: relative;
    isolation: isolate;
  }

  .ab-spotlight::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 0%), rgba(249, 115, 22, 0.10), transparent 68%);
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;
    z-index: -1;
  }

  .ab-spotlight:hover::before { opacity: 1; }

  .ab-marquee-track { animation: ab-marquee 46s linear infinite; }
  .ab-marquee:hover .ab-marquee-track { animation-play-state: paused; }

  @keyframes ab-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .ab-marquee-track,
    .ab-gradient-text { animation: none !important; }
  }
`;

// --------------------------------------------------
// ANIMATION VARIANTS — lighter & faster
// --------------------------------------------------

const EASE = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};

const popIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } },
};

// Viewport presets — trigger earlier so animations feel instant while scrolling
const VIEWPORT_EARLY = {
  once: true,
  amount: 0.03,
  margin: "0px 0px 140px 0px",
};
const VIEWPORT_EARLY_SMALL = {
  once: true,
  amount: 0.03,
  margin: "0px 0px 100px 0px",
};

// --------------------------------------------------
// HOOKS — detect mobile / lite mode
// --------------------------------------------------

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
};

/** true when motion should be kept minimal (mobile or reduced-motion). */
const useLiteMode = () => {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  return Boolean(reduced) || isMobile;
};

// --------------------------------------------------
// DATA
// --------------------------------------------------

const features = [
  {
    number: "01",
    icon: BookOpen,
    title: "Chapter-based learning",
    description:
      "Explore Science 2 chapters, study individual topics, read learning material and continue practising from where you left off.",
    tag: "LEARN",
    color: "orange",
  },
  {
    number: "02",
    icon: Layers3,
    title: "Multiple question types",
    description:
      "Practise MCQs, True or False, Correlation, Odd Man Out, Match the Following, tables, diagrams, symbols and numericals.",
    tag: "PRACTICE",
    color: "blue",
  },
  {
    number: "03",
    icon: Brain,
    title: "Brain Cell rewards",
    description:
      "Earn Brain Cells through eligible questions. Rewards are tracked separately to prevent repeated rewards for the same question.",
    tag: "REWARDS",
    color: "purple",
  },
  {
    number: "04",
    icon: Flame,
    title: "Daily Streak",
    description:
      "Build a consistent learning habit with daily challenges, streak records, challenge accuracy and milestone rewards.",
    tag: "CONSISTENCY",
    color: "orange",
  },
  {
    number: "05",
    icon: Swords,
    title: "Battle Mode",
    description:
      "Create or join live battle rooms, compete using room codes, answer timed questions and explore your battle results.",
    tag: "COMPETE",
    color: "red",
  },
  {
    number: "06",
    icon: Trophy,
    title: "Leaderboards",
    description:
      "Explore overall and class rankings, compare Brain Cells and track your position within your learning community.",
    tag: "RANKINGS",
    color: "yellow",
  },
  {
    number: "07",
    icon: Target,
    title: "Custom Test Builder",
    description:
      "Build personalised practice tests by selecting chapters, topics, question types and the number of questions.",
    tag: "TESTS",
    color: "blue",
  },
  {
    number: "08",
    icon: FileText,
    title: "Previous Year Questions",
    description:
      "Access previous year Science 2 question papers with year-wise browsing and month-wise paper organisation.",
    tag: "EXAM PREP",
    color: "purple",
  },
  {
    number: "09",
    icon: BarChart3,
    title: "Performance dashboard",
    description:
      "Understand your learning through accuracy, activity graphs, performance trends, personal records and practice history.",
    tag: "ANALYTICS",
    color: "green",
  },
  {
    number: "10",
    icon: ChartNoAxesCombined,
    title: "Chapter & topic analysis",
    description:
      "Identify strong chapters, weaker topics, accuracy, attempts and the areas that need more revision.",
    tag: "INSIGHTS",
    color: "orange",
  },
  {
    number: "11",
    icon: History,
    title: "Progress history",
    description:
      "Review saved attempts, question-level answers, test results, chapter breakdowns and reward history.",
    tag: "HISTORY",
    color: "blue",
  },
  {
    number: "12",
    icon: Gauge,
    title: "Answering speed",
    description:
      "Analyse response time, average speed, median time and the time taken for correct and incorrect answers when available.",
    tag: "SPEED",
    color: "green",
  },
  {
    number: "13",
    icon: UserRound,
    title: "Student profile",
    description:
      "Manage your personal information, profile image, class details, password and notification preferences.",
    tag: "PROFILE",
    color: "purple",
  },
  {
    number: "14",
    icon: Users,
    title: "Class community",
    description:
      "Access class information, notices, announcements, learning materials and class-based leaderboards according to your access.",
    tag: "COMMUNITY",
    color: "blue",
  },
  {
    number: "15",
    icon: MessageCircle,
    title: "Feedback & support",
    description:
      "Share feedback, submit ratings, report questions and request help whenever you need assistance.",
    tag: "SUPPORT",
    color: "orange",
  },
];

const steps = [
  {
    number: "01",
    icon: UserRound,
    title: "Create your account",
    text: "Sign up or log in to access your personalised learning space.",
  },
  {
    number: "02",
    icon: BookOpen,
    title: "Choose what to learn",
    text: "Select a chapter, topic, custom test or daily challenge.",
  },
  {
    number: "03",
    icon: Zap,
    title: "Start practising",
    text: "Answer questions loaded from the learning database.",
  },
  {
    number: "04",
    icon: CheckCircle2,
    title: "Get your results",
    text: "Your answers are checked and your results are recorded.",
  },
  {
    number: "05",
    icon: Brain,
    title: "Earn rewards",
    text: "Eligible activities update your Brain Cells and progress.",
  },
  {
    number: "06",
    icon: LineChart,
    title: "Analyse performance",
    text: "Explore your accuracy, speed, attempts and improvement.",
  },
  {
    number: "07",
    icon: Lightbulb,
    title: "Find weak areas",
    text: "Identify topics that need more attention and revision.",
  },
  {
    number: "08",
    icon: RefreshCw,
    title: "Improve continuously",
    text: "Practise again and build stronger learning habits.",
  },
];

// --------------------------------------------------
// SHARED PRIMITIVES
// --------------------------------------------------

const Reveal = ({
  children,
  className = "",
  variants = fadeUp,
  amount = 0.03,
  as = "div",
}) => {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount, margin: "0px 0px 120px 0px" }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
};

const StaggerGroup = ({
  children,
  className = "",
  stagger = 0.04,
  amount = 0.03,
}) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount, margin: "0px 0px 120px 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
};

const Counter = ({ value, suffix = "", className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
};

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400"
    />
  );
};

const SectionHeading = ({ eyebrow, title, description, align = "left" }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_EARLY}
      transition={{ duration: 0.45, ease: EASE }}
      className={
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"
      }
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-orange-50/70 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        {eyebrow}
      </span>

      <h2 className="mt-5 text-[30px] font-black leading-[1.14] tracking-[-0.03em] text-slate-950 sm:text-[40px] lg:text-[46px]">
        {title}
      </h2>

      <p className="mt-5 max-w-2xl text-[14px] leading-8 text-slate-500 sm:text-[15px]">
        {description}
      </p>
    </motion.div>
  );
};

const trackPointer = (event) => {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

const Aboutpage = () => {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-white text-slate-900 antialiased selection:bg-orange-200/60">
      <style>{pageStyles}</style>

      <ScrollProgress />

      <HeroSection />
      <MarqueeBand />
      <PlatformSection />
      <FeaturesSection />
      <GamificationSection />
      <AnalyticsSection />
      <JourneySection />
      <TransparencySection />
      <FinalCTASection />
    </main>
  );
};

// --------------------------------------------------
// 01 · HERO
// --------------------------------------------------

const HeroSection = () => {
  const reduced = useReducedMotion();
  const lite = useLiteMode();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Parallax only when not lite; values stay at 0 otherwise (free of cost)
  const textY = useTransform(scrollYProgress, [0, 1], [0, lite ? 0 : 30]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, lite ? 0 : 60]);
  const blobY = useTransform(scrollYProgress, [0, 1], [0, lite ? 0 : -40]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-28"
    >
      {/* Ambient background — heavier blobs hidden on mobile */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ab-grid-bg absolute inset-0 opacity-80" />

        <motion.div
          style={{ y: blobY }}
          className="absolute -left-36 -top-28 hidden h-[380px] w-[380px] rounded-full bg-orange-200/40 blur-3xl md:block md:blur-[120px]"
        />
        <motion.div
          style={{ y: blobY }}
          className="absolute -right-32 top-24 hidden h-[420px] w-[420px] rounded-full bg-amber-200/35 blur-3xl md:block md:blur-[130px]"
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* COPY */}
        <motion.div style={{ y: textY }}>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700 shadow-sm">
              <Sparkles size={13} className="text-orange-500" />
              Your science learning ecosystem
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            </span>
          </motion.div>

          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.04, ease: EASE }}
            className="mt-6 text-[40px] font-black leading-[1.05] tracking-[-0.038em] text-slate-950 sm:text-6xl lg:text-[68px]"
          >
            Learning science.
            <br />
            <span className="ab-gradient-text">Tracking growth.</span>
            <br />
            Becoming better.
          </motion.h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
            className="mt-7 max-w-xl text-[15px] leading-8 text-slate-500"
          >
            Innovative Science 2 is an interactive Science 2 learning platform
            designed to make practice meaningful, progress measurable and exam
            preparation more engaging.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              to="/chapters"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Start learning</span>
              <ArrowRight
                size={17}
                className="relative transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>

            <Link
              to="/test-builder"
              className="group inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-7 py-4 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/70 hover:text-orange-700"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-100 text-orange-600 transition-transform duration-300 group-hover:scale-110">
                <Play size={11} fill="currentColor" />
              </span>
              Build a test
            </Link>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-500" />
              Saved learning progress
            </span>
            <span className="flex items-center gap-2">
              <Brain size={15} className="text-orange-500" />
              Reward-based practice
            </span>
            <span className="flex items-center gap-2">
              <ChartNoAxesCombined size={15} className="text-sky-500" />
              Performance insights
            </span>
          </motion.div>
        </motion.div>

        {/* VISUAL */}
        <motion.div
          style={{ y: visualY }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          <div className="absolute -inset-6 -z-10 rounded-[46px] bg-gradient-to-br from-orange-200/50 via-amber-100/40 to-transparent blur-xl md:blur-2xl" />

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.96, x: 14 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            className="relative rounded-[32px] border border-orange-100/90 bg-white p-5 shadow-[0_24px_70px_-32px_rgba(234,88,12,0.35)] sm:p-6 md:bg-white/85 md:backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Learning overview
                </p>
                <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-900">
                  Your growth space
                </h2>
              </div>

              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
                <GraduationCap size={22} />
              </div>
            </div>

            {/* Brain Cell panel */}
            <div className="relative mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-5 text-white shadow-lg shadow-orange-500/20">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">
                    Reward system
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight">
                    Brain Cells
                  </p>
                  <p className="mt-1 text-[11px] text-orange-50/90">
                    Earn through eligible questions
                  </p>
                </div>

                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20">
                  <Brain size={30} />
                </div>
              </div>

              <div className="relative mt-5 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 text-[11px] font-semibold">
                <Zap size={14} />
                Every eligible new question can reward 1 Brain Cell
              </div>
            </div>

            {/* Mini grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <VisualCard
                icon={Flame}
                title="Daily Streak"
                description="Build consistency"
                tone="orange"
              />
              <VisualCard
                icon={Swords}
                title="Battle Mode"
                description="Challenge others"
                tone="violet"
              />
              <VisualCard
                icon={Trophy}
                title="Leaderboard"
                description="Track rankings"
                tone="amber"
              />
              <VisualCard
                icon={BarChart3}
                title="Analytics"
                description="Understand growth"
                tone="sky"
              />
            </div>
          </motion.div>

          {/* Floating chips — desktop only */}
          {!lite && (
            <>
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -right-3 top-24 hidden h-14 w-14 place-items-center rounded-2xl border border-orange-100 bg-white text-orange-500 shadow-xl shadow-orange-500/10 sm:grid"
              >
                <Sparkles size={23} />
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -bottom-5 -left-4 hidden items-center gap-2.5 rounded-2xl border border-emerald-100 bg-white px-3.5 py-2.5 shadow-xl shadow-emerald-500/10 sm:flex"
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={17} />
                </span>
                <span>
                  <span className="block text-[11px] font-black text-slate-900">
                    Progress saved
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Your learning history
                  </span>
                </span>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <div className="mt-16 flex justify-center">
        <a
          href="#platform"
          className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition-all duration-300 hover:border-orange-200 hover:text-orange-600"
        >
          Explore the platform
          <ArrowDown
            size={14}
            className="transition-transform duration-300 group-hover:translate-y-0.5"
          />
        </a>
      </div>
    </section>
  );
};

const VisualCard = ({ icon: Icon, title, description, tone }) => {
  const tones = {
    orange: "bg-orange-50 text-orange-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };

  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/10">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${tones[tone]}`}
      >
        <Icon size={18} />
      </div>
      <p className="mt-3 text-[13px] font-black tracking-tight text-slate-900">
        {title}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
    </div>
  );
};

// --------------------------------------------------
// 02 · MARQUEE BAND
// --------------------------------------------------

const MarqueeBand = () => {
  const reduced = useReducedMotion();
  const items = features.map((f) => f.title);

  return (
    <div className="ab-marquee relative overflow-hidden border-y border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-28" />

      <div
        className={`flex w-max ${reduced ? "" : "ab-marquee-track"}`}
        aria-hidden={reduced ? undefined : "true"}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {items.map((label, index) => (
              <span key={`${copy}-${label}`} className="flex items-center">
                <span className="px-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-orange-600">
                  {label}
                </span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-orange-300" />
                {index === items.length - 1 && <span className="w-5" />}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// --------------------------------------------------
// 03 · PLATFORM INTRODUCTION
// --------------------------------------------------

const platformCards = [
  {
    icon: BookOpen,
    title: "Learn",
    description: "Explore chapters, topics and study materials.",
    number: "01",
  },
  {
    icon: Target,
    title: "Practise",
    description: "Solve different objective questions and tests.",
    number: "02",
  },
  {
    icon: Trophy,
    title: "Compete",
    description: "Participate in battles and explore rankings.",
    number: "03",
  },
  {
    icon: LineChart,
    title: "Improve",
    description: "Understand your performance and revise better.",
    number: "04",
  },
];

const PlatformSection = () => {
  return (
    <section
      id="platform"
      className="relative scroll-mt-20 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-white py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="More than just questions"
          title={
            <>
              One platform.
              <br />
              <span className="ab-gradient-text">Multiple ways to grow.</span>
            </>
          }
          description="From learning individual concepts to analysing your exam preparation, everything comes together in one connected learning experience."
        />

        <StaggerGroup
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.05}
        >
          {platformCards.map((card) => (
            <motion.article
              key={card.number}
              variants={fadeUp}
              onMouseMove={trackPointer}
              className="ab-spotlight group relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_18px_45px_-25px_rgba(234,88,12,0.4)]"
            >
              <span className="absolute right-5 top-5 text-4xl font-black tracking-tighter text-slate-100 transition-colors duration-300 group-hover:text-orange-100">
                {card.number}
              </span>

              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600 transition-all duration-300 group-hover:scale-105 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white">
                <card.icon size={23} />
              </div>

              <h3 className="mt-6 text-lg font-black tracking-tight text-slate-900">
                {card.title}
              </h3>

              <p className="mt-2 text-[13px] leading-7 text-slate-500">
                {card.description}
              </p>

              <div className="mt-5 h-1 w-9 rounded-full bg-orange-400 transition-all duration-500 group-hover:w-16" />
            </motion.article>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
};

// --------------------------------------------------
// 04 · FEATURES
// --------------------------------------------------

const featureTones = {
  orange:
    "bg-orange-50 text-orange-600 group-hover:from-orange-500 group-hover:to-orange-600",
  blue: "bg-sky-50 text-sky-600 group-hover:from-sky-500 group-hover:to-blue-600",
  purple:
    "bg-violet-50 text-violet-600 group-hover:from-violet-500 group-hover:to-purple-600",
  red: "bg-rose-50 text-rose-600 group-hover:from-rose-500 group-hover:to-red-600",
  yellow:
    "bg-amber-50 text-amber-600 group-hover:from-amber-400 group-hover:to-orange-500",
  green:
    "bg-emerald-50 text-emerald-600 group-hover:from-emerald-500 group-hover:to-teal-600",
};

const FeaturesSection = () => {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-1/4 hidden h-[360px] w-[360px] rounded-full bg-orange-100/50 blur-3xl md:block md:blur-[120px]" />
        <div className="absolute -right-40 bottom-1/4 hidden h-[360px] w-[360px] rounded-full bg-amber-100/50 blur-3xl md:block md:blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Explore the ecosystem"
          title={
            <>
              Everything you need
              <br />
              <span className="ab-gradient-text">to learn smarter.</span>
            </>
          }
          description="Discover the tools and features designed to support your Science 2 learning journey, from your first question to your latest performance report."
        />

        <Reveal
          className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/70 px-5 py-4"
          variants={popIn}
        >
          <p className="text-sm font-semibold text-slate-500">
            Explore all platform features
          </p>

          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-sm shadow-orange-500/30">
            <Sparkles size={12} />
            <Counter value={15} /> Features
          </span>
        </Reveal>

        <StaggerGroup
          className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          stagger={0.035}
        >
          {features.map((feature) => (
            <FeatureCard key={feature.number} feature={feature} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
};

const FeatureCard = ({ feature }) => {
  const Icon = feature.icon;

  return (
    <motion.article
      variants={fadeUp}
      onMouseMove={trackPointer}
      className="ab-spotlight group relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_18px_45px_-28px_rgba(234,88,12,0.45)] sm:p-7"
    >
      <div className="flex items-start justify-between">
        <div
          className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br transition-all duration-300 group-hover:scale-105 group-hover:text-white ${featureTones[feature.color]}`}
        >
          <Icon size={22} />
        </div>

        <span className="text-[11px] font-black tracking-[0.18em] text-slate-200 transition-colors duration-300 group-hover:text-orange-300">
          {feature.number}
        </span>
      </div>

      <div className="mt-5">
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-500">
          {feature.tag}
        </span>

        <h3 className="mt-2 text-[16px] font-black tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-orange-700">
          {feature.title}
        </h3>

        <p className="mt-2.5 text-[13px] leading-7 text-slate-500">
          {feature.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-[11px] font-semibold text-slate-400">
          Innovative Science 2
        </span>

        <ArrowUpRight
          size={16}
          className="text-slate-300 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-orange-500"
        />
      </div>
    </motion.article>
  );
};

// --------------------------------------------------
// 05 · GAMIFICATION
// --------------------------------------------------

const gamificationPoints = [
  {
    icon: Brain,
    title: "Brain Cell rewards",
    text: "Earn eligible rewards and monitor your accumulated Brain Cells.",
  },
  {
    icon: Flame,
    title: "Daily Streak challenges",
    text: "Build a consistent practice routine and celebrate milestones.",
  },
  {
    icon: Swords,
    title: "Live Battle Mode",
    text: "Challenge classmates and explore your battle performance.",
  },
  {
    icon: Medal,
    title: "Student leaderboards",
    text: "Discover your ranking across the overall and class leaderboards.",
  },
];

const GamificationSection = () => {
  const reduced = useReducedMotion();
  const lite = useLiteMode();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-orange-50/60 to-white py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ab-dots-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_20%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
        {/* Copy */}
        <motion.div
          initial={reduced ? false : { opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VIEWPORT_EARLY}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700 shadow-sm">
            <Zap size={13} className="text-orange-500" />
            Learning meets gamification
          </span>

          <h2 className="mt-6 text-[32px] font-black leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[44px]">
            Make every
            <br />
            question count.
            <br />
            <span className="ab-gradient-text">Make progress visible.</span>
          </h2>

          <p className="mt-6 max-w-lg text-[14px] leading-8 text-slate-500 sm:text-[15px]">
            Learning becomes more engaging when students can see their
            achievements, maintain consistency and understand how their
            performance changes over time.
          </p>

          <div className="mt-9 grid gap-5">
            {gamificationPoints.map((point) => (
              <div key={point.title} className="group flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-100 bg-white text-orange-600 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white">
                  <point.icon size={20} />
                </div>

                <div>
                  <h3 className="text-[14px] font-black tracking-tight text-slate-900">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-6 text-slate-500 sm:text-[13px]">
                    {point.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT_EARLY}
          transition={{ duration: 0.55, ease: EASE }}
          className="relative"
        >
          <div className="absolute -inset-5 -z-10 rounded-[40px] bg-gradient-to-br from-orange-200/40 via-amber-100/30 to-transparent blur-xl md:blur-2xl" />

          <div className="rounded-[30px] border border-orange-100/90 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(234,88,12,0.35)] sm:p-7 md:bg-white/90 md:backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Your learning journey
                </p>
                <h3 className="mt-1.5 text-xl font-black tracking-tight text-slate-900">
                  Stay consistent
                </h3>
              </div>

              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                <Flame size={25} />
              </div>
            </div>

            {/* Streak panel */}
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-5">
              <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-orange-200/40 blur-2xl" />

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
                    Daily streak
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    Stay on track
                  </p>
                </div>

                <motion.div
                  animate={lite ? {} : { scale: [1, 1.06, 1] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-orange-500 shadow-md shadow-orange-500/15"
                >
                  <Flame size={28} />
                </motion.div>
              </div>

              <p className="relative mt-3 text-[11.5px] leading-6 text-slate-500">
                Daily challenges, longest streak records, accuracy and milestone
                rewards.
              </p>
            </div>

            {/* Mini cards */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/10">
                <Brain size={22} className="text-orange-500" />
                <p className="mt-3.5 text-[13px] font-black text-slate-900">
                  Brain Cells
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Question rewards
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10">
                <Trophy size={22} className="text-amber-500" />
                <p className="mt-3.5 text-[13px] font-black text-slate-900">
                  Leaderboard
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Class rankings
                </p>
              </div>
            </div>

            {/* Battle row */}
            <div className="group mt-3 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/10">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 transition-transform duration-300 group-hover:scale-110">
                <Swords size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-slate-900">
                  Battle Mode
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Compete. Answer. Review.
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="shrink-0 text-slate-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-500"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// --------------------------------------------------
// 06 · ANALYTICS
// --------------------------------------------------

const analyticsPoints = [
  {
    icon: Target,
    title: "Accuracy tracking",
    text: "Understand your correct and incorrect answers.",
  },
  {
    icon: Clock3,
    title: "Answering speed",
    text: "Review average and median response times when available.",
  },
  {
    icon: BookOpen,
    title: "Chapter-wise analysis",
    text: "Find strong chapters and topics that need revision.",
  },
  {
    icon: RefreshCw,
    title: "Improvement insights",
    text: "Compare your recent performance with earlier attempts.",
  },
];

const chartBars = [32, 52, 42, 72, 57, 85, 68, 95, 76, 88, 63, 100];

const AnalyticsSection = () => {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="absolute -left-32 top-1/3 hidden h-[340px] w-[340px] rounded-full bg-sky-100/40 blur-3xl md:block md:blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_EARLY}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
              <ChartNoAxesCombined size={14} />
              Understand your performance
            </span>

            <h2 className="mt-6 text-[32px] font-black leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[44px]">
              Don't just solve
              <br />
              questions.
              <br />
              <span className="ab-gradient-text">Understand yourself.</span>
            </h2>

            <p className="mt-6 text-[14px] leading-8 text-slate-500 sm:text-[15px]">
              Your performance dashboard turns saved practice records into
              meaningful insights. Understand what is improving, what needs
              attention and where your next practice session should begin.
            </p>

            <div className="mt-8 grid gap-4">
              {analyticsPoints.map((point) => (
                <div
                  key={point.title}
                  className="group flex items-start gap-3.5"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-100 bg-white text-orange-600 shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-orange-200 group-hover:shadow-md">
                    <point.icon size={18} />
                  </div>

                  <div>
                    <p className="text-[13.5px] font-black tracking-tight text-slate-900">
                      {point.title}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-6 text-slate-500">
                      {point.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/profile/performance"
              className="group mt-9 inline-flex items-center gap-3 text-[13px] font-black text-orange-600 transition-all duration-300 hover:gap-5"
            >
              Explore performance
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>

          {/* Dashboard card */}
          <motion.div
            initial={reduced ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_EARLY}
            transition={{ duration: 0.55, ease: EASE }}
            className="relative"
          >
            <div className="absolute -inset-5 -z-10 rounded-[40px] bg-gradient-to-br from-sky-100/50 via-orange-100/40 to-transparent blur-xl md:blur-2xl" />

            <div className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.3)] sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Performance analytics
                  </p>
                  <h3 className="mt-1.5 text-xl font-black tracking-tight text-slate-900">
                    Learning overview
                  </h3>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                  <BarChart3 size={22} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MetricCard
                  icon={BookOpen}
                  title="Questions"
                  subtitle="Total attempts"
                />
                <MetricCard
                  icon={Target}
                  title="Accuracy"
                  subtitle="Answer correctness"
                />
                <MetricCard
                  icon={Clock3}
                  title="Response time"
                  subtitle="Answering speed"
                />
                <MetricCard
                  icon={Flame}
                  title="Streak"
                  subtitle="Daily consistency"
                />
              </div>

              {/* Bars */}
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-black text-slate-800">
                    Learning activity
                  </p>
                  <span className="text-[9px] font-black tracking-[0.16em] text-slate-400">
                    VISUAL PREVIEW
                  </span>
                </div>

                <div className="mt-6 flex h-32 items-end justify-between gap-1.5 sm:gap-2">
                  {chartBars.map((height, index) => (
                    <motion.div
                      key={index}
                      initial={reduced ? false : { height: 0, opacity: 0.4 }}
                      whileInView={{ height: `${height}%`, opacity: 1 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{
                        duration: 0.55,
                        delay: reduced ? 0 : index * 0.035,
                        ease: EASE,
                      }}
                      className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-amber-400"
                    />
                  ))}
                </div>

                <p className="mt-4 text-center text-[10px] leading-5 text-slate-400">
                  Illustrative interface — actual dashboard data is based on
                  saved attempts.
                </p>
              </div>

              <div className="mt-3 flex items-start gap-3 rounded-xl bg-orange-50/80 p-4">
                <Lightbulb
                  size={19}
                  className="mt-0.5 shrink-0 text-orange-500"
                />
                <p className="text-[11.5px] leading-6 text-slate-600">
                  Learning insights use rule-based calculations from your
                  recorded performance.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({ icon: Icon, title, subtitle }) => (
  <div className="group rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/10">
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-orange-500" />
      <p className="text-[12px] font-black text-slate-800">{title}</p>
    </div>
    <p className="mt-1.5 text-[10.5px] text-slate-400">{subtitle}</p>
  </div>
);

// --------------------------------------------------
// 07 · JOURNEY / HOW IT WORKS
// --------------------------------------------------

const JourneySection = () => {
  return (
    <section className="relative border-y border-slate-100 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Your learning journey"
          title={
            <>
              Simple steps.
              <br />
              <span className="ab-gradient-text">Meaningful progress.</span>
            </>
          }
          description="Every practice session contributes to a clearer picture of your learning journey."
        />

        <StaggerGroup
          className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.045}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.number}
                variants={fadeUp}
                className="group relative"
              >
                <div className="relative mb-5 flex items-center justify-between">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-orange-100 bg-white text-orange-600 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white">
                    <Icon size={24} />
                  </div>

                  <span className="text-4xl font-black tracking-tighter text-slate-100 transition-colors duration-300 group-hover:text-orange-100">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-[15.5px] font-black tracking-tight text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-2 text-[13px] leading-7 text-slate-500">
                  {step.text}
                </p>

                {index !== steps.length - 1 && (
                  <div className="absolute right-0 top-7 hidden translate-x-1/2 text-orange-200 lg:block">
                    <ChevronRight size={20} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
};

// --------------------------------------------------
// 08 · TRANSPARENCY
// --------------------------------------------------

const trustCards = [
  {
    icon: ShieldCheck,
    title: "Saved attempts",
    text: "Practice history is maintained for performance analysis.",
  },
  {
    icon: LockKeyhole,
    title: "Reward tracking",
    text: "Previously rewarded questions are tracked separately.",
  },
  {
    icon: Clock3,
    title: "Timing records",
    text: "Response timing is available for attempts that recorded it.",
  },
  {
    icon: RefreshCw,
    title: "Separate challenges",
    text: "Daily challenge performance is separate from regular chapter practice.",
  },
];

const TransparencySection = () => {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
          <Reveal variants={fadeLeft} amount={0.05}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
              Built around real progress
            </p>

            <h2 className="mt-4 text-[28px] font-black leading-[1.15] tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Your progress.
              <br />
              Your records.
              <br />
              <span className="ab-gradient-text">Your improvement.</span>
            </h2>

            <p className="mt-4 max-w-md text-[13.5px] leading-7 text-slate-500">
              Performance insights are calculated from recorded learning
              activity, rather than displaying random or invented results.
            </p>
          </Reveal>

          <StaggerGroup className="grid gap-3 sm:grid-cols-2" stagger={0.05}>
            {trustCards.map((card) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                className="group flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_16px_38px_-24px_rgba(234,88,12,0.4)]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white">
                  <card.icon size={20} />
                </div>

                <div>
                  <h3 className="text-[13.5px] font-black tracking-tight text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-6 text-slate-500">
                    {card.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
};

// --------------------------------------------------
// 09 · FINAL CTA
// --------------------------------------------------

const FinalCTASection = () => {
  const lite = useLiteMode();

  return (
    <section className="relative px-5 pb-20 pt-4 sm:px-8 sm:pb-28 lg:px-10">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50/80 to-white px-6 py-14 shadow-[0_24px_70px_-38px_rgba(234,88,12,0.45)] sm:px-14 sm:py-20">
        {/* Decorative rings */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border-[40px] border-orange-200/30" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full border-[48px] border-amber-200/30" />

        {!lite && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute right-10 top-10 hidden text-orange-300/60 sm:block"
          >
            <Sparkles size={62} />
          </motion.div>
        )}

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30">
            <GraduationCap size={30} />
          </div>

          <p className="mt-7 text-[10px] font-black uppercase tracking-[0.26em] text-orange-600">
            Your next chapter starts here
          </p>

          <h2 className="mt-5 text-[32px] font-black leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-[52px]">
            Ready to make
            <br />
            <span className="ab-gradient-text">learning count?</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-[13.5px] leading-8 text-slate-500 sm:text-[15px]">
            Start practising, discover your strengths, work on your weak areas
            and make every learning session more meaningful.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/chapters"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/35"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Explore chapters</span>
              <ArrowRight
                size={17}
                className="relative transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-7 py-4 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:bg-white hover:text-orange-700"
            >
              Back to home
            </Link>
          </div>

          <p className="mt-9 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            <span>Innovative Science 2</span>
            <span className="h-1 w-1 rounded-full bg-orange-300" />
            <span>Learn</span>
            <span className="h-1 w-1 rounded-full bg-orange-300" />
            <span>Practise</span>
            <span className="h-1 w-1 rounded-full bg-orange-300" />
            <span>Improve</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Aboutpage;
