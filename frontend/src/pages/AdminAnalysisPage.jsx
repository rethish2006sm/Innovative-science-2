import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, BookOpen, Brain, ChevronLeft, Flame, RefreshCw, Search, Shield, Users } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const views = [
  { id: 'online', label: 'Online students', icon: Activity },
  { id: 'brain', label: 'Brain cell count', icon: Brain },
  { id: 'streak', label: 'Daily streak', icon: Flame },
  { id: 'students', label: 'All students', icon: Users },
]

const formatDate = (value) => {
  if (!value) return 'Never'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

const AdminAnalysisPage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const [activeView, setActiveView] = useState('online')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [summary, setSummary] = useState({ totalStudents: 0, onlineStudents: 0, totalBrainCells: 0, totalAttempts: 0, averagePercent: 0 })
  const [search, setSearch] = useState('')
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalysis = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (classId) params.set('classId', classId)
      const data = await apiRequest(`/api/admin/analysis?${params.toString()}`)
      setStudents(Array.isArray(data.students) ? data.students : [])
      setSummary(data.summary || {})
    } catch (err) {
      setError(err.message || 'Could not load analysis.')
    } finally {
      setLoading(false)
    }
  }, [classId, search])

  useEffect(() => {
    if (!isAdmin) return
    apiRequest('/api/admin/classes')
      .then((data) => setClasses(Array.isArray(data.classes) ? data.classes : []))
      .catch(() => setClasses([]))
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const timeout = setTimeout(loadAnalysis, 250)
    return () => clearTimeout(timeout)
  }, [isAdmin, loadAnalysis])

  const visibleStudents = useMemo(() => {
    const rows = [...students]
    if (activeView === 'online') return rows.filter((student) => student.online).sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0))
    if (activeView === 'brain') return rows.sort((a, b) => Number(b.totalBrainCells || 0) - Number(a.totalBrainCells || 0))
    if (activeView === 'streak') return rows.sort((a, b) => Number(b.currentStreak || 0) - Number(a.currentStreak || 0))
    return rows.sort((a, b) => Number(b.averagePercent || 0) - Number(a.averagePercent || 0))
  }, [activeView, students])

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_52%,#ecfeff_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-slate-950">
                <ChevronLeft className="h-4 w-4" /> Back to admin
              </Link>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                <Shield className="h-3.5 w-3.5" /> Admin only
              </div>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">Student analysis</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Monitor activity, brain-cell progress, daily streaks, and individual performance from one private admin page.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/questions" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-100"><BookOpen className="h-4 w-4" /> Question list</Link>
              <button type="button" onClick={loadAnalysis} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="All students" value={summary.totalStudents || 0} />
            <Metric label="Online now" value={summary.onlineStudents || 0} tone="emerald" />
            <Metric label="Brain cells" value={summary.totalBrainCells || 0} tone="violet" />
            <Metric label="Practice attempts" value={summary.totalAttempts || 0} />
            <Metric label="Average performance" value={`${summary.averagePercent || 0}%`} tone="amber" />
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {views.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setActiveView(id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-black transition ${activeView === id ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_260px]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by name or email..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white" />
            </label>
            <select value={classId} onChange={(event) => setClassId(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white">
              <option value="">All classes</option>
              <option value="__no_class__">No class</option>
              {classes.map((item) => <option key={item._id} value={item._id}>{item.name}{item.grade ? ` (${item.grade})` : ''}</option>)}
            </select>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">{views.find((view) => view.id === activeView)?.label}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">{activeView === 'online' ? 'Online means the student logged in within the last 15 minutes.' : 'Select a student row to review the performance figures shown below.'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{visibleStudents.length} shown</span>
            </div>

            {error && <p className="m-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            {loading ? <div className="p-8 text-center text-sm font-semibold text-slate-500">Loading student analysis...</div> : visibleStudents.length ? (
              <div className="grid gap-3 p-3 sm:p-4">
                {visibleStudents.map((student) => <AnalysisRow key={student.id} student={student} view={activeView} />)}
              </div>
            ) : <div className="p-10 text-center text-sm font-semibold text-slate-500">No students match the selected filters.</div>}
          </div>
        </div>
      </div>
    </section>
  )
}

const Metric = ({ label, value, tone = 'sky' }) => {
  const tones = { sky: 'bg-sky-50 text-sky-700', emerald: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700' }
  return <div className={`rounded-3xl p-4 ${tones[tone]}`}><p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>
}

const AnalysisRow = ({ student, view }) => {
  const performance = [
    ['Average', `${Number(student.averagePercent || 0)}%`],
    ['Attempts', Number(student.attemptCount || 0)],
    ['Brain cells', Number(student.totalBrainCells || 0)],
    ['Streak', `${Number(student.currentStreak || 0)} days`],
  ]
  return <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-lg font-black text-slate-950">{student.name}</h3>{student.online && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Online" />}</div><p className="mt-1 truncate text-sm text-slate-500">{student.email || 'No email'} · {student.className || 'No class'}</p><p className="mt-1 text-xs font-semibold text-slate-400">Last login: {formatDate(student.lastLoginAt)}</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">{performance.map(([label, value]) => <div key={label} className={`rounded-2xl p-3 text-center ${view === 'brain' && label === 'Brain cells' ? 'bg-violet-50' : view === 'streak' && label === 'Streak' ? 'bg-orange-50' : 'bg-slate-50'}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>)}</div></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1">Daily challenges: {student.completedDailyChallenges}</span><span className="rounded-full bg-slate-100 px-3 py-1">Longest streak: {student.longestStreak} days</span><span className="rounded-full bg-slate-100 px-3 py-1">Daily correct: {student.dailyCorrect}</span></div></article>
}

export default AdminAnalysisPage
