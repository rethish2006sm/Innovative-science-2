import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Crown,
  Flame,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Users,
  Zap,
  X,
  Target,
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
// ANIMATED NUMBER
// --------------------------------------------------

const AnimatedNumber = memo(({ value }) => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      key={value}
      initial={
        reducedMotion ? false : { opacity: 0, y: 8, filter: "blur(4px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35 }}
    >
      {numberFormat(value)}
    </motion.span>
  );
});

AnimatedNumber.displayName = "AnimatedNumber";

// --------------------------------------------------
// ANIMATED HERO
// --------------------------------------------------

const ArenaHero = memo(({ count, highest, myRank, loading }) => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative isolate overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_18px_65px_rgba(154,52,18,0.07)] sm:rounded-[42px]">
      {/* Decorative atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
              <span className="relative h-2 w-2 rounded-full bg-orange-500">
                <span className="absolute inset-0 animate-ping rounded-full bg-orange-500 opacity-50" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
                Innovative Science 2
              </span>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Competitive Arena / 001
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-7 text-[48px] font-black leading-[0.95] tracking-[-0.07em] text-slate-950 sm:text-7xl lg:text-[86px]"
          >
            THINK.
            <br />
            <span className="relative inline-block bg-gradient-to-r from-orange-500 via-orange-600 to-amber-400 bg-clip-text text-transparent">
              COMPETE.
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute -bottom-2 left-0 h-1.5 w-full origin-left rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
              />
            </span>
            <br />
            <span className="text-slate-900">DOMINATE.</span>
          </motion.h1>

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
            <a
              href="#rankings"
              className="group inline-flex h-12 items-center gap-3 rounded-full bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Explore arena
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>

            <Link
              to="/test-builder"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50"
            >
              <Zap size={16} className="text-orange-500" />
              Challenge yourself
            </Link>
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

          <div className="relative z-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
              <Trophy size={24} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Arena leader
            </p>

            <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              {loading ? "..." : numberFormat(highest)}
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
            <p className="mt-1 text-sm font-black text-slate-900">{count}</p>
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
        whileHover={reducedMotion ? undefined : { x: 4 }}
        className={`group relative isolate overflow-hidden rounded-[22px] border transition-colors duration-300 ${rowTheme} ${
          first
            ? "shadow-[0_9px_35px_rgba(249,115,22,0.12)]"
            : "shadow-[0_3px_14px_rgba(15,23,42,0.025)]"
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
          className={`absolute bottom-0 left-0 top-0 w-[3px] ${
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
          <div
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
          </div>

          {/* AVATAR + NAME */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-black sm:h-11 sm:w-11 ${
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
                  className={`max-w-full truncate text-sm font-black sm:text-base ${
                    first ? "text-orange-950" : "text-slate-900"
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
              className={`mt-1 text-lg font-black tabular-nums tracking-tight sm:text-2xl ${
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

const PersonalPosition = memo(({ student, rank, aboveStudent }) => {
  const gap = aboveStudent
    ? Math.max(0, aboveStudent.totalBrainCells - student.totalBrainCells)
    : 0;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-orange-200 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-5 text-white shadow-[0_15px_40px_rgba(249,115,22,0.18)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full border-[30px] border-white/10" />
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
          <p className="mt-2 text-3xl font-black tabular-nums">
            {numberFormat(student.totalBrainCells)}
          </p>
          {aboveStudent ? (
            <p className="mt-2 text-xs font-bold text-white/90">
              {numberFormat(gap)} behind #{rank - 1}
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-white/90">
              {rank === 1 ? "You lead the arena!" : "No higher rank available"}
            </p>
          )}
        </div>
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
  }, [
    scope,
    selectedClassId,
    refreshTick,
    canViewClassLeaderboard,
  ]);

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

  // Render
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#fffaf6] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
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
        />

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
                <div className="flex h-11 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
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
                      className={`relative rounded-full px-4 text-xs font-bold transition-colors ${
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
                filteredLeaderboard.length > 0 ? (
                  <motion.div
                    key={`${scope}-${selectedClassId}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <AnimatePresence initial={false}>
                      {filteredLeaderboard.map((student) => {
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
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                    <Search size={28} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 font-bold text-slate-800">
                      No competitors found
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Try another search.
                    </p>
                  </div>
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
