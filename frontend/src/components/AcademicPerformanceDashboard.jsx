import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, RefreshCw, Target, TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'

const DAY = 24 * 60 * 60 * 1000
const formatDate = (value) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(value))
const clamp = (value) => Math.min(100, Math.max(0, Math.round(value)))

const Card = ({ title, icon: Icon, children, className = '' }) => (
  <section className={`min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:shadow-md sm:p-5 ${className}`}>
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon className="h-5 w-5" /></span>
      <h2 className="text-base font-black text-slate-900 sm:text-lg">{title}</h2>
    </div>
    {children}
  </section>
)

const LineChart = ({ points }) => {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(points.length - 1, 0))
  useEffect(() => setSelectedIndex(Math.max(points.length - 1, 0)), [points.length])
  if (!points.length) return <div className="grid min-h-[210px] place-items-center rounded-2xl bg-slate-50 px-4 text-center text-sm font-semibold text-slate-400 sm:min-h-[220px]">No answered questions in this period.</div>
  const width = 640
  const height = 240
  const pad = { top: 20, right: 16, bottom: 38, left: 42 }
  const x = (index) => pad.left + (index / Math.max(points.length - 1, 1)) * (width - pad.left - pad.right)
  const y = (value) => pad.top + ((100 - value) / 100) * (height - pad.top - pad.bottom)
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.accuracy)}`).join(' ')
  const area = `${path} L ${x(points.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`

  const selected = points[selectedIndex] || points[points.length - 1]

  return (
    <div className="-mx-4 min-w-0 overflow-hidden rounded-none border-y border-slate-100 bg-gradient-to-b from-cyan-50/60 to-slate-50 p-3 sm:mx-0 sm:rounded-2xl sm:border sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Accuracy over time</p>
          <p className="mt-1 text-xs font-bold text-slate-600">Tap a point to inspect a day</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-cyan-700 shadow-sm ring-1 ring-cyan-100">{selected.accuracy}%</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block aspect-[1.75] h-auto w-full sm:aspect-[2.6]" role="img" aria-label="Interactive accuracy over time chart" style={{ touchAction: 'manipulation' }}>
        <defs>
          <linearGradient id="accuracy-area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity=".24" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity=".03" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke="#dbe8ee" strokeDasharray="3 6" /><text x="4" y={y(value) + 4} fill="#94a3b8" fontSize="11" fontWeight="600">{value}%</text></g>)}
        <path d={area} fill="url(#accuracy-area-gradient)" />
        <path d={path} fill="none" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={pad.top} y2={height - pad.bottom} stroke="#0891b2" strokeWidth="1.5" strokeDasharray="4 5" opacity=".45" />
        {points.map((point, index) => <g key={`${point.date}-${index}`}>
          <title>{`${formatDate(point.date)}: ${point.accuracy}% (${point.answered} answered)`}</title>
          <circle cx={x(index)} cy={y(point.accuracy)} r="20" fill="transparent" className="cursor-pointer" tabIndex="0" role="button" aria-label={`${formatDate(point.date)}, ${point.accuracy}% accuracy`} onPointerDown={() => setSelectedIndex(index)} onFocus={() => setSelectedIndex(index)} />
          {index === selectedIndex && <circle cx={x(index)} cy={y(point.accuracy)} r="11" fill="#cffafe" opacity=".8" />}
          <circle cx={x(index)} cy={y(point.accuracy)} r={index === selectedIndex ? '6.5' : '5'} fill={index === selectedIndex ? '#0891b2' : 'white'} stroke="#0891b2" strokeWidth="3" className="pointer-events-none transition-all" />
        </g>)}
        {points.filter((_, index) => index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)).map((point, index, labels) => <text key={`${point.date}-label`} x={x(points.indexOf(point))} y={height - 10} textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'} fill="#64748b" fontSize="11" fontWeight="600">{formatDate(point.date)}</text>)}
      </svg>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-cyan-100 bg-white px-3 py-2.5 shadow-sm sm:px-4" aria-live="polite">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Selected day</p>
          <p className="mt-0.5 truncate text-xs font-black text-slate-700">{formatDate(selected.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-cyan-700">{selected.accuracy}% accuracy</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">{selected.answered} answered</p>
        </div>
      </div>
    </div>
  )
}

const AcademicPerformanceDashboard = () => {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [range, setRange] = useState('30')
  const [chapterMode, setChapterMode] = useState('coverage')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    apiRequest('/api/progress/performance', { cache: 'no-store', science: 'science2' })
      .then((result) => { if (active) setData(result) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load performance.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const attempts = useMemo(() => (data?.attempts || []).flatMap((attempt) => (attempt.questions || []).map((question) => ({ ...question, date: attempt.createdAt }))), [data])
  const windowed = useMemo(() => {
    if (!attempts.length) return { current: [], previous: [] }
    const newest = Math.max(...attempts.map((item) => new Date(item.date).getTime()))
    if (range === 'all') return { current: attempts, previous: [] }
    const duration = Number(range) * DAY
    return { current: attempts.filter((item) => new Date(item.date).getTime() >= newest - duration), previous: attempts.filter((item) => { const time = new Date(item.date).getTime(); return time < newest - duration && time >= newest - (duration * 2) }) }
  }, [attempts, range])
  const answered = (items) => items.filter((item) => item.status === 'correct' || item.status === 'wrong')
  const currentAnswered = answered(windowed.current)
  const previousAnswered = answered(windowed.previous)
  const currentAccuracy = currentAnswered.length ? clamp(currentAnswered.filter((item) => item.status === 'correct').length / currentAnswered.length * 100) : 0
  const previousAccuracy = previousAnswered.length ? clamp(previousAnswered.filter((item) => item.status === 'correct').length / previousAnswered.length * 100) : 0
  const chartPoints = useMemo(() => {
    const days = new Map()
    currentAnswered.forEach((item) => { const key = new Date(item.date).toISOString().slice(0, 10); const value = days.get(key) || { date: item.date, correct: 0, answered: 0 }; value.answered += 1; value.correct += item.status === 'correct' ? 1 : 0; days.set(key, value) })
    return [...days.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((item) => ({ ...item, accuracy: clamp(item.correct / item.answered * 100) }))
  }, [currentAnswered])

  const chapterRows = useMemo(() => (data?.chapters || []).map((chapter) => {
    const items = currentAnswered.filter((item) => item.chapterId === chapter.id || Number(item.chapterNumber) === Number(chapter.number))
    const unique = new Set(items.map((item) => item.questionId).filter(Boolean)).size
    const accuracy = items.length ? clamp(items.filter((item) => item.status === 'correct').length / items.length * 100) : 0
    return { ...chapter, attempted: unique, accuracy, coverage: chapter.availableQuestions ? clamp(unique / chapter.availableQuestions * 100) : 0 }
  }), [data, currentAnswered])
  const weakTopics = useMemo(() => {
    const topics = new Map()
    currentAnswered.forEach((item) => { const key = `${item.chapterId}|${item.topicName}`; const value = topics.get(key) || { chapterId: item.chapterId, topicName: item.topicName, chapterName: item.chapterName, chapterNumber: item.chapterNumber, answered: 0, correct: 0 }; value.answered += 1; value.correct += item.status === 'correct' ? 1 : 0; topics.set(key, value) })
    return [...topics.values()].filter((topic) => topic.topicName && topic.answered >= 3).map((topic) => ({ ...topic, accuracy: clamp(topic.correct / topic.answered * 100) })).filter((topic) => topic.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5)
  }, [currentAnswered])

  if (loading) return <div className="grid min-h-[300px] place-items-center px-5 py-12 text-sm font-semibold text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading academic performance...</div>
  if (error) return <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>
  const change = currentAccuracy - previousAccuracy

  return <div className="bg-slate-50/60 p-3 sm:p-5 lg:p-7">
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Science 2</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Academic Performance</h2></div><p className="text-xs font-medium text-slate-500">Calculated from your answered questions</p></div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1.25fr_.75fr]">
      <Card title="Accuracy Trend" icon={TrendingDown} className="animate-[fadeIn_.4s_ease-out]"><div className="mb-4 flex flex-wrap gap-2">{[['7', '7 days'], ['30', '30 days'], ['all', 'All history']].map(([value, label]) => <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${range === value ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-cyan-50 hover:text-cyan-700'}`}>{label}</button>)}</div><LineChart points={chartPoints} /><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div><p className="text-xl font-black text-slate-900">{currentAnswered.length ? `${currentAccuracy}%` : '—'}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Current</p></div><div><p className="text-xl font-black text-slate-900">{previousAnswered.length ? `${previousAccuracy}%` : '—'}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Previous</p></div><div><p className={`text-xl font-black ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{previousAnswered.length ? `${change > 0 ? '+' : ''}${change} pp` : '—'}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Change</p></div></div></Card>
      <Card title="Chapter Progress" icon={BookOpen}><div className="mb-4 flex rounded-xl bg-slate-100 p-1">{[['coverage', 'Practice Coverage'], ['accuracy', 'Accuracy']].map(([value, label]) => <button key={value} type="button" onClick={() => setChapterMode(value)} className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-black transition ${chapterMode === value ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div><div className="space-y-4">{chapterRows.length ? chapterRows.map((chapter) => { const percentage = chapterMode === 'coverage' ? chapter.coverage : chapter.accuracy; return <button type="button" key={chapter.id} onClick={() => navigate(`/chapters/${chapter.number}/topics`)} className="group block w-full text-left"><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-black text-slate-700">Ch {chapter.number}: {chapter.name}</span><span className="shrink-0 font-black text-cyan-700">{percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500 transition-all duration-700 group-hover:bg-cyan-700" style={{ width: `${percentage}%` }} /></div><p className="mt-1 text-[10px] font-semibold text-slate-400">{chapter.attempted} questions attempted · {chapter.availableQuestions} available</p></button> }) : <p className="py-8 text-center text-sm font-semibold text-slate-400">No chapter data available.</p>}</div></Card>
    </div>
    <Card title="Topics to Improve" icon={Target} className="mt-4"><p className="-mt-3 mb-4 text-xs font-medium text-slate-500">Topics appear after at least three answered attempts.</p>{weakTopics.length ? <div className="grid gap-3 md:grid-cols-2">{weakTopics.map((topic) => { const topicMeta = data.topics.find((item) => item.chapterId === topic.chapterId && item.name === topic.topicName); return <div key={`${topic.chapterId}-${topic.topicName}`} className="flex flex-col justify-between gap-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 sm:flex-row sm:items-center"><div className="min-w-0"><p className="truncate font-black text-slate-800">{topic.topicName}</p><p className="mt-1 text-xs font-semibold text-slate-500">{topic.chapterName || `Chapter ${topic.chapterNumber}`} · {topic.accuracy}% accuracy · {topic.answered} attempts</p></div><button type="button" onClick={() => topicMeta && navigate(`/chapters/${topicMeta.chapterNumber}/topics/${topicMeta.id}/objectives`)} disabled={!topicMeta} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:opacity-50">Practice Again <ArrowRight className="h-3.5 w-3.5" /></button></div> })}</div> : <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">Not enough practice data</div>}</Card>
  </div>
}

export default AcademicPerformanceDashboard
