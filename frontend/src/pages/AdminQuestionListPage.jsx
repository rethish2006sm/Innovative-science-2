
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Search,
  Shield,
  X,
  Layers3,
  RotateCcw,
  CircleHelp,
  BarChart3,
  Download,
  ZoomIn,
  ZoomOut,
  Edit3,
  Trash2,
  Award,
  LoaderCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest, assetUrl } from '../api'
import { getStoredAuth } from '../authStorage'
import logo from '../assets/logo.svg'

const labels = {
  mcqs: 'MCQs',
  'true-or-false': 'True or False',
  'odd-man-out': 'Odd man out',
  correlation: 'Correlation',
  'complete-the-tables': 'Complete the tables',
  'diagram-based-question': 'Diagram based',
  'identify-symbol': 'Identify symbol',
  numericals: 'Numericals',
}

const formatType = (type) =>
  labels[type] || String(type || 'Question').replaceAll('-', ' ')

const pdfObjectiveHeading = (type) => ({
  mcqs: 'MCQs',
  'true-or-false': 'True or False',
  'odd-man-out': 'Odd Man Out',
  correlation: 'Correlation',
  'complete-the-tables': 'Complete the Tables',
  'diagram-based-question': 'Diagram Based Questions',
  'identify-symbol': 'Identify Symbol',
  numericals: 'Numericals',
}[type] || formatType(type))

const objectiveTypeOrder = [
  'mcqs',
  'true-or-false',
  'odd-man-out',
  'correlation',
  'complete-the-tables',
  'diagram-based-question',
  'identify-symbol',
  'numericals',
]

const compareChapterNumbers = (first, second) => {
  const firstNumber = Number(first?.number)
  const secondNumber = Number(second?.number)

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return firstNumber - secondNumber
  }

  return String(first?.name || '').localeCompare(String(second?.name || ''))
}

const getQuestionTitle = (question) =>
  question?.question?.trim() || 'Image-based question'

const typeBadgeClasses =
  'inline-flex max-w-full items-center rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-800 ring-1 ring-inset ring-cyan-100'

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40'

const AdminQuestionListPage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const navigate = useNavigate()

  const [questions, setQuestions] = useState([])
  const [chapters, setChapters] = useState([])
  const [objectiveTypes, setObjectiveTypes] = useState([])

  const [search, setSearch] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [objectiveType, setObjectiveType] = useState('')
  const [boardQuestion, setBoardQuestion] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 30
  const [totalPages, setTotalPages] = useState(0)

  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showDownloadTool, setShowDownloadTool] = useState(false)
  const [actionQuestionId, setActionQuestionId] = useState('')
  const searchInputRef = useRef(null)

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
      })

      if (search.trim()) params.set('search', search.trim())
      if (chapterId) params.set('chapterId', chapterId)
      if (objectiveType) params.set('objectiveType', objectiveType)
      if (boardQuestion) params.set('boardQuestion', boardQuestion)

      const data = await apiRequest(`/api/questions?${params}`)

      setQuestions((data.questions || []).filter((question) => question.objectiveType !== 'match-the-following'))
      setChapters(data.chapters || [])
      setObjectiveTypes((data.objectiveTypes || []).filter((type) => type !== 'match-the-following'))
      setTotalQuestions(Number(data.totalQuestions || 0))
      setTotalPages(Number(data.totalPages || 0))
    } catch (err) {
      setError(err.message || 'Could not load questions.')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [boardQuestion, chapterId, objectiveType, page, search])

  useEffect(() => {
    setPage(1)
  }, [boardQuestion, chapterId, objectiveType, search])

  useEffect(() => {
    const timeout = setTimeout(loadQuestions, 300)
    return () => clearTimeout(timeout)
  }, [loadQuestions])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const refreshQuestionStatuses = () => loadQuestions()
    window.addEventListener('innovative-science-progress-updated', refreshQuestionStatuses)
    return () => window.removeEventListener('innovative-science-progress-updated', refreshQuestionStatuses)
  }, [loadQuestions])

  const currentIndex = selectedQuestion
    ? questions.findIndex(
        (item) => item._id === selectedQuestion._id
      )
    : -1

  const clearFilters = () => {
    setSearch('')
    setChapterId('')
    setObjectiveType('')
    setBoardQuestion('')
    setSearchOpen(false)
  }

  const openQuestion = (question) => {
    setSelectedQuestion(question)
  }

  const updateQuestionAttemptStatus = (questionId, status) => {
    setQuestions((current) => current.map((question) => (
      String(question._id) === String(questionId)
        ? { ...question, attemptStatus: status }
        : question
    )))
  }

  const updateBoardStatus = async (question) => {
    if (!isAdmin || actionQuestionId) return

    setActionQuestionId(question._id)
    setError('')
    const nextIsBoardQuestion = !question.isBoardQuestion

    try {
      await apiRequest(`/api/objective-questions/${question._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isBoardQuestion: nextIsBoardQuestion }),
      })

      setQuestions((current) => current.map((item) => (
        item._id === question._id ? { ...item, isBoardQuestion: nextIsBoardQuestion } : item
      )))
      setSelectedQuestion((current) => current?._id === question._id
        ? { ...current, isBoardQuestion: nextIsBoardQuestion }
        : current)
    } catch (err) {
      setError(err.message || 'Could not update board-question status.')
    } finally {
      setActionQuestionId('')
    }
  }

  const deleteQuestion = async (question) => {
    if (!isAdmin || actionQuestionId) return
    if (!window.confirm('Delete this question permanently?')) return

    setActionQuestionId(question._id)
    setError('')

    try {
      await apiRequest(`/api/objective-questions/${question._id}`, { method: 'DELETE' })
      setQuestions((current) => current.filter((item) => item._id !== question._id))
      setSelectedQuestion(null)
      setTotalQuestions((current) => Math.max(0, current - 1))
    } catch (err) {
      setError(err.message || 'Could not delete question.')
    } finally {
      setActionQuestionId('')
    }
  }

  const editQuestion = (question) => {
    if (!isAdmin || !question.topicId || !question.chapterNumber || !question.objectiveType) {
      setError('This question is missing its topic details, so it cannot be edited here.')
      return
    }

    navigate(`/chapters/${question.chapterNumber}/topics/${question.topicId}/objectives/${question.objectiveType}?editQuestion=${question._id}`)
  }

  const navigateQuestion = (direction) => {
    if (currentIndex < 0) return

    const nextIndex = currentIndex + direction

    if (nextIndex >= 0 && nextIndex < questions.length) {
      setSelectedQuestion(questions[nextIndex])
    }
  }

  const hasFilters = Boolean(
    search.trim() || chapterId || objectiveType || boardQuestion
  )

  const orderedChapters = useMemo(
    () => [...chapters].sort(compareChapterNumbers),
    [chapters],
  )

  const orderedObjectiveTypes = useMemo(
    () => [...objectiveTypes].sort((first, second) => {
      const firstIndex = objectiveTypeOrder.indexOf(first)
      const secondIndex = objectiveTypeOrder.indexOf(second)

      if (firstIndex === -1 && secondIndex === -1) {
        return formatType(first).localeCompare(formatType(second))
      }

      if (firstIndex === -1) return 1
      if (secondIndex === -1) return -1
      return firstIndex - secondIndex
    }),
    [objectiveTypes],
  )

  return (
    <main className="min-h-screen bg-[#f5f8fc] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

        {/* Search and filters */}
        <section className="relative z-20 mb-5 overflow-visible rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-5">
          <div className="flex min-h-12 justify-end gap-2">
            <Link
              to="/profile/performance"
              className={`${buttonBase} min-h-12 bg-violet-50 text-violet-700 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100`}
            >
              <BarChart3 size={18} />
              Performance
            </Link>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowDownloadTool(true)}
                className={`${buttonBase} min-h-12 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100`}
              >
                <Download size={18} />
                Download questions
              </button>
            )}

            <AnimatePresence initial={false} mode="wait">
              {searchOpen ? (
                <motion.label
                  key="search-input"
                  initial={{ opacity: 0, width: 48 }}
                  animate={{ opacity: 1, width: 'min(100%, 28rem)' }}
                  exit={{ opacity: 0, width: 48 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="relative flex min-w-0 items-center overflow-hidden rounded-full bg-slate-100 px-4 text-slate-800 focus-within:bg-slate-50 focus-within:ring-2 focus-within:ring-cyan-100"
                >
                  <Search size={18} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                    }}
                    placeholder="Search questions..."
                    aria-label="Search questions"
                    className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                    }}
                    aria-label="Close search"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X size={17} />
                  </button>
                </motion.label>
              ) : (
                <motion.button
                  key="search-button"
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSearchOpen(true)}
                  aria-label="Open search"
                  className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                >
                  <Search size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-slate-50/60 p-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:gap-3 sm:bg-transparent sm:p-0">
            <label className="block min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-slate-600 sm:text-xs">
                Chapter
              </span>
              <FilterSelect
                value={chapterId}
                onChange={setChapterId}
                ariaLabel="Chapter filter"
                options={[
                  { value: '', label: 'All chapters' },
                  ...orderedChapters.map((item) => ({
                    value: item._id,
                    label: `Ch. ${item.number}: ${item.name}`,
                  })),
                ]}
                tone="cyan"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-slate-600 sm:text-xs">
                Question type
              </span>
              <FilterSelect
                value={objectiveType}
                onChange={setObjectiveType}
                ariaLabel="Question type filter"
                options={[
                  { value: '', label: 'All types' },
                  ...orderedObjectiveTypes.map((item) => ({
                    value: item,
                    label: formatType(item),
                  })),
                ]}
                tone="violet"
              />
            </label>

            <label className="block min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-slate-600 sm:text-xs">
                Board question
              </span>
              <FilterSelect
                value={boardQuestion}
                onChange={setBoardQuestion}
                ariaLabel="Board question filter"
                options={[
                  { value: '', label: 'All questions' },
                  { value: 'yes', label: 'Board questions' },
                  { value: 'no', label: 'Non-board questions' },
                ]}
                tone="amber"
              />
            </label>

            <div className="flex items-end gap-2 sm:col-span-1">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className={`${buttonBase} min-h-10 w-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:min-h-11`}
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">
                Active filters:
              </span>

              {chapterId && (
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                  Chapter selected
                </span>
              )}

              {objectiveType && (
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                  {formatType(objectiveType)}
                </span>
              )}

              {boardQuestion && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {boardQuestion === 'yes' ? 'Board questions' : 'Non-board questions'}
                </span>
              )}

              {search.trim() && (
                <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Search: {search.trim()}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <CircleHelp size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Unable to load questions</p>
              <p className="mt-1 break-words">{error}</p>
              <button
                type="button"
                onClick={loadQuestions}
                className="mt-2 font-bold underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Question list */}
        <section
          aria-label="Question list"
          aria-busy={loading}
          className="relative z-0"
        >
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="mt-4 h-4 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
                  <div className="mt-5 h-9 w-full rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          ) : questions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {questions.map((question, itemIndex) => (
                <QuestionCard
                  key={question._id}
                  question={question}
                  index={(page - 1) * pageSize + itemIndex + 1}
                  onOpen={() => openQuestion(question)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Search size={24} />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-800">
                No questions found
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                Try another search, chapter or question type.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`${buttonBase} mt-4 bg-slate-900 text-white hover:bg-slate-800`}
                >
                  <RotateCcw size={15} />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Question pages">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <ChevronLeft size={17} /> Previous
            </button>
            <span className="text-xs font-bold tabular-nums text-slate-500 sm:text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={loading || page >= totalPages}
              className={`${buttonBase} bg-slate-950 text-white hover:bg-slate-800`}
            >
              Next <ChevronRight size={17} />
            </button>
          </nav>
        )}

      </div>

      <div
        aria-label={`${totalQuestions.toLocaleString('en-IN')} total questions`}
        title="Total questions"
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-black bg-slate-950 text-white shadow-xl sm:bottom-7 sm:right-7"
      >
        <span className="text-[10px] font-extrabold leading-none text-cyan-300">
          Q
        </span>
        <span className="mt-1 text-sm font-black leading-none tabular-nums">
          {totalQuestions.toLocaleString('en-IN')}
        </span>
      </div>

      {isAdmin && showDownloadTool && (
        <QuestionDownloadModal onClose={() => setShowDownloadTool(false)} />
      )}

      {/* Question viewer */}
      <AnimatePresence>
        {selectedQuestion && (
          <QuestionModal
            key={selectedQuestion._id}
            question={selectedQuestion}
            isAdmin={isAdmin}
            index={currentIndex}
            count={questions.length}
            onClose={() => setSelectedQuestion(null)}
            onPrevious={() => navigateQuestion(-1)}
            onNext={() => navigateQuestion(1)}
            actionQuestionId={actionQuestionId}
            onEdit={() => editQuestion(selectedQuestion)}
            onDelete={() => deleteQuestion(selectedQuestion)}
            onToggleBoard={() => updateBoardStatus(selectedQuestion)}
            onAttemptStatusChange={updateQuestionAttemptStatus}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

const QuestionCard = ({ question, index, onOpen }) => (
  (() => {
    const isDoneOnlyQuestion = ['diagram-based-question', 'complete-the-tables'].includes(question.objectiveType)
    const attemptStatus = isDoneOnlyQuestion && question.attemptStatus === 'wrong'
      ? null
      : question.attemptStatus

    return (
  <button
    type="button"
    onClick={onOpen}
    className={`group flex min-h-[150px] w-full flex-col rounded-2xl border p-4 text-left shadow-sm transition-colors duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 sm:min-h-[165px] sm:p-5 ${attemptStatus === 'correct' ? 'border-emerald-600 bg-emerald-100 hover:border-emerald-700 focus-visible:ring-emerald-200' : attemptStatus === 'wrong' ? 'border-rose-600 bg-rose-100 hover:border-rose-700 focus-visible:ring-rose-200' : 'border-slate-200/90 bg-white hover:border-cyan-300 focus-visible:ring-cyan-100'}`}
  >
    <div className="flex w-full items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold tabular-nums text-slate-600 transition-colors group-hover:bg-cyan-50 group-hover:text-cyan-800">
        {index}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={typeBadgeClasses}>
            {formatType(question.objectiveType)}
          </span>

          {question.isBoardQuestion && (
            <span className="inline-flex max-w-full items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-100">
              Board question
            </span>
          )}
        </div>

      <p className={`mt-3 line-clamp-3 break-words text-sm font-bold leading-6 sm:text-[15px] ${attemptStatus === 'correct' ? 'text-emerald-950' : attemptStatus === 'wrong' ? 'text-rose-950' : 'text-slate-800'}`}>
          {getQuestionTitle(question)}
        </p>

        {question.imageUrl && ['diagram-based-question', 'complete-the-tables'].includes(question.objectiveType) && (
          <div className="mt-3 h-16 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1.5 sm:h-20">
            <img
              src={assetUrl(question.imageUrl)}
              alt="Question preview"
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </div>
        )}
      </div>

      <Eye
        size={17}
        className="mt-1 shrink-0 text-slate-400 transition-colors group-hover:text-cyan-700"
      />
    </div>

    <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-xs text-slate-500">
      <span className="font-semibold text-slate-600">
        Ch. {question.chapterNumber || '-'}
      </span>
      <span className="text-slate-300">•</span>
      <span className="max-w-full truncate">
        {question.chapterName || 'No chapter'}
      </span>
      {question.topicName && (
        <>
          <span className="text-slate-300">•</span>
          <span className="max-w-full truncate">{question.topicName}</span>
        </>
      )}
    </div>
  </button>
    )
  })()
)

const FilterSelect = ({ value, onChange, options, ariaLabel, tone = 'cyan' }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const selectedLabel = options.find((option) => option.value === value)?.label || options[0]?.label
  const toneClasses = {
    cyan: {
      active: 'border-cyan-500 ring-4 ring-cyan-100',
      selected: 'bg-cyan-50 text-cyan-800',
      hover: 'hover:bg-cyan-50 hover:text-cyan-800',
    },
    violet: {
      active: 'border-violet-500 ring-4 ring-violet-100',
      selected: 'bg-violet-50 text-violet-800',
      hover: 'hover:bg-violet-50 hover:text-violet-800',
    },
    amber: {
      active: 'border-amber-500 ring-4 ring-amber-100',
      selected: 'bg-amber-50 text-amber-800',
      hover: 'hover:bg-amber-50 hover:text-amber-800',
    },
  }[tone]

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') setOpen(false)
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${open ? 'z-[100]' : 'z-0'}`}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-xs font-semibold text-slate-800 shadow-sm outline-none transition duration-200 hover:-translate-y-px hover:shadow-md focus:outline-none sm:h-12 sm:text-sm ${open ? toneClasses.active : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`ml-2 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[110] max-h-60 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_35px_rgba(15,23,42,0.14)]"
          >
            {options.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex min-h-10 w-full items-center rounded-xl px-3 text-left text-xs font-semibold transition-colors sm:text-sm ${value === option.value ? toneClasses.selected : `text-slate-700 ${toneClasses.hover}`}`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ImageViewer = ({ src, alt, onClose }) => {
  const [zoomed, setZoomed] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const lastTapRef = useRef(0)
  const dragRef = useRef(null)

  const toggleZoom = () => {
    setZoomed((current) => !current)
    setPan({ x: 0, y: 0 })
  }

  const handlePointerDown = (event) => {
    if (!zoomed) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    setPan({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    })
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
  }

  const handleTouchEnd = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      toggleZoom()
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex flex-col bg-slate-950/95 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen image viewer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex shrink-0 items-center justify-end gap-2">
        <a
          href={src}
          download
          aria-label="Download image"
          className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
        >
          <Download size={19} />
        </a>
        <button
          type="button"
          onClick={toggleZoom}
          aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
          className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
        >
          {zoomed ? <ZoomOut size={19} /> : <ZoomIn size={19} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen image"
          className="grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-900 transition hover:bg-slate-200"
        >
          <X size={19} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto py-3 sm:py-5">
        <img
          src={src}
          alt={alt}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={toggleZoom}
          onTouchEnd={handleTouchEnd}
          style={zoomed ? { transform: `scale(1.5) translate3d(${pan.x / 1.5}px, ${pan.y / 1.5}px, 0)` } : undefined}
          className={`max-h-full max-w-full select-none object-contain ${!isDragging ? 'transition-transform duration-200' : ''} ${zoomed ? 'max-h-none max-w-none cursor-grab touch-none' : 'cursor-zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
        />
      </div>

      <p className="shrink-0 text-center text-xs text-white/60">
        Double tap or double click to zoom
      </p>
    </div>
  )
}

const imageToDataUrl = async (url) => {
  if (!url) return ''
  const response = await fetch(assetUrl(url))
  if (!response.ok) return ''
  const blob = await response.blob()
  return await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => resolve('')
    reader.readAsDataURL(blob)
  })
}

class SimplePdf {
  constructor() {
    this.pages = [[]]
    this.currentPage = 0
    this.state = { fontSize: 10, color: [30, 41, 59], weight: 'normal' }
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }
  }

  get page() { return this.pages[this.currentPage] }
  setFont(_family, weight) { this.state.weight = weight; return this }
  setFontSize(size) { this.state.fontSize = size; return this }
  setTextColor(...color) { this.state.color = color; return this }
  setDrawColor(...color) { this.state.drawColor = color; return this }
  setProperties() { return this }
  addPage() { this.pages.push([]); this.currentPage += 1; return this }
  splitTextToSize(text, width) {
    const maxChars = Math.max(24, Math.floor((width * 3.78) / Math.max(this.state.fontSize * 0.55, 1)))
    const words = String(text || '').split(/\s+/)
    const lines = []
    let line = ''
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length > maxChars && line) { lines.push(line); line = word }
      else line = candidate
    })
    if (line) lines.push(line)
    return lines
  }
  text(lines, x, y) { this.page.push({ type: 'text', lines: Array.isArray(lines) ? lines : [lines], x, y, state: { ...this.state } }); return this }
  line(x1, y1, x2, y2) { this.page.push({ type: 'line', x1, y1, x2, y2, color: this.state.drawColor || [203, 213, 225] }); return this }
  getImageProperties() { return { width: 1600, height: 1000 } }
  addImage(dataUrl, x, y, width, height) { this.page.push({ type: 'image', dataUrl, x, y, width, height }); return this }

  async save(filename = '') {
    const canvases = []
    const scale = 3.78
    for (const operations of this.pages) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(210 * scale)
      canvas.height = Math.round(297 * scale)
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      for (const operation of operations) {
        if (operation.type === 'text') {
          context.fillStyle = `rgb(${operation.state.color.join(',')})`
          context.font = `${operation.state.weight === 'bold' ? '700' : '400'} ${operation.state.fontSize}px Cambria, Georgia, serif`
          operation.lines.forEach((line, index) => context.fillText(String(line), operation.x * scale, (operation.y + (index * operation.state.fontSize * 1.25 / scale)) * scale))
        } else if (operation.type === 'line') {
          context.strokeStyle = `rgb(${operation.color.join(',')})`
          context.beginPath(); context.moveTo(operation.x1 * scale, operation.y1 * scale); context.lineTo(operation.x2 * scale, operation.y2 * scale); context.stroke()
        } else if (operation.type === 'image') {
          await new Promise((resolve) => {
            const image = new Image()
            image.onload = () => { context.drawImage(image, operation.x * scale, operation.y * scale, operation.width * scale, operation.height * scale); resolve() }
            image.onerror = () => resolve()
            image.src = operation.dataUrl
          })
        }
      }
      canvases.push(canvas.toDataURL('image/jpeg', 0.92))
    }

    const encoder = new TextEncoder()
    const chunks = []
    const offsets = []
    let length = 0
    const add = (chunk) => { const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk; chunks.push(bytes); length += bytes.length }
    const object = (number, content) => { offsets[number] = length; add(`${number} 0 obj\n${content}\nendobj\n`) }
    const pageStart = 3
    const contentStart = pageStart + canvases.length
    const imageStart = contentStart + canvases.length
    add('%PDF-1.3\n%\xFF\xFF\xFF\xFF\n')
    object(1, '<< /Type /Catalog /Pages 2 0 R >>')
    object(2, `<< /Type /Pages /Kids [${canvases.map((_, index) => `${pageStart + index} 0 R`).join(' ')}] /Count ${canvases.length} >>`)
    canvases.forEach((dataUrl, index) => {
      const pageObject = pageStart + index
      const contentObject = contentStart + index
      const imageObject = imageStart + index
      object(pageObject, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 210 297] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`)
      const content = 'q\n210 0 0 297 0 0 cm\n/Im0 Do\nQ'
      object(contentObject, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`)
      const jpegBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (character) => character.charCodeAt(0))
      offsets[imageObject] = length
      add(`${imageObject} 0 obj\n<< /Type /XObject /Subtype /Image /Width 794 /Height 1123 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
      add(jpegBytes); add('\nendstream\nendobj\n')
    })
    const xrefOffset = length
    const objectCount = imageStart + canvases.length
    add(`xref\n0 ${objectCount}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
    const blob = new Blob(chunks, { type: 'application/pdf' })
    if (filename) {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    }
    return blob
  }
}

const jsPDF = SimplePdf

const QuestionDownloadModal = ({ onClose }) => {
  const [questions, setQuestions] = useState([])
  const [chapters, setChapters] = useState([])
  const [objectiveTypes, setObjectiveTypes] = useState([])
  const [chapterId, setChapterId] = useState('')
  const [selectedObjectiveTypes, setSelectedObjectiveTypes] = useState([])
  const [boardQuestion, setBoardQuestion] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedQuestionRecords, setSelectedQuestionRecords] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewAnswers, setPreviewAnswers] = useState(true)
  const [previewBlobUrl, setPreviewBlobUrl] = useState('')

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: 'all', all: '1' })
      if (chapterId) params.set('chapterId', chapterId)
      if (selectedObjectiveTypes.length) params.set('objectiveType', selectedObjectiveTypes.join(','))
      if (boardQuestion) params.set('boardQuestion', boardQuestion)
      const data = await apiRequest(`/api/questions?${params}`)
      setQuestions((data.questions || []).filter((question) => question.objectiveType !== 'match-the-following'))
      setChapters(data.chapters || [])
      setObjectiveTypes((data.objectiveTypes || []).filter((type) => type !== 'match-the-following'))
    } catch (requestError) {
      setError(requestError.message || 'Could not load questions for download.')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [boardQuestion, chapterId, selectedObjectiveTypes])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    }
  }, [previewBlobUrl])

  const allSelected = questions.length > 0 && questions.every((question) => selectedIds.has(String(question._id)))
  const selectedQuestions = useMemo(() => Array.from(selectedQuestionRecords.values()), [selectedQuestionRecords])

  const toggleAll = () => {
    const visibleIds = new Set(questions.map((question) => String(question._id)))
    setSelectedIds((current) => {
      const next = new Set(current)
      visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
    setSelectedQuestionRecords((current) => {
      const next = new Map(current)
      questions.forEach((question) => {
        const id = String(question._id)
        if (allSelected) next.delete(id)
        else next.set(id, question)
      })
      return next
    })
  }

  const toggleQuestion = (question) => {
    const questionId = String(question._id)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
    setSelectedQuestionRecords((current) => {
      const next = new Map(current)
      if (next.has(questionId)) next.delete(questionId)
      else next.set(questionId, question)
      return next
    })
  }

  const clearQuestionSelection = () => {
    setSelectedIds(new Set())
    setSelectedQuestionRecords(new Map())
    setShowPreview(false)
    setPreviewBlobUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
  }

  const createPdfBlob = async (withAnswers) => {
    if (!selectedQuestions.length) return

    setError('')
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      let y = margin

      const ensureSpace = (height) => {
        if (y + height > pageHeight - margin) {
          pdf.addPage()
          y = margin
        }
      }

      const addWrapped = (text, size = 10, color = [30, 41, 59], weight = 'normal', gap = 5) => {
        pdf.setFont('helvetica', weight)
        pdf.setFontSize(size)
        pdf.setTextColor(...color)
        const lines = pdf.splitTextToSize(String(text || ''), contentWidth)
        const lineHeight = (size * 1.25) / 3.78
        ensureSpace((lines.length * lineHeight) + gap)
        pdf.text(lines, margin, y)
        y += (lines.length * lineHeight) + gap
      }

      const addImage = async (url, maxHeight = 72) => {
        const dataUrl = await imageToDataUrl(url)
        if (!dataUrl) return
        try {
          const properties = pdf.getImageProperties(dataUrl)
          const maxWidth = contentWidth
          const ratio = Math.min(maxWidth / properties.width, maxHeight / properties.height, 1)
          const width = properties.width * ratio
          const height = properties.height * ratio
          ensureSpace(height + 8)
          pdf.addImage(dataUrl, margin + ((contentWidth - width) / 2), y, width, height)
          y += height + 7
        } catch {
          // An unsupported image format should not prevent the text PDF from downloading.
        }
      }

      pdf.setProperties({ title: 'Question Bank Export', author: 'Innovative Science 2' })
      await addImage(logo, 26)
      addWrapped('Innovative Science 2', 14, [15, 23, 42], 'bold', 4)
      addWrapped('Question Bank', 14, [15, 23, 42], 'bold', 8)
      addWrapped(`${selectedQuestions.length} selected question${selectedQuestions.length === 1 ? '' : 's'}${withAnswers ? ' with answers' : ' without answers'}`, 10, [71, 85, 105], 'normal', 10)

      let previousObjectiveType = ''
      for (let index = 0; index < selectedQuestions.length; index += 1) {
        const question = selectedQuestions[index]
        if (question.objectiveType !== previousObjectiveType) {
          if (index > 0) y += 5
          addWrapped(pdfObjectiveHeading(question.objectiveType), 14, [8, 145, 178], 'bold', 6)
          previousObjectiveType = question.objectiveType
        }
        ensureSpace(24)
        pdf.setDrawColor(203, 213, 225)
        pdf.line(margin, y, pageWidth - margin, y)
        y += 7
        addWrapped(`${index + 1}. ${getQuestionTitle(question)}`, 14, [15, 23, 42], 'bold', 8)
        if (!question.isTheoryQuestion && !['complete-the-tables', 'diagram-based-question'].includes(question.objectiveType) && question.options?.length) {
          question.options.forEach((option, optionIndex) => {
            addWrapped(`${String.fromCharCode(65 + optionIndex)}. ${option}`, 12, [51, 65, 85], 'normal', 2)
          })
          y += 5
        }
        if (question.imageUrl) await addImage(question.imageUrl)
        if (withAnswers) {
          if (question.isTheoryQuestion && question.answer) addWrapped(`Answer: ${question.answer}`, 12, [6, 78, 59], 'normal', 4)
          if (!question.isTheoryQuestion && !['complete-the-tables', 'diagram-based-question'].includes(question.objectiveType) && question.correctOption !== undefined && question.options?.[Number(question.correctOption)]) {
            addWrapped(`Answer: ${question.options[Number(question.correctOption)]}`, 12, [6, 78, 59], 'normal', 4)
          }
          if (question.solution) addWrapped(`Solution: ${question.solution}`, 12, [6, 78, 59], 'normal', 4)
          if (question.answerImageUrl) await addImage(question.answerImageUrl)
        }
      }

      return await pdf.save()
    } catch (downloadError) {
      setError(downloadError.message || 'Could not create the PDF.')
      return null
    }
  }

  const downloadPdf = async (withAnswers) => {
    if (!selectedQuestions.length || downloading) return
    setDownloading(withAnswers ? 'answers' : 'questions')
    const blob = await createPdfBlob(withAnswers)
    if (blob) {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `question-bank-${withAnswers ? 'with-answers' : 'questions'}-${new Date().toISOString().slice(0, 10)}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
      clearQuestionSelection()
    }
    setDownloading('')
  }

  const previewPdf = async (withAnswers = previewAnswers) => {
    if (!selectedQuestions.length || downloading) return
    setDownloading('preview')
    const blob = await createPdfBlob(withAnswers)
    if (blob) {
      setPreviewBlobUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setPreviewAnswers(withAnswers)
      setShowPreview(true)
    }
    setDownloading('')
  }

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="download-questions-title" className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h2 id="download-questions-title" className="text-xl font-black text-slate-950 sm:text-2xl">Download questions</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Admin only · filter, select, and export the question bank.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close download questions" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={18} /></button>
        </div>

        <div className="shrink-0 grid gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-3 sm:p-5">
          <label className="grid gap-1 text-xs font-black text-slate-600">Chapter<select value={chapterId} onChange={(event) => setChapterId(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">All chapters</option>{chapters.sort(compareChapterNumbers).map((chapter) => <option key={chapter._id} value={chapter._id}>Ch. {chapter.number}: {chapter.name}</option>)}</select></label>
          <div className="grid gap-1 text-xs font-black text-slate-600"><span>Objective types</span><div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">{[...objectiveTypes].sort((a, b) => formatType(a).localeCompare(formatType(b))).map((type) => <label key={type} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-slate-50"><input type="checkbox" checked={selectedObjectiveTypes.includes(type)} onChange={() => setSelectedObjectiveTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])} className="h-4 w-4 accent-cyan-600" />{formatType(type)}</label>)}{!objectiveTypes.length && <span className="block px-2 py-1 text-xs text-slate-400">No objective types available</span>}</div><button type="button" onClick={() => setSelectedObjectiveTypes([])} disabled={!selectedObjectiveTypes.length} className="text-left text-[10px] font-black text-cyan-700 disabled:opacity-40">{selectedObjectiveTypes.length ? `Clear selected (${selectedObjectiveTypes.length})` : 'All objective types'}</button></div>
          <label className="grid gap-1 text-xs font-black text-slate-600">Board status<select value={boardQuestion} onChange={(event) => setBoardQuestion(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">All questions</option><option value="yes">Board questions</option><option value="no">Non-board questions</option></select></label>
        </div>

        {showPreview && (
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">PDF preview</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{selectedQuestions.length} selected question{selectedQuestions.length === 1 ? '' : 's'} · check the layout before downloading.</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"><input type="checkbox" checked={previewAnswers} onChange={(event) => { const value = event.target.checked; setPreviewAnswers(value); if (showPreview) previewPdf(value) }} className="h-4 w-4 accent-emerald-600" />Preview answers</label>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 sm:p-3">
              {downloading === 'preview' && !previewBlobUrl ? <div className="grid h-full min-h-96 place-items-center text-sm font-bold text-slate-500"><LoaderCircle className="mr-2 animate-spin" size={20} />Preparing preview...</div> : previewBlobUrl ? <iframe title="Question PDF preview" src={previewBlobUrl} className="h-full min-h-96 w-full rounded-xl bg-white" /> : <div className="grid h-full min-h-96 place-items-center text-sm font-bold text-slate-500">Click Preview selected to generate the PDF preview.</div>}
            </div>
            <div className="hidden mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-5">
              <div className="mx-auto grid max-w-3xl gap-4">
                {selectedQuestions.map((question, index) => (
                  <article key={question._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Question {index + 1} · {formatType(question.objectiveType)} · {question.isBoardQuestion ? 'Board question' : 'Non-board question'}</p>
                    <h3 className="mt-3 whitespace-pre-wrap break-words text-base font-black leading-7 text-slate-950 sm:text-lg">{getQuestionTitle(question)}</h3>
                    {question.imageUrl && <img src={assetUrl(question.imageUrl)} alt="Question" className="mt-4 max-h-72 w-full rounded-xl border border-slate-200 object-contain" />}
                    {previewAnswers && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Answer</p>{question.answer && <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-emerald-950">{question.answer}</p>}{question.correctOption !== undefined && question.options?.[Number(question.correctOption)] && <p className="mt-2 text-sm font-bold text-emerald-950">{question.options[Number(question.correctOption)]}</p>}{question.solution && <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-emerald-950">{question.solution}</p>}{question.answerImageUrl && <img src={assetUrl(question.answerImageUrl)} alt="Answer" className="mt-3 max-h-72 w-full rounded-xl object-contain" />}</div>}
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {!showPreview && <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-sm font-black text-slate-800">{loading ? 'Loading...' : `${questions.length} question${questions.length === 1 ? '' : 's'} found · ${selectedIds.size} selected`}</p><p className="mt-1 text-xs font-semibold text-slate-500">Objectives: {selectedObjectiveTypes.length ? selectedObjectiveTypes.map(formatType).join(', ') : 'All objectives'}</p></div>
            <button type="button" onClick={toggleAll} disabled={loading || !questions.length} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100 disabled:opacity-40">{allSelected ? 'Clear all' : 'Select all'}</button>
          </div>
          {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200">
            {loading ? <p className="p-8 text-center text-sm font-semibold text-slate-500">Loading questions...</p> : questions.length ? questions.map((question, index) => <label key={question._id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50"><input type="checkbox" checked={selectedIds.has(String(question._id))} onChange={() => toggleQuestion(question)} className="mt-1 h-4 w-4 accent-cyan-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400"><span>{index + 1}. {formatType(question.objectiveType)}</span>{question.isBoardQuestion && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Board</span>}</span><span className="mt-1 block break-words text-sm font-bold text-slate-800">{getQuestionTitle(question)}</span>{['diagram-based-question', 'complete-the-tables'].includes(question.objectiveType) && question.imageUrl && <img src={assetUrl(question.imageUrl)} alt="Question preview" className="mt-2 h-12 w-20 rounded-lg border border-slate-200 bg-white object-contain" />}<span className="mt-1 block text-xs font-semibold text-slate-500">{question.chapterName ? `Chapter ${question.chapterNumber}: ${question.chapterName}` : 'Chapter not specified'}</span></span></label>) : <p className="p-8 text-center text-sm font-semibold text-slate-500">No questions match these filters.</p>}
          </div>
        </div>}

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-5">
          {showPreview ? <button type="button" onClick={() => setShowPreview(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 hover:bg-slate-50">Back to selection</button> : <button type="button" onClick={() => previewPdf(previewAnswers)} disabled={!selectedQuestions.length || loading || Boolean(downloading)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-black text-cyan-800 hover:bg-cyan-100 disabled:opacity-40">{downloading === 'preview' ? <LoaderCircle className="animate-spin" size={16} /> : <Eye size={16} />}{downloading === 'preview' ? 'Preparing preview...' : 'Preview selected'}</button>}
          <button type="button" onClick={clearQuestionSelection} disabled={!selectedIds.size || Boolean(downloading)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-40">Clear selected</button>
          <button type="button" onClick={() => downloadPdf(false)} disabled={!selectedIds.size || Boolean(downloading)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800 hover:bg-slate-50 disabled:opacity-40">{downloading === 'questions' ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}{downloading === 'questions' ? 'Preparing download...' : 'Download without answers'}</button>
          <button type="button" onClick={() => downloadPdf(true)} disabled={!selectedIds.size || Boolean(downloading)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-40">{downloading === 'answers' ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}{downloading === 'answers' ? 'Preparing download...' : 'Download with answers'}</button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

const QuestionModal = ({
  question,
  isAdmin,
  index,
  count,
  onClose,
  onPrevious,
  onNext,
  actionQuestionId,
  onEdit,
  onDelete,
  onToggleBoard,
  onAttemptStatusChange,
}) => {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageViewer, setImageViewer] = useState(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const [answerDone, setAnswerDone] = useState(false)

  const options = question.options || []
  const isImageAnswerQuestion = ['diagram-based-question', 'complete-the-tables'].includes(question.objectiveType)

  const correctAnswerText = useMemo(() => {
    if (question.isTheoryQuestion) return question.answer || 'No answer text provided'
    if (question.correctOption === undefined || question.correctOption === null) {
      return 'Not specified'
    }

    return options[Number(question.correctOption)] ?? 'Not specified'
  }, [options, question.correctOption])

  useEffect(() => {
    setSelected(null)
    setSubmitted(false)
    setCorrect(null)
    setError('')
    setSaving(false)
    setImageViewer(null)
    setAnswerRevealed(false)
    setAnswerDone(false)
  }, [question._id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (imageViewer) {
          setImageViewer(null)
        } else {
          onClose()
        }
        return
      }

      if (
        event.key === 'ArrowLeft' &&
        index > 0 &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName
        )
      ) {
        onPrevious()
      }

      if (
        event.key === 'ArrowRight' &&
        index >= 0 &&
        index < count - 1 &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName
        )
      ) {
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onPrevious, onNext, index, count, imageViewer])

  const submit = async (optionOverride = selected) => {
    if (optionOverride === null || saving) return

    setSaving(true)
    setError('')

    try {
      const data = await apiRequest(
        `/api/objective-types/${question.objectiveTypeId}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            answers: [
              {
                questionId: question._id,
                selectedOption: optionOverride,
              },
            ],
          }),
        }
      )

      const answer = (data.correctAnswers || []).find(
        (item) =>
          String(item.questionId) === String(question._id)
      )

      setCorrect(
        answer
          ? Number(answer.correctOption) === Number(optionOverride)
          : null
      )

      if (answer) {
        onAttemptStatusChange?.(
          question._id,
          Number(answer.correctOption) === Number(optionOverride) ? 'correct' : 'wrong',
        )
      }

      setSubmitted(true)
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
    } catch (err) {
      setError(
        err.message || 'Please sign in to practise this question.'
      )
    } finally {
      setSaving(false)
    }
  }

  const retry = () => {
    setSelected(null)
    setSubmitted(false)
    setCorrect(null)
    setError('')
  }

  const chooseOption = (optionIndex) => {
    if (isAdmin || submitted) return
    setSelected(optionIndex)
    setError('')
    submit(optionIndex)
  }

  const revealAnswer = () => {
    setAnswerRevealed((current) => {
      const nextVisible = !current
      if (nextVisible) {
        window.setTimeout(() => {
          document.getElementById(`question-bank-answer-${question._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 80)
      }
      return nextVisible
    })
  }

  const markAnswerDone = () => {
    setAnswerDone(true)
    onAttemptStatusChange?.(question._id, 'correct')
  }

  const optionStyle = (optionIndex) => {
    const isSelected = selected === optionIndex
    const isCorrectOption =
      isAdmin &&
      Number(question.correctOption) === optionIndex

    if (submitted && isSelected && correct === true) {
      return 'border-emerald-500 bg-emerald-500 text-white ring-2 ring-emerald-100'
    }

    if (submitted && isSelected && correct === false) {
      return 'border-rose-500 bg-rose-500 text-white ring-2 ring-rose-100'
    }

    if (isCorrectOption) {
      return 'border-emerald-400 bg-emerald-50 text-emerald-900'
    }

    if (isSelected) {
      return 'border-cyan-500 bg-cyan-500 text-white ring-2 ring-cyan-100'
    }

    return 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-slate-50'
  }

  const progress = count > 0 && index >= 0
    ? ((index + 1) / count) * 100
    : 0

  return (
    <motion.div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-modal-title"
        initial={{ opacity: 0, y: 30, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.99 }}
        transition={{ duration: 0.2 }}
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl"
      >
        {/* Modal header */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-4 pb-3 pt-3 sm:px-6 sm:pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={typeBadgeClasses}>
                  {formatType(question.objectiveType)}
                </span>

                {question.isBoardQuestion && (
                  <span className="inline-flex max-w-full items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-100">
                    Board question
                  </span>
                )}

                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                    <Shield size={12} />
                    Admin preview
                  </span>
                )}
              </div>

              <p className="mt-2 break-words text-xs leading-5 text-slate-500 sm:text-sm">
                {question.chapterName
                  ? `Chapter ${question.chapterNumber || '-'}: ${question.chapterName}`
                  : 'Chapter not specified'}
                {question.topicName ? ` · ${question.topicName}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close question"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              <X size={19} />
            </button>
          </div>

          {index >= 0 && count > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700">
                  Question {index + 1} of {count}
                </span>
                <span className="text-slate-400">
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-cyan-600"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable question content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <h2
            id="question-modal-title"
            className="break-words text-lg font-extrabold leading-8 text-slate-950 sm:text-xl sm:leading-9"
          >
            {getQuestionTitle(question)}
          </h2>

          {question.imageUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-4">
              <button
                type="button"
                onClick={() => setImageViewer({ src: assetUrl(question.imageUrl), alt: 'Question illustration' })}
                className="block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                aria-label="Open question image fullscreen"
              >
                <img
                  src={assetUrl(question.imageUrl)}
                  alt="Question illustration"
                  loading="lazy"
                  className="mx-auto max-h-[45vh] w-full object-contain"
                />
              </button>
            </div>
          )}

          {question.isTheoryQuestion && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Answer / solution</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-emerald-950">{question.answer || 'No answer text provided.'}</p>
              {question.answerImageUrl && (
                <button
                  type="button"
                  onClick={() => setImageViewer({ src: assetUrl(question.answerImageUrl), alt: 'Answer solution' })}
                  className="mt-4 block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                  aria-label="Open answer solution image fullscreen"
                >
                  <img src={assetUrl(question.answerImageUrl)} alt="Answer solution" className="max-h-[45vh] w-full object-contain" />
                </button>
              )}
            </div>
          )}

          {isImageAnswerQuestion ? (
            <div className="mt-5 grid gap-3">
              {answerRevealed && (
                <div id={`question-bank-answer-${question._id}`} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-800">Answer</p>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Correct answer</p>
                  {question.answerImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setImageViewer({ src: assetUrl(question.answerImageUrl), alt: 'Correct answer' })}
                      className="mt-3 block w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                      aria-label="Open correct answer image fullscreen"
                    >
                      <img src={assetUrl(question.answerImageUrl)} alt="Correct answer" className="max-h-[45vh] w-full rounded-xl object-contain" />
                    </button>
                  ) : question.solution ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-emerald-950">{question.solution}</p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-emerald-950">Answer image is not available yet.</p>
                  )}
                </div>
              )}

              {answerRevealed && (
                <button
                  type="button"
                  onClick={markAnswerDone}
                  className={`min-h-12 w-full rounded-2xl border text-sm font-extrabold transition ${answerDone ? 'border-emerald-600 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50'}`}
                >
                  {answerDone ? 'Done ✓' : 'Done'}
                </button>
              )}
            </div>
          ) : !question.isTheoryQuestion && options.length > 0 ? (
            <div className="mt-5 space-y-2.5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAdmin ? 'Answer options' : 'Choose your answer'}
              </p>

              {options.map((option, optionIndex) => {
                const isSelected = selected === optionIndex

                return (
                  <button
                    key={`${option}-${optionIndex}`}
                    type="button"
                    disabled={isAdmin || submitted}
                    onClick={() => chooseOption(optionIndex)}
                    aria-pressed={isSelected}
                    className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border p-3.5 text-left text-sm leading-6 transition-all duration-150 sm:p-4 ${optionStyle(optionIndex)} disabled:cursor-default`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current/10 bg-white/80 text-xs font-extrabold">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>

                    <span className="min-w-0 flex-1 break-words pt-0.5 font-semibold">
                      {option}
                    </span>

                    {isSelected && submitted && (
                      <CheckCircle2
                        size={19}
                        className="mt-1 shrink-0"
                      />
                    )}

                    {isSelected && !submitted && (
                      <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-current">
                        <span className="h-2 w-2 rounded-full bg-current" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : question.isTheoryQuestion ? null : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {question.imageUrl
                ? 'Review the question image above.'
                : 'No answer options are available for this question.'}
            </div>
          )}

          {/* Selecting an option submits automatically; result is shown on the option itself. */}

          {error && (
            <p
              role="alert"
              className="mt-3 break-words rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </p>
          )}

          {/* Admin answer key */}
          {isAdmin && (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onEdit} disabled={Boolean(actionQuestionId)} className={`${buttonBase} flex-1 border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 sm:flex-none`}>
                  <Edit3 size={16} />
                  Edit
                </button>
                <button type="button" onClick={onDelete} disabled={Boolean(actionQuestionId)} className={`${buttonBase} flex-1 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 sm:flex-none`}>
                  <Trash2 size={16} />
                  Delete
                </button>
                <button type="button" onClick={onToggleBoard} disabled={Boolean(actionQuestionId)} className={`${buttonBase} flex-1 border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 sm:flex-none`}>
                  <Award size={16} />
                  {actionQuestionId ? 'Saving...' : question.isBoardQuestion ? 'Remove board status' : 'Make board question'}
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={18}
                  className="shrink-0 text-emerald-700"
                />
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  Correct answer
                </p>
              </div>

              <p className="mt-2 break-words text-sm font-bold leading-6 text-emerald-950">
                {correctAnswerText}
              </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom navigation */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
          <div className={`grid gap-2.5 ${isImageAnswerQuestion ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              type="button"
              onClick={onPrevious}
              disabled={index <= 0}
              className={`${buttonBase} min-w-0 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ${isImageAnswerQuestion ? 'px-2 text-xs sm:px-4 sm:text-sm' : ''}`}
            >
              <ChevronLeft size={18} />
              <span className="truncate">Previous</span>
            </button>

            {isImageAnswerQuestion && (
              <button
                type="button"
                onClick={revealAnswer}
                className={`min-w-0 rounded-xl border px-2 text-xs font-extrabold transition sm:px-3 sm:text-sm ${answerRevealed ? 'border-emerald-600 bg-emerald-500 text-white hover:bg-emerald-600' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
              >
                <span className="truncate">{answerRevealed ? 'Hide answer' : 'Show answer'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              disabled={index < 0 || index >= count - 1}
              className={`${buttonBase} min-w-0 bg-slate-950 text-white hover:bg-slate-800 ${isImageAnswerQuestion ? 'px-2 text-xs sm:px-4 sm:text-sm' : ''}`}
            >
              <span className="truncate">Next question</span>
              <ChevronRight size={18} />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-400 sm:text-xs">
            Use the buttons to navigate between questions
          </p>
        </div>
      </motion.section>

      <AnimatePresence>
        {imageViewer && (
          <ImageViewer
            key={imageViewer.src}
            src={imageViewer.src}
            alt={imageViewer.alt}
            onClose={() => setImageViewer(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default AdminQuestionListPage  
