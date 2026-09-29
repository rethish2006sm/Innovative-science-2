import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  CalendarDays,
  Link2,
  Sparkles,
} from 'lucide-react'
import { apiRequest, assetUrl } from '../api'
import { authEvents, getStoredAuth } from '../authStorage'

const FIXED_TITLE = 'Class 10 Science 2'
const FIXED_SUBJECT = 'Science 2'

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const initialUploadForm = {
  month: '',
  year: '',
  link: '',
}

const PyqsPage = () => {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [pyqs, setPyqs] = useState([])
  const [selectedPyqId, setSelectedPyqId] = useState('')
  const [uploadForm, setUploadForm] = useState(initialUploadForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  const selectedPyq =
    pyqs.find((item) => item.id === selectedPyqId) || pyqs[0] || null

  const papersForMonth = selectedMonth
    ? pyqs.filter((item) => String(item.month || '').trim() === selectedMonth)
    : pyqs
  const papersForYear = selectedYear
    ? pyqs.filter((item) => String(item.year || '').trim() === selectedYear)
    : pyqs
  const availableYears = [...new Set(papersForMonth.map((item) => String(item.year || '').trim()).filter(Boolean))]
    .sort((left, right) => Number(right) - Number(left))
  const availableMonths = MONTH_OPTIONS.filter((month) => papersForYear.some((item) => String(item.month || '').trim() === month))
  const filteredPyqs = pyqs.filter((pyq) => {
    const matchesYear = !selectedYear || String(pyq.year || '') === selectedYear
    const matchesMonth = !selectedMonth || String(pyq.month || '') === selectedMonth

    return matchesYear && matchesMonth
  })

  /* ---------------- AUTH SYNC ---------------- */

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth())

    syncAuth()

    window.addEventListener(authEvents.changed, syncAuth)
    window.addEventListener('storage', syncAuth)

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  /* ---------------- LOAD PYQS ---------------- */

  useEffect(() => {
    const loadPyqs = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await apiRequest('/api/pyqs')
        const nextPyqs = data.pyqs || []

        setPyqs(nextPyqs)
        setSelectedPyqId(
          (current) => current || nextPyqs[0]?.id || ''
        )
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPyqs()
  }, [auth?.token])

  /* ---------------- FORM ---------------- */

  const handleUploadChange = (field, value) => {
    setUploadForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  /* ---------------- UPLOAD ---------------- */

  const handleUpload = async (event) => {
    event.preventDefault()

    setMessage('')
    setError('')
    setIsUploading(true)

    try {
      const data = await apiRequest('/api/admin/pyqs', {
        method: 'POST',
        body: JSON.stringify({
          month: uploadForm.month,
          year: uploadForm.year,
          link: uploadForm.link,
        }),
      })

      setMessage(data.message || 'PYQ link saved successfully.')
      setUploadForm(initialUploadForm)

      const refreshed = await apiRequest('/api/pyqs')
      const nextPyqs = refreshed.pyqs || []

      setPyqs(nextPyqs)
      setSelectedPyqId(
        data.pyq?.id || nextPyqs[0]?.id || ''
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  /* ---------------- URL ---------------- */

  const buildPyqUrl = (pyq) => {
    if (!auth?.token || !auth?.user) {
      return null
    }

    const rawUrl = pyq.linkUrl || pyq.pdfUrl || ''

    if (!rawUrl) {
      return ''
    }

    const resolvedUrl = assetUrl(rawUrl)
    const url = new URL(resolvedUrl)

    url.searchParams.set('token', auth.token)

    return url.toString()
  }

  /* ---------------- OPEN PYQ ---------------- */

  const openPyqLink = (pyq) => {
    const url = buildPyqUrl(pyq)

    if (url === null) {
      navigate('/signin')
      return
    }

    if (!url) {
      setError('This PYQ does not have a link yet.')
      return
    }

    setError('')
    setSelectedPyqId(pyq.id)

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )
  }

  /* ---------------- DELETE ---------------- */

  const deletePyq = async (pyq) => {
    if (!window.confirm(`Delete "${pyq.title}"?`)) {
      return
    }

    try {
      await apiRequest(`/api/admin/pyqs/${pyq.id}`, {
        method: 'DELETE',
      })

      const refreshed = await apiRequest('/api/pyqs')
      const nextPyqs = refreshed.pyqs || []

      setPyqs(nextPyqs)

      setSelectedPyqId((current) => {
        if (current === pyq.id) {
          return nextPyqs[0]?.id || ''
        }

        return current || nextPyqs[0]?.id || ''
      })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="min-h-screen bg-[#f7f9fc] px-3 py-4 sm:px-6 sm:py-7 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            MAIN CONTAINER
        ===================================================== */}

        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.07)]">

          {/* =====================================================
              HERO
          ===================================================== */}

          <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-8 sm:pb-10 sm:pt-9 lg:px-11 lg:pt-11">

            {/* Decorative background */}
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-sky-100/40 blur-3xl" />

            <div className="relative">

              {/* Label */}
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
                <BookOpen className="h-3.5 w-3.5" />
                Previous Year Questions
              </div>

              {/* Title */}
              <div className="mt-3 max-w-4xl">
                <h1 className="font-serif text-4xl font-medium leading-[1.05] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-[4.5rem]">
                  {FIXED_TITLE}
                </h1>

              </div>

              {/* Small stats */}
              <div className="mt-4 flex flex-nowrap gap-2 sm:gap-3">
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm sm:gap-2 sm:px-4 sm:text-xs">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  {pyqs.length} {pyqs.length === 1 ? 'Paper' : 'Papers'} Available
                </div>

                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm sm:gap-2 sm:px-4 sm:text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Student Access
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              ADMIN UPLOAD
          ===================================================== */}

          {auth?.user?.isAdmin && (
            <div className="border-y border-slate-100 bg-slate-50/70 px-4 py-6 sm:px-8 sm:py-8 lg:px-11">

              <form
                onSubmit={handleUpload}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7"
              >

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                      <UploadCloud className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                        Add a new PYQ
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                        Save a question paper link for students.
                      </p>
                    </div>
                  </div>

                  <div className="hidden rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:block">
                    Admin only
                  </div>
                </div>

                {/* Fields */}
                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">

                  <Field
                    label="Month"
                    asSelect
                    value={uploadForm.month}
                    onChange={(value) =>
                      handleUploadChange('month', value)
                    }
                  >
                    <option value="">Select month</option>

                    {MONTH_OPTIONS.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ))}
                  </Field>

                  <Field
                    label="Year"
                    value={uploadForm.year}
                    onChange={(value) =>
                      handleUploadChange('year', value)
                    }
                    placeholder="2026"
                  />

                  <Field
                    label="PDF / Drive link"
                    value={uploadForm.link}
                    onChange={(value) =>
                      handleUploadChange('link', value)
                    }
                    placeholder="Paste the PDF or Google Drive link"
                  />
                </div>

                {/* Info */}
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3.5">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />

                  <p className="text-xs leading-5 text-cyan-900 sm:text-sm">
                    The link can be a hosted PDF, Google Drive file,
                    or any page students should open.
                  </p>
                </div>

                {/* Messages */}
                {message && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {message}
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}

                  {isUploading
                    ? 'Saving...'
                    : 'Save PYQ link'}
                </button>
              </form>
            </div>
          )}

          {/* =====================================================
              AVAILABLE PAPERS
          ===================================================== */}

          <div className="px-4 py-3 sm:px-8 sm:py-8 lg:px-11 lg:py-10">

            {!isLoading && pyqs.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[11rem_12.5rem] sm:justify-end">
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  aria-label="Filter by year"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 sm:h-14 sm:px-5"
                >
                  <option value="">All years</option>
                  {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>

                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  aria-label="Filter by month"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 sm:h-14 sm:px-5"
                >
                  <option value="">All months</option>
                  {availableMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                </select>
              </div>
            )}

            {/* =====================================================
                PAPERS LIST
            ===================================================== */}

            <div className="mt-0 sm:mt-6">

              {isLoading ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-600">
                    Loading PYQs...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Please wait a moment
                  </p>
                </div>
              ) : filteredPyqs.length ? (
                <div className="grid gap-3 sm:gap-4">

                  {filteredPyqs.map((pyq) => {
                    const isActive =
                      pyq.id === selectedPyq?.id

                    return (
                      <article
                        key={pyq.id}
                        className={`group relative cursor-pointer overflow-hidden rounded-[1.5rem] border transition-all duration-300 ${
                          isActive
                            ? 'border-cyan-200 bg-cyan-50/60 shadow-[0_10px_30px_rgba(6,182,212,0.08)] hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_14px_35px_rgba(6,182,212,0.14)]'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_35px_rgba(15,23,42,0.07)]'
                        }`}
                      >

                        <button
                          type="button"
                          onClick={() => openPyqLink(pyq)}
                          className="w-full cursor-pointer p-4 text-left sm:p-5"
                        >
                          <div className="flex items-start gap-4">

                            {/* PDF document marker */}
                            <div
                              className={`grid h-14 w-14 shrink-0 place-items-center gap-0.5 rounded-2xl border ${
                                isActive
                                  ? 'border-rose-100 bg-white text-rose-600'
                                  : 'border-rose-100 bg-rose-50 text-rose-500 group-hover:bg-white'
                              }`}
                            >
                              <FileText className="h-6 w-6" />
                              <span className="text-[8px] font-black uppercase tracking-widest">PDF</span>
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3
                                      className={`text-sm font-black sm:text-base ${
                                        isActive
                                          ? 'text-cyan-950'
                                          : 'text-slate-900'
                                      }`}
                                    >
                                      {pyq.title}
                                    </h3>
                                    <span className="hidden rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-rose-600 sm:inline-flex">
                                      PDF paper
                                    </span>
                                  </div>

                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                                    {pyq.subject && (
                                      <span>
                                        {pyq.subject}
                                      </span>
                                    )}

                                    {pyq.month && (
                                      <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {pyq.month}
                                      </span>
                                    )}

                                    {pyq.year && (
                                      <span>
                                        {pyq.year}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Open badge */}
                                <div
                                  className="inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-xl border border-slate-900 bg-slate-900 px-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-sm transition hover:-translate-y-0.5 hover:border-black hover:bg-black"
                                >
                                  {auth?.token
                                    ? 'Open paper'
                                    : 'Sign in'}

                                  <ExternalLink className="h-3 w-3" />
                                </div>
                              </div>

                              {/* Bottom hint */}
                              <div className="mt-3 flex items-center justify-end sm:mt-4 sm:justify-between">

                                <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                                  PDF document · Opens in a new tab
                                </span>

                                <span
                                  className={`text-xs font-bold transition ${
                                    isActive
                                      ? 'text-cyan-700'
                                      : 'text-slate-400 group-hover:text-cyan-700'
                                  }`}
                                >
                                  View paper →
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Delete */}
                        {auth?.user?.isAdmin && (
                          <button
                            type="button"
                            onClick={() => deletePyq(pyq)}
                            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-400 opacity-100 shadow-sm transition hover:bg-red-50 hover:text-red-600 sm:right-4 sm:top-4"
                            aria-label={`Delete ${pyq.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 text-center">

                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>

                  <h3 className="mt-4 text-sm font-black text-slate-700">
                    {pyqs.length ? 'No matching PYQs' : 'No PYQs available yet'}
                  </h3>

                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                    {pyqs.length
                      ? 'Try a different search or filter.'
                      : 'Previous year question papers will appear here once they are added.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom subtle branding */}
        <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
          <Sparkles className="h-3 w-3" />
          Science 2 • PYQs
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   REUSABLE FIELD
============================================================ */

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  asSelect = false,
  children,
}) => (
  <label className="grid gap-2 text-xs font-bold text-slate-600">

    <span className="flex items-center gap-1.5">
      {label}
    </span>

    {asSelect ? (
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
      >
        {children}
      </select>
    ) : (
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={
          placeholder ||
          `Enter ${label.toLowerCase()}`
        }
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
      />
    )}
  </label>
)

export default PyqsPage
