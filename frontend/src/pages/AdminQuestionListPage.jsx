
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { apiRequest, assetUrl } from '../api'
import { getStoredAuth } from '../authStorage'

const labels = {
  mcqs: 'MCQs',
  'true-or-false': 'True or False',
  'match-the-following': 'Match the following',
  'odd-man-out': 'Odd man out',
  correlation: 'Correlation',
  'complete-the-tables': 'Complete the tables',
  'diagram-based-question': 'Diagram based',
  'identify-symbol': 'Identify symbol',
  numericals: 'Numericals',
}

const formatType = (type) =>
  labels[type] || String(type || 'Question').replaceAll('-', ' ')

const objectiveTypeOrder = [
  'mcqs',
  'true-or-false',
  'match-the-following',
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

  const [questions, setQuestions] = useState([])
  const [chapters, setChapters] = useState([])
  const [objectiveTypes, setObjectiveTypes] = useState([])

  const [search, setSearch] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [objectiveType, setObjectiveType] = useState('')
  const [boardQuestion, setBoardQuestion] = useState('')
  const [totalQuestions, setTotalQuestions] = useState(0)

  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef(null)

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        limit: 'all',
      })

      if (search.trim()) params.set('search', search.trim())
      if (chapterId) params.set('chapterId', chapterId)
      if (objectiveType) params.set('objectiveType', objectiveType)
      if (boardQuestion) params.set('boardQuestion', boardQuestion)

      const data = await apiRequest(`/api/questions?${params}`)

      setQuestions(data.questions || [])
      setChapters(data.chapters || [])
      setObjectiveTypes(data.objectiveTypes || [])
      setTotalQuestions(Number(data.totalQuestions || 0))
    } catch (err) {
      setError(err.message || 'Could not load questions.')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [boardQuestion, chapterId, objectiveType, search])

  useEffect(() => {
    const timeout = setTimeout(loadQuestions, 300)
    return () => clearTimeout(timeout)
  }, [loadQuestions])

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

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
            <motion.div
              layout
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {questions.map((question, itemIndex) => (
                  <QuestionCard
                    key={question._id}
                    question={question}
                    index={itemIndex + 1}
                    onOpen={() => openQuestion(question)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
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
          />
        )}
      </AnimatePresence>
    </main>
  )
}

const QuestionCard = ({ question, index, onOpen }) => (
  <motion.button
    layout
    type="button"
    onClick={onOpen}
    whileTap={{ scale: 0.99 }}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -5 }}
    transition={{ duration: 0.18 }}
    className="group flex min-h-[150px] w-full flex-col rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-sm transition-colors duration-200 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 sm:min-h-[165px] sm:p-5"
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

        <p className="mt-3 line-clamp-3 break-words text-sm font-bold leading-6 text-slate-800 sm:text-[15px]">
          {getQuestionTitle(question)}
        </p>
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
  </motion.button>
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

const QuestionModal = ({
  question,
  isAdmin,
  index,
  count,
  onClose,
  onPrevious,
  onNext,
}) => {
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const options = question.options || []

  const correctAnswerText = useMemo(() => {
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
  }, [question._id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()

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
  }, [onClose, onPrevious, onNext, index, count])

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

      setSubmitted(true)
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
              <img
                src={assetUrl(question.imageUrl)}
                alt="Question illustration"
                loading="lazy"
                className="mx-auto max-h-[45vh] w-full object-contain"
              />
            </div>
          )}

          {options.length > 0 ? (
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
          ) : (
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
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
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
          )}
        </div>

        {/* Fixed bottom navigation */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onPrevious}
              disabled={index <= 0}
              className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={index < 0 || index >= count - 1}
              className={`${buttonBase} bg-slate-950 text-white hover:bg-slate-800`}
            >
              Next question
              <ChevronRight size={18} />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-400 sm:text-xs">
            Use the buttons to navigate between questions
          </p>
        </div>
      </motion.section>
    </motion.div>
  )
}

export default AdminQuestionListPage  
