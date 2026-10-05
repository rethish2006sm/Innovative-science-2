import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Edit3, Plus, Star, Trash2, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { getFeedbackClientKey } from '../lib/feedbackClient'
import { sendCurrentDevicePush } from '../lib/webPush'

const emptyForm = { name: '', description: '', studyText: '' }

const normalizeChapter = (chapter = {}) => ({
  ...(chapter || {}),
  sourceName: chapter.name || '',
  name: chapter.name || '',
})

const normalizeTopic = (topic = {}) => ({
  ...(topic || {}),
  sourceName: topic.name || '',
  sourceDescription: topic.description || '',
  sourceStudyText: topic.studyText || '',
  name: topic.name || '',
  description: topic.description || '',
  studyText: topic.studyText || '',
})

const Topicspage = () => {
  const { chapterNumber } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const boardOnly = searchParams.get('boardOnly') === '1' || searchParams.get('boardOnly') === 'true'
  const [chapter, setChapter] = useState(null)
  const [topics, setTopics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [topicFeedbackSummary, setTopicFeedbackSummary] = useState({ averageRating: 0, ratingCount: 0, userRating: 0, userFeedback: null })
  const [topicFeedbackSubmitting, setTopicFeedbackSubmitting] = useState(false)
  const [ratingPulse, setRatingPulse] = useState(0)
  const [feedbackClientKey] = useState(() => getFeedbackClientKey())
  const [hoverRating, setHoverRating] = useState(0)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [selectedFeedbackRating, setSelectedFeedbackRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSuccessNotice, setFeedbackSuccessNotice] = useState(false)
  const [feedbackSuccessLeaving, setFeedbackSuccessLeaving] = useState(false)
  const feedbackToastTimerRef = useRef(null)
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)

  useEffect(() => () => window.clearTimeout(feedbackToastTimerRef.current), [])

  const loadTopics = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/api/chapters/${chapterNumber}/topics`, { cache: 'no-store' })
      const nextTopics = Array.isArray(data.topics) ? data.topics : []
      const nextChapter = normalizeChapter(data.chapter || {})
      const normalizedTopics = nextTopics.map(normalizeTopic)

      setChapter(nextChapter)
      setTopics(normalizedTopics)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTopics()

    const refreshTopics = () => {
      if (document.visibilityState === 'visible') {
        loadTopics()
      }
    }

    window.addEventListener('focus', refreshTopics)
    document.addEventListener('visibilitychange', refreshTopics)
    window.addEventListener('innovative-science-progress-updated', refreshTopics)

    return () => {
      window.removeEventListener('focus', refreshTopics)
      document.removeEventListener('visibilitychange', refreshTopics)
      window.removeEventListener('innovative-science-progress-updated', refreshTopics)
    }
  }, [chapterNumber])

  useEffect(() => {
    let cancelled = false

    const loadFeedbackSummary = async () => {
      if (!chapter?._id) {
        setTopicFeedbackSummary({ averageRating: 0, ratingCount: 0, userRating: 0, userFeedback: null })
        return
      }

      try {
        const data = await apiRequest(
          `/api/feedback/context?sourceType=topic&sourceKey=${encodeURIComponent(chapter._id)}&clientKey=${encodeURIComponent(feedbackClientKey)}&limit=10`,
        )

        if (!cancelled) {
          setTopicFeedbackSummary({
            averageRating: Number(data.averageRating || 0),
            ratingCount: Number(data.ratingCount || 0),
            userRating: Number(data.userRating || 0),
            userFeedback: data.userFeedback || null,
          })
          setSelectedFeedbackRating(Number(data.userFeedback?.rating || data.userRating || 0))
          setFeedbackComment(data.userFeedback?.message || '')
        }
      } catch (err) {
        if (!cancelled) {
          setTopicFeedbackSummary({ averageRating: 0, ratingCount: 0, userRating: 0, userFeedback: null })
        }
      }
    }

    loadFeedbackSummary()

    return () => {
      cancelled = true
    }
  }, [chapter?._id, auth?.token, feedbackClientKey])

  const openAddModal = () => {
    setEditingTopic(null)
    setForm(emptyForm)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (topic) => {
    setEditingTopic(topic)
    setForm({
      name: topic.name,
      description: topic.description || '',
      studyText: topic.studyText || '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const saveTopic = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const path = editingTopic
        ? `/api/topics/${editingTopic._id}`
        : `/api/chapters/${chapterNumber}/topics`
      const method = editingTopic ? 'PATCH' : 'POST'

      await apiRequest(path, {
        method,
        body: JSON.stringify(form),
      })
      setIsModalOpen(false)
      await loadTopics()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteTopic = async (topic) => {
    const shouldDelete = window.confirm(`Delete topic "${topic.name}"?`)

    if (!shouldDelete) return

    setError('')
    try {
      await apiRequest(`/api/topics/${topic._id}`, { method: 'DELETE' })
      await loadTopics()
    } catch (err) {
      setError(err.message)
    }
  }

  const topicFeedbackSourceKey = chapter?._id ? String(chapter._id) : ''

  const showFeedbackSuccessToast = () => {
    window.clearTimeout(feedbackToastTimerRef.current)
    setFeedbackSuccessLeaving(false)
    setFeedbackSuccessNotice(true)
    feedbackToastTimerRef.current = window.setTimeout(() => {
      setFeedbackSuccessLeaving(true)
      feedbackToastTimerRef.current = window.setTimeout(() => {
        setFeedbackSuccessNotice(false)
        setFeedbackSuccessLeaving(false)
      }, 280)
    }, 2700)
  }

  const openFeedbackModal = () => {
    if (!auth?.token) {
      setError('Please sign in to give feedback.')
      return
    }

    setSelectedFeedbackRating(topicFeedbackSummary.userRating || 0)
    setFeedbackComment(topicFeedbackSummary.userFeedback?.message || '')
    setError('')
    setIsFeedbackModalOpen(true)
  }

  const submitTopicFeedback = async (event) => {
    event.preventDefault()
    const rating = Number(selectedFeedbackRating)

    if (!topicFeedbackSourceKey || topicFeedbackSubmitting) {
      return
    }

    if (!auth?.token) {
      setError('Please sign in to rate this chapter.')
      return
    }

    setTopicFeedbackSubmitting(true)
    setRatingPulse(rating)

    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          message: feedbackComment.trim(),
          sourceType: 'topic',
          sourceKey: topicFeedbackSourceKey,
          sourceLabel: chapter?.name || 'Chapter topics',
          clientKey: feedbackClientKey,
          name: auth?.user?.name || '',
          email: auth?.user?.email || '',
          phoneNumber: auth?.user?.phoneNumber || '',
        }),
      })

      setTopicFeedbackSummary((current) => ({
        ...current,
        userRating: rating,
        userFeedback: { rating, message: feedbackComment.trim() },
      }))
      sendCurrentDevicePush({
        title: 'Thank you for your feedback! ⭐',
        body: 'Your chapter rating was saved successfully.',
        url: `/#/chapters/${chapterNumber}/topics`,
      }).catch(() => undefined)
      await refreshTopicFeedback()
      setIsFeedbackModalOpen(false)
      showFeedbackSuccessToast()
    } catch (err) {
      setError(err.message)
    } finally {
      setTopicFeedbackSubmitting(false)
      window.setTimeout(() => setRatingPulse(0), 700)
    }
  }

  const refreshTopicFeedback = async () => {
    if (!topicFeedbackSourceKey) {
      return
    }

    try {
      const data = await apiRequest(
        `/api/feedback/context?sourceType=topic&sourceKey=${encodeURIComponent(topicFeedbackSourceKey)}&clientKey=${encodeURIComponent(feedbackClientKey)}&limit=10`,
      )
      setTopicFeedbackSummary({
        averageRating: Number(data.averageRating || 0),
        ratingCount: Number(data.ratingCount || 0),
        userRating: Number(data.userRating || 0),
        userFeedback: data.userFeedback || null,
      })
    } catch (err) {
      // Leave the current summary in place.
    }
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-[#fbfbfa] px-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-stone-500 shadow-xl">
          Loading topics...
        </div>
      </section>
    )
  }

  if (!chapter) {
    return (
      <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-[#fbfbfa] px-4">
        <div className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
          <h1 className="font-serif text-3xl text-stone-900">Chapter not found</h1>
          <p className="mt-3 text-sm text-stone-500">{error}</p>
          <Link to="/chapters" className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">
            Back to chapters
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-[calc(100vh-6rem)] w-full bg-[#fbfbfa] px-4 py-2 text-stone-800 sm:px-6 sm:py-5 lg:px-10">
      <div className="mx-auto w-full max-w-none">
        <div className="mt-0 border-b border-stone-200 pb-5 sm:mt-2 sm:pb-6">
          <button
            type="button"
            onClick={() => navigate('/chapters')}
            className="group mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-x-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-[0_8px_20px_rgba(8,145,178,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2"
            aria-label="Back to chapters"
            title="Back to chapters"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-stone-950 sm:text-4xl lg:text-5xl">{chapter.name}</h1>
            {isAdmin && <button type="button" onClick={() => navigate(`/chapters/${chapterNumber}/theory-questions`)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-800 sm:text-sm"><Plus className="h-4 w-4" /> Theory question</button>}
          </div>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-stone-400 sm:text-sm">
            Chapter {chapter.number.toString().padStart(2, '0')} · Topics
          </p>
          <div className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-white p-1 shadow-[0_4px_12px_rgba(15,23,42,0.12)]">
            {[
              { id: 'all', label: 'All' },
              { id: 'board', label: 'Board question' },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSearchParams(filter.id === 'board' ? { boardOnly: '1' } : {})}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition sm:text-sm ${(filter.id === 'board' ? boardOnly : !boardOnly) ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-amber-400 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openFeedbackModal}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100"
              aria-label="Give chapter feedback"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              Give feedback
            </button>
            {topicFeedbackSummary.ratingCount > 0 && (
              <span className="text-sm font-bold text-slate-500">
                ⭐ {topicFeedbackSummary.averageRating.toFixed(1)}/5
              </span>
            )}
            {isAdmin && (
              <button type="button" onClick={openAddModal} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-black sm:text-sm">
                <Plus className="h-4 w-4" />
                Add topic
              </button>
            )}
          </div>
          {error && !isModalOpen && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
              {error}
            </p>
          )}
        </div>

        {topics.filter((topic) => !boardOnly || Number(topic.boardQuestionCount ?? topic.practiceProgress?.boardQuestionCount ?? 0) > 0).length > 0 ? (
          <div className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:mt-6 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2">
            {topics.filter((topic) => !boardOnly || Number(topic.boardQuestionCount ?? topic.practiceProgress?.boardQuestionCount ?? 0) > 0).map((topic) => {
              const progress = topic.practiceProgress || {}
              const correctQuestions = Number(boardOnly ? (topic.boardCorrectQuestions ?? 0) : (progress.correctQuestions ?? 0)) || 0
              const totalQuestions = Number(boardOnly ? (topic.boardQuestionCount ?? 0) : (progress.totalQuestions ?? 0)) || 0
              const percentage = totalQuestions ? Math.round((correctQuestions / totalQuestions) * 100) : 0
              const isDone = totalQuestions > 0 && correctQuestions >= totalQuestions

              return (
                <article
                  key={topic._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/chapters/${chapterNumber}/topics/${topic._id}/objectives${boardOnly ? '?boardOnly=1' : ''}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      navigate(`/chapters/${chapterNumber}/topics/${topic._id}/objectives${boardOnly ? '?boardOnly=1' : ''}`)
                    }
                  }}
                  className="group relative flex h-full cursor-pointer flex-col rounded-[1.25rem] border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_14px_32px_rgba(8,145,178,0.1)] sm:p-4"
                >
                  {isAdmin && (
                    <div className="absolute right-4 top-4 z-10 flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditModal(topic)
                        }}
                        className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-100 hover:text-stone-950"
                        aria-label="Edit topic"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteTopic(topic)
                        }}
                        className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                        aria-label="Delete topic"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-xs font-black text-cyan-700 sm:h-11 sm:w-11 sm:text-sm">
                    {topic.number.toString().padStart(2, '0')}
                  </span>
                  <div className={`min-w-0 flex-1 ${isAdmin ? 'pr-24' : ''}`}>
                    <h2 className="mt-2 text-base font-black leading-snug tracking-tight text-stone-900 sm:text-lg lg:text-xl">
                      {topic.name}
                    </h2>
                    {topic.description && (
                      <p className="mt-2 text-xs leading-5 text-stone-500 sm:text-sm sm:leading-6">{topic.description}</p>
                    )}
                    <div className="mt-4 md:max-w-2xl">
                      <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold text-stone-500 sm:text-xs">
                        <span>Progress · {correctQuestions}/{totalQuestions} correct</span>
                        <span>{correctQuestions}/{totalQuestions}</span>
                      </div>
                      <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-[10px] font-bold text-slate-500 sm:text-xs">{percentage}%</span>
                      </div>
                    </div>
                    {isAdmin && topic.studyText && (
                      <p className="mt-3 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700">
                        Topic paragraph saved
                      </p>
                    )}
                    {isDone && (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </p>
                    )}
                  </div>
                  <span className="mt-auto flex w-full flex-col items-center gap-1.5 pt-4">
                    <span className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-white transition sm:min-h-11 sm:px-4 sm:text-sm ${isDone ? 'bg-emerald-600 group-hover:bg-emerald-700' : 'bg-cyan-700 group-hover:bg-cyan-800'}`}>
                      Start practice
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    {isDone && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Completed</span>}
                  </span>
                </article>
              )
            })}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center sm:p-16">
            <span className="font-serif text-2xl italic text-stone-300">{boardOnly ? 'No board questions' : 'No topics'}</span>
            <p className="mt-2 text-sm text-stone-500">{boardOnly ? 'No topics with board questions are available yet.' : 'No topics are saved for this chapter yet.'}</p>
            {isAdmin && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-6 inline-flex items-center gap-2 border border-stone-800 bg-stone-900 px-5 py-2 font-mono text-xs uppercase tracking-widest text-white transition-all hover:bg-transparent hover:text-stone-900"
              >
                <Plus className="h-4 w-4" />
                Add first topic
              </button>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <form onSubmit={saveTopic} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-3xl text-stone-950">{editingTopic ? 'Edit topic' : 'Add topic'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <Field label="Topic name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <label className="grid gap-2 text-sm font-bold text-stone-600">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={4}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-stone-600">
                Topic paragraph for AI analysis
                <textarea
                  value={form.studyText}
                  onChange={(event) => setForm({ ...form, studyText: event.target.value })}
                  rows={7}
                  placeholder="Paste the textbook paragraph or topic explanation here..."
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                />
              </label>
            </div>

            {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">{error}</p>}

            <button type="submit" disabled={isSaving} className="mt-6 h-12 w-full rounded-2xl bg-stone-900 font-bold text-white disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save topic'}
            </button>
          </form>
        </div>
      )}

      {isFeedbackModalOpen && (
        <div className="feedback-modal-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <form
            onSubmit={submitTopicFeedback}
            className="feedback-modal-panel w-full max-w-md rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-600">Chapter feedback</p>
                <h2 className="mt-1 font-serif text-3xl text-stone-950">How was this chapter?</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900"
                aria-label="Close feedback"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1
                const activeRating = hoverRating || selectedFeedbackRating
                const isActive = activeRating >= starValue

                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => {
                      setSelectedFeedbackRating(starValue)
                      setRatingPulse(starValue)
                      window.setTimeout(() => setRatingPulse(0), 700)
                    }}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onFocus={() => setHoverRating(starValue)}
                    onBlur={() => setHoverRating(0)}
                    className={`constellation-star relative rounded-full p-1 transition duration-300 hover:scale-110 ${isActive ? 'selected-star' : ''} ${ratingPulse === starValue ? 'animate-[ratingPop_0.65s_ease-out]' : ''}`}
                    aria-label={`${starValue} star rating`}
                  >
                    <Star className={`h-8 w-8 transition ${isActive ? 'fill-amber-300 text-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]' : 'text-slate-300 hover:text-amber-300'}`} />
                    {ratingPulse === starValue && (
                      <span className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <i className="rating-spark spark-one" />
                        <i className="rating-spark spark-two" />
                        <i className="rating-spark spark-three" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedFeedbackRating > 0 && (
              <label className="mt-6 grid gap-2 text-sm font-bold text-stone-600">
                Add your comments <span className="font-normal text-stone-400">(optional)</span>
                <textarea
                  value={feedbackComment}
                  onChange={(event) => setFeedbackComment(event.target.value)}
                  rows={4}
                  maxLength={1500}
                  placeholder="Write your feedback here..."
                  className="resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-normal text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={!selectedFeedbackRating || topicFeedbackSubmitting}
              className={`mt-6 h-12 w-full rounded-2xl bg-stone-900 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 ${selectedFeedbackRating ? 'feedback-submit-ready' : ''}`}
            >
              {topicFeedbackSubmitting ? 'Saving feedback...' : 'Submit feedback'}
            </button>
          </form>
        </div>
      )}

      {feedbackSuccessNotice && (
        <div className={`feedback-success-toast pointer-events-none fixed right-5 top-20 z-[90] flex w-[min(360px,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] sm:right-6 ${feedbackSuccessLeaving ? 'feedback-success-toast-leaving' : ''}`} role="status" aria-live="polite">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </span>
          <span>Feedback submitted successfully</span>
        </div>
      )}

      <style>{`
        @keyframes ratingPop {
          0% { transform: scale(1) rotate(0deg); }
          35% { transform: scale(1.45) rotate(-10deg); }
          65% { transform: scale(0.92) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .feedback-modal-backdrop {
          animation: feedbackFadeIn 180ms ease-out both;
        }

        .feedback-modal-panel {
          animation: feedbackModalIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .feedback-success-toast {
          animation: feedbackToastIn 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .feedback-success-toast-leaving {
          animation: feedbackToastOut 280ms ease-in both;
        }

        .feedback-submit-ready {
          animation: feedbackSubmitPop 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
          box-shadow: 0 10px 24px rgba(28, 25, 23, 0.2), 0 0 0 4px rgba(245, 158, 11, 0.12);
        }

        @keyframes feedbackFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes feedbackModalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes feedbackToastIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes feedbackToastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-8px) scale(0.98); }
        }

        @keyframes feedbackSubmitPop {
          0% { opacity: 0.5; transform: translateY(8px) scale(0.94); }
          65% { transform: translateY(-2px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .selected-star {
          animation: constellationGlow 3.2s ease-in-out infinite;
        }

        .selected-star::after {
          content: '';
          position: absolute;
          inset: 8% 12%;
          border-radius: 999px;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.9) 50%, transparent 65%);
          transform: translateX(-150%) skewX(-16deg);
          animation: starShimmer 3.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
          pointer-events: none;
        }

        .rating-spark {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #fde68a;
          box-shadow: 0 0 8px 2px rgba(251, 191, 36, 0.85);
          pointer-events: none;
          animation: sparkleOut 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .spark-one { --spark-x: -17px; --spark-y: -19px; }
        .spark-two { --spark-x: 19px; --spark-y: -12px; animation-delay: 70ms; }
        .spark-three { --spark-x: 17px; --spark-y: 18px; animation-delay: 120ms; }

        @keyframes sparkleOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(0.7); }
        }

        @keyframes constellationGlow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.25)); }
          50% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.55)); }
        }

        @keyframes starShimmer {
          0%, 55% { transform: translateX(-150%) skewX(-16deg); opacity: 0; }
          65% { opacity: 1; }
          82%, 100% { transform: translateX(150%) skewX(-16deg); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .selected-star,
          .selected-star::after,
          .rating-spark,
          .feedback-modal-backdrop,
          .feedback-modal-panel,
          .feedback-success-toast,
          .feedback-submit-ready {
            animation: none;
          }
        }
      `}</style>

    </section>
  )
}

const Field = ({ label, value, onChange, type = 'text' }) => (
  <label className="grid gap-2 text-sm font-bold text-stone-600">
    {label}
    <input
      type={type}
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
    />
  </label>
)

export default Topicspage
