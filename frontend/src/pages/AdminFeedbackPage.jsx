import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, Filter, Search, Shield, Star, Trash2 } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const emptyFilters = {
  student: '',
  rating: '',
  featured: '',
  classId: '',
  sourceType: '',
  objective: '',
  status: '',
  sort: 'newest',
}

const sourceLabels = {
  general: 'General',
  objective: 'Objective practice',
  test: 'Test',
  topic: 'Chapter / topic',
}

const formatSource = (item) => item.sourceLabel || sourceLabels[item.sourceType] || 'General'

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()
}

const AdminFeedbackPage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const [filters, setFilters] = useState(emptyFilters)
  const [classes, setClasses] = useState([])
  const [feedback, setFeedback] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  const [summary, setSummary] = useState({ featured: 0, visible: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFeedback = async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '24' })
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      const data = await apiRequest(`/api/admin/feedback?${params.toString()}`)
      setFeedback(Array.isArray(data.feedback) ? data.feedback : [])
      setPagination(data.pagination || { page, total: 0, totalPages: 0 })
      setSummary({
        featured: data.summary?.featured ?? 0,
        visible: data.pagination?.total ?? 0,
      })
    } catch (loadError) {
      setError(loadError.message || 'Could not load feedback.')
      setFeedback([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    apiRequest('/api/admin/classes')
      .then((data) => setClasses(Array.isArray(data.classes) ? data.classes : []))
      .catch(() => setClasses([]))
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const timer = window.setTimeout(() => loadFeedback(1), 250)
    return () => window.clearTimeout(timer)
  }, [isAdmin, filters])

  const updateFeedback = async (item, patch) => {
    try {
      const data = await apiRequest(`/api/admin/feedback/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setFeedback((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...data.feedback } : entry))
    } catch (updateError) {
      setError(updateError.message || 'Could not update feedback.')
    }
  }

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback?')) return
    try {
      await apiRequest(`/api/admin/feedback/${id}`, { method: 'DELETE' })
      setFeedback((current) => current.filter((item) => item.id !== id))
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }))
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete feedback.')
    }
  }

  const resetFilters = () => setFilters(emptyFilters)
  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([key, value]) => key !== 'sort' && value).length, [filters])

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#fffbeb_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <Link to="/admin/students" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-950"><ChevronLeft className="h-4 w-4" /> Back to admin</Link>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700"><Shield className="h-3.5 w-3.5" /> Admin feedback</div>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">Feedback library</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Review every student response, find patterns by rating and class, and choose which feedback appears on the homepage.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
              <Stat label="Matching feedback" value={summary.visible} />
              <Stat label="On homepage" value={summary.featured} />
            </div>
          </div>

          <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-black text-slate-800"><Filter className="h-4 w-4" /> Filters{activeFilterCount ? ` · ${activeFilterCount} active` : ''}</div><button type="button" onClick={resetFilters} className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 hover:text-slate-950">Reset</button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={filters.student} onChange={(event) => setFilters((current) => ({ ...current, student: event.target.value }))} placeholder="Search student name, email, or class" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-amber-400" /></label>
              <Select label="Stars" value={filters.rating} onChange={(value) => setFilters((current) => ({ ...current, rating: value }))} options={[['', 'All ratings'], ['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']]} />
              <Select label="Homepage" value={filters.featured} onChange={(value) => setFilters((current) => ({ ...current, featured: value }))} options={[['', 'All visibility'], ['true', 'Featured'], ['false', 'Not featured']]} />
              <Select label="Class" value={filters.classId} onChange={(value) => setFilters((current) => ({ ...current, classId: value }))} options={[['', 'All classes'], ...classes.map((item) => [item._id, item.name])]} />
              <Select label="Source" value={filters.sourceType} onChange={(value) => setFilters((current) => ({ ...current, sourceType: value }))} options={[['', 'All sources'], ...Object.entries(sourceLabels)]} />
              <input value={filters.objective} onChange={(event) => setFilters((current) => ({ ...current, objective: event.target.value }))} placeholder="Objective / topic filter" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400" />
              <Select label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={[['', 'All statuses'], ['new', 'New'], ['reviewed', 'Reviewed']]} />
              <Select label="Sort" value={filters.sort} onChange={(value) => setFilters((current) => ({ ...current, sort: value }))} options={[['newest', 'Newest first'], ['oldest', 'Oldest first'], ['rating', 'Highest rating']]} />
            </div>
          </div>

          {error && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          {loading ? <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">Loading feedback...</div> : feedback.length ? <div className="mt-6 grid gap-4 lg:grid-cols-2">{feedback.map((item) => <FeedbackCard key={item.id} item={item} onFeature={() => updateFeedback(item, { featured: !item.featured })} onReview={() => updateFeedback(item, { status: 'reviewed' })} onDelete={() => deleteFeedback(item.id)} />)}</div> : <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">No feedback matches these filters.</div>}

          {pagination.totalPages > 1 && <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="text-xs font-bold text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1 || loading} onClick={() => loadFeedback(pagination.page - 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40">Previous</button><button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => loadFeedback(pagination.page + 1)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Next</button></div></div>}
        </div>
      </div>
    </section>
  )
}

const Select = ({ label, value, onChange, options }) => <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-amber-400">{options.map(([optionValue, optionLabel]) => <option key={optionValue || 'all'} value={optionValue}>{optionLabel}</option>)}</select></label>

const Stat = ({ label, value }) => <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{label}</p><p className="mt-1 text-2xl font-black text-amber-950">{value}</p></div>

const FeedbackCard = ({ item, onFeature, onReview, onDelete }) => <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-lg font-black text-slate-950">{item.name || 'Guest'}</h2><p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.email || 'No email'} · {item.className || 'No class'}</p><div className="mt-3 flex items-center gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}<span className="ml-2 text-xs font-black text-slate-600">{item.rating}/5</span></div></div><span className="shrink-0 text-right text-[10px] font-bold text-slate-400">{formatDate(item.createdAt)}</span></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{formatSource(item)}</span><span className={`rounded-full px-2.5 py-1 ${item.featured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.featured ? 'Featured on home' : 'Not featured'}</span><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-700">{item.status || 'new'}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.message || 'No text message was added.'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onFeature} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">{item.featured ? 'Remove from home' : 'Feature on home'}</button>{item.status !== 'reviewed' && <button type="button" onClick={onReview} className="inline-flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700"><CheckCircle2 className="h-3.5 w-3.5" /> Mark reviewed</button>}<button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div></article>

export default AdminFeedbackPage
