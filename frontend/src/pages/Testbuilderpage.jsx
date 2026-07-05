import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Circle, Flag, Sparkles, X } from 'lucide-react'
import { apiRequest, assetUrl } from '../api'
import { getStoredAuth } from '../authStorage'
import StarFeedbackModal from '../components/StarFeedbackModal'
import { buildSelectionKey, readJsonCache, writeJsonCache } from '../lib/cacheStorage'
import { hasFeedbackFlowBeenSubmitted } from '../lib/feedbackFlow'

const objectiveLabels = {
  mcqs: 'MCQs',
  'true-or-false': 'True or False',
  correlation: 'Correlation',
  'match-the-following': 'Match the Following',
  'complete-the-tables': 'Complete the Tables',
  'diagram-based-question': 'Diagram Based',
}

const shuffleArray = (items) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

const shuffleMatchOptions = (options) => {
  const indexed = options.map((option, index) => ({ text: option, originalIndex: index }))
  return indexed.length <= 1 ? indexed : shuffleArray(indexed)
}

const buildBalancedPlan = (types = [], count = 0) => {
  if (!types.length) return []

  const total = Math.max(Number(count) || 0, 0)
  const base = Math.floor(total / types.length)
  const remainder = total % types.length

  return types.map((type, index) => ({
    type,
    count: base + (index < remainder ? 1 : 0),
  }))
}

const InfoCard = ({ label, value, tone = 'slate' }) => (
  <div className={`rounded-3xl border p-4 ${tone === 'violet' ? 'border-violet-100 bg-violet-50' : tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' : tone === 'cyan' ? 'border-cyan-100 bg-cyan-50' : 'border-slate-200 bg-slate-50'}`}>
    <p className={`text-xs font-black uppercase tracking-[0.22em] ${tone === 'violet' ? 'text-violet-700' : tone === 'emerald' ? 'text-emerald-700' : tone === 'cyan' ? 'text-cyan-700' : 'text-slate-400'}`}>
      {label}
    </p>
    <p className={`mt-2 text-2xl font-black ${tone === 'violet' ? 'text-violet-950' : tone === 'emerald' ? 'text-emerald-950' : tone === 'cyan' ? 'text-cyan-950' : 'text-slate-950'}`}>
      {value}
    </p>
  </div>
)

const ResultCard = ({ label, value, tone }) => (
  <div className={`rounded-3xl border p-4 ${tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' : tone === 'rose' ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
    <p className={`text-xs font-black uppercase tracking-[0.22em] ${tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-amber-700'}`}>
      {label}
    </p>
    <p className={`mt-2 text-3xl font-black ${tone === 'emerald' ? 'text-emerald-950' : tone === 'rose' ? 'text-rose-950' : 'text-amber-950'}`}>
      {value}
    </p>
  </div>
)

const TEST_BUILDER_CACHE_KEY = 'innovative_science_2_test_builder_cache'

const readBuilderCache = () => readJsonCache(TEST_BUILDER_CACHE_KEY)

const writeBuilderCache = (payload) => {
  const existing = readBuilderCache() || {}
  writeJsonCache(TEST_BUILDER_CACHE_KEY, {
    ...existing,
    ...payload,
  })
}

const Testbuilderpage = () => {
  const cachedBuilder = useMemo(() => readBuilderCache(), [])
  const cachedSelectionKey = buildSelectionKey(cachedBuilder?.selectedChapters || [])
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [chapters, setChapters] = useState(() => Array.isArray(cachedBuilder?.chapters) ? cachedBuilder.chapters : [])
  const [availableTypes, setAvailableTypes] = useState(
    () => cachedBuilder?.availableTypesBySelection?.[cachedSelectionKey] || [],
  )
  const [selectedChapters, setSelectedChapters] = useState(() => cachedBuilder?.selectedChapters || [])
  const [selectedTypes, setSelectedTypes] = useState(() => cachedBuilder?.selectedTypes || [])
  const [questionCount, setQuestionCount] = useState(() => Number(cachedBuilder?.questionCount || 10))
  const [step, setStep] = useState(() => Number(cachedBuilder?.step || 1))
  const [generatedTest, setGeneratedTest] = useState(null)
  const [answers, setAnswers] = useState({})
  const [revealedAnswers, setRevealedAnswers] = useState({})
  const [doneStates, setDoneStates] = useState({})
  const [markedLater, setMarkedLater] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [error, setError] = useState('')
  const [pendingResult, setPendingResult] = useState(null)
  const [feedbackPromptStage, setFeedbackPromptStage] = useState('')
  const [loading, setLoading] = useState(
    () => !Array.isArray(cachedBuilder?.chapters) || !cachedBuilder.chapters.length,
  )
  // New state for controlling the mobile popup/wizard flow
  const [mobileWizard, setMobileWizard] = useState(false)
  const selectedQuestionCount = useMemo(() => Math.max(Number(questionCount) || 10, 1), [questionCount])
  const plannedDistribution = useMemo(
    () => buildBalancedPlan(selectedTypes, selectedQuestionCount),
    [selectedTypes, selectedQuestionCount],
  )

  useEffect(() => {
    const hasCachedChapters = Array.isArray(cachedBuilder?.chapters) && cachedBuilder.chapters.length > 0

    const loadChapters = async ({ silent = false } = {}) => {
      if (!silent || !hasCachedChapters) {
        setLoading(true)
      }

      if (!silent) {
        setError('')
      }

      try {
        const data = await apiRequest('/api/chapters')
        const nextChapters = Array.isArray(data.chapters) ? data.chapters : []
        setChapters(nextChapters)
        writeBuilderCache({
          chapters: nextChapters,
        })
      } catch (err) {
        if (!hasCachedChapters) {
          setError(err.message)
        }
      } finally {
        if (!silent || !hasCachedChapters) {
          setLoading(false)
        }
      }
    }

    if (hasCachedChapters) {
      setChapters(cachedBuilder.chapters)
      setLoading(false)
    }

    loadChapters({ silent: hasCachedChapters })
  }, [cachedBuilder?.chapters])

  useEffect(() => {
    setAuth(getStoredAuth())
  }, [])

  useEffect(() => {
    const loadTypes = async () => {
      if (!selectedChapters.length) {
        setAvailableTypes([])
        setSelectedTypes([])
        writeBuilderCache({
          selectedChapters: [],
          selectedTypes: [],
          availableTypesBySelection: {
            ...(readBuilderCache()?.availableTypesBySelection || {}),
          },
        })
        return
      }

      const selectionKey = buildSelectionKey(selectedChapters)
      const cachedState = readBuilderCache() || {}
      const cachedTypes = cachedState.availableTypesBySelection?.[selectionKey]

      if (Array.isArray(cachedTypes) && cachedTypes.length) {
        setAvailableTypes(cachedTypes)
        setSelectedTypes((current) => current.filter((type) => cachedTypes.some((item) => item.type === type)))
      }

      try {
        const data = await apiRequest(`/api/test-builder/options?chapters=${selectedChapters.join(',')}`)
        const nextTypes = data.objectiveTypes || []
        setAvailableTypes(nextTypes)
        setSelectedTypes((current) => current.filter((type) => nextTypes.some((item) => item.type === type)))
        writeBuilderCache({
          availableTypesBySelection: {
            ...(cachedState.availableTypesBySelection || {}),
            [selectionKey]: nextTypes,
          },
        })
      } catch (err) {
        if (!Array.isArray(cachedTypes) || !cachedTypes.length) {
          setError(err.message)
        }
      }
    }

    loadTypes()
  }, [selectedChapters])

  useEffect(() => {
    const selectionKey = buildSelectionKey(selectedChapters)
    const cachedState = readBuilderCache() || {}

    writeBuilderCache({
      chapters,
      selectedChapters,
      selectedTypes,
      questionCount: selectedQuestionCount,
      step,
      availableTypesBySelection: {
        ...(cachedState.availableTypesBySelection || {}),
        [selectionKey]: availableTypes,
      },
    })
  }, [chapters, selectedChapters, selectedTypes, questionCount, selectedQuestionCount, step, availableTypes])
  const currentQuestion = generatedTest?.questions?.[currentIndex]
  const answeredCount = generatedTest?.questions?.filter((question) => {
    if (question.objectiveType === 'match-the-following') {
      const answer = answers[question.id]
      return Array.isArray(answer) && answer.length === (question.pairs?.length || question.options?.length || 0)
    }

    if (question.objectiveType === 'complete-the-tables') {
      return Boolean(doneStates[question.id] || answers[question.id] !== undefined)
    }

    return answers[question.id] !== undefined
  }).length || 0
  const markedLaterCount = Object.keys(markedLater).length
  const remainingCount = Math.max((generatedTest?.questions?.length || 0) - answeredCount, 0)

  const progressPercent = generatedTest?.questions?.length
    ? Math.round((answeredCount / generatedTest.questions.length) * 100)
    : 0

  const resetRunState = () => {
    setGeneratedTest(null)
    setAnswers({})
    setRevealedAnswers({})
    setDoneStates({})
    setMarkedLater({})
    setCurrentIndex(0)
    setResult(null)
    setPendingResult(null)
    setFeedbackPromptStage('')
    setIsGenerating(false)
    setIsSubmitting(false)
    setIsDashboardOpen(false)
    setError('')
    setMobileWizard(false)
  }

  const toggleChapter = (chapterNumber) => {
    resetRunState()
    setStep(1)
    setSelectedChapters((current) => (
      current.includes(chapterNumber)
        ? current.filter((item) => item !== chapterNumber)
        : [...current, chapterNumber]
    ))
  }

  const toggleType = (type) => {
    resetRunState()
    setStep(2)
    setSelectedTypes((current) => (
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    ))
  }

  const buildDisplayQuestions = (questions = []) => (
    questions.map((question) => ({
      ...question,
      displayOptions: question.pairs?.length
        ? shuffleMatchOptions(question.options || [])
        : shuffleArray((question.options || []).map((option, index) => ({ text: option, originalIndex: index }))),
    }))
  )

  const generateTest = async () => {
    if (!auth?.token) {
      setError('Please sign in to create and save a test.')
      return
    }

    setIsGenerating(true)
    setError('')
    setResult(null)
    setIsDashboardOpen(false)

    try {
      const data = await apiRequest('/api/tests/generate', {
        method: 'POST',
        body: JSON.stringify({
          chapterNumbers: selectedChapters,
          objectiveTypes: selectedTypes,
          questionCount: selectedQuestionCount,
        }),
      })

      setGeneratedTest({
        ...data,
        questions: buildDisplayQuestions(data.questions || []),
      })
      setAnswers({})
      setRevealedAnswers({})
      setDoneStates({})
      setMarkedLater({})
      setCurrentIndex(0)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const goToObjectives = () => {
    if (!selectedChapters.length) {
      setError('Please select at least one chapter first.')
      return
    }

    setError('')
    setStep(2)
  }

  const startTestMode = async () => {
    if (!selectedTypes.length) {
      setError('Please choose at least one objective type.')
      return
    }
    await generateTest()
  }

  const selectAnswer = (questionId, optionIndex) => {
    if (!generatedTest) return

    const question = generatedTest.questions.find((item) => item.id === questionId)

    if (question?.pairs?.length) {
      const pairCount = question.pairs.length
      const currentAnswer = Array.isArray(answers[questionId]) ? answers[questionId] : []
      if (currentAnswer.includes(optionIndex) || currentAnswer.length >= pairCount) return
      setAnswers({ ...answers, [questionId]: [...currentAnswer, optionIndex] })
      return
    }

    setAnswers({ ...answers, [questionId]: optionIndex })
  }

  const clearAnswer = (questionId) => {
    const next = { ...answers }
    delete next[questionId]
    setAnswers(next)
    setDoneStates((current) => {
      const nextDone = { ...current }
      delete nextDone[questionId]
      return nextDone
    })
  }

  const toggleMarkLater = (questionId) => {
    setMarkedLater((current) => {
      const next = { ...current }

      if (next[questionId]) {
        delete next[questionId]
      } else {
        next[questionId] = true
      }

      return next
    })
  }

  const toggleReveal = (questionId) => {
    setRevealedAnswers((current) => ({ ...current, [questionId]: !current[questionId] }))
  }

  const toggleDone = (questionId) => {
    const isDone = Boolean(doneStates[questionId] || answers[questionId] !== undefined)

    if (isDone) {
      clearAnswer(questionId)
      return
    }

    setAnswers({ ...answers, [questionId]: 1 })
    setDoneStates((current) => ({ ...current, [questionId]: true }))
  }

  const submitTest = async () => {
    if (!generatedTest?.questions?.length) return

    if (!auth?.token) {
      setError('Please sign in to submit and save the test.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const data = await apiRequest('/api/tests/submit', {
        method: 'POST',
        body: JSON.stringify({
          answers: generatedTest.questions.map((question) => ({
            questionId: question.id,
            selectedOption: answers[question.id],
          })),
        }),
      })

      setMobileWizard(false) // Exit mobile full-screen mode for the result
      setPendingResult(data)
      if (hasFeedbackFlowBeenSubmitted('test', 'test-builder')) {
        setResult(data)
        setFeedbackPromptStage('')
      } else {
        setFeedbackPromptStage('before')
      }
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetTest = () => {
    setGeneratedTest(null)
    setAnswers({})
    setRevealedAnswers({})
    setDoneStates({})
    setMarkedLater({})
    setResult(null)
    setPendingResult(null)
    setFeedbackPromptStage('')
    setCurrentIndex(0)
    setStep(2)
  }

  const startOver = () => {
    resetRunState()
    setSelectedTypes([])
    setSelectedChapters([])
    setQuestionCount(10)
    setStep(1)
    setMobileWizard(false)
    setPendingResult(null)
    setFeedbackPromptStage('')
  }

  const handleTestFeedbackSubmitted = () => {
    if (pendingResult) {
      setResult(pendingResult)
    }

    setPendingResult(null)
    setFeedbackPromptStage('')
  }

  const handleTestFeedbackSkip = () => {
    if (feedbackPromptStage === 'before' && pendingResult) {
      setResult(pendingResult)
      setFeedbackPromptStage('after')
      return
    }

    setFeedbackPromptStage('')
  }

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-xl">
          Loading test builder...
        </div>
      </section>
    )
  }

  const stepChip = (index, label, active, done) => (
    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] ${active ? 'border-slate-950 bg-slate-950 text-white' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
      <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${active ? 'bg-white text-slate-950' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
        {index}
      </span>
      {label}
    </div>
  )

  return (
    <section className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_50%,#eef2ff_100%)] lg:py-10">
      <div className="mx-auto max-w-7xl lg:px-10">
        <div className="lg:rounded-[2rem] lg:border lg:border-white/70 lg:bg-white/85 lg:p-8 lg:shadow-[0_30px_100px_rgba(15,23,42,0.08)] lg:backdrop-blur-xl p-4 sm:p-6 h-full min-h-[100dvh] lg:min-h-0">
          
          {/* Mobile Landing */}
          <div className="space-y-4 lg:hidden">
            <div className="rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                Test Builder
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`rounded-2xl border px-2 py-3 text-center transition ${step === 1 ? 'border-stone-950 bg-stone-950 text-white' : selectedChapters.length > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                >
                  <div className="mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-black">
                    1
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] leading-tight">
                    Chapters + marks
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => selectedChapters.length && setStep(2)}
                  className={`rounded-2xl border px-2 py-3 text-center transition ${step === 2 ? 'border-stone-950 bg-stone-950 text-white' : selectedTypes.length > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                >
                  <div className="mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-black">
                    2
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] leading-tight">
                    Objectives
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => generatedTest && setStep(3)}
                  className={`rounded-2xl border px-2 py-3 text-center transition ${step === 3 ? 'border-stone-950 bg-stone-950 text-white' : generatedTest ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                >
                  <div className="mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-black">
                    3
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] leading-tight">
                    Test mode
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMobileWizard(true)}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 text-base font-bold text-white shadow-lg transition hover:bg-black"
              >
                Create Test
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Desktop Hero Section */}
          <div className="hidden lg:block">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Test builder
                </div>
                <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Build a balanced test, then practice it like the real thing.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Step through chapter selection, objective selection, and then a normal objective-style test screen. Questions are sampled in a round-robin way so no objective type gets all the attention.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                <InfoCard label="Chapters" value={selectedChapters.length} tone="slate" />
                <InfoCard label="Objectives" value={selectedTypes.length} tone="violet" />
                <InfoCard label="Marks" value={selectedQuestionCount} tone="cyan" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {stepChip(1, 'Chapters + marks', step === 1, selectedChapters.length > 0)}
              {stepChip(2, 'Objectives', step === 2, selectedTypes.length > 0)}
              {stepChip(3, 'Test mode', step === 3, Boolean(generatedTest))}
            </div>

            {error && (
              <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* STEP 1: Chapters & Marks Setup */}
          {step === 1 && (
            <div className={`${mobileWizard ? 'fixed inset-0 z-[100] flex flex-col bg-slate-50 lg:static lg:block lg:bg-transparent lg:z-auto' : 'hidden lg:block'} lg:mt-8`}>
              
              {/* Mobile Only Header */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <h2 className="font-bold text-slate-950">Step 1: Setup Test</h2>
                <button onClick={() => setMobileWizard(false)} className="rounded-full bg-slate-100 p-2 text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-0 lg:overflow-visible">
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  {/* Left Col: Marks & Info Cards (Reordered for Mobile flow) */}
                  <div className="grid gap-4 self-start rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 lg:block hidden">Step 1</p>
                      <h3 className="lg:mt-2 font-serif text-2xl lg:text-3xl text-slate-950">Choose test size</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Questions are worth 1 mark each. This number is the total mark count.
                      </p>
                    </div>

                    <label className="grid gap-2 text-sm font-bold text-slate-600">
                      Total marks
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={questionCount}
                        onChange={(event) => setQuestionCount(event.target.value)}
                        className="h-14 lg:h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white text-lg lg:text-base"
                      />
                    </label>

                    <div className="hidden lg:grid gap-3 sm:grid-cols-3">
                      <InfoCard label="Selected" value={selectedChapters.length} tone="slate" />
                      <InfoCard label="Available" value={chapters.length} tone="emerald" />
                      <InfoCard label="Marks" value={selectedQuestionCount} tone="cyan" />
                    </div>

                    <button
                      type="button"
                      onClick={goToObjectives}
                      disabled={!selectedChapters.length}
                      className="hidden lg:inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Right Col: Chapter Selection */}
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 lg:order-first">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-slate-700" />
                      <h2 className="font-black text-slate-950">Select chapters</h2>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {chapters.map((chapter) => {
                        const isSelected = selectedChapters.includes(chapter.number)
                        return (
                          <button
                            key={chapter._id}
                            type="button"
                            onClick={() => toggleChapter(chapter.number)}
                            className={`rounded-3xl border px-4 py-4 text-left transition ${isSelected ? 'border-slate-950 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                          >
                            <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Chapter {chapter.number}</p>
                            <p className="mt-2 font-black leading-tight">{chapter.name}</p>
                            <p className="mt-1 text-xs opacity-70">{chapter.marks} marks</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Only Footer */}
              <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-6 lg:hidden">
                <button
                  type="button"
                  onClick={goToObjectives}
                  disabled={!selectedChapters.length}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-base font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next Step
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Objectives Selection */}
          {step === 2 && (
            <div className={`${mobileWizard ? 'fixed inset-0 z-[100] flex flex-col bg-slate-50 lg:static lg:block lg:bg-transparent lg:z-auto' : 'hidden lg:block'} lg:mt-8`}>
              
              {/* Mobile Only Header */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <button onClick={() => setStep(1)} className="rounded-full bg-slate-100 p-2 text-slate-600">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="font-bold text-slate-950">Step 2: Objectives</h2>
                <div className="w-9" /> {/* Spacer for centering */}
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-0 lg:overflow-visible">
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                  {/* Types Selection */}
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-violet-700" />
                      <h2 className="font-black text-slate-950">Pick objective types</h2>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {availableTypes.length ? availableTypes.map((item) => {
                        const isSelected = selectedTypes.includes(item.type)
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => toggleType(item.type)}
                            className={`rounded-3xl border px-4 py-4 text-left transition ${isSelected ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'}`}
                          >
                            <p className="text-sm font-black">{objectiveLabels[item.type] || item.type}</p>
                            <p className="mt-2 text-xs font-semibold text-slate-500">{item.count} questions available</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 truncate">
                              Chapters {item.chapters.join(', ')}
                            </p>
                          </button>
                        )
                      }) : (
                        <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                          No objective types found for the selected chapters.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Overview Sidebar */}
                  <div className="grid gap-4 self-start rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 lg:block hidden">Step 2</p>
                      <h3 className="lg:mt-2 font-serif text-2xl lg:text-3xl text-slate-950">Balanced split</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        The generator uses a round-robin pattern so selected objective types get an even share before any extras are added.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      {plannedDistribution.length ? plannedDistribution.map((item) => (
                        <div key={item.type} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-slate-900">{objectiveLabels[item.type] || item.type}</span>
                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                          Select at least one type to preview distribution.
                        </div>
                      )}
                    </div>

                    <div className="hidden lg:grid gap-3 sm:grid-cols-3">
                      <InfoCard label="Chapters" value={selectedChapters.length} tone="slate" />
                      <InfoCard label="Types" value={selectedTypes.length} tone="violet" />
                      <InfoCard label="Marks" value={selectedQuestionCount} tone="cyan" />
                    </div>

                    <div className="hidden lg:grid gap-3 mt-2">
                      {!auth?.token && (
                        <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                          Sign in first to generate and save the test.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={startTestMode}
                        disabled={isGenerating || !selectedTypes.length || !auth?.token}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isGenerating ? 'Generating...' : 'Build test'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Only Footer */}
              <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-6 lg:hidden">
                {!auth?.token && (
                  <p className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                    Sign in first to generate and save the test.
                  </p>
                )}
                <button
                  type="button"
                  onClick={startTestMode}
                  disabled={isGenerating || !selectedTypes.length || !auth?.token}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Start Test'}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Test Mode UI */}
          {step === 3 && generatedTest && !result && (
            <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 lg:static lg:block lg:bg-transparent lg:z-auto lg:mt-6 lg:space-y-6">
              
              {/* Mobile Minimal Header */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Q {currentIndex + 1} / {generatedTest.questions.length}
                </div>
                <button
                  type="button"
                  onClick={() => setIsDashboardOpen(true)}
                  className="grid h-10 w-10 place-items-center rounded-full text-stone-700 hover:bg-stone-50"
                >
                  <BarChart3 className="h-5 w-5" />
                </button>
              </div>

              {/* Desktop Only Extra Info & Titles */}
              <div className="hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm lg:block">
                <Link
                  to="#"
                  onClick={(event) => {
                    event.preventDefault()
                    setStep(2)
                  }}
                  className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 transition hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to objective types
                </Link>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {selectedChapters.map((chapterNumber) => {
                    const chapter = chapters.find((item) => item.number === chapterNumber)
                    return (
                      <span key={chapterNumber} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        Chapter {String(chapterNumber).padStart(2, '0')}{chapter?.name ? ` / ${chapter.name}` : ''}
                      </span>
                    )
                  })}
                </div>
                <h2 className="mt-4 font-serif text-3xl text-slate-950 sm:text-4xl lg:text-5xl">
                  Balanced test mode
                </h2>
              </div>

              {/* Test Content Area */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-0 lg:overflow-visible">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start max-w-3xl mx-auto lg:max-w-none">
                  
                  <div className="grid gap-4">
                    {/* Desktop Progress Card (Hidden on Mobile) */}
                    <div className="hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4 lg:block">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                            <span>Progress</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="rounded-2xl border border-emerald-300 bg-emerald-200 px-2 py-2 text-center shadow-sm sm:px-3">
                          <p className="text-xl font-black text-emerald-950 sm:text-3xl">{answeredCount}</p>
                          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-950 sm:text-[10px]">Attempted</p>
                        </div>
                        <div className="rounded-2xl border border-amber-300 bg-amber-200 px-2 py-2 text-center shadow-sm sm:px-3">
                          <p className="text-xl font-black text-amber-950 sm:text-3xl">{markedLaterCount}</p>
                          <p className="text-[9px] font-black uppercase tracking-wide text-amber-950 sm:text-[10px]">Marked</p>
                        </div>
                        <div className="rounded-2xl bg-stone-100 px-2 py-2 text-center sm:px-3">
                          <p className="text-xl font-black text-stone-700 sm:text-3xl">{remainingCount}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-stone-600 sm:text-[10px]">Remaining</p>
                        </div>
                      </div>
                    </div>

                    {currentQuestion && (
                      <article className="relative rounded-2xl bg-white lg:border lg:border-stone-200 p-5 lg:shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleMarkLater(currentQuestion.id)}
                          className={`absolute right-4 top-4 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition sm:right-5 sm:top-5 ${markedLater[currentQuestion.id] ? 'border-amber-400 bg-amber-300 text-amber-950 shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
                          title={markedLater[currentQuestion.id] ? 'Marked later' : 'Mark later'}
                        >
                          <Flag className="h-4 w-4" />
                        </button>

                        <div className="flex flex-col gap-2 pr-12 sm:flex-row sm:items-start sm:justify-between sm:pr-16">
                          <div className="min-w-0 flex-1">
                            {/* Question text styling highly readable on mobile */}
                            {currentQuestion.question?.trim() && (
                              <h3 className="mt-2 break-words text-lg font-black leading-snug text-stone-950 sm:mt-3 sm:text-xl">
                                {currentQuestion.question}
                              </h3>
                            )}
                            {currentQuestion.imageUrl && (
                              <img
                                src={assetUrl(currentQuestion.imageUrl)}
                                alt=""
                                className="mt-4 max-h-64 sm:max-h-80 w-full rounded-2xl border border-stone-200 object-contain"
                              />
                            )}
                          </div>

                          {currentQuestion.objectiveType === 'complete-the-tables' && (
                            <button
                              type="button"
                              onClick={() => toggleReveal(currentQuestion.id)}
                              className="mt-4 lg:mt-0 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 sm:h-10 sm:rounded-full"
                            >
                              <Circle className="h-4 w-4" />
                              {revealedAnswers[currentQuestion.id] ? 'Hide answer' : 'Show answer'}
                            </button>
                          )}
                        </div>

                        {/* Options Logic */}
                        {currentQuestion.pairs?.length ? (
                          <div className="mt-5 grid gap-2">
                            <div className="grid gap-2">
                              {currentQuestion.pairs.map((pair, pairIndex) => {
                                const selectedIndex = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id][pairIndex] : undefined
                                const selectedText = selectedIndex !== undefined ? currentQuestion.options[selectedIndex] : 'Select'
                                return (
                                  <div key={`${pair.left}-${pairIndex}`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-700">
                                    {pair.left}
                                    <div className="mt-1 text-[11px] uppercase tracking-widest text-stone-400">{selectedText}</div>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="grid gap-2 mt-2">
                              {(currentQuestion.displayOptions || []).map((option, optionIndex) => {
                                const currentAnswer = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : []
                                const selectedOrder = currentAnswer.indexOf(option.originalIndex)
                                return (
                                  <button
                                    key={`${currentQuestion.id}-${optionIndex}`}
                                    type="button"
                                    onClick={() => selectAnswer(currentQuestion.id, option.originalIndex)}
                                    disabled={selectedOrder !== -1}
                                    className={`rounded-2xl border px-3 py-3 text-left text-sm font-bold leading-snug transition sm:px-4 sm:text-base ${selectedOrder !== -1 ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm' : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'}`}
                                  >
                                    {option.text}
                                  </button>
                                )
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => clearAnswer(currentQuestion.id)}
                              className="mt-2 h-11 rounded-2xl border border-stone-200 bg-white text-sm font-bold text-stone-600 transition hover:bg-stone-50"
                            >
                              Clear answer
                            </button>
                          </div>
                        ) : currentQuestion.objectiveType === 'complete-the-tables' ? (
                          <div className="mt-5 grid gap-3">
                            {revealedAnswers[currentQuestion.id] && (
                              currentQuestion.answerImageUrl ? (
                                <img
                                  src={assetUrl(currentQuestion.answerImageUrl)}
                                  alt=""
                                  className="max-h-64 sm:max-h-80 w-full rounded-2xl border border-emerald-100 object-contain"
                                />
                              ) : (
                                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center text-sm font-semibold text-stone-500">
                                  Answer is not uploaded yet.
                                </div>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => toggleDone(currentQuestion.id)}
                              disabled={isSubmitting}
                              className={`h-14 lg:h-12 rounded-2xl border text-base lg:text-sm font-black transition disabled:cursor-not-allowed ${doneStates[currentQuestion.id] || answers[currentQuestion.id] !== undefined ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm' : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'}`}
                            >
                              {doneStates[currentQuestion.id] || answers[currentQuestion.id] !== undefined ? 'Undo done' : 'Mark done'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-5 grid gap-2">
                            {(currentQuestion.displayOptions || []).map((option, optionIndex) => (
                              <button
                                key={`${currentQuestion.id}-${optionIndex}`}
                                type="button"
                                onClick={() => selectAnswer(currentQuestion.id, option.originalIndex)}
                                className={`rounded-2xl border px-4 py-3.5 text-left text-sm font-bold leading-relaxed transition sm:text-base ${answers[currentQuestion.id] === option.originalIndex ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm' : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400 hover:bg-white'}`}
                              >
                                {String.fromCharCode(65 + optionIndex)}. {option.text}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Desktop Only Prev/Next Buttons (Moved to fixed footer on mobile) */}
                        <div className="mt-6 hidden lg:flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                            disabled={currentIndex === 0}
                            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-400 transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={submitTest}
                            disabled={isSubmitting}
                            className="inline-flex h-14 flex-[1.35] items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSubmitting ? 'Saving...' : 'Final Submit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentIndex((index) => Math.min(index + 1, generatedTest.questions.length - 1))}
                            disabled={currentIndex === generatedTest.questions.length - 1}
                            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    )}
                  </div>

                  {/* Desktop Only Dashboard Sidebar (Hidden on Mobile) */}
                  <div className="hidden gap-4 self-start lg:grid">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Circle className="h-5 w-5 text-stone-700" />
                        <h3 className="font-serif text-3xl text-stone-950">Dashboard</h3>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button type="button" className="rounded-2xl bg-stone-950 px-4 py-3 text-center text-sm font-black text-white">
                          <div>All</div>
                          <div className="text-xs font-semibold opacity-80">{generatedTest.questions.length}</div>
                        </button>
                        <button type="button" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-black text-stone-700">
                          <div>Attempted</div>
                          <div className="text-xs font-semibold text-stone-500">{answeredCount}</div>
                        </button>
                        <button type="button" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-black text-stone-700">
                          <div>Not attempted</div>
                          <div className="text-xs font-semibold text-stone-500">{remainingCount}</div>
                        </button>
                        <button type="button" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-black text-stone-700">
                          <div>Mark later</div>
                          <div className="text-xs font-semibold text-stone-500">{markedLaterCount}</div>
                        </button>
                      </div>
                      <div className="mt-5 grid grid-cols-5 gap-2">
                        {generatedTest.questions.map((question, index) => {
                          const isActive = index === currentIndex
                          const isMarked = Boolean(markedLater[question.id])
                          const isAnswered = question.objectiveType === 'match-the-following'
                            ? Array.isArray(answers[question.id]) && answers[question.id].length === (question.pairs?.length || question.options?.length || 0)
                            : question.objectiveType === 'complete-the-tables'
                              ? Boolean(doneStates[question.id] || answers[question.id] !== undefined)
                              : answers[question.id] !== undefined

                          return (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => setCurrentIndex(index)}
                              className={`grid h-11 place-items-center rounded-2xl border text-sm font-black transition ${isActive ? 'border-stone-950 bg-stone-950 text-white' : isMarked ? 'border-amber-300 bg-amber-200 text-amber-950' : isAnswered ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-white'}`}
                            >
                              {index + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Fixed Footer Controls */}
              <div className="shrink-0 border-t border-stone-200 bg-white p-3 lg:hidden">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                    disabled={currentIndex === 0}
                    className="grid h-14 flex-[1] place-items-center rounded-2xl border border-stone-200 bg-white font-bold text-stone-500 transition disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={submitTest}
                    disabled={isSubmitting}
                    className="flex h-14 flex-[2] items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Submit test'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => Math.min(index + 1, generatedTest.questions.length - 1))}
                    disabled={currentIndex === generatedTest.questions.length - 1}
                    className="grid h-14 flex-[1] place-items-center rounded-2xl bg-stone-950 font-bold text-white transition disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Dashboard Modal Overlay (Higher z-index) */}
              {isDashboardOpen && (
                <div
                  className="fixed inset-0 z-[120] flex items-end justify-center bg-stone-950/45 p-3 backdrop-blur-sm lg:hidden"
                  onClick={() => setIsDashboardOpen(false)}
                >
                  <div
                    className="w-full max-w-xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Circle className="h-5 w-5 text-stone-700" />
                        <h3 className="font-serif text-2xl text-stone-950">Dashboard</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDashboardOpen(false)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
                        aria-label="Close dashboard"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-[75vh] overflow-y-auto px-4 py-4 pb-6">
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="rounded-2xl bg-stone-950 px-3 py-3 text-center text-sm font-black text-white">
                          <div>All</div>
                          <div className="text-xs font-semibold opacity-80">{generatedTest.questions.length}</div>
                        </button>
                        <button type="button" className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-center text-sm font-black text-stone-700">
                          <div>Attempted</div>
                          <div className="text-xs font-semibold text-stone-500">{answeredCount}</div>
                        </button>
                        <button type="button" className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-center text-sm font-black text-stone-700">
                          <div>Not attempted</div>
                          <div className="text-xs font-semibold text-stone-500">{remainingCount}</div>
                        </button>
                        <button type="button" className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-center text-sm font-black text-stone-700">
                          <div>Mark later</div>
                          <div className="text-xs font-semibold text-stone-500">{markedLaterCount}</div>
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-5 gap-2">
                        {generatedTest.questions.map((question, index) => {
                          const isActive = index === currentIndex
                          const isMarked = Boolean(markedLater[question.id])
                          const isAnswered = question.objectiveType === 'match-the-following'
                            ? Array.isArray(answers[question.id]) && answers[question.id].length === (question.pairs?.length || question.options?.length || 0)
                            : question.objectiveType === 'complete-the-tables'
                              ? Boolean(doneStates[question.id] || answers[question.id] !== undefined)
                              : answers[question.id] !== undefined

                          return (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => {
                                setCurrentIndex(index)
                                setIsDashboardOpen(false)
                              }}
                              className={`grid h-10 place-items-center rounded-2xl border text-sm font-black transition ${isActive ? 'border-stone-950 bg-stone-950 text-white' : isMarked ? 'border-amber-300 bg-amber-200 text-amber-950' : isAnswered ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-white'}`}
                            >
                              {index + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Completed / Result Card */}
          {result && (
            <div className="lg:mt-8 mt-4 rounded-[1.75rem] border border-cyan-100 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h2 className="mt-3 font-serif text-3xl text-slate-950">AI Progress Card</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                    {result.progressReport?.suggestion}
                  </p>
                </div>
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 sm:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Brain cells earned</p>
                  <p className="mt-2 text-3xl font-black text-emerald-950">{result.brainCellsEarned || 0}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <ResultCard label="Score" value={`${result.score}/${result.totalQuestions}`} tone="emerald" />
                <ResultCard label="Wrong" value={result.progressReport?.wrongCount || 0} tone="rose" />
                <ResultCard label="Skipped" value={result.progressReport?.skippedCount || 0} tone="amber" />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">Chapter breakdown</p>
                  <div className="mt-3 grid gap-2">
                    {(result.chapterBreakdown || []).map((chapter) => (
                      <div key={chapter.chapterId} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                        Chapter {chapter.chapterNumber}: {chapter.chapterName} - {chapter.score}/{chapter.totalQuestions} ({chapter.percent}%)
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">Next steps</p>
                  <div className="mt-3 grid gap-2">
                    {(result.progressReport?.solutionSteps || []).map((stepText, index) => (
                      <div key={`${stepText}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                        {index + 1}. {stepText}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={resetTest}
                  className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-bold text-white transition hover:bg-black shadow-lg"
                >
                  Build another test
                </button>
                <Link
                  to="/improvement"
                  className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  View improvement
                </Link>
                <button
                  type="button"
                  onClick={startOver}
                  className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <StarFeedbackModal
        open={Boolean(feedbackPromptStage) && Boolean(pendingResult)}
        title={feedbackPromptStage === 'before' ? 'Rate this test' : 'Rate the result too'}
        subtitle={feedbackPromptStage === 'before'
          ? 'Tap stars only. After you rate, we will show your result.'
          : 'Your result is visible now. If you skipped earlier, please leave a quick star rating.'}
        sourceType="test"
        sourceKey="test-builder"
        sourceLabel="Test builder"
        onSubmitSuccess={handleTestFeedbackSubmitted}
        onSkip={handleTestFeedbackSkip}
      />
    </section>
  )
}

export default Testbuilderpage
