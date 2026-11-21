
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flame,
  Target,
  TrendingUp,
  XCircle,
  RefreshCw,
  CalendarDays,
  Zap,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api";

// ======================================================
// CONFIGURATION
// ======================================================

const RANGES = [
  ["7", "7 Days"],
  ["30", "30 Days"],
  ["90", "90 Days"],
  ["all", "All Time"],
];

const COLORS = {
  orange: "#ff7417",
  orangeDark: "#ea650d",
  orangeLight: "#fff1e7",
  green: "#16a36a",
  red: "#e5484d",
  yellow: "#e5a000",
  text: "#171717",
  muted: "#777d87",
  border: "#eceef1",
  background: "#f8f9fb",
};

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const percent = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return `${Math.round(number(value))}%`;
};

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, number(value)));

const formatDuration = (milliseconds) => {
  const ms = number(milliseconds);

  if (ms <= 0) return "—";

  const totalSeconds = Math.round(ms / 1000);

  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

const dateLabel = (
  value,
  options = { day: "numeric", month: "short" },
) => {
  if (!value) return "—";

  const date = new Date(
    String(value).length === 10 ? `${value}T00:00:00` : value,
  );

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", options).format(date);
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getChange = (current, previous) => {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined
  ) {
    return null;
  }

  return number(current) - number(previous);
};

// ======================================================
// REUSABLE COMPONENTS
// ======================================================

const Card = ({ children, className = "" }) => (
  <section
    className={`min-w-0 rounded-2xl border border-[#eceef1] bg-white p-4 shadow-[0_5px_20px_rgba(23,23,23,0.035)] transition duration-200 hover:shadow-[0_10px_28px_rgba(23,23,23,0.06)] sm:p-5 ${className}`}
  >
    {children}
  </section>
);

const IconBox = ({ icon: Icon, size = 19 }) => (
  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff1e7] text-[#ff7417]">
    <Icon size={size} />
  </span>
);

const Heading = ({ icon: Icon, title, description, right }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-3">
      <IconBox icon={Icon} />
      <div className="min-w-0">
        <h2 className="text-base font-black tracking-tight text-[#171717] sm:text-lg">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs font-medium leading-relaxed text-[#777d87]">
            {description}
          </p>
        )}
      </div>
    </div>
    {right}
  </div>
);

const Empty = ({
  children = "Complete more practice to unlock this view.",
}) => (
  <div className="grid min-h-36 place-items-center rounded-xl bg-[#f8f9fb] px-4 py-6 text-center">
    <div>
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-slate-400">
        <BarChart3 size={19} />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#777d87]">
        {children}
      </p>
    </div>
  </div>
);

const Mini = ({ label, value, icon: Icon, compact = false }) => (
  <div className="min-w-0 rounded-xl border border-[#f0f1f3] bg-[#f8f9fb] p-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-[#777d87]">{label}</p>
      {Icon && <Icon size={15} className="shrink-0 text-[#ff7417]" />}
    </div>
    <p
      className={`mt-2 font-black text-[#171717] ${
        compact ? "truncate text-sm" : "text-xl"
      }`}
    >
      {value ?? "—"}
    </p>
  </div>
);

const Change = ({ value, suffix = "", inverse = false }) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  const amount = Number(value);
  const positive = inverse ? amount < 0 : amount > 0;

  const tone =
    amount === 0
      ? "text-slate-400"
      : positive
        ? "text-emerald-600"
        : "text-rose-600";

  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-bold ${tone}`}>
      {amount > 0 ? (
        <ArrowUpRight size={14} />
      ) : amount < 0 ? (
        <ArrowDownRight size={14} />
      ) : null}
      {amount > 0 ? "+" : ""}
      {Number.isInteger(amount) ? amount : amount.toFixed(1)}
      {suffix}
    </span>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
  detail,
  change,
  suffix = "",
  inverse = false,
}) => (
  <Card>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#777d87] sm:text-xs">
          {label}
        </p>
        <p className="mt-3 break-words text-2xl font-black tracking-tight text-[#171717] sm:text-3xl">
          {value}
        </p>
      </div>
      <IconBox icon={Icon} size={20} />
    </div>

    <div className="mt-3 flex min-h-5 flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] font-medium text-[#777d87]">{detail}</p>
      <Change value={change} suffix={suffix} inverse={inverse} />
    </div>
  </Card>
);

const Metric = ({
  label,
  value,
  compare,
  change,
  suffix = "",
  inverse = false,
}) => (
  <div className="rounded-xl border border-[#f0f1f3] bg-[#f8f9fb] p-3 sm:p-4">
    <p className="text-xs font-bold text-[#777d87]">{label}</p>

    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <strong className="text-xl font-black text-[#171717]">{value}</strong>
      <Change value={change} suffix={suffix} inverse={inverse} />
    </div>

    <p className="mt-2 text-[10px] font-semibold text-slate-400">
      Previous: {compare}
    </p>
  </div>
);

const ProgressBar = ({ value, color = COLORS.orange }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{
        width: `${clamp(value)}%`,
        backgroundColor: color,
      }}
    />
  </div>
);

const Skeleton = () => (
  <main className="min-h-screen bg-[#f8f9fb] p-4 sm:p-6">
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-40 rounded-3xl bg-white" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-white" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-64 rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  </main>
);

// ======================================================
// LEARNING ACTIVITY CHART
// ======================================================

const BarChart = ({ points }) => {
  const scrollRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  useEffect(() => setSelectedIndex(null), [points.length]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [points.length]);

  if (!points.length) return <Empty>No practice activity in this period.</Empty>;

  const chartWidth = Math.max(720, points.length * 42);
  const chartHeight = 250;
  const left = 42;
  const right = 16;
  const top = 16;
  const bottom = 42;
  const plotHeight = chartHeight - top - bottom;
  const plotWidth = chartWidth - left - right;
  const max = Math.max(...points.map((point) => number(point.attempted)), 1);
  const barWidth = Math.max(12, Math.min(28, plotWidth / points.length * 0.58));
  const step = plotWidth / Math.max(points.length, 1);
  const labelEvery = Math.max(1, Math.ceil(points.length / 10));

  return <div className="flex overflow-hidden rounded-xl bg-[#fffaf6] p-2">
    <div className="flex h-[250px] w-[42px] shrink-0 flex-col justify-between bg-[#fffaf6] pb-[42px] pt-[16px] text-[11px] text-[#9aa1aa]">
      {[100, 75, 50, 25, 0].map((tick) => <span key={tick}>{Math.round((max * tick) / 100)}</span>)}
    </div>
    <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="block h-[250px] max-w-none" style={{ width: `${chartWidth}px`, minWidth: `${chartWidth}px` }} role="img" aria-label="Questions attempted over time">
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = top + plotHeight - (tick / 100) * plotHeight;
        return <g key={tick}><line x1={left} x2={chartWidth - right} y1={y} y2={y} stroke="#e7e9ed" strokeDasharray="3 5" /></g>;
      })}
      {points.map((point, index) => {
        const attempted = number(point.attempted);
        const x = left + (index * step) + ((step - barWidth) / 2);
        const height = attempted ? Math.max((attempted / max) * plotHeight, 8) : 0;
        const y = top + plotHeight - height;
        return <g key={`${point.date}-${index}`}>
          <rect x={x} y={y} width={barWidth} height={height || 2} rx="5" fill={selectedIndex === index ? '#ea650d' : '#ff7417'} className="cursor-pointer transition hover:fill-[#ea650d]" onClick={() => setSelectedIndex(index)} role="button" aria-label={`${dateLabel(point.date)}: ${attempted} questions attempted`}>
            <title>{`${dateLabel(point.date)} · ${attempted} attempted · ${number(point.correct)} correct · ${number(point.wrong)} incorrect`}</title>
          </rect>
          {(index % labelEvery === 0 || index === points.length - 1) && <text x={x + (barWidth / 2)} y={chartHeight - 14} textAnchor="middle" fill="#7d8794" fontSize="10" fontWeight="600">{dateLabel(point.date, { day: 'numeric', month: 'short' })}</text>}
        </g>;
      })}
      <text x={left} y={chartHeight - 1} fill="#777d87" fontSize="10" fontWeight="700">Date</text>
      </svg>
      {selectedIndex !== null && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="presentation" onClick={() => setSelectedIndex(null)}><div className="w-full max-w-sm rounded-2xl border border-orange-100 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Learning activity details" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[#ff7417]">Learning activity</p><h3 className="mt-1 text-lg font-black text-slate-900">{dateLabel(points[selectedIndex].date, { weekday: 'long', day: 'numeric', month: 'short' })}</h3></div><button type="button" onClick={() => setSelectedIndex(null)} className="rounded-lg px-2 py-1 text-sm font-black text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close details">×</button></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Mini label="Attempted" value={number(points[selectedIndex].attempted)} /><Mini label="Correct" value={number(points[selectedIndex].correct)} /><Mini label="Incorrect" value={number(points[selectedIndex].wrong)} /><Mini label="Accuracy" value={number(points[selectedIndex].attempted) ? `${Math.round((number(points[selectedIndex].correct) / number(points[selectedIndex].attempted)) * 100)}%` : '—'} /></div></div></div>}
    </div>
  </div>;
};

// ======================================================
// ACCURACY TREND CHART
// ======================================================

const AccuracyChart = ({ points }) => {
  const scrollRef = useRef(null);
  const answered = points.filter(
    (point) => number(point.attempted) > 0,
  );
  const [selectedIndex, setSelectedIndex] = useState(null);
  useEffect(() => setSelectedIndex(null), [points.length]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [answered.length]);

  if (!answered.length) {
    return <Empty>No answered questions in this period.</Empty>;
  }

  const width = 720;
  const height = 230;

  const x = (index) =>
    35 + (index / Math.max(answered.length - 1, 1)) * (width - 65);

  const y = (value) => 18 + ((100 - clamp(value)) / 100) * 170;

  const path = answered
    .map(
      (point, index) =>
        `${index ? "L" : "M"} ${x(index)} ${y(point.accuracy)}`,
    )
    .join(" ");

  return (
    <div className="flex overflow-hidden rounded-xl bg-[#fffaf6] p-2 sm:p-3">
      <div className="flex h-[230px] w-[35px] shrink-0 flex-col justify-between bg-[#fffaf6] pb-[42px] pt-[18px] text-[11px] text-[#9aa1aa]">
        {[100, 75, 50, 25, 0].map((tick) => <span key={tick}>{tick}%</span>)}
      </div>
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
        <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-none"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
        role="img"
        aria-label="Student accuracy over time"
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1="35"
              x2="700"
              y1={y(tick)}
              y2={y(tick)}
              stroke="#eceef1"
              strokeDasharray="4 5"
            />
          </g>
        ))}

        <path
          d={path}
          fill="none"
          stroke="#ff7417"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {answered.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle
              cx={x(index)}
              cy={y(point.accuracy)}
              r="7"
              fill="white"
              stroke="#ff7417"
              strokeWidth="3"
              className="cursor-pointer transition hover:fill-orange-100"
              onClick={() => setSelectedIndex(index)}
              role="button"
              aria-label={`${dateLabel(point.date)}: ${point.accuracy}% accuracy`}
            >
              <title>
                {`${dateLabel(point.date)} · ${point.accuracy}% accuracy · ${point.attempted} answered`}
              </title>
            </circle>
          </g>
        ))}
        </svg>
        {selectedIndex !== null && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="presentation" onClick={() => setSelectedIndex(null)}><div className="w-full max-w-sm rounded-2xl border border-orange-100 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Accuracy details" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[#ff7417]">Accuracy details</p><h3 className="mt-1 text-lg font-black text-slate-900">{dateLabel(answered[selectedIndex].date, { weekday: 'long', day: 'numeric', month: 'short' })}</h3></div><button type="button" onClick={() => setSelectedIndex(null)} className="rounded-lg px-2 py-1 text-sm font-black text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close details">×</button></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Mini label="Attempted" value={number(answered[selectedIndex].attempted)} /><Mini label="Correct" value={number(answered[selectedIndex].correct)} /><Mini label="Incorrect" value={number(answered[selectedIndex].wrong)} /><Mini label="Accuracy" value={`${Math.round(number(answered[selectedIndex].accuracy))}%`} /></div></div></div>}
      </div>
    </div>
  );
};

// ======================================================
// ANSWER DISTRIBUTION
// ======================================================

const Donut = ({ correct, wrong }) => {
  const total = correct + wrong;

  if (!total) {
    return <Empty>No answered questions yet.</Empty>;
  }

  const ratio = clamp((correct / total) * 100);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div
        className="grid h-40 w-40 shrink-0 place-items-center rounded-full sm:h-44 sm:w-44"
        style={{
          background: `conic-gradient(#16a36a 0 ${ratio}%, #e5484d ${ratio}% 100%)`,
        }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
          <div>
            <strong className="text-2xl font-black text-[#171717]">
              {total}
            </strong>
            <p className="text-[10px] font-bold text-slate-400">
              answered
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-48 space-y-4 text-sm font-bold">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#16a36a]" />
          <span className="text-[#777d87]">Correct</span>
          <span className="ml-auto text-[#171717]">{correct}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#e5484d]" />
          <span className="text-[#777d87]">Incorrect</span>
          <span className="ml-auto text-[#171717]">{wrong}</span>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-[#777d87]">Overall accuracy</p>
          <p className="mt-1 text-xl font-black text-[#171717]">
            {Math.round(ratio)}%
          </p>
        </div>
      </div>
    </div>
  );
};

// ======================================================
// CHAPTER PERFORMANCE
// ======================================================

const ChapterPerformance = ({
  chapters,
  topics,
  expandedChapter,
  setExpandedChapter,
  navigate,
  isAdminStudentView,
}) => {
  const chapterTopicMap = useMemo(() => {
    const map = new Map();

    topics.forEach((topic) => {
      const key = topic.chapterName || "";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(topic);
    });

    return map;
  }, [topics]);

  if (!chapters.length) {
    return <Empty>No chapter activity in this period.</Empty>;
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => {
        const id = String(chapter.chapterId || chapter.key || index);
        const open = expandedChapter === id;

        const chapterTopics =
          chapterTopicMap.get(chapter.chapterName || "") || [];

        const accuracy = clamp(chapter.accuracy);

        const progressColor =
          accuracy >= 80
            ? COLORS.green
            : accuracy >= 65
              ? COLORS.yellow
              : COLORS.red;

        return (
          <div
            key={id}
            className="overflow-hidden rounded-xl border border-[#eceef1] bg-white transition hover:border-[#ffd1b5]"
          >
            <button
              type="button"
              onClick={() => setExpandedChapter(open ? "" : id)}
              aria-expanded={open}
              className="w-full p-3 text-left sm:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#171717]">
                    {chapter.label || chapter.chapterName || "Chapter"}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#777d87]">
                    {number(chapter.attempted)} attempts
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-black text-[#ff7417]">
                    {percent(chapter.accuracy)}
                  </span>

                  <ChevronDown
                    size={17}
                    className={`text-slate-400 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              <div className="mt-3">
                <ProgressBar
                  value={accuracy}
                  color={progressColor}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-[#777d87]">
                <span>
                  <span className="text-emerald-600">●</span>{" "}
                  {number(chapter.correct)} correct
                </span>
                <span>
                  <span className="text-rose-500">●</span>{" "}
                  {number(chapter.wrong)} incorrect
                </span>
              </div>
            </button>

            {open && (
              <div className="space-y-3 border-t border-slate-100 bg-[#fcfcfd] p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#777d87]">
                  Topic breakdown
                </p>

                {chapterTopics.length ? (
                  chapterTopics.map((topic, topicIndex) => (
                    <div
                      key={topic.key || topicIndex}
                      className="rounded-lg bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-xs font-bold text-[#171717]">
                          {topic.label || topic.topicName || "Topic"}
                        </p>

                        <span className="shrink-0 text-xs font-black text-[#ff7417]">
                          {percent(topic.accuracy)}
                        </span>
                      </div>

                      <div className="mt-2">
                        <ProgressBar value={topic.accuracy} />
                      </div>

                      <p className="mt-2 text-[10px] font-semibold text-[#777d87]">
                        {number(topic.attempted)} attempts ·{" "}
                        {number(topic.correct)} correct ·{" "}
                        {number(topic.wrong)} incorrect
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-white p-3 text-xs text-[#777d87]">
                    Topic details are not available for these records.
                  </p>
                )}

                {!isAdminStudentView && chapter.chapterNumber && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/chapters/${chapter.chapterNumber}/topics`)
                    }
                    className="rounded-lg bg-[#fff1e7] px-4 py-2 text-xs font-black text-[#ea650d] transition hover:bg-[#ffe5d3]"
                  >
                    Practise this chapter →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ======================================================
// MAIN PERFORMANCE PAGE
// ======================================================

const ProfilePerformancePage = () => {
  const [searchParams] = useSearchParams();

  const studentId = searchParams.get("studentId") || "";
  const isAdminStudentView = Boolean(studentId);

  const navigate = useNavigate();

  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [studentData, setStudentData] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedChapter, setExpandedChapter] = useState("");

  // ====================================================
  // API FETCHING
  // ====================================================

  const fetchAnalytics = useCallback(async () => {
    const query = new URLSearchParams({ range });

    if (studentId) {
      query.set("studentId", studentId);
    }

    const analytics = await apiRequest(
      `/api/progress/analytics?${query.toString()}`,
      { cache: "no-store" },
    );

    return analytics;
  }, [range, studentId]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [analytics, profile] = await Promise.all([
          fetchAnalytics(),
          isAdminStudentView
            ? apiRequest(
                `/api/admin/students/${encodeURIComponent(studentId)}`,
                { cache: "no-store" },
              ).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!active) return;

        setData(analytics);
        setStudentData(profile);
      } catch (requestError) {
        if (!active) return;

        setError(
          requestError?.message ||
            "Could not load performance analytics. Please try again.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [
    fetchAnalytics,
    studentId,
    isAdminStudentView,
    refreshKey,
  ]);

  const retry = () => {
    setRefreshKey((previous) => previous + 1);
  };

  // ====================================================
  // NORMALIZE API RESPONSE
  // ====================================================

  const summary = data?.summary || {};
  const comparison = data?.periodComparison || {};

  const current = comparison.current || summary;
  const previous = comparison.previous || {};

  const chapters = safeArray(data?.chapterBreakdown);
  const topics = safeArray(data?.topicBreakdown);
  const trend = safeArray(data?.accuracyTrend);
  const activity = safeArray(data?.activityTrend);
  const recentAttempts = safeArray(data?.recentAttempts);

  const speed = data?.speedAnalysis || {};
  const consistency = data?.consistency || {};
  const dailyStats = data?.dailyChallengeStats || {};

  const correct = number(current.correct);
  const wrong = number(current.wrong);
  const attempted = number(current.attempted);

  // ====================================================
  // SMART LEARNING INSIGHTS
  // RULE-BASED. NO AI REQUIRED.
  // ====================================================

  const insightItems = useMemo(() => {
    const items = [];

    const accuracyChange = number(comparison.accuracyChange);

    const currentAccuracy = number(current.accuracy);
    const previousAccuracy = number(previous.accuracy);

    if (attempted === 0) {
      items.push({
        type: "info",
        title: "Start your practice",
        message:
          "Attempt questions from your chapters to build your performance history.",
      });

      return items;
    }

    if (accuracyChange >= 5) {
      items.push({
        type: "success",
        title: "Accuracy improving",
        message: `Your accuracy increased by ${accuracyChange} percentage points compared with the previous period. Keep following your current approach.`,
      });
    } else if (accuracyChange > 0) {
      items.push({
        type: "success",
        title: "Positive progress",
        message:
          "Your accuracy has improved. Continue practising consistently to build on this progress.",
      });
    } else if (accuracyChange <= -5) {
      items.push({
        type: "warning",
        title: "Review recent mistakes",
        message:
          "Your accuracy has decreased compared with the previous period. Review incorrect answers before attempting another timed session.",
      });
    } else if (accuracyChange < 0) {
      items.push({
        type: "info",
        title: "Small accuracy change",
        message:
          "Your accuracy has changed slightly. Keep monitoring your next practice sessions.",
      });
    }

    const weakChapters = chapters
      .filter(
        (chapter) =>
          number(chapter.attempted) >= 5 &&
          number(chapter.accuracy) < 50,
      )
      .sort(
        (a, b) => number(a.accuracy) - number(b.accuracy),
      );

    if (weakChapters.length) {
      const weak = weakChapters[0];

      items.push({
        type: "warning",
        title: "Chapter needs revision",
        message: `${weak.label || weak.chapterName} has ${percent(weak.accuracy)} accuracy. Review the concepts and practise its difficult questions again.`,
      });
    }

    const strongChapters = chapters
      .filter(
        (chapter) =>
          number(chapter.attempted) >= 5 &&
          number(chapter.accuracy) >= 80,
      )
      .sort(
        (a, b) => number(b.accuracy) - number(a.accuracy),
      );

    if (strongChapters.length && items.length < 3) {
      items.push({
        type: "success",
        title: "Strong chapter",
        message: `You are performing well in ${strongChapters[0].label || strongChapters[0].chapterName}. Maintain your understanding with occasional revision.`,
      });
    }

    if (
      speed.available &&
      number(speed.averageTimeMs) > 0 &&
      attempted >= 5 &&
      wrong > correct
    ) {
      items.push({
        type: "warning",
        title: "Focus on accuracy",
        message:
          "You have more incorrect than correct answers. Read each question carefully before submitting an answer.",
      });
    }

    if (
      speed.available &&
      number(speed.averageTimeMs) > 0 &&
      number(speed.correctAverageTimeMs) > 0 &&
      number(speed.incorrectAverageTimeMs) > 0 &&
      number(speed.incorrectAverageTimeMs) <
        number(speed.correctAverageTimeMs) * 0.5
    ) {
      items.push({
        type: "info",
        title: "Check your answering pace",
        message:
          "Your incorrect answers are being submitted much faster than your correct answers. Take time to understand each question.",
      });
    }

    if (
      number(consistency.currentStreak) >= 3 &&
      items.length < 3
    ) {
      items.push({
        type: "success",
        title: "Consistency maintained",
        message: `You have maintained a ${number(consistency.currentStreak)}-day streak. Regular practice helps build a reliable learning routine.`,
      });
    }

    if (!items.length) {
      items.push({
        type: "info",
        title: "Keep building your progress",
        message:
          "Continue practising regularly. More attempts will help identify your strengths and areas that need attention.",
      });
    }

    return items.slice(0, 3);
  }, [
    comparison.accuracyChange,
    current.accuracy,
    previous.accuracy,
    attempted,
    chapters,
    speed,
    correct,
    wrong,
    consistency.currentStreak,
  ]);

  // ====================================================
  // PERSONAL RECORDS
  // ====================================================

  const bestDayAttempts = useMemo(
    () =>
      Math.max(
        0,
        ...activity.map((item) => number(item.attempted)),
      ),
    [activity],
  );

  const strongestChapter = useMemo(() => {
    const eligible = chapters.filter(
      (item) => number(item.attempted) > 0,
    );

    if (!eligible.length) return "—";

    return eligible.reduce((best, item) =>
      number(item.accuracy) > number(best.accuracy)
        ? item
        : best,
    ).label || "Chapter";
  }, [chapters]);

  const profileName = studentData?.user?.name;

  // ====================================================
  // LOADING STATE
  // ====================================================

  if (loading && !data) {
    return <Skeleton />;
  }

  // ====================================================
  // ERROR STATE
  // ====================================================

  if (error && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f9fb] p-4">
        <div className="w-full max-w-md rounded-3xl border border-[#eceef1] bg-white p-7 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <XCircle size={28} />
          </span>

          <h2 className="mt-4 text-xl font-black text-[#171717]">
            Unable to load performance
          </h2>

          <p className="mt-2 text-sm text-[#777d87]">
            {error}
          </p>

          <button
            type="button"
            onClick={retry}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff7417] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ea650d]"
          >
            <RefreshCw size={16} />
            Try again
          </button>

          <div>
            <Link
              to={isAdminStudentView ? "/admin" : "/profile"}
              className="mt-4 inline-block text-xs font-bold text-[#777d87] hover:text-[#ff7417]"
            >
              Back
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ====================================================
  // MAIN DASHBOARD
  // ====================================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9fb] px-3 py-4 text-[#171717] sm:px-6 sm:py-7">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* ============================================
            HEADER
        ============================================ */}

        <header className="relative overflow-hidden rounded-3xl border border-[#eceef1] bg-white p-5 shadow-[0_8px_24px_rgba(23,23,23,0.04)] sm:p-7">

          <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-[#fff1e7] blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ff7417]" />
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff7417] sm:text-xs">
                  {isAdminStudentView
                    ? "Admin · Student analytics"
                    : "Learning analytics"}
                </p>
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#171717] sm:text-4xl">
                My Performance<span className="text-[#ff7417]">.</span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#777d87]">
                Understand your learning journey, track your improvement,
                and discover what to practise next.
                {profileName ? ` Viewing ${profileName}.` : ""}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1e7] px-3 py-1.5 text-[10px] font-bold text-[#ea650d]">
                  <CalendarDays size={12} />
                  {range === "all" ? "All time" : `Last ${range} days`}
                </span>

                {loading && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#777d87]">
                    <RefreshCw size={12} className="animate-spin" />
                    Updating analytics...
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[#eceef1] bg-[#f8f9fb] p-1">
              {RANGES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    if (range !== value) {
                      setRange(value);
                      setExpandedChapter("");
                    }
                  }}
                  aria-pressed={range === value}
                  className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition sm:px-4 ${
                    range === value
                      ? "!bg-[#ff7417] !text-white shadow-md shadow-orange-100"
                      : "border border-transparent bg-transparent text-[#777d87] hover:border-[#ffcfad] hover:bg-white hover:text-[#ea650d]"
                  }`}
                >
                  {label}
                </button>
              ))}

              <Link
                to={isAdminStudentView ? "/admin" : "/profile"}
                className="rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-xs font-extrabold text-[#777d87] transition hover:border-[#ffcfad] hover:bg-white hover:text-[#ea650d]"
              >
                Back
              </Link>
            </div>
          </div>
        </header>

        {/* ============================================
            BACKGROUND REFRESH ERROR
        ============================================ */}

        {error && data && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
              <AlertCircle size={18} />
              {error}
            </div>

            <button
              type="button"
              onClick={retry}
              className="text-xs font-black text-rose-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================================
            ADMIN STUDENT PROFILE
        ============================================ */}

        {isAdminStudentView && studentData?.user && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fff1e7] text-lg font-black text-[#ff7417]">
                  {String(studentData.user.name || "S")
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#ff7417]">
                    Student profile
                  </p>
                  <h2 className="mt-1 truncate text-lg font-black">
                    {studentData.user.name}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-[#777d87]">
                    {studentData.user.email || "No email available"} ·{" "}
                    {studentData.user.className || "No class assigned"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#fff1e7] px-4 py-3">
                <p className="text-[10px] font-bold text-[#ea650d]">
                  Brain Cells
                </p>
                <p className="mt-1 text-xl font-black text-[#171717]">
                  {number(
                    studentData.progress?.totalBrainCells ??
                      studentData.user.totalBrainCells,
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ============================================
            OVERVIEW STATISTICS
        ============================================ */}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#171717]">
                Performance Overview
              </h2>
              <p className="mt-1 text-[11px] font-medium text-[#777d87]">
                Your key learning numbers
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#999]">
              {range === "all" ? "All time" : `${range}-day view`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
            <Stat
              icon={Target}
              label="Attempted"
              value={attempted}
              detail={`${number(current.total)} records`}
              change={getChange(current.attempted, previous.attempted)}
            />

            <Stat
              icon={TrendingUp}
              label="Accuracy"
              value={percent(current.accuracy)}
              detail={`Previous ${percent(previous.accuracy)}`}
              change={comparison.accuracyChange}
              suffix=" pp"
            />

            <Stat
              icon={CheckCircle2}
              label="Correct"
              value={correct}
              detail="Correct answers"
              change={getChange(current.correct, previous.correct)}
            />

            <Stat
              icon={XCircle}
              label="Incorrect"
              value={wrong}
              detail="Answers to review"
              change={getChange(current.wrong, previous.wrong)}
              inverse
            />

            <Stat
              icon={Clock3}
              label="Study Time"
              value={formatDuration(speed.totalTimeMs)}
              detail={
                speed.available
                  ? "Recorded answer time"
                  : "Timing unavailable"
              }
            />

            <Stat
              icon={Flame}
              label="Current Streak"
              value={number(consistency.currentStreak)}
              detail={`Longest ${number(consistency.longestStreak)} days`}
            />
          </div>
        </section>

        {/* ============================================
            IMPROVEMENT COMPARISON
        ============================================ */}

        <Card>
          <Heading
            icon={TrendingUp}
            title="Your Improvement"
            description="Compare your current period with the immediately preceding period of equal length."
          />

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              label="Accuracy"
              value={percent(current.accuracy)}
              compare={percent(previous.accuracy)}
              change={comparison.accuracyChange}
              suffix=" pp"
            />

            <Metric
              label="Questions Attempted"
              value={number(current.attempted)}
              compare={number(previous.attempted)}
              change={getChange(current.attempted, previous.attempted)}
            />

            <Metric
              label="Correct Answers"
              value={correct}
              compare={number(previous.correct)}
              change={getChange(current.correct, previous.correct)}
            />

            <Metric
              label="Active Days"
              value={number(consistency.activeDays)}
              compare="Selected period"
            />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ffe5d3] bg-[#fffaf6] p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#ff7417]">
              <Zap size={17} />
            </span>

            <div>
              <p className="text-xs font-black text-[#171717]">
                Progress summary
              </p>

              <p className="mt-1 text-xs leading-relaxed text-[#777d87]">
                {number(current.attempted) === 0
                  ? "Start attempting questions to establish your learning baseline."
                  : previous.attempted === undefined
                    ? "Complete more sessions to establish a comparison with your previous performance."
                    : number(comparison.accuracyChange) > 0
                      ? `Your accuracy improved by ${comparison.accuracyChange} percentage points. Continue practising carefully.`
                      : number(comparison.accuracyChange) < 0
                        ? "Your accuracy is lower than the previous period. Review incorrect answers before focusing on speed."
                        : "Your accuracy has remained stable. Continue practising to build a stronger performance record."}
              </p>
            </div>
          </div>
        </Card>

        {/* ============================================
            ACTIVITY AND ACCURACY CHARTS
        ============================================ */}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <Heading
              icon={BarChart3}
              title="Learning Activity"
              description="Questions attempted over time."
            />

            <div className="mt-5">
              <BarChart points={activity} />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#ff7417]" />
              <span className="text-[10px] font-bold text-[#777d87]">
                Questions attempted
              </span>
            </div>
          </Card>

          <Card>
            <Heading
              icon={TrendingUp}
              title="Accuracy Over Time"
              description="Track how your answer accuracy changes."
            />

            <div className="mt-5">
              <AccuracyChart points={trend} />
            </div>

            <p className="mt-3 text-[10px] font-medium text-[#777d87]">
              Days without attempts are not treated as zero accuracy.
            </p>
          </Card>
        </div>

        {/* ============================================
            ANSWER DISTRIBUTION AND CHAPTERS
        ============================================ */}

        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <Card>
            <Heading
              icon={CheckCircle2}
              title="Answer Accuracy"
              description="Your correct versus incorrect answers."
            />

            <div className="mt-6">
              <Donut correct={correct} wrong={wrong} />
            </div>
          </Card>

          <Card>
            <Heading
              icon={BookOpen}
              title="Chapter Performance"
              description="Expand any chapter to explore topic-level results."
            />

            <div className="mt-5">
              <ChapterPerformance
                chapters={chapters}
                topics={topics}
                expandedChapter={expandedChapter}
                setExpandedChapter={setExpandedChapter}
                navigate={navigate}
                isAdminStudentView={isAdminStudentView}
              />
            </div>
          </Card>
        </div>

        {/* ============================================
            ANSWERING SPEED
        ============================================ */}

        <Card>
          <Heading
            icon={Clock3}
            title="Answering Speed"
            description="Understand how much time you spend answering questions."
          />

          {speed.available ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Mini
                  icon={Clock3}
                  label="Average Response"
                  value={formatDuration(speed.averageTimeMs)}
                />

                <Mini
                  icon={Activity}
                  label="Median Response"
                  value={formatDuration(speed.medianTimeMs)}
                />

                <Mini
                  icon={CheckCircle2}
                  label="Correct Average"
                  value={formatDuration(speed.correctAverageTimeMs)}
                />

                <Mini
                  icon={XCircle}
                  label="Incorrect Average"
                  value={formatDuration(speed.incorrectAverageTimeMs)}
                />
              </div>

              <div className="mt-4 rounded-xl bg-[#fffaf6] p-4">
                <p className="text-xs font-black text-[#171717]">
                  Speed versus accuracy
                </p>

                <p className="mt-1 text-xs leading-relaxed text-[#777d87]">
                  A lower response time is useful only when your accuracy
                  remains stable or improves. Focus on understanding the
                  question instead of answering as quickly as possible.
                </p>
              </div>
            </>
          ) : (
            <div className="mt-5">
              <Empty>
                Timing data will appear when your practice attempts include
                response-time information.
              </Empty>
            </div>
          )}
        </Card>

        {/* ============================================
            STREAK AND SMART INSIGHTS
        ============================================ */}

        <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
          <Card>
            <Heading
              icon={Flame}
              title="Daily Streak Performance"
              description="Your daily challenge consistency."
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini
                icon={Flame}
                label="Current Streak"
                value={`${number(consistency.currentStreak)} days`}
              />

              <Mini
                icon={Trophy}
                label="Longest Streak"
                value={`${number(consistency.longestStreak)} days`}
              />

              <Mini
                icon={CheckCircle2}
                label="Challenges"
                value={number(dailyStats.completed)}
              />

              <Mini
                icon={Target}
                label="Challenge Accuracy"
                value={percent(dailyStats.accuracy)}
              />
            </div>

            <div className="mt-4 rounded-xl bg-[#fffaf6] p-4">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[#ff7417]" />
                <p className="text-xs font-black text-[#171717]">
                  Consistency matters
                </p>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-[#777d87]">
                Regular practice builds a stronger learning routine.
                Try to complete your daily challenge consistently.
              </p>
            </div>
          </Card>

          <Card>
            <Heading
              icon={Award}
              title="Smart Learning Insights"
              description="Automatically generated from your actual performance records. No AI required."
            />

            <div className="mt-5 space-y-3">
              {insightItems.map((insight, index) => {
                const styles = {
                  success: {
                    border: "border-emerald-500",
                    background: "bg-emerald-50/60",
                    icon: CheckCircle2,
                    color: "text-emerald-600",
                  },
                  warning: {
                    border: "border-[#ff7417]",
                    background: "bg-[#fffaf6]",
                    icon: AlertCircle,
                    color: "text-[#ff7417]",
                  },
                  info: {
                    border: "border-blue-400",
                    background: "bg-blue-50/60",
                    icon: Activity,
                    color: "text-blue-600",
                  },
                };

                const style = styles[insight.type] || styles.info;
                const InsightIcon = style.icon;

                return (
                  <div
                    key={`${insight.title}-${index}`}
                    className={`rounded-xl border-l-4 ${style.border} ${style.background} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <InsightIcon
                        size={18}
                        className={`mt-0.5 shrink-0 ${style.color}`}
                      />

                      <div>
                        <p className="text-xs font-black text-[#171717]">
                          {insight.title}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-[#666d76]">
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ============================================
            PERSONAL RECORDS AND HISTORY
        ============================================ */}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <Heading
              icon={Trophy}
              title="Personal Records"
              description="Highlights from your practice history."
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini
                icon={CalendarDays}
                label="Active Practice Days"
                value={number(consistency.activeDays)}
              />

              <Mini
                icon={Zap}
                label="Best Day Attempts"
                value={bestDayAttempts}
              />

              <Mini
                icon={Award}
                label="Strongest Chapter"
                value={strongestChapter}
                compact
              />

              <Mini
                icon={Target}
                label="Total Answered"
                value={number(summary.attempted)}
              />
            </div>
          </Card>

          <Card>
            <Heading
              icon={Activity}
              title="Recent Practice History"
              description="Your latest recorded practice attempts."
              right={
                <span className="rounded-lg bg-[#fff1e7] px-2.5 py-1.5 text-[10px] font-black text-[#ea650d]">
                  Latest 8
                </span>
              }
            />

            <div className="mt-5 divide-y divide-slate-100">
              {recentAttempts.length ? (
                recentAttempts.slice(0, 8).map((item, index) => {
                  const isCorrect = item.status === "correct";
                  const isWrong = item.status === "wrong";

                  return (
                    <div
                      key={`${item.date}-${index}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#171717] sm:text-sm">
                          {item.topicName ||
                            item.chapterName ||
                            "Practice session"}
                        </p>

                        <p className="mt-1 text-[10px] font-semibold text-[#777d87]">
                          {dateLabel(item.date)} ·{" "}
                          {item.source === "daily-streak"
                            ? "Daily challenge"
                            : item.source === "test"
                              ? "Test"
                              : "Chapter practice"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                          isCorrect
                            ? "bg-emerald-50 text-emerald-700"
                            : isWrong
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.status || "Recorded"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <Empty>No practice activity yet.</Empty>
              )}
            </div>
          </Card>
        </div>

        {/* ============================================
            FOOTER
        ============================================ */}

        <div className="flex flex-col items-center justify-between gap-2 py-3 text-center sm:flex-row sm:text-left">
          <p className="text-[10px] font-semibold text-[#a0a5ad]">
            Innovative Science · Learning Analytics
          </p>

          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold text-[#777d87] transition hover:bg-white hover:text-[#ff7417] disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin" : ""}
            />
            Refresh analytics
          </button>
        </div>
      </div>
    </main>
  );
};

export default ProfilePerformancePage;
