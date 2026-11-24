import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Crown,
  Flame,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { apiRequest } from "../api";
import { authEvents, getStoredAuth } from "../authStorage";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientLeaderboardError = (error) =>
  !error?.status ||
  [408, 429, 500, 502, 503, 504].includes(Number(error.status));

const normalizeLeaderboardRow = (row, index) => ({
  id: String(row?.id || row?._id || row?.email || `student-${index}`),
  name: String(row?.name || "Student").trim() || "Student",
  className: String(row?.className || "").trim(),
  totalBrainCells: Number(row?.totalBrainCells || 0),
});

const normalizeLeaderboardRows = (rows = []) =>
  Array.isArray(rows) ? rows.map(normalizeLeaderboardRow) : [];

const compareRows = (a, b) => {
  if (b.totalBrainCells !== a.totalBrainCells) {
    return b.totalBrainCells - a.totalBrainCells;
  }

  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;

  return a.className.localeCompare(b.className);
};

const mergeRows = (left, right) => {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compareRows(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return result.concat(left.slice(i), right.slice(j));
};

const mergeSort = (rows) => {
  if (rows.length <= 1) return rows;

  const middle = Math.floor(rows.length / 2);

  return mergeRows(
    mergeSort(rows.slice(0, middle)),
    mergeSort(rows.slice(middle)),
  );
};

const numberFormat = (value) =>
  new Intl.NumberFormat("en-IN").format(value || 0);

const getInitial = (name) => name?.trim()?.charAt(0)?.toUpperCase() || "S";

// --------------------------------------------------
// ANIMATED NUMBER (count-up)
// --------------------------------------------------

const AnimatedNumber = memo(({ value }) => {
  const reducedMotion = useReducedMotion();
  const target = Number(value || 0);
  const [display, setDisplay] = useState(reducedMotion ? target : 0);
  const displayRef = useRef(display);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(target);
      return undefined;
    }

    const from = displayRef.current;
    if (from === target) return undefined;

    const duration = 850;
    const startTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    let frame;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reducedMotion]);

  return <span className="tabular-nums">{numberFormat(display)}</span>;
});

AnimatedNumber.displayName = "AnimatedNumber";

// --------------------------------------------------
// HERO HEADLINE
// --------------------------------------------------

const headlineContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.15,
    },
  },
};

const letterVariant = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const StaggerLine = ({ text, className = "", letterClassName = "" }) => (
  <span className={`inline-block ${className}`}>
    {text.split("").map((char, index) => (
      <motion.span
        key={`${char}-${index}`}
        variants={letterVariant}
        className={`inline-block ${letterClassName}`}
      >
        {char === " " ? "\u00A0" : char}
      </motion.span>
    ))}
  </span>
);

const HeroHeadline = memo(() => {
  const reducedMotion = useReducedMotion();

  const baseClass =
    "mt-7 text-[44px] font-black leading-[0.95] tracking-[-0.07em] text-slate-950 sm:text-7xl lg:text-[86px]";

  if (reducedMotion) {
    return (
      <h1 className={baseClass}>
        THINK.
        <br />
        <span className="relative inline-block text-orange-500">
          COMPETE.
          <span className="absolute -bottom-2 left-0 h-1.5 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" />
        </span>
        <br />
        <span className="text-slate-900">DOMINATE.</span>
      </h1>
    );
  }

  return (
    <motion.h1
      variants={headlineContainer}
      initial="hidden"
      animate="show"
      className={baseClass}
    >
      <StaggerLine text="THINK." />

      <br />

      <span className="relative inline-block">
        <StaggerLine
          text="COMPETE."
          letterClassName="bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent"
        />

        <span className="absolute -bottom-2 left-0 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.75, duration: 0.8, ease: "easeOut" }}
            className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-orange-500 via-orange-500 to-amber-300"
          />
          <motion.span
            animate={{ x: ["-120%", "320%"] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.6,
            }}
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
        </span>
      </span>

      <br />

      <StaggerLine text="DOMINATE." className="text-slate-900" />
    </motion.h1>
  );
});

HeroHeadline.displayName = "HeroHeadline";

// --------------------------------------------------
// HERO DECORATION DATA
// --------------------------------------------------

const TROPHY_PARTICLES = [
  { top: "4%", left: "47%" },
  { top: "17%", right: "6%" },
  { bottom: "17%", left: "5%" },
  { bottom: "6%", right: "21%" },
  { top: "45%", left: "-2%" },
  { top: "38%", right: "-2%" },
];

const AVATAR_POSITIONS = [
  "-right-2 top-1",
  "-left-2 bottom-10",
  "left-[42%] -top-2",
];

// --------------------------------------------------
// ANIMATED HERO
// --------------------------------------------------

const ArenaHero = memo(({ count, highest, myRank, loading, topStudents }) => {
  const reducedMotion = useReducedMotion();
  const avatars = (topStudents || []).slice(0, 3);

  return (
    <div className="relative isolate overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_18px_65px_rgba(154,52,18,0.07)] sm:rounded-[42px]">
      {/* Decorative atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(255,101,0,0.10),transparent_58%)]" />
        <div className="absolute -right-32 -top-44 h-[420px] w-[420px] rounded-full bg-orange-100/70 blur-[75px]" />
        <div className="absolute -bottom-48 left-1/3 h-[330px] w-[330px] rounded-full bg-amber-100/60 blur-[80px]" />

        <motion.div
          animate={reducedMotion ? {} : { rotate: 360 }}
          transition={{ duration: 65, repeat: Infinity, ease: "linear" }}
          className="absolute -right-20 top-0 h-[390px] w-[390px] rounded-full border border-orange-200/50"
        />

        <motion.div
          animate={reducedMotion ? {} : { rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          className="absolute -right-2 top-12 h-[260px] w-[260px] rounded-full border border-dashed border-orange-300/40"
        />

        <div className="absolute right-[115px] top-[95px] h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_18px_5px_rgba(249,115,22,0.4)]" />
      </div>

      <div className="relative grid gap-9 p-6 sm:p-10 lg:grid-cols-[1fr_300px] lg:items-center lg:p-12">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3"
          >
            <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                Live · Innovative Science 2
              </span>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Competitive Arena / 001
            </span>
          </motion.div>

          <HeroHeadline />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-7 max-w-md text-sm leading-7 text-slate-500 sm:text-base"
          >
            Your knowledge is your power. Every objective you solve brings you
            one step closer to the top.
          </motion.p>

          <div className="mt-8 flex flex-wrap gap-3">
            <motion.a
              whileHover={reducedMotion ? undefined : { y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              href="#rankings"
              className="group inline-flex h-12 items-center gap-3 rounded-full bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-orange-600 hover:shadow-orange-500/25"
            >
              Explore arena
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </motion.a>

            <motion.div
              whileHover={reducedMotion ? undefined : { y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Link
                to="/test-builder"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50"
              >
                <Zap size={16} className="text-orange-500" />
                Challenge yourself
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating stats visual */}
        <div className="relative mx-auto flex h-[245px] w-full max-w-[300px] items-center justify-center sm:h-[280px]">
          <motion.div
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            className="absolute h-[225px] w-[225px] rounded-full border border-dashed border-orange-200 sm:h-[260px] sm:w-[260px]"
          />

          <motion.div
            animate={reducedMotion ? {} : { scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute h-[180px] w-[180px] rounded-full border border-orange-200/70 bg-gradient-to-br from-orange-50 to-white shadow-[0_15px_60px_rgba(249,115,22,0.10)] sm:h-[210px] sm:w-[210px]"
          />

          {/* Particles orbiting the trophy */}
          {TROPHY_PARTICLES.map((position, index) => (
            <motion.span
              key={index}
              animate={
                reducedMotion
                  ? {}
                  : { y: [0, -7, 0], opacity: [0.25, 0.9, 0.25] }
              }
              transition={{
                duration: 2.6 + index * 0.35,
                repeat: Infinity,
                delay: index * 0.25,
                ease: "easeInOut",
              }}
              style={position}
              className="absolute h-1.5 w-1.5 rounded-full bg-orange-400"
            />
          ))}

          {/* Floating student avatars */}
          {avatars.map((student, index) => (
            <motion.div
              key={student.id}
              animate={reducedMotion ? {} : { y: [0, index % 2 ? 9 : -9, 0] }}
              transition={{
                duration: 4.5 + index * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute z-20 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-orange-100 text-[11px] font-black text-orange-700 shadow-lg shadow-orange-200/60 sm:h-10 sm:w-10 sm:text-xs ${AVATAR_POSITIONS[index]}`}
            >
              {getInitial(student.name)}
            </motion.div>
          ))}

          <div className="relative z-10 text-center">
            <motion.div
              animate={reducedMotion ? {} : { y: [0, -6, 0] }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30"
            >
              <Trophy size={24} />
            </motion.div>

            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Arena leader
            </p>

            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              {loading ? "..." : <AnimatedNumber value={highest} />}
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-orange-600">
              Brain Cells
            </p>
          </div>

          <motion.div
            animate={reducedMotion ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -left-1 top-5 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl shadow-slate-200/50 sm:left-0"
          >
            <Users size={17} className="text-orange-500" />
            <p className="mt-1 text-sm font-black text-slate-900">
              <AnimatedNumber value={count} />
            </p>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              Students
            </p>
          </motion.div>

          <motion.div
            animate={reducedMotion ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity }}
            className="absolute -bottom-1 -right-1 rounded-2xl border border-orange-100 bg-white p-3 shadow-xl shadow-orange-100/50 sm:right-0"
          >
            <Crown size={17} className="text-amber-500" />
            <p className="mt-1 text-sm font-black text-slate-900">
              {myRank ? `#${myRank}` : "--"}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              Your rank
            </p>
          </motion.div>
        </div>
      </div>

      {/* Bottom animated strip */}
      <div className="relative h-1 overflow-hidden bg-orange-50">
        <motion.div
          animate={reducedMotion ? {} : { x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
        />
      </div>
    </div>
  );
});

ArenaHero.displayName = "ArenaHero";

// --------------------------------------------------
// CHAMPIONS PODIUM
// --------------------------------------------------

const PODIUM_STYLES = {
  1: {
    icon: Crown,
    iconColor: "text-amber-500",
    avatar:
      "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-white shadow-[0_10px_30px_rgba(251,191,36,0.45)]",
    pedestal: "bg-gradient-to-b from-amber-300 via-amber-200 to-amber-100",
    number: "text-amber-700/60",
    height: "h-24 sm:h-32",
    delay: 0.2,
  },
  2: {
    icon: Medal,
    iconColor: "text-slate-500",
    avatar:
      "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-white shadow-[0_10px_30px_rgba(148,163,184,0.4)]",
    pedestal: "bg-gradient-to-b from-slate-300 via-slate-200 to-slate-100",
    number: "text-slate-500/60",
    height: "h-16 sm:h-24",
    delay: 0,
  },
  3: {
    icon: Award,
    iconColor: "text-orange-600",
    avatar:
      "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 text-white shadow-[0_10px_30px_rgba(249,115,22,0.35)]",
    pedestal: "bg-gradient-to-b from-orange-300 via-orange-200 to-orange-100",
    number: "text-orange-700/60",
    height: "h-12 sm:h-20",
    delay: 0.35,
  },
};

const PodiumCard = memo(({ student, place, gap, animate }) => {
  const style = PODIUM_STYLES[place];
  const Icon = style.icon;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 80 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 15,
        delay: animate ? style.delay : 0,
      }}
      className="flex min-w-0 w-1/3 max-w-[150px] flex-1 flex-col items-center sm:max-w-[200px]"
    >
      <div className="relative flex w-full flex-col items-center px-1 text-center">
        {place === 1 && (
          <motion.span
            animate={
              animate
                ? { opacity: [0.25, 0.6, 0.25], scale: [0.95, 1.08, 0.95] }
                : {}
            }
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.45),transparent_70%)] blur-xl"
          />
        )}

        <span
          className={`relative grid h-12 w-12 place-items-center rounded-full text-base font-black sm:h-20 sm:w-20 sm:text-2xl ${style.avatar}`}
        >
          {getInitial(student.name)}

          <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow-md">
            <Icon size={13} className={style.iconColor} />
          </span>
        </span>

        <h3 className="mt-3 min-h-[2rem] w-full break-words text-[10px] font-black leading-tight text-slate-900 sm:min-h-0 sm:text-base">
          {student.name}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-sm font-black text-slate-900 sm:text-lg">
          <Zap size={12} className="text-orange-500" />
          <AnimatedNumber value={student.totalBrainCells} />
        </p>

        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 sm:text-[9px]">
          Brain Cells
        </p>

        {place === 1 ? (
          <span className="mt-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white sm:text-[9px]">
            Champion
          </span>
        ) : gap > 0 ? (
          <span className="mt-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold text-slate-500">
            {numberFormat(gap)} behind #{place - 1}
          </span>
        ) : null}
      </div>

      <div
        className={`relative mt-3 flex w-full ${style.height} items-start justify-center overflow-hidden rounded-t-[18px] ${style.pedestal}`}
      >
        <span
          className={`mt-2 text-2xl font-black tracking-tighter sm:text-3xl ${style.number}`}
        >
          0{place}
        </span>
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/60" />
      </div>
    </motion.div>
  );
});

PodiumCard.displayName = "PodiumCard";

const ChampionsPodium = memo(({ rows }) => {
  const reducedMotion = useReducedMotion();

  if (!rows || rows.length === 0) return null;

  const [first, second, third] = rows;

  const order = [
    {
      place: 2,
      student: second,
      gap:
        first && second
          ? Math.max(0, first.totalBrainCells - second.totalBrainCells)
          : 0,
    },
    { place: 1, student: first, gap: 0 },
    {
      place: 3,
      student: third,
      gap:
        second && third
          ? Math.max(0, second.totalBrainCells - third.totalBrainCells)
          : 0,
    },
  ].filter((item) => Boolean(item.student));

  return (
    <section className="mt-10 sm:mt-14">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Crown size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
              The champions
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
            The Podium.
            <span className="ml-2 text-slate-300">/ Top 3</span>
          </h2>

          <p className="mt-2 text-xs text-slate-500 sm:text-sm">
            Gold, silver and bronze. The three names everyone is chasing.
          </p>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Live arena standings
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-100 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:p-8">
        <div className="flex items-end justify-center gap-1 sm:gap-6">
          {order.map(({ place, student, gap }) => (
            <PodiumCard
              key={student.id}
              student={student}
              place={place}
              gap={gap}
              animate={!reducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

ChampionsPodium.displayName = "ChampionsPodium";

// --------------------------------------------------
// COMPETITION ROW
// --------------------------------------------------

const CompetitionRow = memo(
  ({ student, rank, isCurrentUser, maxCells, index }) => {
    const reducedMotion = useReducedMotion();

    const first = rank === 1;
    const second = rank === 2;
    const third = rank === 3;

    const percentage =
      maxCells > 0
        ? Math.min(100, (student.totalBrainCells / maxCells) * 100)
        : 0;

    const [barWidth, setBarWidth] = useState(0);

    useEffect(() => {
      const timer = requestAnimationFrame(() => setBarWidth(percentage));
      return () => cancelAnimationFrame(timer);
    }, [percentage]);

    const rowTheme = first
      ? "border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/80 to-white"
      : second
        ? "border-slate-200 bg-gradient-to-r from-slate-50 to-white"
        : third
          ? "border-orange-200 bg-gradient-to-r from-orange-50 to-white"
          : isCurrentUser
            ? "border-orange-300 bg-orange-50/60"
            : "border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/30";

    const rankTheme = first
      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-300/40"
      : second
        ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
        : third
          ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white"
          : "bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-orange-600";

    return (
      <motion.article
        layout={!reducedMotion}
        initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          duration: 0.45,
          delay: reducedMotion ? 0 : Math.min(index * 0.045, 0.6),
          layout: { duration: 0.25 },
        }}
        whileHover={reducedMotion ? undefined : { y: -3 }}
        className={`group relative isolate overflow-hidden rounded-[22px] border transition-colors duration-300 ${rowTheme} ${
          first
            ? "shadow-[0_9px_35px_rgba(249,115,22,0.12)]"
            : "shadow-[0_3px_14px_rgba(15,23,42,0.025)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
        }`}
      >
        {/* Winner animated light sweep */}
        {first && (
          <motion.div
            animate={reducedMotion ? {} : { x: ["-120%", "220%"] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "linear",
            }}
            className="pointer-events-none absolute inset-y-0 z-[-1] w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-orange-200/50 to-transparent"
          />
        )}

        {/* Left accent */}
        <div
          className={`absolute bottom-0 left-0 top-0 w-[3px] transition-colors duration-300 ${
            first
              ? "bg-gradient-to-b from-amber-300 via-orange-500 to-orange-300"
              : second
                ? "bg-slate-300"
                : third
                  ? "bg-orange-300"
                  : isCurrentUser
                    ? "bg-orange-500"
                    : "bg-transparent group-hover:bg-orange-300"
          }`}
        />

        <div className="flex items-center gap-3 p-3.5 sm:gap-5 sm:px-5 sm:py-4">
          {/* RANK */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.35,
              delay: reducedMotion ? 0 : Math.min(index * 0.045 + 0.1, 0.7),
            }}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black transition-transform duration-300 group-hover:scale-105 sm:h-[54px] sm:w-[54px] ${rankTheme}`}
          >
            {first ? (
              <Crown size={22} />
            ) : second || third ? (
              <Medal size={21} />
            ) : (
              <span className="tabular-nums">
                {String(rank).padStart(2, "0")}
              </span>
            )}

            {first && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-amber-300" />
            )}
          </motion.div>

          {/* AVATAR + NAME */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-black transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11 ${
                first
                  ? "bg-orange-200 text-orange-700"
                  : second
                    ? "bg-slate-200 text-slate-600"
                    : third
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-600"
              }`}
            >
              {getInitial(student.name)}
              {isCurrentUser && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`max-w-full truncate text-sm font-black transition-colors duration-300 sm:text-base ${
                    first
                      ? "text-orange-950"
                      : "text-slate-900 group-hover:text-orange-600"
                  }`}
                >
                  {student.name}
                </h3>

                {first && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                    Champion
                  </span>
                )}

                {isCurrentUser && (
                  <span className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-600">
                    You
                  </span>
                )}
              </div>

              <p className="hidden">
                {student.className || "No class"}
                {first && " · Arena Leader"}
              </p>
            </div>
          </div>

          {/* SCORE */}
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <Zap
                size={13}
                className={first ? "text-orange-500" : "text-amber-500"}
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">
                Brain Cells
              </span>
            </div>

            <p
              className={`mt-1 text-lg font-black tracking-tight sm:text-2xl ${
                first ? "text-orange-600" : "text-slate-900"
              }`}
            >
              <AnimatedNumber value={student.totalBrainCells} />
            </p>
          </div>
        </div>

        {/* PERFORMANCE BAR */}
        <div className="relative mx-4 mb-3 h-[3px] overflow-hidden rounded-full bg-slate-100 sm:mx-5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{
              duration: reducedMotion ? 0 : 1,
              delay: reducedMotion ? 0 : Math.min(index * 0.04, 0.5),
              ease: "easeOut",
            }}
            className={`h-full rounded-full ${
              first
                ? "bg-gradient-to-r from-amber-400 via-orange-500 to-orange-400"
                : second
                  ? "bg-slate-400"
                  : third
                    ? "bg-gradient-to-r from-orange-300 to-orange-500"
                    : isCurrentUser
                      ? "bg-orange-400"
                      : "bg-gradient-to-r from-slate-200 to-orange-300"
            }`}
          />
        </div>
      </motion.article>
    );
  },
);

CompetitionRow.displayName = "CompetitionRow";

// --------------------------------------------------
// PERSONAL RANK
// --------------------------------------------------

const getMotivation = (rank, gap) => {
  if (rank === 1) return "You lead the arena. Defend your throne.";
  if (gap <= 5) return "So close — one objective could flip this.";
  if (gap <= 25) return "You're closing in. Keep the momentum.";
  return "Every Brain Cell counts. Keep climbing.";
};

const PersonalPosition = memo(({ student, rank, aboveStudent }) => {
  const reducedMotion = useReducedMotion();

  const gap = aboveStudent
    ? Math.max(0, aboveStudent.totalBrainCells - student.totalBrainCells)
    : 0;

  const progress =
    aboveStudent && aboveStudent.totalBrainCells > 0
      ? Math.min(
          100,
          Math.round(
            (student.totalBrainCells / aboveStudent.totalBrainCells) * 100,
          ),
        )
      : 100;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-orange-300/60 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-5 text-white shadow-[0_15px_40px_rgba(249,115,22,0.18)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full border-[30px] border-white/10" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full border-[24px] border-white/10" />

      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-white/80">
            <Target size={17} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">
              Your position
            </p>
          </div>

          <p className="mt-3 text-4xl font-black tracking-tight">#{rank}</p>
          <p className="mt-1 text-xs font-semibold text-white/80">
            {student.name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/75">
            Your Brain Cells
          </p>
          <p className="mt-2 text-3xl font-black">
            <AnimatedNumber value={student.totalBrainCells} />
          </p>

          {aboveStudent ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white/90">
              <ArrowUpRight size={13} />
              {numberFormat(gap)} more to reach #{rank - 1}
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-white/90">
              {rank === 1 ? "You lead the arena!" : "No higher rank available"}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/75">
          <span>
            {rank > 1 ? `Progress to #${rank - 1}` : "Top of the arena"}
          </span>
          <span>{progress}%</span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: reducedMotion ? 0 : 1.1,
              delay: reducedMotion ? 0 : 0.2,
              ease: "easeOut",
            }}
            className="h-full rounded-full bg-gradient-to-r from-white via-white to-amber-100"
          />
        </div>

        <p className="mt-2 text-[11px] font-semibold text-white/85">
          {getMotivation(rank, gap)}
        </p>
      </div>
    </div>
  );
});

PersonalPosition.displayName = "PersonalPosition";

// --------------------------------------------------
// SKELETON
// --------------------------------------------------

const Skeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="flex animate-pulse items-center gap-4 rounded-[22px] border border-slate-100 bg-white p-4"
      >
        <div className="h-12 w-12 rounded-2xl bg-slate-100" />
        <div className="flex-1">
          <div className="h-4 w-1/2 rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-1/4 rounded-full bg-slate-50" />
        </div>
        <div className="h-7 w-16 rounded-lg bg-slate-100" />
      </div>
    ))}
  </div>
);

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

const LeaderboardPage = () => {
  const requestIdRef = useRef(0);

  const [scope, setScope] = useState("all");
  const [leaderboard, setLeaderboard] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(
    () => getStoredAuth()?.user?.classId || "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const canViewClassLeaderboard = Boolean(auth?.user?.classId);

  // Authentication synchronization
  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());

    syncAuth();
    window.addEventListener(authEvents.changed, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    if (!auth?.user?.classId) {
      setSelectedClassId("");
      return;
    }

    setSelectedClassId(auth.user.classId);
  }, [auth?.user?.classId]);

  // Load classes
  useEffect(() => {
    let active = true;

    const loadClasses = async () => {
      try {
        const data = await apiRequest("/api/classes");
        if (active) setClassOptions(data.classes || []);
      } catch (err) {
        if (active) setError(err.message);
      }
    };

    loadClasses();

    return () => {
      active = false;
    };
  }, []);

  // Load leaderboard
  useEffect(() => {
    if (!canViewClassLeaderboard && scope === "class") {
      setScope("all");
      return;
    }

    let active = true;
    const requestId = ++requestIdRef.current;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const classQuery =
          scope === "class" && selectedClassId
            ? `&classId=${encodeURIComponent(selectedClassId)}`
            : "";

        let data;
        let lastError;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            data = await apiRequest(
              `/api/leaderboard?scope=${scope}${classQuery}&limit=20`,
            );
            break;
          } catch (err) {
            lastError = err;

            if (!isTransientLeaderboardError(err) || attempt === 2) {
              throw err;
            }

            await wait(500 * (attempt + 1));
          }
        }

        if (!data) {
          throw lastError || new Error("Could not load leaderboard.");
        }

        if (!active || requestId !== requestIdRef.current) return;

        setLeaderboard(normalizeLeaderboardRows(data.leaderboard));
      } catch (err) {
        if (!active || requestId !== requestIdRef.current) return;
        setError(err.message || "Unable to load rankings.");
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [scope, selectedClassId, refreshTick, canViewClassLeaderboard]);

  // Progress refresh event
  useEffect(() => {
    const refresh = () => setRefreshTick((value) => value + 1);

    window.addEventListener("innovative-science-progress-updated", refresh);

    return () => {
      window.removeEventListener(
        "innovative-science-progress-updated",
        refresh,
      );
    };
  }, []);

  // Data
  const sortedLeaderboard = useMemo(
    () => mergeSort([...leaderboard]),
    [leaderboard],
  );

  const currentUserId = String(
    auth?.user?.id || auth?.user?._id || auth?.user?.email || "",
  );

  const currentUserIndex = sortedLeaderboard.findIndex(
    (student) =>
      student.id === currentUserId ||
      student.id === String(auth?.user?.email || ""),
  );

  const currentUser =
    currentUserIndex >= 0 ? sortedLeaderboard[currentUserIndex] : null;

  const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;

  const aboveStudent =
    currentUserIndex > 0 ? sortedLeaderboard[currentUserIndex - 1] : null;

  const filteredLeaderboard = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return sortedLeaderboard;

    return sortedLeaderboard.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.className.toLowerCase().includes(query),
    );
  }, [sortedLeaderboard, searchTerm]);

  const highest = sortedLeaderboard[0]?.totalBrainCells || 0;

  const selectedClassName =
    classOptions.find((item) => item._id === selectedClassId)?.name ||
    "Selected class";

  const hasLeaderboard = sortedLeaderboard.length > 0;
  const showLoading = loading && !hasLeaderboard;
  const showError = Boolean(error) && !hasLeaderboard;

  const isSearching = Boolean(searchTerm.trim());

  const topStudents = useMemo(
    () => sortedLeaderboard.slice(0, 3),
    [sortedLeaderboard],
  );

  const podiumRows = useMemo(
    () => sortedLeaderboard.slice(0, 3),
    [sortedLeaderboard],
  );

  const showPodium = hasLeaderboard && !isSearching;

  const listRows = isSearching
    ? filteredLeaderboard
    : filteredLeaderboard.slice(3);

  // Render
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#FFFCF9] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Ambient background */}
      <div className="pointer-events-none absolute -right-40 top-20 h-[450px] w-[450px] rounded-full bg-orange-100/50 blur-[100px]" />
      <div className="pointer-events-none absolute -left-40 top-[800px] h-[400px] w-[400px] rounded-full bg-amber-100/40 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl">
        {/* HERO */}
        <ArenaHero
          count={sortedLeaderboard.length}
          highest={highest}
          myRank={currentUserRank}
          loading={loading}
          topStudents={topStudents}
        />

        {/* CHAMPIONS PODIUM */}
        {showPodium && <ChampionsPodium rows={podiumRows} />}

        {/* RANKING SECTION */}
        <div id="rankings" className="mt-10 sm:mt-14">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                    <Flame size={19} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">
                    The competition
                  </span>
                </div>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  The Arena.
                  <span className="ml-2 text-slate-300">/ Rankings</span>
                </h2>

                <p className="mt-2 text-xs text-slate-500 sm:text-sm">
                  One arena. Twenty positions. One goal: reach the top.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-11 w-full rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
                  {[
                    { id: "all", label: "Global" },
                    { id: "class", label: "My Class" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "all" || canViewClassLeaderboard) {
                          setScope(item.id);
                          setSearchTerm("");
                        }
                      }}
                      disabled={item.id === "class" && !canViewClassLeaderboard}
                      className={`relative flex-1 rounded-full px-3 text-xs font-bold transition-colors sm:flex-none sm:px-4 ${
                        scope === item.id
                          ? "text-white"
                          : "text-slate-500 hover:text-slate-900"
                      } disabled:opacity-40`}
                    >
                      {scope === item.id && (
                        <motion.span
                          layoutId="arena-tab"
                          className="absolute inset-0 -z-0 rounded-full bg-slate-950"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setRefreshTick((value) => value + 1)}
                  disabled={loading}
                  aria-label="Refresh leaderboard"
                  className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>

            {/* Class selection */}
            {scope === "class" && (
              <div className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800">
                    Class leaderboard
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Currently viewing {selectedClassName}
                  </p>
                </div>
              </div>
            )}

            {/* Search and info */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-[340px]">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Find your competitor..."
                  className="h-12 w-full rounded-full border border-slate-200 bg-white pl-11 pr-11 text-sm font-medium outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100/60"
                />

                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ranking / 01—20
                </span>

                <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-bold text-orange-600">
                  {filteredLeaderboard.length} competitors
                </span>
              </div>
            </div>
          </div>

          {/* LIST */}
          <div className="relative mt-6">
            {/* Timeline rail */}
            <div className="pointer-events-none absolute bottom-5 left-[34px] top-5 hidden w-px bg-gradient-to-b from-orange-300 via-orange-100 to-transparent sm:block" />

            <AnimatePresence mode="wait">
              {showLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Skeleton />
                </motion.div>
              ) : showError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center"
                >
                  <p className="font-bold text-red-700">{error}</p>
                  <button
                    onClick={() => setRefreshTick((value) => value + 1)}
                    className="mt-4 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Retry
                  </button>
                </motion.div>
              ) : hasLeaderboard ? (
                listRows.length > 0 ? (
                  <motion.div
                    key={`${scope}-${selectedClassId}-${isSearching ? "search" : "list"}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <AnimatePresence initial={false}>
                      {listRows.map((student) => {
                        const rank =
                          sortedLeaderboard.findIndex(
                            (item) => item.id === student.id,
                          ) + 1;

                        const isCurrentUser =
                          student.id === currentUserId ||
                          student.id === String(auth?.user?.email || "");

                        return (
                          <CompetitionRow
                            key={student.id}
                            student={student}
                            rank={rank}
                            index={rank - 1}
                            maxCells={highest}
                            isCurrentUser={isCurrentUser}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-list"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center"
                  >
                    {isSearching ? (
                      <>
                        <Search size={28} className="mx-auto text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-800">
                          No competitors found
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Try another search.
                        </p>
                      </>
                    ) : (
                      <>
                        <Crown size={28} className="mx-auto text-orange-300" />
                        <h3 className="mt-3 font-bold text-slate-800">
                          The podium holds the top three.
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Keep earning Brain Cells to join them.
                        </p>
                      </>
                    )}
                  </motion.div>
                )
              ) : (
                <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-14 text-center">
                  <Trophy size={36} className="mx-auto text-orange-300" />
                  <h3 className="mt-4 text-xl font-black text-slate-900">
                    The arena awaits you.
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Students will appear once they begin earning Brain Cells.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PERSONAL POSITION */}
        {currentUser && (
          <div className="mt-8">
            <PersonalPosition
              student={currentUser}
              rank={currentUserRank}
              aboveStudent={aboveStudent}
            />
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-12 border-t border-slate-200 py-7">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div>
              <p className="text-xs font-black tracking-wider text-slate-800">
                INNOVATIVE SCIENCE 2
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                Knowledge creates the competition.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <Sparkles size={14} className="text-orange-500" />
              Built for curious minds.
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default LeaderboardPage;
