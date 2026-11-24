
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Flame,
  RefreshCw,
  SlidersHorizontal,
  Target,
  TrendingUp,
  X,
  AlertCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import LoadingState from '../components/LoadingState'

// ------------------------------------------
// HELPERS
// ------------------------------------------

const formatDate = (value) => {
  if (!value) return ''

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const formatFullDate = (value) => {
  if (!value) return 'Selected day'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const numberValue = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const accuracyValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? Math.max(0, Math.min(100, number))
    : null
}

const displayAccuracy = (value) => {
  const accuracy = accuracyValue(value)
  return accuracy === null ? '—' : `${accuracy}%`
}

const analyticsCacheKey = (range) => {
  const auth = getStoredAuth()
  const userId = auth?.user?._id || auth?.user?.id || 'current'
  return `student-performance-analytics:${userId}:${range}`
}

const readAnalyticsCache = (range) => {
  try {
    return JSON.parse(sessionStorage.getItem(analyticsCacheKey(range)) || 'null')
  } catch {
    return null
  }
}

const writeAnalyticsCache = (range, value) => {
  try {
    sessionStorage.setItem(analyticsCacheKey(range), JSON.stringify(value))
  } catch {
    // Session storage is an optional fast-render cache.
  }
}

const formatDuration = (value) => {
  const milliseconds = Number(value)
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '—'
  return milliseconds < 1000
    ? `${Math.round(milliseconds)} ms`
    : `${(milliseconds / 1000).toFixed(1)} sec`
}

// ------------------------------------------
// STAT CARD
// ------------------------------------------

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  description,
  trend
}) => {
  const colors = {
    cyan: {
      icon: 'bg-cyan-50 text-cyan-700',
      border: 'hover:border-cyan-200'
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-700',
      border: 'hover:border-emerald-200'
    },
    violet: {
      icon: 'bg-violet-50 text-violet-700',
      border: 'hover:border-violet-200'
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700',
      border: 'hover:border-amber-200'
    }
  }

  const theme = colors[color] || colors.cyan

  return (
    <div className={`group min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${theme.border}`}>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
          {label}
        </p>

        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.icon}`}>
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-1">
        <p className="break-words text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {value}
        </p>

        {trend && (
          <span className={`mb-1 flex items-center text-[10px] font-bold ${trend.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trend.positive
              ? <ArrowUpRight size={14} />
              : <ArrowDownRight size={14} />
            }
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-[10px] font-medium text-slate-400 sm:text-xs">
          {description}
        </p>
      )}
    </div>
  )
}

// ------------------------------------------
// SECTION TITLE
// ------------------------------------------

const SectionTitle = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <h2 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
        {title}
      </h2>
    </div>

    {action}
  </div>
)

// ------------------------------------------
// BREAKDOWN
// ------------------------------------------

const Breakdown = ({
  title,
  items = [],
  icon: Icon = BarChart3,
  empty = 'Complete more questions to see your performance.',
  onItemClick
}) => {
  const validItems = Array.isArray(items) ? items : []

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

      <SectionTitle icon={Icon} title={title} />

      <div className="mt-5 space-y-4">

        {validItems.length > 0 ? (
          validItems.map((item, index) => {
            const accuracy = accuracyValue(item.accuracy)

            const color =
              accuracy === null ? 'bg-slate-300'
                : accuracy < 50 ? 'bg-rose-500'
                  : accuracy < 70 ? 'bg-amber-400'
                    : 'bg-emerald-500'

            const indicatorClass = accuracy === null
              ? 'border-slate-200 bg-slate-100 text-slate-500'
              : accuracy < 50
                ? 'border-rose-200 bg-rose-500 text-white'
                : accuracy < 70
                  ? 'border-amber-200 bg-amber-400 text-white'
                  : 'border-emerald-200 bg-emerald-500 text-white'

            return (
              <div key={`${item.key || item.label || 'item'}-${index}`}>

                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs font-bold text-slate-700 sm:text-sm">
                    {item.label || 'Untitled'}
                  </p>

                  <span className="shrink-0 text-xs font-black text-slate-800">
                    {displayAccuracy(accuracy)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onItemClick?.(item, title)}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border shadow-sm transition hover:scale-110 hover:shadow-md ${indicatorClass}`}
                    title={`View questions for ${item.label || 'this area'}`}
                    aria-label={`View questions for ${item.label || 'this area'}`}
                  >
                    <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${accuracy ?? 0}%` }}
                  />
                </div>

                <div className="mt-1.5 flex flex-wrap gap-x-3 text-[10px] font-medium text-slate-400">
                  <span>{numberValue(item.attempted)} attempted</span>
                  <span>{numberValue(item.wrong)} wrong</span>
                  <span>{numberValue(item.skipped)} skipped</span>
                </div>

              </div>
            )
          })
        ) : (
          <div className="rounded-xl bg-slate-50 px-3 py-8 text-center">
            <BarChart3 size={25} className="mx-auto text-slate-300" />

            <p className="mt-2 text-xs font-bold text-slate-600">
              No data available
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              {empty}
            </p>
          </div>
        )}

      </div>
    </section>
  )
}

// ------------------------------------------
// QUESTION REVIEW
// ------------------------------------------

const answerIndexes = (value, options = []) => {
  if (Array.isArray(value)) return value.flatMap((item) => answerIndexes(item, options))
  if (typeof value === 'number' && Number.isInteger(value)) return [value]
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (/^\d+$/.test(normalized)) return [Number(normalized)]
    const optionIndex = options.findIndex((option) => String(option).trim() === normalized)
    return optionIndex >= 0 ? [optionIndex] : []
  }
  return []
}

const QuestionReviewCard = ({ question, index }) => {
  const [expanded, setExpanded] = useState(false)
  const isCorrect = question.status === 'correct'
  const isWrong = question.status === 'wrong'
  const StatusIcon = isCorrect ? Check : isWrong ? X : Clock3
  const statusClass = isCorrect
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : isWrong
      ? 'border-rose-100 bg-rose-50 text-rose-700'
      : 'border-amber-100 bg-amber-50 text-amber-700'
  const options = Array.isArray(question.options) ? question.options : []
  const storedCorrectIndexes = Array.isArray(question.correctOptions) && question.correctOptions.length
    ? answerIndexes(question.correctOptions, options)
    : answerIndexes(question.correctOption, options)
  const correctIndexes = storedCorrectIndexes.length
    ? storedCorrectIndexes
    : answerIndexes(question.correctAnswer, options)
  const selectedIndexes = answerIndexes(question.selectedAnswer, options)
  const correctAnswer = question.correctAnswer || correctIndexes.map((optionIndex) => options[optionIndex]).filter(Boolean).join(', ')

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      className={`w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${statusClass}`}
      aria-expanded={expanded}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-current/15">
          <StatusIcon size={12} strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-5 text-slate-800">
            {question.question || `Question ${index + 1}`}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
            {isCorrect ? 'Correct' : isWrong ? 'Wrong' : 'Skipped'}{question.date ? ` · ${formatDate(question.date)}` : ''} · {expanded ? 'Tap to hide details' : 'Tap to see answer'}
          </p>
        </div>
        <ArrowRight size={14} className={`mt-1 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && (
        <div className="mt-3 border-t border-current/10 pt-3">
          {options.length > 0 ? (
            <div className="space-y-1.5">
              {options.map((option, optionIndex) => {
                const optionIsCorrect = correctIndexes.includes(optionIndex)
                const optionWasSelected = selectedIndexes.includes(optionIndex)
                return (
                  <div key={`${option}-${optionIndex}`} className={`flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold ${optionIsCorrect ? 'bg-emerald-100 text-emerald-800' : optionWasSelected ? 'bg-rose-100 text-rose-800' : 'bg-white/70 text-slate-600'}`}>
                    <span className="w-4 shrink-0 font-black">{String.fromCharCode(65 + optionIndex)}.</span>
                    <span className="flex-1">{option}</span>
                    {optionIsCorrect && <Check size={14} className="shrink-0" strokeWidth={3} />}
                    {!optionIsCorrect && optionWasSelected && <X size={14} className="shrink-0" strokeWidth={3} />}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-600">Correct answer: {correctAnswer || question.correctAnswer || 'Not available'}</p>
          )}
          {isWrong && correctAnswer && <p className="mt-2 text-[11px] font-black text-emerald-700">Correct answer: {correctAnswer}</p>}
          {question.solution && <p className="mt-2 text-[11px] leading-5 text-slate-600"><span className="font-black">Explanation:</span> {question.solution}</p>}
        </div>
      )}
    </button>
  )
}

// ------------------------------------------
// POPUP
// ------------------------------------------

const Modal = ({ children, onClose, title }) => {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)

    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="analytics-modal-scroll my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
      >
        {children}
      </div>
    </div>
  )
}

// ------------------------------------------
// MAIN PAGE
// ------------------------------------------

const StudentPerformanceAnalyticsPage = () => {
  const [range, setRange] = useState('30')

  const [data, setData] = useState(() => readAnalyticsCache(range))
  const [loading, setLoading] = useState(() => !readAnalyticsCache(range))
  const [error, setError] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTrendPoint, setSelectedTrendPoint] = useState(null)
  const [selectedBreakdown, setSelectedBreakdown] = useState(null)

  const [tempRange, setTempRange] = useState('30')
  const trendScrollRef = useRef(null)

  // ----------------------------------------
  // FETCH ANALYTICS
  // ----------------------------------------

  useEffect(() => {
    let active = true

    const fetchAnalytics = async () => {
      const cached = readAnalyticsCache(range)
      if (cached && active) setData(cached)
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({ range })

        const result = await apiRequest(
          `/api/progress/analytics?${params.toString()}`,
          { cache: 'no-store' }
        )

        if (active) {
          setData(result)
          writeAnalyticsCache(range, result)
          setSelectedTrendPoint(null)
            setSelectedBreakdown(null)
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.message || 'Unable to load analytics.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAnalytics()

    return () => {
      active = false
    }
  }, [range, refreshKey])

  // ----------------------------------------
  // SAFE DATA
  // ----------------------------------------

  const summary = data?.summary || {}
  const periodComparison = data?.periodComparison || {}

  const accuracyTrend = Array.isArray(data?.accuracyTrend)
    ? data.accuracyTrend
    : []

  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations
    : []

  const trendBars = useMemo(
    () =>
      accuracyTrend.map((item) => ({
        ...item,
        safeAccuracy: accuracyValue(item.accuracy)
      })),
    [accuracyTrend]
  )

  const latestAccuracy = trendBars.length
    ? trendBars[trendBars.length - 1].safeAccuracy
    : null

  useEffect(() => {
    const chartScroller = trendScrollRef.current

    if (chartScroller) {
      chartScroller.scrollLeft = chartScroller.scrollWidth
    }
  }, [trendBars.length, range])

  const change = periodComparison.accuracyChange

  const validChange =
    change !== null &&
    change !== undefined &&
    change !== '' &&
    Number.isFinite(Number(change))

  const retry = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  // ----------------------------------------
  // FILTER ACTIONS
  // ----------------------------------------

  const openFilters = () => {
    setTempRange(range)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setRange(tempRange)
    setShowFilters(false)
  }

  // ----------------------------------------
  // INITIAL LOADING
  // ----------------------------------------

  if (loading && !data) {
    return <LoadingState label="Loading analytics..." />
  }

  // ----------------------------------------
  // FULL ERROR STATE
  // ----------------------------------------

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={26} />
          </div>

          <h2 className="mt-4 text-lg font-black text-slate-900">
            Unable to load analytics
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            onClick={retry}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-cyan-700"
          >
            <RefreshCw size={15} />
            Try again
          </button>

        </div>
      </main>
    )
  }

  // ----------------------------------------
  // PAGE
  // ----------------------------------------

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f8fb] px-3 pb-24 pt-4 text-slate-900 sm:px-6 sm:pt-6">

      <div className="mx-auto max-w-6xl space-y-5">

        {/* TOP BAR */}

        <header className="flex items-center justify-between gap-3">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
              <Activity size={21} />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                Analytics
              </h1>

              <p className="text-[11px] font-medium text-slate-400">
                Your learning progress
              </p>
            </div>

          </div>

          <div className="flex shrink-0 items-center gap-2">

            <button
              type="button"
              onClick={openFilters}
              aria-label="Open analytics filters"
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filters</span>
              <ChevronDown size={13} />
            </button>

            <button
              type="button"
              onClick={retry}
              disabled={loading}
              aria-label="Refresh analytics"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
            </button>

          </div>

        </header>

        {/* ACTIVE FILTER */}

        <div className="flex flex-wrap items-center gap-2">

          <span className="rounded-lg bg-cyan-50 px-2.5 py-1.5 text-[10px] font-bold text-cyan-700">
            {range === 'all' ? 'All time' : `Last ${range} days`}
          </span>

          <span className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
            Daily Streak
          </span>

          {loading && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-700">
              <RefreshCw size={11} className="animate-spin" />
              Updating
            </span>
          )}

        </div>

        {/* ERROR BANNER */}

        {error && data && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
            <span>{error}</span>

            <button onClick={retry} className="shrink-0 font-bold underline">
              Retry
            </button>
          </div>
        )}

        {/* OVERVIEW */}

        <section>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800">
              Overview
            </h2>

            <span className="text-[10px] font-medium text-slate-400">
              Performance summary
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

            <StatCard
              label="Accuracy"
              value={displayAccuracy(summary.accuracy)}
              icon={Target}
              color="cyan"
              description="Correct answers"
            />

            <StatCard
              label="Attempted"
              value={numberValue(summary.attempted)}
              icon={CheckCircle2}
              color="emerald"
              description="Total questions"
            />

            <StatCard
              label="Improvement"
              value={
                validChange
                  ? `${Number(change) > 0 ? '+' : ''}${change} pp`
                  : '—'
              }
              icon={TrendingUp}
              color="violet"
              description="Vs previous period"
              trend={
                validChange
                  ? {
                      positive: Number(change) >= 0,
                      value: 'Accuracy'
                    }
                  : null
              }
            />

            <StatCard
              label="Speed"
              value={formatDuration(data?.speedAnalysis?.averageTimeMs)}
              icon={Clock3}
              color="amber"
              description="Average submission time"
            />

          </div>

        </section>

        {/* ACCURACY CHART */}

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          <div className="flex items-center justify-between gap-3">

            <SectionTitle
              icon={TrendingUp}
              title="Accuracy trend"
            />

            {latestAccuracy !== null && (
              <div className="rounded-xl bg-cyan-50 px-3 py-2 text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-600">
                  Latest
                </p>
                <p className="text-lg font-black text-cyan-800">
                  {latestAccuracy}%
                </p>
              </div>
            )}

          </div>

          {trendBars.length > 0 ? (

            <div className="mt-5">

              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>100%</span>
                <span>0%</span>
              </div>

              <div
                ref={trendScrollRef}
                className="mt-2 h-44 overflow-x-auto overflow-y-hidden rounded-xl bg-slate-50 px-3 pt-3 sm:h-52"
              >

                  <div
                  className="flex h-full min-w-full items-end gap-0 pb-2"
                  style={{
                    width: `${Math.max(100, trendBars.length * 42)}px`
                  }}
                >

                  {trendBars.map((item, index) => {
                    const accuracy = item.safeAccuracy ?? 0

                    const isSelected =
                      selectedTrendPoint?.date === item.date

                    const barColor =
                      accuracy < 50
                        ? 'bg-rose-400'
                        : accuracy < 70
                          ? 'bg-amber-400'
                          : 'bg-cyan-500'

                    return (
                      <button
                        type="button"
                        key={`${item.date}-${index}`}
                        onClick={() => setSelectedTrendPoint(item)}
                        aria-label={`View ${formatFullDate(item.date)}`}
                        title={formatFullDate(item.date)}
                        className={`group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 rounded-lg px-0 outline-none transition hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-500 ${isSelected ? 'bg-cyan-50' : ''}`}
                      >

                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className={`w-full max-w-full rounded-t-md border border-white/80 transition-all duration-300 ${barColor} ${isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : 'group-hover:brightness-90'}`}
                            style={{
                              height: `${Math.max(4, accuracy)}%`
                            }}
                          />
                        </div>

                        <span className="w-full shrink-0 truncate text-center text-[9px] font-bold text-slate-400">
                          {formatDate(item.date)}
                        </span>

                      </button>
                    )
                  })}

                </div>

              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">

                {[
                  ['bg-rose-400', 'Below 50%'],
                  ['bg-amber-400', '50–69%'],
                  ['bg-cyan-500', '70% and above']
                ].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </span>
                ))}

              </div>

              <button
                type="button"
                onClick={() => setSelectedTrendPoint(trendBars[trendBars.length - 1])}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
              >
                View latest performance
                <TrendingUp size={14} />
              </button>

            </div>

          ) : (

            <div className="flex min-h-44 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center">
              <TrendingUp size={30} className="text-slate-300" />

              <p className="mt-3 text-sm font-bold text-slate-600">
                No trend data yet
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Start practising to see your progress here.
              </p>
            </div>

          )}

        </section>

        {/* ELIGIBLE DAILY STREAK CHAPTERS */}

        <section className="min-w-0 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/30 to-slate-50 p-4 shadow-sm sm:p-5">

          <div className="flex items-start justify-between gap-3">
            <SectionTitle
              icon={BookOpen}
              title="Eligible Daily Streak chapters"
            />

            <span className="shrink-0 rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black text-cyan-700">
              {data?.eligibleChapters?.length || 0} chapters
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Daily Streak questions can come from any chapter below. The order follows your recent chapter practice, and questions are balanced across eligible chapters.
          </p>

          {data?.eligibleChapters?.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.eligibleChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-xs font-black text-white shadow-sm shadow-cyan-600/20">
                    {chapter.order}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase tracking-wider text-cyan-600">
                      Chapter {chapter.number}
                    </p>
                    <p className="truncate text-sm font-extrabold text-slate-800" title={chapter.name}>
                      {chapter.name}
                    </p>
                  </div>

                  <span className="ml-auto shrink-0 text-lg font-black text-cyan-700">
                    {chapter.coverage || 0}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center">
              <BookOpen size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-600">
                No eligible chapters yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Answer a question from a chapter in normal practice to unlock it for Daily Streak.
              </p>
            </div>
          )}

        </section>

        {/* PERFORMANCE BREAKDOWN */}

        <section>

          <div className="mb-3">
            <h2 className="text-sm font-extrabold text-slate-800">
              Performance breakdown
            </h2>
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">

            <Breakdown
              title="Chapters"
              icon={BookOpen}
              items={data?.chapterBreakdown}
              onItemClick={(item, category) => setSelectedBreakdown({ item, category })}
            />

            <Breakdown
              title="Weak areas"
              icon={Target}
              items={data?.weakAreas}
              empty="More practice will help identify areas to improve."
              onItemClick={(item, category) => setSelectedBreakdown({ item, category })}
            />

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

              <SectionTitle
                icon={Clock3}
                title="Submission speed"
              />

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Average time taken to submit Daily Streak questions, separated by result.
              </p>

              {data?.speedAnalysis?.available ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                      Correct submissions
                    </p>
                    <p className="mt-2 text-xl font-black text-emerald-800">
                      {formatDuration(data.speedAnalysis.correctAverageTimeMs)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                      average response time
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                      Wrong submissions
                    </p>
                    <p className="mt-2 text-xl font-black text-rose-800">
                      {formatDuration(data.speedAnalysis.incorrectAverageTimeMs)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-rose-700">
                      average response time
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center">
                  <Clock3 size={25} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    Speed data will appear after your next submissions
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Timing starts when a Daily Streak question is opened.
                  </p>
                </div>
              )}

            </section>

            {/* RECOMMENDATIONS */}

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

              <SectionTitle
                icon={Award}
                title="Recommended practice"
              />

              <div className="mt-4 space-y-3">

                {recommendations.length > 0 ? (

                  recommendations.slice(0, 5).map((item, index) => (

                    <div
                      key={`${item.category || 'recommendation'}-${item.title || index}`}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-amber-200 hover:bg-amber-50/50"
                    >

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                          <BookOpen size={17} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <h3 className="break-words text-xs font-extrabold text-slate-800">
                            {item.title || 'Practice recommendation'}
                          </h3>

                          <p className="mt-1 break-words text-[11px] leading-5 text-slate-500">
                            {item.description || 'Continue practising to improve.'}
                          </p>

                          {item.actionUrl && (
                            <Link
                              to={item.actionUrl}
                              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-cyan-700 transition hover:text-cyan-900"
                            >
                              {item.actionLabel || 'Start practising'}
                              <ArrowUpRight size={14} />
                            </Link>
                          )}

                        </div>

                      </div>

                    </div>

                  ))

                ) : (

                  <div className="rounded-xl bg-slate-50 p-7 text-center">
                    <Award size={26} className="mx-auto text-slate-300" />

                    <p className="mt-2 text-xs font-bold text-slate-600">
                      Keep learning!
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Recommendations will appear as you practise.
                    </p>
                  </div>

                )}

              </div>

            </section>

          </div>

        </section>

        {/* FOOTER */}

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 py-4">

          <p className="text-[10px] font-medium text-slate-400">
            Keep learning. Keep improving.
          </p>

          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-500 transition hover:bg-white hover:text-cyan-700 disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>

        </footer>

      </div>

      {/* --------------------------------
          FILTER POPUP
      -------------------------------- */}

      {showFilters && (
        <Modal
          title="Analytics filters"
          onClose={() => setShowFilters(false)}
        >

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Filters
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Customise your performance view.
              </p>
            </div>

            <button
              onClick={() => setShowFilters(false)}
              aria-label="Close filters"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X size={17} />
            </button>

          </div>

          <div className="mt-6">

            <p className="mb-3 text-xs font-extrabold text-slate-700">
              Time period
            </p>

            <div className="grid grid-cols-3 gap-2">

              {[
                ['7', '7 Days'],
                ['30', '30 Days'],
                ['all', 'All Time']
              ].map(([value, label]) => (

                <button
                  key={value}
                  type="button"
                  onClick={() => setTempRange(value)}
                  className={`flex min-h-12 items-center justify-center rounded-xl border text-xs font-bold transition ${
                    tempRange === value
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'
                  }`}
                >
                  {label}

                  {tempRange === value && (
                    <Check size={13} className="ml-1.5" />
                  )}

                </button>

              ))}

            </div>

          </div>

          <div className="mt-7 flex gap-2">

            <button
              type="button"
              onClick={() => {
                setTempRange('30')
              }}
              className="min-h-11 flex-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={applyFilters}
              className="min-h-11 flex-[1.5] rounded-xl bg-slate-900 text-xs font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-cyan-700"
            >
              Apply filters
            </button>

          </div>

        </Modal>
      )}

      {/* --------------------------------
          DAILY PERFORMANCE POPUP
      -------------------------------- */}

      {selectedTrendPoint && (
        <Modal
          title="Daily performance details"
          onClose={() => setSelectedTrendPoint(null)}
        >

          <div className="flex items-start justify-between gap-3">

            <div>
              <span className="rounded-lg bg-cyan-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">
                Daily performance
              </span>

              <h2 className="mt-3 text-lg font-black text-slate-900">
                {formatFullDate(selectedTrendPoint.date)}
              </h2>
            </div>

            <button
              onClick={() => setSelectedTrendPoint(null)}
              aria-label="Close details"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X size={17} />
            </button>

          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-emerald-50 p-5">

            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Accuracy
            </p>

            <div className="mt-1 flex items-end justify-between gap-3">

              <p className="text-4xl font-black tracking-tight text-cyan-800">
                {displayAccuracy(selectedTrendPoint.accuracy)}
              </p>

              <Target size={29} className="mb-1 text-cyan-600" />

            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-cyan-600 transition-all duration-500"
                style={{
                  width: `${accuracyValue(selectedTrendPoint.accuracy) ?? 0}%`
                }}
              />
            </div>

          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">

            {[
              {
                label: 'Attempted',
                value: numberValue(selectedTrendPoint.attempted),
                icon: CheckCircle2,
                color: 'text-slate-800'
              },
              {
                label: 'Correct',
                value: numberValue(selectedTrendPoint.correct),
                icon: Check,
                color: 'text-emerald-600'
              },
              {
                label: 'Wrong',
                value: numberValue(selectedTrendPoint.wrong),
                icon: X,
                color: 'text-rose-600'
              },
              {
                label: 'Skipped',
                value: numberValue(selectedTrendPoint.skipped),
                icon: Clock3,
                color: 'text-amber-600'
              },
              {
                label: 'Recorded',
                value: numberValue(selectedTrendPoint.total),
                icon: BarChart3,
                color: 'text-slate-800'
              }
            ].map(({ label, value, icon: Icon, color }) => (

              <div
                key={label}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                  </p>

                  <Icon size={14} className={color} />
                </div>

                <p className={`mt-2 text-xl font-black ${color}`}>
                  {value}
                </p>

              </div>

            ))}

          </div>

          <button
            type="button"
            onClick={() => setSelectedTrendPoint(null)}
            className="mt-6 min-h-11 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-cyan-700"
          >
            Done
          </button>

        </Modal>
      )}

      {selectedBreakdown && (
        <Modal
          title={`Questions in ${selectedBreakdown.item.label || 'this area'}`}
          onClose={() => setSelectedBreakdown(null)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-600">
                {selectedBreakdown.category}
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                {selectedBreakdown.item.label || 'Questions'}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedBreakdown.item.questions?.length || 0} questions recorded
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBreakdown(null)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              aria-label="Close questions"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {selectedBreakdown.item.questions?.length ? selectedBreakdown.item.questions.map((question, index) => (
              <QuestionReviewCard key={`${question.questionId || 'question'}-${index}`} question={question} index={index} />
            )) : (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-xs font-semibold text-slate-500">
                No question details are available for this selection.
              </div>
            )}
          </div>
        </Modal>
      )}

    </main>
  )
}

export default StudentPerformanceAnalyticsPage
