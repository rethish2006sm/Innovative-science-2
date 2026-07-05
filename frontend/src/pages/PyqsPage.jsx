import { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, Loader2, Shield, Trash2, UploadCloud } from 'lucide-react'
import { apiRequest } from '../api'
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
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [pyqs, setPyqs] = useState([])
  const [selectedPyqId, setSelectedPyqId] = useState('')
  const [uploadForm, setUploadForm] = useState(initialUploadForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedPyq = pyqs.find((item) => item.id === selectedPyqId) || pyqs[0] || null

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

  const handleUploadChange = (field, value) => {
    setUploadForm((current) => ({ ...current, [field]: value }))
  }

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
      setSelectedPyqId(data.pyq?.id || nextPyqs[0]?.id || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const openPyqLink = (pyq) => {
    const url = pyq.linkUrl || pyq.pdfUrl || ''

    if (!url) {
      setError('This PYQ does not have a link yet.')
      return
    }

    setError('')
    setSelectedPyqId(pyq.id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

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
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#ecfeff_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                <BookOpen className="h-3.5 w-3.5" />
                PYQs
              </div>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {FIXED_TITLE}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Students only see the available papers list. When a paper is clicked, the saved link opens in a new tab.
              </p>
            </div>
          </div>

          {auth?.user?.isAdmin && (
            <form
              onSubmit={handleUpload}
              className="mt-8 rounded-[1.75rem] border border-cyan-100 bg-cyan-50/40 p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-cyan-700" />
                <h2 className="text-2xl font-black text-slate-950">Save a new PYQ link</h2>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
                <Field label="Month" asSelect value={uploadForm.month} onChange={(value) => handleUploadChange('month', value)}>
                  <option value="">Select month</option>
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Field>
                <Field
                  label="Year"
                  value={uploadForm.year}
                  onChange={(value) => handleUploadChange('year', value)}
                  placeholder="Enter year"
                />
                <Field
                  label="PDF link"
                  value={uploadForm.link}
                  onChange={(value) => handleUploadChange('link', value)}
                  placeholder="Paste the PDF or Drive link"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                The link can be a hosted PDF, Google Drive file, or any page students should open.
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
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {isUploading ? 'Saving...' : 'Save link'}
              </button>
            </form>
          )}

          <div className="mt-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-600" />
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
                    const paperUrl = pyq.linkUrl || pyq.pdfUrl || ''

                    return (
                      <article key={pyq.id} className="relative">
                        <button
                          type="button"
                          onClick={() => openPyqLink(pyq)}
                          className={`w-full rounded-2xl border px-4 py-3 pr-12 text-left transition ${
                            isActive
                              ? 'border-cyan-300 bg-cyan-50 text-cyan-950 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-black">{pyq.title}</div>
                          <div className="mt-1 text-xs font-medium text-slate-500">
                            {[pyq.subject, pyq.month, pyq.year].filter(Boolean).join(' - ') || 'Link paper'}
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">
                            Open link
                            <ExternalLink className="h-3 w-3" />
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

                        {!paperUrl && (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            No link saved yet.
                          </p>
                        )}
                      </article>
                    )
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                    No PYQs saved yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const Field = ({ label, value, onChange, placeholder, asSelect = false, children }) => (
  <label className="grid gap-2 text-sm font-bold text-slate-600">
    {label}
    {asSelect ? (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
      >
        {children}
      </select>
    ) : (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
      />
    )}
  </label>
)

export default PyqsPage
