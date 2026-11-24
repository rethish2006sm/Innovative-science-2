import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Mail, MessageCircleMore, PhoneCall, Send, Sparkles, Star, User } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { getFeedbackClientKey } from '../lib/feedbackClient'

const emptyForm = {
  name: '',
  email: '',
  message: '',
}

const formatFeedbackSourceLabel = (item = {}) => {
  if (item.sourceType === 'topic') {
    return item.sourceLabel ? `Chapter: ${item.sourceLabel}` : 'Chapter feedback'
  }

  if (item.sourceLabel) {
    return item.sourceLabel
  }

  if (item.sourceType === 'test') {
    return 'Test feedback'
  }

  if (item.sourceType === 'objective') {
    return 'Practice feedback'
  }

  return 'General feedback'
}

const Feedbackpage = () => {
  const auth = getStoredAuth()
  const [form, setForm] = useState(emptyForm)
  const [rating, setRating] = useState(5)
  const [featuredFeedback, setFeaturedFeedback] = useState([])
  const [myFeedback, setMyFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [myFeedbackLoading, setMyFeedbackLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: auth?.user?.name || current.name,
      email: auth?.user?.email || current.email,
    }))
  }, [auth?.user?.email, auth?.user?.name])

  useEffect(() => {
    let cancelled = false

    const loadFeatured = async () => {
      setLoading(true)
      try {
        const data = await apiRequest('/api/feedback/featured?limit=6')

        if (!cancelled) {
          setFeaturedFeedback(data.feedback || [])
        }
      } catch (fetchError) {
        if (!cancelled) {
          setFeaturedFeedback([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFeatured()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadMyFeedback = async () => {
      if (!auth?.token) {
        setMyFeedback([])
        return
      }

      setMyFeedbackLoading(true)

      try {
        const data = await apiRequest('/api/feedback/me')

        if (!cancelled) {
          setMyFeedback(data.feedback || [])
        }
      } catch (fetchError) {
        if (!cancelled) {
          setMyFeedback([])
        }
      } finally {
        if (!cancelled) {
          setMyFeedbackLoading(false)
        }
      }
    }

    loadMyFeedback()

    return () => {
      cancelled = true
    }
  }, [auth?.token, success])

  const starButtons = useMemo(() => [1, 2, 3, 4, 5], [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          name: form.name,
          email: form.email,
          message: form.message,
          clientKey: getFeedbackClientKey(),
        }),
      })

      setSuccess('Thanks! Your feedback was sent to admin.')
      setForm({
        name: auth?.user?.name || '',
        email: auth?.user?.email || '',
        message: '',
      })
      setRating(5)
      if (auth?.token) {
        const myData = await apiRequest('/api/feedback/me')
        setMyFeedback(myData.feedback || [])
      }
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteMyFeedback = async (feedbackId) => {
    try {
      await apiRequest(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
      })

      setMyFeedback((current) => current.filter((item) => item.id !== feedbackId))
      setSuccess('Feedback deleted successfully.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#ffffff_50%,#ecfdf5_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Feedback wall
            </div>
            <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">
              Click your stars and tell us what feels right.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Rate the website, leave an optional message, and help us pick the feedback worth celebrating on the home page.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Featured feedback</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Cool voices from students</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Admin can pin the best feedback here and send it to the home page.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Other ways to reach us</p>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                  <a
                    href="https://wa.me/917304930375"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 transition hover:bg-emerald-50"
                  >
                    <MessageCircleMore className="h-4 w-4 text-emerald-600" />
                    WhatsApp support
                  </a>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 transition hover:bg-emerald-50"
                  >
                    <PhoneCall className="h-4 w-4 text-emerald-600" />
                    Contact page
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Rated by you</p>
                  <h2 className="mt-2 font-serif text-3xl text-slate-950">Leave a quick rating</h2>
                </div>
                {auth?.user?.name && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <User className="h-4 w-4 text-emerald-600" />
                    Posting as {auth.user.name}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-5">
                  <div>
                    <p className="text-sm font-bold text-slate-600">Tap a star</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {starButtons.map((value) => {
                        const active = value <= rating

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                              active
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                            aria-label={`${value} star rating`}
                          >
                            <Star className={`h-4 w-4 ${active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                            {value}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold text-slate-600">
                      Name
                      <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Your name"
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-slate-600">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="Optional email"
                        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-bold text-slate-600">
                    Your message, if you want
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                      placeholder="Tell us what you liked, what felt confusing, or what should be improved."
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  {error && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="mr-2 inline-block h-4 w-4" />
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Sending...' : 'Send feedback'}
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">My feedback</p>
                  <h2 className="mt-2 font-serif text-2xl text-slate-950">Delete what you posted</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Every saved entry below can be removed from your account.
                  </p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {myFeedback.length}
                </span>
                </div>

                {myFeedbackLoading ? (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                    Loading your feedback...
                  </div>
                ) : auth?.token ? (
                  <div className="mt-5 grid gap-3">
                    {myFeedback.length ? myFeedback.map((item) => (
                      <article key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                              {formatFeedbackSourceLabel(item)}
                            </p>
                            <div className="mt-2 flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={`${item.id}-star-${index}`}
                                  className={`h-4 w-4 ${index < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteMyFeedback(item.id)}
                            className="rounded-2xl border border-red-100 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-slate-500">
                          {item.sourceType === 'topic'
                            ? 'Topic feedback'
                            : item.sourceType === 'test'
                              ? 'Test feedback'
                              : item.sourceType === 'objective'
                                ? 'Practice feedback'
                                : 'General feedback'}
                        </p>
                      </article>
                    )) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                        No feedback submitted yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                    Sign in to view and delete your own feedback entries.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-2">
                <MessageCircleMore className="h-5 w-5 text-emerald-700" />
                <h2 className="font-serif text-3xl text-slate-950">Featured wall</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These are the feedback messages the admin has chosen to highlight on the home page.
              </p>

              {loading ? (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Loading featured feedback...
                </div>
              ) : featuredFeedback.length ? (
                <div className="mt-5 grid gap-3">
                  {featuredFeedback.map((item) => (
                    <article key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                            {item.name} {item.className ? `• ${item.className}` : ''}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            {formatFeedbackSourceLabel(item)}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-amber-400">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={`${item.id}-star-${index}`}
                                className={`h-4 w-4 ${index < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Featured
                        </span>
                      </div>
                      {item.message ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {item.message}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                          No written message, only stars.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  No featured feedback yet. Be the first to leave one.
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-6 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Other options</p>
              <h3 className="mt-2 font-serif text-2xl text-slate-950">Feedback, support, or a quick hello</h3>
              <div className="mt-4 grid gap-3">
                <a
                  href="https://wa.me/917304930375?text=Hello%20Sir%2C%20I%20want%20to%20share%20feedback%20about%20Innovative%20Science%202."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50"
                >
                  <MessageCircleMore className="h-4 w-4 text-emerald-600" />
                  WhatsApp feedback
                </a>
                <a
                  href="mailto:innovativesci2@gmail.com"
                  className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50"
                >
                  <Mail className="h-4 w-4 text-emerald-600" />
                  Email us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Feedbackpage
