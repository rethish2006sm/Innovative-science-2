import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, FileUp, Filter, Loader2, Trash2, UploadCloud, X } from 'lucide-react'
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
  pdf: null,
}

const PyqsPage = () => {
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [pyqs, setPyqs] = useState([])
  const [selectedPyqId, setSelectedPyqId] = useState('')
  const [uploadForm, setUploadForm] = useState(initialUploadForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileViewerOpen, setIsMobileViewerOpen] = useState(false)
  const [isMobilePdfLoading, setIsMobilePdfLoading] = useState(false)
  const [pdfObjectUrl, setPdfObjectUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [isSignInPopupOpen, setIsSignInPopupOpen] = useState(false)
  const mobilePdfWindowRef = useRef(null)
  const selectedPyq = pyqs.find((item) => item.id === selectedPyqId) || pyqs[0] || null

  const closeMobilePdfWindow = () => {
    if (mobilePdfWindowRef.current && !mobilePdfWindowRef.current.closed) {
      mobilePdfWindowRef.current.close()
    }

    mobilePdfWindowRef.current = null
  }

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth())
    const syncViewport = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches)

    syncAuth()
    syncViewport()

    window.addEventListener(authEvents.changed, syncAuth)
    window.addEventListener('storage', syncAuth)
    window.addEventListener('resize', syncViewport)

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth)
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('resize', syncViewport)
    }
  }, [])

  useEffect(() => () => closeMobilePdfWindow(), [])

  useEffect(() => {
    const loadPyqs = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await apiRequest('/api/pyqs')
        const nextPyqs = data.pyqs || []
        setPyqs(nextPyqs)
        setSelectedPyqId((current) => current || nextPyqs[0]?.id || '')
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPyqs()
  }, [])

  useEffect(() => {
    setPdfObjectUrl('')
    setPdfLoading(false)
    setIsMobileViewerOpen(false)
    setIsMobilePdfLoading(false)
  }, [selectedPyqId])

  const handleUploadChange = (field, value) => {
    setUploadForm((current) => ({ ...current, [field]: value }))
  }

  const buildProtectedPdfUrl = (pdfUrl) => {
    const baseUrl = assetUrl(pdfUrl)

    if (!baseUrl) {
      return ''
    }

    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}token=${encodeURIComponent(auth?.token || '')}`
  }

  const openPyq = (pyq) => {
    if (!auth?.token) {
      setPdfObjectUrl('')
      setIsMobileViewerOpen(false)
      setIsSignInPopupOpen(true)
      return
    }

    setSelectedPyqId(pyq.id)
    setIsSignInPopupOpen(false)

    const pdfUrl = buildProtectedPdfUrl(pyq.pdfUrl)

    if (!pdfUrl) {
      setError('Could not open this PDF.')
      return
    }

    const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer')

    if (!newWindow) {
      window.location.assign(pdfUrl)
    }
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('month', uploadForm.month)
      formData.append('year', uploadForm.year)
      formData.append('subject', FIXED_SUBJECT)
      formData.append('pdf', uploadForm.pdf)

      const data = await apiRequest('/api/admin/pyqs', {
        method: 'POST',
        body: formData,
      })

      setMessage(data.message || 'PYQ uploaded successfully.')
      setUploadForm(initialUploadForm)

      const refreshed = await apiRequest('/api/pyqs')
      const nextPyqs = refreshed.pyqs || []
      setPyqs(nextPyqs)
      setSelectedPyqId(data.pyq?.id || nextPyqs[0]?.id || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const selectedMeta = [selectedPyq?.month, selectedPyq?.year].filter(Boolean).join(' - ')

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
      setIsMobileViewerOpen(false)
      setIsMobilePdfLoading(false)
      setPdfObjectUrl('')
      closeMobilePdfWindow()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#ecfeff_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 md:hidden">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">PYQs</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{FIXED_TITLE}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tap a paper to open it full screen.
            </p>
          </div>

          <div className="hidden flex-col gap-5 md:flex lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                <BookOpen className="h-3.5 w-3.5" />
                PYQs
              </div>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {FIXED_TITLE}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Tap a paper to open it inside the website. On mobile, the PDF takes over the full screen so students can read it directly.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <Metric label="Papers" value={pyqs.length} />
              <Metric label="Mode" value={isMobile ? 'Mobile' : 'Desktop'} />
              <Metric label="Title" value="Fixed" />
            </div>
          </div>

          {auth?.user?.isAdmin && (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleUpload}
              className="mt-8 hidden rounded-[1.75rem] border border-cyan-100 bg-cyan-50/40 p-5 shadow-sm md:block sm:p-6"
            >
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-cyan-700" />
                <h2 className="text-2xl font-black text-slate-950">Upload a new PYQ PDF</h2>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
                <div className="grid gap-2 text-sm font-bold text-slate-600">
                  Title
                  <div className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900">
                    {FIXED_TITLE}
                  </div>
                </div>
                <SelectField
                  label="Month"
                  value={uploadForm.month}
                  onChange={(value) => handleUploadChange('month', value)}
                  options={MONTH_OPTIONS}
                  placeholder="Select month"
                />
                <SelectField
                  label="Year"
                  value={uploadForm.year}
                  onChange={(value) => handleUploadChange('year', value)}
                  asInput
                  placeholder="Enter year"
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="grid gap-2 text-sm font-bold text-slate-600">
                  Subject
                  <div className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900">
                    {FIXED_SUBJECT}
                  </div>
                </div>
                <label className="grid gap-2 text-sm font-bold text-slate-600">
                  PDF file
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(event) => handleUploadChange('pdf', event.target.files?.[0] || null)}
                    className="rounded-2xl border border-dashed border-cyan-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                  />
                </label>
              </div>

              {message && (
                <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {message}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {isUploading ? 'Uploading...' : 'Upload PDF'}
              </button>
            </motion.form>
          )}

          <div className="mt-2 grid gap-5 lg:mt-6 lg:grid-cols-[320px_1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-slate-600" />
                <h2 className="text-2xl font-black text-slate-950">Available papers</h2>
              </div>

              <div className="mt-4 grid gap-3">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                    Loading PYQs...
                  </div>
                ) : pyqs.length ? (
                  pyqs.map((pyq) => {
                    const isActive = pyq.id === selectedPyq?.id

                    return (
                      <div key={pyq.id} className="relative">
                        <button
                          type="button"
                          onClick={() => openPyq(pyq)}
                          className={`w-full rounded-2xl border px-4 py-3 pr-12 text-left transition ${
                            isActive
                              ? 'border-cyan-300 bg-cyan-50 text-cyan-950 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-black">{pyq.title}</div>
                          <div className="mt-1 text-xs font-medium text-slate-500">
                            {[pyq.subject, pyq.month, pyq.year].filter(Boolean).join(' - ') || 'PDF paper'}
                          </div>
                        </button>

                        {auth?.user?.isAdmin && (
                          <button
                            type="button"
                            onClick={() => deletePyq(pyq)}
                            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                            aria-label={`Delete ${pyq.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                    No PYQs uploaded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm lg:block sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Reader</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {selectedPyq?.title || FIXED_TITLE}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {selectedMeta || 'Select a paper to view it inline.'}
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                {pdfObjectUrl ? (
                  <iframe
                    key={selectedPyq.id}
                    title={selectedPyq.title}
                    src={pdfObjectUrl}
                    className="h-[75vh] w-full bg-white"
                  />
                ) : pdfLoading ? (
                  <div className="grid h-[75vh] place-items-center bg-slate-50 px-6 text-center text-slate-500">
                    <div>
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-600" />
                      <p className="mt-3 text-sm font-medium">Opening PDF...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-[75vh] place-items-center bg-slate-50 px-6 text-center text-slate-500">
                    <div>
                      <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm font-medium">Sign in to open a paper.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobile && isMobileViewerOpen && (pdfObjectUrl || pdfLoading) && (
        <div className="fixed inset-0 z-[220] bg-slate-950">
          <div className="flex h-[100dvh] flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">PDF open</p>
                <h2 className="truncate text-base font-black">{selectedPyq.title}</h2>
                <p className="truncate text-xs text-slate-300">
                  {[selectedPyq.subject, selectedPyq.month, selectedPyq.year].filter(Boolean).join(' - ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileViewerOpen(false)
                  setIsMobilePdfLoading(false)
                  closeMobilePdfWindow()
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white"
                aria-label="Close PDF"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid flex-1 place-items-center px-4 text-center">
              {isMobilePdfLoading ? (
                <div className="flex flex-col items-center gap-3 text-white">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="rounded-full border-4 border-white/20 border-t-cyan-300 p-3"
                  >
                    <Loader2 className="h-6 w-6 text-cyan-300" />
                  </motion.div>
                  <p className="text-sm font-semibold text-slate-200">Opening PDF...</p>
                  <p className="max-w-sm text-xs leading-6 text-slate-400">
                    Your PDF is opening in a new tab for better mobile support.
                  </p>
                </div>
              ) : pdfObjectUrl ? (
                <div className="flex max-w-sm flex-col items-center gap-4 text-white">
                  <BookOpen className="h-10 w-10 text-cyan-300" />
                  <p className="text-sm font-semibold text-slate-200">
                    If the PDF did not open automatically, tap the button below.
                  </p>
                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        const win = window.open(pdfObjectUrl, '_blank')
                        if (win) {
                          win.focus()
                        }
                      }}
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-cyan-400 px-5 font-bold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Open PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileViewerOpen(false)
                        closeMobilePdfWindow()
                      }}
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 font-bold text-white transition hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {isSignInPopupOpen && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Sign in required</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Please sign in first</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  You need to log in before opening this PYQ PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSignInPopupOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close sign in popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signin"
                className="inline-flex h-20  flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-black"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => setIsSignInPopupOpen(false)}
                className="inline-flex h-12 py-2 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

const Metric = ({ label, value }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
  </div>
)

const SelectField = ({ label, value, onChange, options = [], placeholder, asInput = false }) => (
  <label className="grid gap-2 text-sm font-bold text-slate-600">
    {label}
    {asInput ? (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
      />
    ) : (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
      >
        <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )}
  </label>
)

export default PyqsPage
