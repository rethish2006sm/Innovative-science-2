import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Edit3, Plus, Star, Trash2, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { getFeedbackClientKey } from '../lib/feedbackClient'

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
  const [chapter, setChapter] = useState(null)
  const [topics, setTopics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [topicFeedbackSummary, setTopicFeedbackSummary] = useState({ averageRating: 0, ratingCount: 0, userRating: 0 })
  const [topicFeedbackSubmitting, setTopicFeedbackSubmitting] = useState(false)
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const marksWithOption = Number(chapter?.marks || 0)
  const marksWithoutOption = Number(chapter?.marksWithoutOption || 0)
  const marksWithOptionPercent = Math.min(Math.max(marksWithOption * 10, 0), 100)
  const marksWithoutOptionPercent = Math.min(Math.max(marksWithoutOption * 10, 0), 100)

  const loadTopics = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/api/chapters/${chapterNumber}/topics`)
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
  }, [chapterNumber])

  useEffect(() => {
    let cancelled = false

    const loadFeedbackSummary = async () => {
      if (!chapter?._id) {
        setTopicFeedbackSummary({ averageRating: 0, ratingCount: 0, userRating: 0 })
        return
      }

      try {
        const data = await apiRequest(
          `/api/feedback/context?sourceType=topic&sourceKey=${encodeURIComponent(chapter._id)}&clientKey=${encodeURIComponent(getFeedbackClientKey())}&limit=10`,
        )

        if (!cancelled) {
          setTopicFeedbackSummary({
            averageRating: Number(data.averageRating || 0),
            ratingCount: Number(data.ratingCount || 0),
            userRating: Number(data.userRating || 0),
          })
        }
      } catch (err) {
        if (!cancelled) {
          setTopicFeedbackSummary({ averageRating: 0, ratingCount: 0, userRating: 0 })
        }
      }
    }

    loadFeedbackSummary()

    return () => {
      cancelled = true
    }
  }, [chapter?._id, auth?.token])

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
  const topicFeedbackSubmitted = Boolean(topicFeedbackSummary.userRating)

  const submitTopicFeedback = async (rating) => {
    if (!topicFeedbackSourceKey || topicFeedbackSubmitting) {
      return
    }

    setTopicFeedbackSubmitting(true)

    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          message: '',
          sourceType: 'topic',
          sourceKey: topicFeedbackSourceKey,
          sourceLabel: chapter?.name || 'Chapter topics',
          clientKey: getFeedbackClientKey(),
          name: auth?.user?.name || '',
          email: auth?.user?.email || '',
          phoneNumber: auth?.user?.phoneNumber || '',
        }),
      })

      setTopicFeedbackSummary((current) => ({
        ...current,
        userRating: rating,
      }))
      await refreshTopicFeedback()
    } catch (err) {
      setError(err.message)
    } finally {
      setTopicFeedbackSubmitting(false)
    }
  }

  const refreshTopicFeedback = async () => {
    if (!topicFeedbackSourceKey) {
      return
    }

    try {
      const data = await apiRequest(
        `/api/feedback/context?sourceType=topic&sourceKey=${encodeURIComponent(topicFeedbackSourceKey)}&clientKey=${encodeURIComponent(getFeedbackClientKey())}&limit=10`,
      )
      setTopicFeedbackSummary({
        averageRating: Number(data.averageRating || 0),
        ratingCount: Number(data.ratingCount || 0),
        userRating: Number(data.userRating || 0),
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
    <section className="min-h-[calc(100vh-6rem)] w-full bg-[#fbfbfa] px-4 py-10 text-stone-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/chapters" className="font-mono text-xs uppercase tracking-widest text-stone-500 transition hover:text-stone-900">
            Back to chapters
          </Link>

          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black"
            >
              <Plus className="h-5 w-5" />
              Add topic
            </button>
          )}
        </div>

        <div className="mt-6 border-b border-stone-200 pb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-stone-400">
            Chapter {chapter.number.toString().padStart(2, '0')} Topics
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-stone-950 sm:text-5xl">
            {chapter.name}
          </h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-teal-700">
                Weightage With Option
              </p>
              <p className="mt-1 font-serif text-3xl text-teal-950">
                {marksWithOption} marks
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-teal-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-700"
                  style={{ width: `${marksWithOptionPercent}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-amber-700">
                Weightage Without Option
              </p>
              <p className="mt-1 font-serif text-3xl text-amber-950">
                {marksWithoutOption} marks
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${marksWithoutOptionPercent}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
            Select the Topic you want to practice.
          </p>
          <div className="mt-5 rounded-[1.75rem] border border-amber-100 bg-amber-50/80 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Topic feedback</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Feedback</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Click on the stars to give feedback.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const starValue = index + 1
                    const userActive = topicFeedbackSummary.userRating >= starValue
                    const hasUserRating = topicFeedbackSummary.userRating > 0

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => submitTopicFeedback(starValue)}
                        disabled={topicFeedbackSubmitting}
                        className="grid place-items-center rounded-full transition disabled:cursor-not-allowed"
                        aria-label={`${starValue} star rating`}
                      >
                        <Star
                          className={`h-5 w-5 transition ${hasUserRating && userActive ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                        />
                      </button>
                    )
                  })}
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">
                    {topicFeedbackSummary.userRating ? `Your rating: ${topicFeedbackSummary.userRating}/5` : 'Not rated yet'}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {topicFeedbackSummary.ratingCount} rating{topicFeedbackSummary.ratingCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-right shadow-sm">
                <p className="text-sm font-black text-slate-950">
                  {topicFeedbackSummary.averageRating
                    ? `Avg rating: ${topicFeedbackSummary.averageRating.toFixed(1)}/5`
                    : 'No average rating yet'}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {topicFeedbackSummary.userRating
                    ? `You rated ${topicFeedbackSummary.userRating}/5`
                    : 'No user rating yet'}
                </p>
                {topicFeedbackSummary.userRating ? (
                  <p className="text-xs font-bold text-amber-700">
                    Saved
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-500">
                    Tap any star to start or change your rating.
                  </p>
                )}
                <p className="text-xs font-semibold text-slate-500">
                  {topicFeedbackSummary.ratingCount} rating{topicFeedbackSummary.ratingCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-600">
                <Star className="h-4 w-4 text-amber-500" />
                {topicFeedbackSubmitted ? 'Saved' : 'Tap any star to rate'}
              </span>
            </div>
          </div>
          {error && !isModalOpen && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
              {error}
            </p>
          )}
        </div>

        {topics.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {topics.map((topic) => {
              const progress = topic.practiceProgress || {}
              const averagePercent = Number(progress.averagePercent || 0)
              const attemptedTypes = Number(progress.attemptedTypes || 0)
              const bestScore = Number(progress.bestScore || 0)
              const totalQuestions = Number(progress.totalQuestions || 0)
              const isDone = Boolean(progress.isDone)

              return (
                <article
                  key={topic._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/chapters/${chapterNumber}/topics/${topic._id}/objectives`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      navigate(`/chapters/${chapterNumber}/topics/${topic._id}/objectives`)
                    }
                  }}
                  className="group relative cursor-pointer rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-stone-400 hover:shadow-lg"
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
                  <div className={isAdmin ? 'pr-24' : ''}>
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                      Topic {topic.number.toString().padStart(2, '0')}
                    </p>
                    <h2 className="mt-3 text-lg font-bold leading-snug text-stone-900 sm:text-xl">
                      {topic.name}
                    </h2>
                    {topic.description && (
                      <p className="mt-3 text-sm leading-6 text-stone-500">{topic.description}</p>
                    )}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-stone-500">
                        <span>Average marks</span>
                        <span>{attemptedTypes ? `${bestScore}/${totalQuestions}` : 'Not attempted'}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${averagePercent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-stone-400">
                        {attemptedTypes ? `${averagePercent}% average across ${attemptedTypes} question type${attemptedTypes === 1 ? '' : 's'}` : 'Solve practice types to fill this line.'}
                      </p>
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
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center sm:p-16">
            <span className="font-serif text-2xl italic text-stone-300">No topics</span>
            <p className="mt-2 text-sm text-stone-500">No topics are saved for this chapter yet.</p>
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
