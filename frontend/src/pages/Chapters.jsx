
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Edit3,
  Layers3,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import LoadingState from '../components/LoadingState'

const emptyForm = {
  number: '',
  name: '',
  marks: '',
  marksWithoutOption: '',
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

// --------------------------------------------------
// CHAPTER CARD
// --------------------------------------------------

const ChapterCard = memo(({
  chapter,
  index,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate()

  const marks = Number(chapter.marks) || 0
  const marksWithoutOption =
    Number(chapter.marksWithoutOption) || 0

  const progressPercentage = Math.min(
    Math.max(Number(chapter.progress?.percentage || 0), 0),
    100
  )

  const correctQuestions =
    Number(chapter.progress?.correctQuestions) || 0

  const totalQuestions =
    Number(chapter.progress?.totalQuestions) || 0

  const isDone = Boolean(chapter.progress?.isDone)

  const theme = marks >= 9
    ? {
        badge: 'bg-orange-50 text-orange-800 border-orange-100',
        accent: 'bg-orange-600',
      }
    : marks >= 7
      ? {
          badge: 'bg-teal-50 text-teal-800 border-teal-100',
          accent: 'bg-teal-600',
        }
      : {
          badge: 'bg-stone-100 text-stone-700 border-stone-200',
          accent: 'bg-stone-500',
        }

  const openChapter = () => {
    navigate(`/chapters/${chapter.number}/topics`)
  }

  return (
    <article
      className={cn(
        'chapter-card group relative flex min-w-0 flex-col',
        'overflow-hidden rounded-2xl border border-slate-200/80',
        'bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-cyan-200',
        'hover:shadow-[0_14px_32px_rgba(8,145,178,0.09)]',
        'focus-within:border-cyan-200'
      )}
      style={{
        animationDelay: `${Math.min(index * 45, 450)}ms`,
      }}
    >
      {/* Admin actions */}

      {isAdmin && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            title="Add theory question"
            aria-label="Add theory question"
            onClick={() =>
              navigate(
                `/chapters/${chapter.number}/theory-questions`
              )
            }
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-xl',
              'bg-cyan-700 px-2.5 text-xs font-bold text-white',
              'shadow-sm transition-colors hover:bg-cyan-800',
              'active:scale-95'
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Theory</span>
          </button>

          <button
            type="button"
            title="Edit chapter"
            aria-label={`Edit ${chapter.name}`}
            onClick={() => onEdit(chapter)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 active:scale-95"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Delete chapter"
            aria-label={`Delete ${chapter.name}`}
            onClick={() => onDelete(chapter)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-400 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main clickable chapter area */}

      <button
        type="button"
        onClick={openChapter}
        className={cn(
          'flex w-full flex-1 flex-col text-left',
          'p-4 sm:p-5',
          isAdmin && 'pt-[4.25rem] sm:pt-[4.5rem]'
        )}
        aria-label={`Open chapter ${chapter.number}: ${chapter.name}`}
      >
        {/* Chapter information */}

        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 font-mono text-sm font-black text-cyan-800 transition duration-300 group-hover:border-cyan-200 group-hover:bg-cyan-100">
            {chapter.number}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-extrabold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-cyan-800 sm:text-lg">
              {chapter.name}
            </h3>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Chapter {chapter.number}
            </p>
          </div>
        </div>

        {/* Weightage */}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-lg border px-2.5 py-1.5',
              'text-[10px] font-extrabold uppercase tracking-wide',
              theme.badge
            )}
          >
            {marks} Marks · With option
          </span>

          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            {marksWithoutOption} Marks · Without option
          </span>
        </div>

        {/* Progress section */}

        <div className="mt-5 rounded-xl border border-cyan-100/80 bg-cyan-50/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Layers3 className="h-4 w-4 text-cyan-700" />
              )}

              <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                Your progress
              </span>
            </div>

            <span
              className={cn(
                'text-xs font-black tabular-nums',
                isDone ? 'text-emerald-600' : 'text-cyan-800'
              )}
            >
              {Math.round(progressPercentage)}%
            </span>
          </div>

          {/* Progress bar */}

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-700 ease-out',
                isDone ? 'bg-emerald-500' : 'bg-cyan-600'
              )}
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              {correctQuestions} / {totalQuestions} correct
            </span>

            <span className="text-[10px] font-bold text-slate-400">
              {isDone ? 'Completed' : 'Keep learning'}
            </span>
          </div>
        </div>

        {/* Open button */}

        <div className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white transition-all duration-300 group-hover:bg-cyan-800 group-hover:shadow-md group-active:scale-[0.99]">
          <BookOpen className="h-4 w-4" />
          Explore Topics
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </button>
    </article>
  )
})

ChapterCard.displayName = 'ChapterCard'

// --------------------------------------------------
// REUSABLE FORM FIELD
// --------------------------------------------------

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  step,
}) => (
  <label className="grid gap-2 text-sm font-bold text-slate-700">
    {label}

    <input
      type={type}
      required
      min={min}
      step={step}
      value={value}
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-12 w-full rounded-xl border border-slate-200',
        'bg-slate-50 px-4 text-sm font-semibold text-slate-900',
        'outline-none transition-all duration-200',
        'placeholder:text-slate-400',
        'focus:border-cyan-400 focus:bg-white',
        'focus:ring-4 focus:ring-cyan-50'
      )}
    />
  </label>
)

// --------------------------------------------------
// MAIN CHAPTERS PAGE
// --------------------------------------------------

const Chapters = () => {
  const navigate = useNavigate()

  const [chapters, setChapters] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Prevent duplicate requests.
  const requestRef = useRef(null)
  const lastLoadedAtRef = useRef(0)

  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)

  // ------------------------------------------------
  // FAST DATA LOADING
  // ------------------------------------------------

  const loadChapters = useCallback(async ({
    force = false,
  } = {}) => {
    // Reuse an existing request.
    if (requestRef.current) {
      return requestRef.current
    }

    // Avoid unnecessary requests on repeated focus events.
    if (
      !force &&
      Date.now() - lastLoadedAtRef.current < 15000
    ) {
      return
    }

    if (chapters.length === 0) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setError('')

    const request = (async () => {
      try {
        const data = await apiRequest('/api/chapters', {
          cache: 'no-store',
        })

        const nextChapters = Array.isArray(data?.chapters)
          ? data.chapters.map((chapter) => ({
              ...chapter,
              sourceName: chapter.name || '',
              name: chapter.name || '',
            }))
          : []

        setChapters(nextChapters)
        lastLoadedAtRef.current = Date.now()
      } catch (err) {
        setError(
          err?.message || 'Unable to load chapters. Please try again.'
        )
      }
    })()

    requestRef.current = request

    try {
      await request
    } finally {
      requestRef.current = null
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [chapters.length])

  // Initial loading and smart refresh.

  useEffect(() => {
    loadChapters()

    const refreshChapters = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoadedAtRef.current >= 15000
      ) {
        loadChapters()
      }
    }

    const forceRefresh = () => {
      loadChapters({ force: true })
    }

    window.addEventListener('focus', refreshChapters)
    document.addEventListener(
      'visibilitychange',
      refreshChapters
    )

    window.addEventListener(
      'innovative-science-progress-updated',
      forceRefresh
    )

    return () => {
      window.removeEventListener('focus', refreshChapters)
      document.removeEventListener(
        'visibilitychange',
        refreshChapters
      )

      window.removeEventListener(
        'innovative-science-progress-updated',
        forceRefresh
      )
    }
  }, [loadChapters])

  // ------------------------------------------------
  // DERIVED DATA
  // ------------------------------------------------

  const totalMarks = useMemo(
    () =>
      chapters.reduce(
        (sum, chapter) => sum + (Number(chapter.marks) || 0),
        0
      ),
    [chapters]
  )

  const completedChapters = useMemo(
    () =>
      chapters.filter(
        (chapter) => chapter.progress?.isDone
      ).length,
    [chapters]
  )

  // ------------------------------------------------
  // ADD / EDIT
  // ------------------------------------------------

  const openAddModal = () => {
    setEditingChapter(null)
    setForm({ ...emptyForm })
    setFormError('')
    setIsModalOpen(true)
  }

  const openEditModal = (chapter) => {
    setEditingChapter(chapter)

    setForm({
      number: String(chapter.number ?? ''),
      name: chapter.name || '',
      marks: String(chapter.marks ?? ''),
      marksWithoutOption: String(
        chapter.marksWithoutOption ?? ''
      ),
    })

    setFormError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return

    setIsModalOpen(false)
    setEditingChapter(null)
    setFormError('')
  }

  // Escape key and background scroll handling.

  useEffect(() => {
    if (!isModalOpen) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isSaving) {
        closeModal()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen, isSaving])

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const saveChapter = async (event) => {
    event.preventDefault()

    setFormError('')

    if (!form.name.trim()) {
      setFormError('Please enter a chapter name.')
      return
    }

    if (
      form.number === '' ||
      !Number.isFinite(Number(form.number)) ||
      Number(form.number) <= 0
    ) {
      setFormError('Please enter a valid chapter number.')
      return
    }

    if (
      form.marks === '' ||
      !Number.isFinite(Number(form.marks)) ||
      Number(form.marks) < 0
    ) {
      setFormError('Please enter valid chapter weightage.')
      return
    }

    if (
      form.marksWithoutOption === '' ||
      !Number.isFinite(Number(form.marksWithoutOption)) ||
      Number(form.marksWithoutOption) < 0
    ) {
      setFormError('Please enter valid weightage without option.')
      return
    }

    setIsSaving(true)

    try {
      const path = editingChapter
        ? `/api/chapters/${editingChapter._id}`
        : '/api/chapters'

      const method = editingChapter ? 'PATCH' : 'POST'

      await apiRequest(path, {
        method,
        body: JSON.stringify({
          ...form,
          number: Number(form.number),
          marks: Number(form.marks),
          marksWithoutOption: Number(form.marksWithoutOption),
          name: form.name.trim(),
        }),
      })

      setIsModalOpen(false)
      setEditingChapter(null)
      setForm({ ...emptyForm })

      await loadChapters({ force: true })
    } catch (err) {
      setFormError(
        err?.message || 'Unable to save chapter.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // ------------------------------------------------
  // DELETE
  // ------------------------------------------------

  const deleteChapter = async (chapter) => {
    const shouldDelete = window.confirm(
      `Delete chapter "${chapter.name}" and all its topics?`
    )

    if (!shouldDelete) return

    setError('')

    try {
      await apiRequest(
        `/api/chapters/${chapter._id}`,
        { method: 'DELETE' }
      )

      await loadChapters({ force: true })
    } catch (err) {
      setError(
        err?.message || 'Unable to delete chapter.'
      )
    }
  }

  // ------------------------------------------------
  // UI
  // ------------------------------------------------

  return (
    <section className="chapters-page min-h-[calc(100vh-6rem)] w-full overflow-x-hidden bg-[#fbfbfa] px-3 pb-8 pt-3 font-sans text-slate-800 antialiased selection:bg-cyan-100 sm:px-6 sm:pb-10 sm:pt-5 lg:px-10">

      <div className="mx-auto w-full max-w-[1500px]">

        {/* PAGE HEADER */}

        <header className="border-b border-slate-200/80 pb-5 sm:pb-7">

          <button
            type="button"
            onClick={() => navigate('/')}
            className="group mb-5 inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-x-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            {/* Title */}

            <div className="min-w-0">

              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />

                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                  Curriculum Blueprint
                </p>

                {isRefreshing && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
                    Updating
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Chapters
                <span className="ml-2 text-cyan-700">.</span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Explore your science chapters, practise questions
                and track your learning progress.
              </p>
            </div>

            {/* Statistics */}

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:min-w-[105px] sm:px-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Chapters
                </p>

                <p className="mt-1 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                  {chapters.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:min-w-[105px] sm:px-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Total Marks
                </p>

                <p className="mt-1 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                  {totalMarks}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 sm:min-w-[105px] sm:px-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  Completed
                </p>

                <p className="mt-1 text-xl font-black tabular-nums text-emerald-700 sm:text-2xl">
                  {completedChapters}
                </p>
              </div>

            </div>
          </div>

          {/* Add chapter */}

          {isAdmin && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-cyan-800 hover:shadow-lg active:scale-[0.98] sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add New Chapter
              </button>
            </div>
          )}

          {error && !isModalOpen && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => loadChapters({ force: true })}
                className="shrink-0 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

        </header>

        {/* CHAPTER LIST */}

        <main className="mt-5 sm:mt-7">

          <div className="mb-4 flex items-center justify-between gap-3">

            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                All Chapters
              </h2>

              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
                Select a chapter to explore its topics.
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 sm:text-xs">
              {chapters.length} Available
            </span>

          </div>

          {isLoading && chapters.length === 0 ? (

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-10">
              <LoadingState
                label="Loading chapters"
                compact
              />
            </div>

          ) : chapters.length > 0 ? (

            <div
              className={cn(
                'grid grid-cols-1 gap-3',
                'sm:grid-cols-2 sm:gap-4',
                'xl:grid-cols-3 xl:gap-5'
              )}
            >
              {chapters.map((chapter, index) => (
                <ChapterCard
                  key={chapter._id || chapter.number}
                  chapter={chapter}
                  index={index}
                  isAdmin={isAdmin}
                  onEdit={openEditModal}
                  onDelete={deleteChapter}
                />
              ))}
            </div>

          ) : (

            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">

              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                <BookOpen className="h-7 w-7" />
              </div>

              <h3 className="mt-4 font-serif text-2xl text-slate-900">
                No chapters yet
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Your chapters will appear here once they are added
                to the curriculum.
              </p>

              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-700 px-5 text-sm font-bold text-white transition hover:bg-cyan-800"
                >
                  <Plus className="h-4 w-4" />
                  Add First Chapter
                </button>
              )}

              {!error && (
                <button
                  type="button"
                  onClick={() => loadChapters({ force: true })}
                  className="mt-4 text-xs font-bold text-cyan-700 hover:underline"
                >
                  Refresh chapters
                </button>
              )}

            </div>
          )}

        </main>

        {/* FOOTER */}

        {chapters.length > 0 && (
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-200/70 pt-5 text-center">
            <Sparkles className="h-3.5 w-3.5 text-cyan-600" />

            <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
              Every chapter brings you one step closer to mastering Science.
            </p>
          </div>
        )}

      </div>

      {/* ------------------------------------------ */}
      {/* ADD / EDIT MODAL */}
      {/* ------------------------------------------ */}

      {isModalOpen && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
        >

          <form
            onSubmit={saveChapter}
            className="chapter-modal my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.2)]"
          >

            {/* Modal heading */}

            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-cyan-50 to-white px-5 py-5 sm:px-7 sm:py-6">

              <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-cyan-100/50 blur-2xl" />

              <div className="relative flex items-start justify-between gap-3">

                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-700 shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    Curriculum Management
                  </span>

                  <h2 className="mt-3 font-serif text-2xl text-slate-950 sm:text-3xl">
                    {editingChapter
                      ? 'Edit Chapter'
                      : 'New Chapter'}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Enter the chapter details below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  aria-label="Close modal"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>

              </div>
            </div>

            {/* Modal form */}

            <div className="grid gap-4 p-5 sm:p-7">

              <Field
                label="Chapter number"
                type="number"
                min="1"
                step="1"
                value={form.number}
                onChange={(value) => updateField('number', value)}
              />

              <Field
                label="Chapter name"
                value={form.name}
                onChange={(value) => updateField('name', value)}
              />

              <div className="grid grid-cols-2 gap-3">

                <Field
                  label="With option"
                  type="number"
                  min="0"
                  step="any"
                  value={form.marks}
                  onChange={(value) => updateField('marks', value)}
                />

                <Field
                  label="Without option"
                  type="number"
                  min="0"
                  step="any"
                  value={form.marksWithoutOption}
                  onChange={(value) =>
                    updateField('marksWithoutOption', value)
                  }
                />

              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600"
                >
                  {formError}
                </div>
              )}

              <div className="mt-1 grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-700 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Chapter
                    </>
                  )}
                </button>

              </div>

            </div>

          </form>

        </div>

      )}

      {/* ------------------------------------------ */}
      {/* LIGHTWEIGHT ANIMATIONS */}
      {/* ------------------------------------------ */}

      <style>{`
        .chapter-card {
          animation: chapterEnter 450ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
          will-change: transform, opacity;
        }

        .chapter-modal {
          animation: modalEnter 220ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }

        @keyframes chapterEnter {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (hover: none) {
          .chapter-card:hover {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chapter-card,
          .chapter-modal {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

    </section>
  )
}

export default Chapters
