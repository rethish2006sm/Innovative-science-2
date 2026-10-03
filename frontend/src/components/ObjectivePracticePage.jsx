import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Edit3, Flag, Play, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { apiRequest, assetUrl } from '../api'
import { getStoredAuth } from '../authStorage'
import StarFeedbackModal from './StarFeedbackModal'
import { hasFeedbackFlowBeenSubmitted } from '../lib/feedbackFlow'

const emptyQuestionForm = {
  question: '',
  solution: '',
  options: ['', '', '', ''],
  pairs: [
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
  ],
  correctOption: '',
  imageFile: null,
  removeImage: false,
  answerImageFile: null,
  removeAnswerImage: false,
  isBoardQuestion: false,
}

const trueFalseOptions = ['True', 'False']

const prepareNumericalAnswer = (options = [], correctOption = '') => {
  const sourceOptions = Array.isArray(options) ? options : []
  const cleanedOptions = sourceOptions
    .map((option) => String(option || '').trim())
    .filter(Boolean)
  const selectedText = String(sourceOptions[Number(correctOption)] || '').trim()

  return {
    options: cleanedOptions,
    correctOption: selectedText ? cleanedOptions.indexOf(selectedText) : -1,
  }
}

const matchColors = [
  'border-red-300 bg-red-100 text-red-950',
  'border-amber-300 bg-amber-100 text-amber-950',
  'border-pink-300 bg-pink-100 text-pink-950',
  'border-cyan-300 bg-cyan-100 text-cyan-950',
  'border-emerald-300 bg-emerald-100 text-emerald-950',
  'border-violet-300 bg-violet-100 text-violet-950',
  'border-orange-300 bg-orange-100 text-orange-950',
  'border-lime-300 bg-lime-100 text-lime-950',
]

const shuffleArray = (items) => {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentItem = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = currentItem
  }

  return shuffled
}

const shuffleMatchOptions = (options) => {
  const indexedOptions = options.map((option, index) => ({ text: option, originalIndex: index }))

  if (indexedOptions.length <= 1) {
    return indexedOptions
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const shuffled = shuffleArray(indexedOptions)
    const hasSameRowMatch = shuffled.some((option, displayIndex) => option.originalIndex === displayIndex)

    if (!hasSameRowMatch) {
      return shuffled
    }
  }

  return indexedOptions.map((_, index) => indexedOptions[(index + 1) % indexedOptions.length])
}

const preparePracticeQuestions = (questions, isAdmin, objectiveType = '') => {
  return questions.map((question) => {
    const options = Array.isArray(question.options) ? question.options : []

    return {
      ...question,
      options,
      displayOptions: options.map((option, index) => ({ text: option, originalIndex: index })),
    }
  })
}

const shuffleDraftOptions = (draft) => {
  const shuffledOptions = shuffleArray((draft.options || []).map((option, index) => ({
    text: option,
    isCorrect: Number(draft.correctOption) === index,
  })))

  return {
    ...draft,
    options: shuffledOptions.map((option) => option.text),
    correctOption: shuffledOptions.findIndex((option) => option.isCorrect),
  }
}

const normalizeMatchDraft = (draft) => ({
  ...draft,
  question: draft.question || 'Match the following',
  pairs: (draft.pairs || [])
    .map((pair) => ({
      left: pair.left || '',
      right: pair.right || '',
    }))
    .filter((pair) => pair.left || pair.right),
})

const reportReasonOptions = [
  { value: 'incorrect_question', label: 'Question is wrong' },
  { value: 'incorrect_options', label: 'Options are incorrect' },
  { value: 'incorrect_answer', label: 'Answer is incorrect' },
  { value: 'other', label: 'Other' },
]

const defaultTutorMessages = [
  {
    role: 'assistant',
    content: 'Ask me anything about the current question. I will explain it in simple words and keep it short.',
  },
]

const formatTutorOptions = (question = {}) => {
  const options = Array.isArray(question.options) ? question.options : []

  if (!options.length) {
    return ''
  }

  return options
    .map((option, index) => {
      const label = typeof option === 'string' ? option : option?.text || ''
      return `${String.fromCharCode(65 + index)}. ${label}`
    })
    .join('\n')
}

const buildTutorContext = ({ question, topicName = '', chapterName = '', paragraphText = '' }) => {
  const safeQuestion = String(question?.question || '').trim() || 'No question text provided.'
  const paragraph = String(paragraphText || topicName || chapterName || 'Science').trim()
  const optionsText = formatTutorOptions(question)

  return [
    `Paragraph/Topic: ${paragraph}`,
    `Chapter: ${chapterName || 'Science'}`,
    `Question: ${safeQuestion}`,
    optionsText ? `Options:\n${optionsText}` : '',
  ].filter(Boolean).join('\n\n')
}

const buildTutorStarterPrompt = ({ question, topicName = '', chapterName = '', paragraphText = '' }) => (
  `I am not getting this concept. Can you explain it in easy words?\n\n${buildTutorContext({
    question,
    topicName,
    chapterName,
    paragraphText,
  })}`
)

const translatePracticeQuestions = async (questions = []) => questions

const ObjectivePracticePage = ({ objectiveType, title, subtitle, defaultOptions }) => {
  const { chapterNumber, topicId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [objective, setObjective] = useState(null)
  const [questions, setQuestions] = useState([])
  const [bestScore, setBestScore] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submittedQuestions, setSubmittedQuestions] = useState({})
  const [correctAnswersByQuestion, setCorrectAnswersByQuestion] = useState({})
  const [questionFeedback, setQuestionFeedback] = useState({})
  const [markedLater, setMarkedLater] = useState({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isSingleQuestionFlow, setIsSingleQuestionFlow] = useState(false)
  const [result, setResult] = useState(null)
  const [mode, setMode] = useState('dashboard')
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [dashboardFilter, setDashboardFilter] = useState('all')
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [form, setForm] = useState(() => ({
    ...emptyQuestionForm,
    options: defaultOptions || emptyQuestionForm.options,
  }))
  const [aiSourceText, setAiSourceText] = useState('')
  const [aiQuestionCount, setAiQuestionCount] = useState(5)
  const [aiDrafts, setAiDrafts] = useState([])
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportedQuestion, setReportedQuestion] = useState(null)
  const [reportReason, setReportReason] = useState('incorrect_question')
  const [reportDetails, setReportDetails] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [isTutorOpen, setIsTutorOpen] = useState(false)
  const [tutorInput, setTutorInput] = useState('')
  const [tutorMessages, setTutorMessages] = useState(defaultTutorMessages)
  const [isTutorSending, setIsTutorSending] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState({})
  const [doneStates, setDoneStates] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const practiceHistoryEntry = useRef(false)
  const [pendingResult, setPendingResult] = useState(null)
  const [feedbackPromptStage, setFeedbackPromptStage] = useState('')
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const isSignedIn = Boolean(auth?.token)
  const boardOnly = searchParams.get('boardOnly') === '1' || searchParams.get('boardOnly') === 'true'
  const boardQuery = boardOnly ? '?boardOnly=1' : ''
  const isTrueFalse = objectiveType === 'true-or-false'
  const isCorrelation = objectiveType === 'correlation'
  const isOddManOut = objectiveType === 'odd-man-out'
  const isMatching = objectiveType === 'match-the-following'
  const isCompleteTable = objectiveType === 'complete-the-tables'
  const isDiagram = objectiveType === 'diagram-based-question'
  const isIdentifySymbol = objectiveType === 'identify-symbol'
  const isNumerical = objectiveType === 'numericals'
  const supportsQuestionImage = isCompleteTable || isDiagram || isIdentifySymbol || isNumerical
  const supportsAiDrafts = !isCompleteTable && !isDiagram && !isIdentifySymbol && !isNumerical
  const savedQuestionTotal = Number(bestScore?.totalQuestions || 0)
  const savedAttemptedQuestions = Number(bestScore?.attemptedQuestions ?? (bestScore?.isDone && savedQuestionTotal >= questions.length ? questions.length : 0))
  const isDoneOnlyDone = (isCompleteTable || isDiagram)
    && Boolean(bestScore?.isDone)
    && savedQuestionTotal >= questions.length
    && savedAttemptedQuestions >= questions.length

  const isQuestionAnswered = (question) => {
    const answer = answers[question._id]

    if (isMatching) {
      const pairCount = question.pairs?.length || question.options?.length || 0
      return Array.isArray(answer) && pairCount > 0 && answer.length === pairCount && answer.every((optionIndex) => Number.isInteger(optionIndex))
    }

    if (isDiagram) {
      return Boolean(doneStates[question._id])
    }

    return Boolean(submittedQuestions[question._id] || (!isSingleQuestionFlow && answer !== undefined))
  }

  const answeredCount = questions.filter(isQuestionAnswered).length
  const markedLaterCount = useMemo(() => Object.keys(markedLater).length, [markedLater])
  const remainingCount = Math.max(questions.length - answeredCount, 0)
  const currentQuestion = questions[currentQuestionIndex]
  const currentQuestionSubmitted = Boolean(currentQuestion && submittedQuestions[currentQuestion._id])
  const currentCorrectAnswer = currentQuestion ? correctAnswersByQuestion[currentQuestion._id] : null
  const currentFeedback = currentQuestion ? questionFeedback[currentQuestion._id] : ''
  const topicParagraph = topic?.studyText || topic?.description || ''
  const progressPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0
  const totalQuestionCount = questions.length
  const isCompleteTableDone = isCompleteTable && isDoneOnlyDone
  const practicedQuestionIds = new Set([
    ...(bestScore?.attemptedQuestionIds || []).map(String),
    ...Object.keys(submittedQuestions),
  ])
  const isPracticeCompleted = questions.length > 0
    && questions.every((question) => practicedQuestionIds.has(String(question._id)))
  const dashboardFilters = [
    { id: 'all', label: 'All', count: questions.length },
    { id: 'attempted', label: 'Attempted', count: answeredCount },
    { id: 'not-attempted', label: 'Not attempted', count: remainingCount },
    { id: 'marked-later', label: 'Mark later', count: markedLaterCount },
  ]
  const filteredDashboardQuestions = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      const isAnswered = isQuestionAnswered(question)
      const isMarked = markedLater[question._id]

      if (dashboardFilter === 'attempted') return isAnswered
      if (dashboardFilter === 'not-attempted') return !isAnswered
      if (dashboardFilter === 'marked-later') return isMarked

      return true
    })

  const loadPractice = async () => {
    setIsLoading(true)
    setError('')

    try {
      const boardQuery = boardOnly ? '?boardOnly=true' : ''
      const data = await apiRequest(`/api/topics/${topicId}/objective-types/${objectiveType}/practice${boardQuery}`)
      const nextTopic = {
        ...(data.topic || {}),
        sourceName: data.topic?.name || '',
        sourceDescription: data.topic?.description || '',
        sourceStudyText: data.topic?.studyText || '',
        name: data.topic?.name || '',
        description: data.topic?.description || '',
        studyText: data.topic?.studyText || '',
      }
      const nextChapter = {
        ...(data.chapter || {}),
        sourceName: data.chapter?.name || '',
        name: data.chapter?.name || '',
      }

      setTopic(nextTopic)
      setChapter(nextChapter)
      setObjective(data.objectiveType)
      const preparedQuestions = preparePracticeQuestions(data.questions || [], isAdmin, objectiveType)
      setQuestions(await translatePracticeQuestions(preparedQuestions))
      setBestScore(data.bestScore)
      setDoneStates(
        (objectiveType === 'complete-the-tables' || objectiveType === 'diagram-based-question') && data.bestScore?.isDone
          ? Object.fromEntries((data.questions || []).map((question) => [question._id, true]))
          : {},
      )
      setTutorMessages(defaultTutorMessages)
      setTutorInput('')
      setReportStatus('')
      setResult(null)
      setMode('dashboard')
      setCurrentQuestionIndex(0)
      setPendingResult(null)
      setFeedbackPromptStage('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPractice()
  }, [topicId, objectiveType, boardOnly])

  useEffect(() => {
    const handleBrowserBack = () => {
      if (mode !== 'practice' && mode !== 'result') return

      practiceHistoryEntry.current = false
      setMode('dashboard')
      setIsDashboardOpen(false)
    }

    window.addEventListener('popstate', handleBrowserBack)
    return () => window.removeEventListener('popstate', handleBrowserBack)
  }, [mode])

  const updateOption = (index, value) => {
    const nextOptions = [...form.options]
    nextOptions[index] = value
    setForm({ ...form, options: nextOptions })
  }

  const buildQuestionPayload = (payload) => {
    if (!payload.imageFile && !payload.removeImage && !payload.answerImageFile && !payload.removeAnswerImage) {
      const { imageFile, removeImage, answerImageFile, removeAnswerImage, ...jsonPayload } = payload
      return JSON.stringify(jsonPayload)
    }

    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'imageFile') {
        if (value) formData.append('questionImage', value)
        return
      }

      if (key === 'answerImageFile') {
        if (value) formData.append('answerImage', value)
        return
      }

      if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
        return
      }

      formData.append(key, String(value ?? ''))
    })

    return formData
  }

  const updateMatchPair = (index, field, value) => {
    const nextPairs = [...form.pairs]
    nextPairs[index] = { ...nextPairs[index], [field]: value }
    setForm({ ...form, pairs: nextPairs })
  }

  const addMatchPair = () => {
    setForm({ ...form, pairs: [...form.pairs, { left: '', right: '' }] })
  }

  const removeMatchPair = (index) => {
    setForm({ ...form, pairs: form.pairs.filter((_, pairIndex) => pairIndex !== index) })
  }

  const startEditQuestion = (question) => {
    if (isMatching) {
      const questionOptions = Array.isArray(question.options) ? question.options : []
      const nextPairs = question.pairs?.length
        ? question.pairs.map((pair, index) => ({
          left: pair.left,
          right: pair.right || questionOptions[question.correctOptions?.[index] ?? index] || '',
        }))
        : questionOptions.map((option, index) => ({ left: `Item ${index + 1}`, right: option }))

      setEditingQuestion(question)
      setForm({
        question: question.question,
        solution: question.solution || '',
        options: questionOptions,
        pairs: nextPairs,
        correctOption: '0',
        imageFile: null,
        removeImage: false,
        answerImageFile: null,
        removeAnswerImage: false,
        isBoardQuestion: Boolean(question.isBoardQuestion),
      })
      return
    }

    if (isDiagram) {
      setEditingQuestion(question)
      setForm({
        question: question.question,
        solution: question.solution || '',
        options: ['Done', 'Show answer'],
        pairs: emptyQuestionForm.pairs,
        correctOption: '0',
        imageFile: null,
        removeImage: false,
        answerImageFile: null,
        removeAnswerImage: false,
        isBoardQuestion: Boolean(question.isBoardQuestion),
      })
      return
    }

    const nextOptions = isTrueFalse
      ? trueFalseOptions
      : Array.isArray(question.options) ? [...question.options] : []

    if (!isTrueFalse) {
      while (nextOptions.length < 4) {
        nextOptions.push('')
      }
    }

    setEditingQuestion(question)
    setForm({
      question: question.question,
      solution: question.solution || '',
      options: nextOptions,
      pairs: emptyQuestionForm.pairs,
      correctOption: String(question.correctOption),
      imageFile: null,
      removeImage: false,
      answerImageFile: null,
      removeAnswerImage: false,
      isBoardQuestion: Boolean(question.isBoardQuestion),
    })
  }

  const resetQuestionForm = () => {
    setEditingQuestion(null)
    setForm({
      ...emptyQuestionForm,
      options: isTrueFalse ? trueFalseOptions : defaultOptions || emptyQuestionForm.options,
      pairs: emptyQuestionForm.pairs,
      imageFile: null,
      removeImage: false,
      answerImageFile: null,
      removeAnswerImage: false,
      isBoardQuestion: false,
    })
  }

  const openReportDialog = (question = currentQuestion) => {
    if (!question) return

    setIsReportOpen(true)
    setReportedQuestion(question)
    setReportStatus('')
    setReportDetails('')
    setReportReason('incorrect_question')
  }

  const openTutorTeacher = () => {
    if (!getStoredAuth()?.token) {
      navigate('/signin')
      return
    }

    const starterPrompt = buildTutorStarterPrompt({
      question: currentQuestion,
      topicName: topic?.name || '',
      chapterName: chapter?.name || '',
      paragraphText: topicParagraph,
    })

    setIsTutorOpen(true)
    setTutorInput(starterPrompt)
  }

  const toggleAnswerReveal = (questionId) => {
    setRevealedAnswers((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }))
  }

  const submitReport = async (event) => {
    event.preventDefault()

    if (!reportedQuestion) return

    setIsSaving(true)
    setError('')
    setReportStatus('')

    try {
      await apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          objectiveTypeId: objective?._id,
          chapterId: chapter?._id,
          questionId: reportedQuestion._id,
          questionText: reportedQuestion.question || '',
          optionsText: formatTutorOptions(reportedQuestion),
          reason: reportReason,
          details: reportDetails,
        }),
      })

      setReportStatus('Thank you for reporting this question. Your feedback has been sent.')
      setTimeout(() => {
        setIsReportOpen(false)
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const sendTutorMessage = async (event) => {
    event.preventDefault()

    if (!tutorInput.trim()) return

    const questionContext = currentQuestion || {}
    const tutorPrompt = tutorInput.trim()
    const appHelpContext = [
      'How to create a test:',
      '1. Open the homepage.',
      '2. Click Create test.',
      '3. Choose the chapters and objective types.',
      '4. Start the test and answer the questions.',
      '5. Submit to see your score and improvement.',
      '',
      'How to report a mistake:',
      '1. Open the practice question.',
      '2. Click the report button.',
      '3. Choose the reason and add details.',
      '4. Send the report.',
      '',
      'How to contact Rethish Sir or the team:',
      '1. Open the Contact page from the navbar.',
      '2. Enter your name, email, subject, and message.',
      '3. Click Send.',
    ].join('\n')
    const profileContext = auth?.user
      ? `Name: ${auth.user.name || 'N/A'}\nEmail: ${auth.user.email || 'N/A'}\nClass: ${auth.user.className || 'N/A'}`
      : ''
    const contextText = buildTutorContext({
      question: questionContext,
      topicName: topic?.name || '',
      chapterName: chapter?.name || '',
      paragraphText: topicParagraph,
    })
    const nextUserMessage = {
      role: 'user',
      content: tutorPrompt,
    }
    const nextMessages = [...tutorMessages, nextUserMessage]
    setTutorMessages(nextMessages)
    setTutorInput('')
    setIsTutorSending(true)
    setError('')

    try {
      const data = await apiRequest('/api/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({
          question: tutorPrompt,
          answer: (isCompleteTable || isDiagram) && questionContext.answerImageUrl ? 'Explain the answer simply.' : '',
          topicName: topic?.name || '',
          chapterName: chapter?.name || '',
          objectiveType,
          contextText,
          profileContext,
          appHelpContext,
          questionText: questionContext.question || '',
          optionsText: formatTutorOptions(questionContext),
          conversation: nextMessages.slice(-6),
        }),
      })

      setTutorMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.reply || 'I could not generate a response just now.',
        },
      ])
    } catch (err) {
      setTutorMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: err.message,
        },
      ])
    } finally {
      setIsTutorSending(false)
    }
  }

  const saveQuestion = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      if (isIdentifySymbol) {
        const hasExistingImage = Boolean(editingQuestion?.imageUrl && !form.removeImage)
        const optionCount = (form.options || []).map((option) => String(option || '').trim()).filter(Boolean).length

        if (!form.imageFile && !hasExistingImage) {
          throw new Error('Please upload a symbol image.')
        }

        if (optionCount !== 4) {
          throw new Error('Identify Symbol questions need exactly four options.')
        }
      }

      if (isNumerical) {
        const hasQuestionText = Boolean(String(form.question || '').trim())
        const hasQuestionImage = Boolean(form.imageFile || (editingQuestion?.imageUrl && !form.removeImage))
        const hasExistingSolutionImage = Boolean(editingQuestion?.answerImageUrl && !form.removeAnswerImage)
        const hasSolutionText = Boolean(String(form.solution || '').trim())
        const hasSolutionImage = Boolean(form.answerImageFile || hasExistingSolutionImage)

        if (!hasQuestionText && !hasQuestionImage) {
          throw new Error('Add the numerical question as text, a photo, or both.')
        }

        if (!hasSolutionText && !hasSolutionImage) {
          throw new Error('Add the solution as text, a photo, or both.')
        }
      }

      if (!isMatching && !isCompleteTable && !isDiagram && form.correctOption === '') {
        throw new Error('Please select the correct answer.')
      }

      if ((isCorrelation || isOddManOut) && (form.options || []).map((option) => option.trim()).filter(Boolean).length !== 4) {
        throw new Error(`${isOddManOut ? 'Odd Man Out' : 'Correlation'} questions must have exactly four options.`)
      }

      const cleanedPairs = (form.pairs || [])
        .map((pair) => ({
          left: String(pair.left || '').trim(),
          right: String(pair.right || '').trim(),
        }))
        .filter((pair) => pair.left || pair.right)

      if (isMatching && (cleanedPairs.length < 2 || cleanedPairs.some((pair) => !pair.left || !pair.right))) {
        throw new Error('Fill at least two complete matching rows.')
      }

      const path = editingQuestion
        ? `/api/objective-questions/${editingQuestion._id}`
        : `/api/objective-types/${objective._id}/questions`
      const method = editingQuestion ? 'PATCH' : 'POST'

      const numericalAnswer = prepareNumericalAnswer(form.options, form.correctOption)

      const payload = isMatching ? {
          question: form.question,
          pairs: cleanedPairs,
          options: cleanedPairs.map((pair) => pair.right),
          correctOptions: cleanedPairs.map((_, index) => index),
          imageFile: form.imageFile,
          isBoardQuestion: form.isBoardQuestion,
          removeImage: form.removeImage,
        } : isTrueFalse ? {
          question: form.question,
          options: trueFalseOptions,
          correctOption: form.correctOption,
          imageFile: form.imageFile,
          isBoardQuestion: form.isBoardQuestion,
          removeImage: form.removeImage,
          answerImageFile: form.answerImageFile,
          removeAnswerImage: form.removeAnswerImage,
        } : isCompleteTable ? {
          question: form.question,
          options: ['Done', 'View answer'],
          correctOption: 0,
          imageFile: form.imageFile,
          isBoardQuestion: form.isBoardQuestion,
          removeImage: form.removeImage,
          answerImageFile: form.answerImageFile,
          removeAnswerImage: form.removeAnswerImage,
        } : isDiagram ? {
          question: form.question,
          options: ['Done', 'Show answer'],
          correctOption: 0,
          imageFile: form.imageFile,
          isBoardQuestion: form.isBoardQuestion,
          removeImage: form.removeImage,
          answerImageFile: form.answerImageFile,
          removeAnswerImage: form.removeAnswerImage,
        } : isIdentifySymbol ? {
          question: form.question,
          options: (form.options || []).map((option) => String(option || '').trim()).filter(Boolean),
          correctOption: form.correctOption,
          imageFile: form.imageFile,
          isBoardQuestion: form.isBoardQuestion,
          removeImage: form.removeImage,
        } : isNumerical ? {
          objectiveType: objectiveType,
          topicId,
          question: form.question,
          solution: form.solution,
          options: numericalAnswer.options,
          correctOption: numericalAnswer.correctOption,
          imageFile: form.imageFile,
          isBoardQuestion: form.isBoardQuestion,
          removeImage: form.removeImage,
          answerImageFile: form.answerImageFile,
          removeAnswerImage: form.removeAnswerImage,
        } : form

      await apiRequest(path, {
        method,
        body: buildQuestionPayload(payload),
      })
      resetQuestionForm()
      await loadPractice()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const generateAiDrafts = async () => {
    if (!supportsAiDrafts) {
      return
    }

    setIsAiGenerating(true)
    setError('')

    try {
      const data = await apiRequest(`/api/objective-types/${objective._id}/questions/ai-draft`, {
        method: 'POST',
        body: JSON.stringify({
          sourceText: aiSourceText,
          questionCount: isMatching ? 1 : aiQuestionCount,
        }),
      })
      setAiDrafts(isMatching
        ? (data.questions || []).slice(0, 1).map(normalizeMatchDraft)
        : isTrueFalse
        ? shuffleArray((data.questions || []).map((draft) => ({
          ...draft,
          options: trueFalseOptions,
          correctOption: Number(draft.correctOption) === 1 ? 1 : 0,
        })))
        : shuffleArray((data.questions || []).map(shuffleDraftOptions)))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const updateAiDraft = (draftIndex, updates) => {
    setAiDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => (
        index === draftIndex ? { ...draft, ...updates } : draft
      )),
    )
  }

  const updateAiDraftOption = (draftIndex, optionIndex, value) => {
    setAiDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => {
        if (index !== draftIndex) return draft

        const nextOptions = [...draft.options]
        nextOptions[optionIndex] = value
        return { ...draft, options: nextOptions }
      }),
    )
  }

  const updateAiDraftPair = (draftIndex, pairIndex, field, value) => {
    setAiDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => {
        if (index !== draftIndex) return draft

        const nextPairs = [...(draft.pairs || [])]
        nextPairs[pairIndex] = { ...nextPairs[pairIndex], [field]: value }
        return { ...draft, pairs: nextPairs }
      }),
    )
  }

  const addAiDraftPair = (draftIndex) => {
    setAiDrafts((currentDrafts) =>
      currentDrafts.map((draft, index) => (
        index === draftIndex
          ? { ...draft, pairs: [...(draft.pairs || []), { left: '', right: '' }] }
          : draft
      )),
    )
  }

  const removeAiDraft = (draftIndex) => {
    setAiDrafts((currentDrafts) => currentDrafts.filter((_, index) => index !== draftIndex))
  }

  const saveAiDrafts = async () => {
    const shouldSave = window.confirm(`Save ${aiDrafts.length} AI generated questions?`)

    if (!shouldSave) return

    setIsSaving(true)
    setError('')

    try {
      for (const draft of aiDrafts) {
        const cleanedPairs = (draft.pairs || [])
          .map((pair) => ({
            left: String(pair.left || '').trim(),
            right: String(pair.right || '').trim(),
          }))
          .filter((pair) => pair.left && pair.right)

        await apiRequest(`/api/objective-types/${objective._id}/questions`, {
          method: 'POST',
          body: JSON.stringify(isMatching ? {
            question: draft.question,
            pairs: cleanedPairs,
            options: cleanedPairs.map((pair) => pair.right),
            correctOptions: cleanedPairs.map((_, index) => index),
          } : isTrueFalse ? {
            question: draft.question,
            options: trueFalseOptions,
            correctOption: draft.correctOption,
          } : draft),
        })
      }

      setAiDrafts([])
      setAiSourceText('')
      await loadPractice()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteQuestion = async (questionId) => {
    const shouldDelete = window.confirm('Delete this question?')

    if (!shouldDelete) return

    setError('')
    try {
      await apiRequest(`/api/objective-questions/${questionId}`, { method: 'DELETE' })
      await loadPractice()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleBoardQuestion = async (question) => {
    setIsSaving(true)
    setError('')

    try {
      await apiRequest(`/api/objective-questions/${question._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isBoardQuestion: !question.isBoardQuestion }),
      })
      await loadPractice()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startPractice = (singleQuestionFlow = false) => {
    if (!practiceHistoryEntry.current) {
      window.history.pushState(
        { ...(window.history.state || {}), objectivePracticeMode: true },
        '',
        window.location.href,
      )
      practiceHistoryEntry.current = true
    }

    setAnswers({})
    setSubmittedQuestions({})
    setCorrectAnswersByQuestion({})
    setIsSingleQuestionFlow(singleQuestionFlow)
    setMarkedLater({})
    setRevealedAnswers({})
    setDoneStates({})
    setCurrentQuestionIndex(0)
    setResult(null)
    setPendingResult(null)
    setFeedbackPromptStage('')
    setDashboardFilter('all')
    setIsDashboardOpen(false)
    setMode('practice')
  }

  const returnToQuestionList = () => {
    if (practiceHistoryEntry.current) {
      practiceHistoryEntry.current = false
      window.history.back()
      return
    }

    setMode('dashboard')
    setIsDashboardOpen(false)
  }

  const selectAnswer = (questionId, optionIndex) => {
    if (isMatching) {
      const question = questions.find((item) => item._id === questionId)
      const pairCount = question?.pairs?.length || question?.options?.length || 0
      const currentAnswer = Array.isArray(answers[questionId]) ? answers[questionId] : []

      if (currentAnswer.includes(optionIndex) || currentAnswer.length >= pairCount) return

      const nextAnswer = [...currentAnswer, optionIndex]
      setAnswers({ ...answers, [questionId]: nextAnswer })
      if (isSingleQuestionFlow && nextAnswer.length === pairCount && !submittedQuestions[questionId]) {
        submitCurrentQuestion(nextAnswer)
      }
      return
    }

    const nextAnswers = { ...answers, [questionId]: optionIndex }
    setAnswers(nextAnswers)
    if (isSingleQuestionFlow && !submittedQuestions[questionId]) {
      submitCurrentQuestion(optionIndex)
    }
  }

  const markQuestionDone = async (questionId) => {
    const isAlreadyDone = Boolean(doneStates[questionId] || answers[questionId] !== undefined || isDoneOnlyDone)
    const nextIsDone = !isAlreadyDone
    const previousAnswers = answers
    const previousDoneStates = doneStates

    if (!isSignedIn) {
      setError('Please sign in to mark this practice as done.')
      return
    }

    const nextAnswers = nextIsDone
      ? { ...answers, [questionId]: 1 }
      : (() => {
        const copy = { ...answers }
        delete copy[questionId]
        return copy
      })()
    const nextDoneStates = nextIsDone
      ? { ...doneStates, [questionId]: true }
      : (() => {
        const copy = { ...doneStates }
        delete copy[questionId]
        return copy
      })()

    setAnswers(nextAnswers)
    setDoneStates(nextDoneStates)
    setIsSaving(true)
    setError('')

    try {
      const data = await apiRequest(`/api/objective-types/${objective._id}/done`, {
        method: 'POST',
        body: JSON.stringify({ isDone: nextIsDone }),
      })
      setBestScore(data.bestScore)
    } catch (err) {
      setAnswers(previousAnswers)
      setDoneStates(previousDoneStates)
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const clearAnswer = (questionId) => {
    const nextAnswers = { ...answers }
    delete nextAnswers[questionId]
    setAnswers(nextAnswers)
    setDoneStates((current) => {
      const next = { ...current }
      delete next[questionId]
      return next
    })
  }

  const toggleMarkLater = (questionId) => {
    const nextMarked = { ...markedLater }

    if (nextMarked[questionId]) {
      delete nextMarked[questionId]
    } else {
      nextMarked[questionId] = true
    }

    setMarkedLater(nextMarked)
  }

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0))
  }

  const goToNextQuestion = () => {
    setCurrentQuestionIndex((index) => Math.min(index + 1, questions.length - 1))
  }

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index)
    setIsDashboardOpen(false)
  }

  const openQuestionFromDashboard = (index) => {
    startPractice(true)
    setCurrentQuestionIndex(index)
  }

  const submitPractice = async () => {
    if (isCompleteTable) {
      return
    }

    if (!isSignedIn) {
      setError('Please sign in to submit practice and save your best score.')
      return
    }

    if (remainingCount > 0) {
      const shouldSubmit = window.confirm(`${remainingCount} questions are still not attempted. Submit anyway?`)

      if (!shouldSubmit) return
    }

    setIsSaving(true)
    setError('')

    try {
      const data = await apiRequest(`/api/objective-types/${objective._id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
            questionId,
            selectedOption,
          })),
        }),
      })
      setBestScore(data.bestScore)
      setIsDashboardOpen(false)
      if (isAdmin) {
        setResult(data)
        setMode('result')
        setPendingResult(null)
        setFeedbackPromptStage('')
      } else {
        setPendingResult(data)
        if (hasFeedbackFlowBeenSubmitted('objective', objective._id)) {
          setResult(data)
          setMode('result')
          setFeedbackPromptStage('')
        } else {
          setFeedbackPromptStage('before')
        }
      }
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitCurrentQuestion = async (selectedOptionOverride) => {
    if (!currentQuestion || isCompleteTable || isDiagram) return

    const selectedOption = selectedOptionOverride ?? answers[currentQuestion._id]
    const hasAnswer = isMatching
      ? Array.isArray(selectedOption) && selectedOption.length > 0
      : selectedOption !== undefined

    if (!hasAnswer) {
      setError('Select an answer before submitting this question.')
      return
    }

    if (!isSignedIn) {
      setError('Please sign in to submit this question and save your progress.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const data = await apiRequest(`/api/objective-types/${objective._id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: [{
            questionId: currentQuestion._id,
            selectedOption,
          }],
        }),
      })
      const correctAnswer = (data.correctAnswers || []).find((item) => String(item.questionId) === String(currentQuestion._id))
      const isAnswerCorrect = isMatching
        ? Array.isArray(selectedOption)
          && Array.isArray(correctAnswer?.correctOptions)
          && selectedOption.length === correctAnswer.correctOptions.length
          && selectedOption.every((optionIndex, pairIndex) => optionIndex === correctAnswer.correctOptions[pairIndex])
        : selectedOption === correctAnswer?.correctOption
      setCorrectAnswersByQuestion((current) => ({ ...current, [currentQuestion._id]: correctAnswer }))
      setSubmittedQuestions((current) => ({ ...current, [currentQuestion._id]: true }))
      setQuestionFeedback((current) => ({ ...current, [currentQuestion._id]: isAnswerCorrect ? 'correct' : 'incorrect' }))
      setBestScore(data.bestScore)
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const practiceFeedbackSourceKey = objective?._id ? String(objective._id) : ''

  const handlePracticeFeedbackSubmitted = () => {
    if (pendingResult) {
      setResult(pendingResult)
      setMode('result')
    }

    setPendingResult(null)
    setFeedbackPromptStage('')
  }

  const handlePracticeFeedbackSkip = () => {
    if (feedbackPromptStage === 'before' && pendingResult) {
      setResult(pendingResult)
      setMode('result')
      setFeedbackPromptStage('after')
      return
    }

    setFeedbackPromptStage('')
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-[#fbfbfa] px-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-stone-500 shadow-xl">
          Loading practice...
        </div>
      </section>
    )
  }

  if (!objective) {
    return (
      <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-[#fbfbfa] px-4">
        <div className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
          <h1 className="font-serif text-3xl text-stone-900">Practice not found</h1>
          <p className="mt-3 text-sm text-stone-500">{error}</p>
          <Link to={`/chapters/${chapterNumber}/topics/${topicId}/objectives${boardQuery}`} className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">
            Back to objective types
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={`practice-feedback-screen min-h-screen text-stone-800 ${mode === 'practice' && currentFeedback ? `is-${currentFeedback}` : ''} ${mode === 'practice' ? 'px-2 py-1 sm:px-3 lg:px-4' : 'px-3 py-2 sm:px-5 sm:py-3 lg:px-6'}`}>
      <div className={`mx-auto w-full ${mode === 'practice' || mode === 'dashboard' ? 'max-w-[1180px]' : 'max-w-6xl'}`}>
        {mode === 'dashboard' ? (
          <Link
            to={`/chapters/${chapterNumber}/topics/${topicId}/objectives${boardQuery}`}
            className="group mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-x-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-[0_8px_20px_rgba(8,145,178,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={returnToQuestionList}
            className="group mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-x-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-[0_8px_20px_rgba(8,145,178,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        )}
        <div className={`${mode === 'practice' ? 'mt-3' : 'mt-4 sm:mt-5'} flex items-center gap-3 border-b border-stone-200 pb-3 sm:gap-4 sm:pb-4`}>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-stone-900 text-white sm:h-14 sm:w-14">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400 sm:text-xs">
              Chapter {chapter?.number?.toString().padStart(2, '0')} / Topic {topic?.number?.toString().padStart(2, '0')}
            </p>
            <h1 className="mt-1 text-3xl font-serif tracking-tight text-stone-950 sm:text-4xl">
              {title}
            </h1>
          </div>
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
              {error}
            </p>
          )}
        </div>

        <div className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-white p-1 shadow-[0_4px_12px_rgba(15,23,42,0.12)]">
          {[
            { id: 'all', label: 'All' },
            { id: 'board', label: 'Board question' },
          ].map((filter) => {
            const selected = filter.id === 'board' ? boardOnly : !boardOnly
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSearchParams(filter.id === 'board' ? { boardOnly: '1' } : {})}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition sm:text-sm ${selected ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-amber-400 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        {isAdmin ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
            <div className="grid gap-4">
              {questions.length > 0 ? questions.map((question, index) => (
                <article key={question._id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                        Question {String(index + 1).padStart(2, '0')}
                      </p>
                      {question.question?.trim() && (
                        <h2 className="mt-3 text-lg font-bold text-stone-900">{question.question}</h2>
                      )}
                      {question.imageUrl && (
                        <img
                          src={assetUrl(question.imageUrl)}
                          alt=""
                          className="mt-4 max-h-[420px] w-full rounded-2xl border border-stone-200 object-contain"
                        />
                      )}
                      {(isCompleteTable || isDiagram) && question.answerImageUrl && (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Answer</p>
                          <img
                            src={assetUrl(question.answerImageUrl)}
                            alt=""
                            className="mt-2 max-h-[420px] w-full rounded-xl object-contain"
                          />
                        </div>
                      )}
                      {isNumerical && (question.solution || question.answerImageUrl) && (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Solution</p>
                          {question.solution && <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-stone-700">{question.solution}</p>}
                          {question.answerImageUrl && <img src={assetUrl(question.answerImageUrl)} alt="" className="mt-3 max-h-[420px] w-full rounded-xl object-contain" />}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditQuestion(question)}
                        className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 hover:text-stone-950"
                        aria-label="Edit question"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBoardQuestion(question)}
                        disabled={isSaving}
                        className={`rounded-full border px-3 text-[10px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${question.isBoardQuestion ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}
                        aria-label={question.isBoardQuestion ? 'Remove board question status' : 'Mark as board question'}
                      >
                        {question.isBoardQuestion ? 'Board' : 'Make board'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(question._id)}
                        className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-white text-red-500 transition hover:bg-red-50"
                        aria-label="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {isMatching && question.pairs?.length ? question.pairs.map((pair, pairIndex) => (
                      <div key={`${pair.left}-${pairIndex}`} className={`grid gap-2 rounded-xl border px-4 py-3 text-sm font-semibold sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${matchColors[pairIndex % matchColors.length]}`}>
                        <span>{String.fromCharCode(65 + pairIndex)}. {pair.left}</span>
                        <span>{pair.right}</span>
                      </div>
                    )) : isDiagram ? (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-600">
                        Diagram question with answer image.
                      </div>
                    ) : (question.options || []).map((option, optionIndex) => (
                      <div key={option} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${question.correctOption === optionIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-600'}`}>
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </div>
                    ))}
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center">
                  <span className="font-serif text-2xl italic text-stone-300">No questions</span>
                  <p className="mt-2 text-sm text-stone-500">Add the first question for this practice set.</p>
                </div>
              )}
            </div>

            <div className="grid h-fit gap-5">
              <form onSubmit={saveQuestion} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-serif text-2xl text-stone-950">
                    {editingQuestion ? 'Edit question' : 'Add question'}
                  </h2>
                  {editingQuestion && (
                    <button
                      type="button"
                      onClick={resetQuestionForm}
                      className="grid h-9 w-9 place-items-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
                      aria-label="Cancel edit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <label className="mt-4 grid gap-2 text-sm font-bold text-stone-600">
                  Question
                  <textarea
                    required={!isMatching && !isNumerical}
                    rows={4}
                    value={form.question}
                    onChange={(event) => setForm({ ...form, question: event.target.value })}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                  />
                </label>
                {supportsQuestionImage && (
                  <>
                    <label className="mt-4 grid gap-2 text-sm font-bold text-stone-600">
                      Question photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setForm({ ...form, imageFile: event.target.files?.[0] || null, removeImage: false })}
                        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 file:mr-4 file:rounded-xl file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                      />
                    </label>
                    {editingQuestion?.imageUrl && !form.removeImage && !form.imageFile && (
                      <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <img
                          src={assetUrl(editingQuestion.imageUrl)}
                          alt=""
                          className="max-h-48 w-full rounded-xl object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, removeImage: true })}
                          className="mt-3 h-10 w-full rounded-xl border border-red-100 bg-white text-sm font-bold text-red-500 transition hover:bg-red-50"
                        >
                          Remove photo
                        </button>
                      </div>
                    )}
                  </>
                )}
                {(isCompleteTable || isDiagram || isNumerical) && (
                  <>
                    <label className="mt-4 grid gap-2 text-sm font-bold text-stone-600">
                      {isNumerical ? 'Solution photo' : 'Answer photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setForm({ ...form, answerImageFile: event.target.files?.[0] || null, removeAnswerImage: false })}
                        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 file:mr-4 file:rounded-xl file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                      />
                    </label>
                    {editingQuestion?.answerImageUrl && !form.removeAnswerImage && !form.answerImageFile && (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                        <img
                          src={assetUrl(editingQuestion.answerImageUrl)}
                          alt=""
                          className="max-h-48 w-full rounded-xl object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, removeAnswerImage: true })}
                          className="mt-3 h-10 w-full rounded-xl border border-red-100 bg-white text-sm font-bold text-red-500 transition hover:bg-red-50"
                        >
                          {isNumerical ? 'Remove solution photo' : 'Remove answer photo'}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {isNumerical && (
                  <label className="mt-4 grid gap-2 text-sm font-bold text-stone-600">
                    Solution text
                    <textarea
                      rows={5}
                      value={form.solution}
                      onChange={(event) => setForm({ ...form, solution: event.target.value })}
                      placeholder="Explain the steps or final solution..."
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                    />
                  </label>
                )}
                {isMatching ? (
                  <div className="mt-4 grid gap-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 text-xs font-black uppercase tracking-wide text-stone-500">
                      <span>Question side</span>
                      <span>Answer side</span>
                      <span />
                    </div>
                    {(form.pairs || []).map((pair, index) => (
                      <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                        <input
                          required={index < 2}
                          value={pair.left}
                          onChange={(event) => updateMatchPair(index, 'left', event.target.value)}
                          placeholder={`A${index + 1}`}
                          className="h-12 min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                        />
                        <input
                          required={index < 2}
                          value={pair.right}
                          onChange={(event) => updateMatchPair(index, 'right', event.target.value)}
                          placeholder={`Answer ${index + 1}`}
                          className="h-12 min-w-0 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeMatchPair(index)}
                          disabled={form.pairs.length <= 2}
                          className="grid h-12 w-12 place-items-center rounded-2xl border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addMatchPair}
                      className="h-11 rounded-2xl border border-stone-200 bg-stone-50 text-sm font-bold text-stone-700 transition hover:bg-white"
                    >
                      Add matching row
                    </button>
                  </div>
                ) : isCompleteTable || isDiagram ? null : isTrueFalse ? (
                  <div className="mt-4 grid gap-2">
                    <p className="text-sm font-bold text-stone-600">Answer</p>
                    <div className="grid grid-cols-2 gap-2">
                      {trueFalseOptions.map((option, index) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setForm({ ...form, options: trueFalseOptions, correctOption: String(index) })}
                          className={`h-12 rounded-2xl border text-sm font-black transition ${String(form.correctOption) === String(index) ? 'border-emerald-400 bg-emerald-100 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-400 hover:bg-white'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {(form.options || []).map((option, index) => (
                      <label key={index} className="grid gap-2 text-sm font-bold text-stone-600">
                        Option {String.fromCharCode(65 + index)}
                        <div className="flex gap-2">
                          <input
                            required={isCorrelation || index < 2}
                            value={option}
                            onChange={(event) => updateOption(index, event.target.value)}
                            className="h-12 min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, correctOption: String(index) })}
                            className={`h-12 rounded-2xl border px-3 text-xs font-bold transition ${String(form.correctOption) === String(index) ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}
                          >
                            Correct
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isBoardQuestion)}
                    onChange={(event) => setForm({ ...form, isBoardQuestion: event.target.checked })}
                    className="h-4 w-4 accent-amber-600"
                  />
                  <span>Board question</span>
                </label>
                <button type="submit" disabled={isSaving} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 font-bold text-white transition hover:bg-black disabled:opacity-60">
                  <Plus className="h-4 w-4" />
                  {isSaving ? 'Saving...' : editingQuestion ? 'Update question' : 'Add question'}
                </button>
              </form>

              {supportsAiDrafts && <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-serif text-2xl text-stone-950">AI question draft</h2>
                    <p className="text-xs font-semibold text-stone-500">Paste lesson text, review the draft, then save.</p>
                  </div>
                </div>
                <label className="mt-4 grid gap-2 text-sm font-bold text-stone-600">
                  Source text
                  <textarea
                    rows={6}
                    value={aiSourceText}
                    onChange={(event) => setAiSourceText(event.target.value)}
                    placeholder="Paste a long textbook paragraph or notes here..."
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                  />
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  {!isMatching && <label className="grid gap-2 text-sm font-bold text-stone-600 sm:w-32">
                    Count
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={aiQuestionCount}
                      onChange={(event) => setAiQuestionCount(event.target.value)}
                      className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                    />
                  </label>}
                  <button
                    type="button"
                    disabled={isAiGenerating || aiSourceText.trim().length < 80}
                    onClick={generateAiDrafts}
                    className="mt-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isAiGenerating ? 'Generating...' : 'Generate draft'}
                  </button>
                </div>
              </div>}

              {supportsAiDrafts && aiDrafts.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-serif text-2xl text-stone-950">Review AI draft</h2>
                      <p className="text-xs font-semibold text-stone-500">Edit before final save.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={saveAiDrafts}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save all'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {aiDrafts.map((draft, draftIndex) => (
                      <div key={draftIndex} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                            Draft {String(draftIndex + 1).padStart(2, '0')}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeAiDraft(draftIndex)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-white text-red-500 transition hover:bg-red-50"
                            aria-label="Remove draft"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <label className="mt-3 grid gap-2 text-xs font-bold text-stone-600">
                          Question
                          <textarea
                            rows={3}
                            value={draft.question}
                            onChange={(event) => updateAiDraft(draftIndex, { question: event.target.value })}
                            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500"
                          />
                        </label>
                        {isMatching ? (
                          <div className="mt-3 grid gap-2">
                            {(draft.pairs || []).map((pair, pairIndex) => (
                              <div key={pairIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                                <input
                                  value={pair.left}
                                  onChange={(event) => updateAiDraftPair(draftIndex, pairIndex, 'left', event.target.value)}
                                  className="h-10 min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-stone-500"
                                />
                                <input
                                  value={pair.right}
                                  onChange={(event) => updateAiDraftPair(draftIndex, pairIndex, 'right', event.target.value)}
                                  className="h-10 min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-stone-500"
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addAiDraftPair(draftIndex)}
                              className="h-10 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-600 transition hover:bg-stone-50"
                            >
                              Add row
                            </button>
                          </div>
                        ) : isTrueFalse ? (
                          <div className="mt-3 grid gap-2">
                            <p className="text-xs font-bold text-stone-600">Answer</p>
                            <div className="grid grid-cols-2 gap-2">
                              {trueFalseOptions.map((option, optionIndex) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => updateAiDraft(draftIndex, { options: trueFalseOptions, correctOption: optionIndex })}
                                  className={`h-10 rounded-xl border text-xs font-black ${Number(draft.correctOption) === optionIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-500'}`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 grid gap-2">
                            {(draft.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex gap-2">
                                <input
                                  value={option}
                                  onChange={(event) => updateAiDraftOption(draftIndex, optionIndex, event.target.value)}
                                  className="h-10 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-stone-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateAiDraft(draftIndex, { correctOption: optionIndex })}
                                  className={`h-10 rounded-xl border px-3 text-[11px] font-bold ${Number(draft.correctOption) === optionIndex ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-white text-stone-500'}`}
                                >
                                  Correct
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={mode === 'practice' ? 'mt-3' : 'mt-4 sm:mt-5'}>
            {mode === 'dashboard' && (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => startPractice(false)}
                  disabled={!questions.length || !isSignedIn}
                  className={`group relative mx-auto flex w-full max-w-4xl cursor-pointer flex-row items-center gap-2 overflow-hidden rounded-[1.5rem] p-2 text-left text-white shadow-[0_12px_26px_rgba(8,47,73,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(8,47,73,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:gap-4 sm:p-3 ${isPracticeCompleted ? 'bg-[#2f7541]' : 'bg-cyan-800'}`}
                >
                  <span className="relative z-10 flex min-w-0 items-center gap-2 sm:gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 ring-4 ring-white/10 transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16 sm:ring-8">
                      <Play className="ml-0.5 h-5 w-5 fill-white sm:h-7 sm:w-7" />
                    </span>
                    <span className="h-9 w-px shrink-0 bg-white/35 sm:h-12" />
                    <span>
                      <span className="block whitespace-nowrap text-[8px] font-black uppercase tracking-[0.14em] text-white/85 sm:text-[10px] sm:tracking-[0.2em]">Total Questions</span>
                      <span className="mt-0.5 block text-2xl font-black leading-none sm:text-3xl">{totalQuestionCount}</span>
                    </span>
                  </span>
                  <span className={`relative z-10 inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-black shadow-sm transition-transform duration-300 group-hover:scale-[1.02] sm:min-w-64 sm:px-6 sm:text-lg ${isPracticeCompleted ? 'text-[#2f7541]' : 'text-cyan-800'}`}>
                    Start Practice
                  </span>
                </button>

                <div className="grid gap-2">
                  {questions.map((question, index) => {
                    const isSubmitted = Boolean(submittedQuestions[question._id] || bestScore?.attemptedQuestionIds?.includes(String(question._id)) || bestScore?.isDone)
                    const storedCorrectAnswer = correctAnswersByQuestion[question._id]
                    const storedQuestionResult = bestScore?.questionResults?.find((item) => String(item.questionId) === String(question._id))
                    const isCorrect = isSubmitted && (storedQuestionResult ? Boolean(storedQuestionResult.isCorrect) : storedCorrectAnswer && (
                      isMatching
                        ? Array.isArray(answers[question._id])
                          && Array.isArray(storedCorrectAnswer.correctOptions)
                          && answers[question._id].length === storedCorrectAnswer.correctOptions.length
                          && answers[question._id].every((optionIndex, pairIndex) => optionIndex === storedCorrectAnswer.correctOptions[pairIndex])
                        : answers[question._id] === storedCorrectAnswer.correctOption
                    ))
                    const hasStoredResult = Boolean(storedQuestionResult || storedCorrectAnswer)
                    const questionStatusClass = isCorrect
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-200'
                      : isSubmitted && hasStoredResult
                        ? 'border-red-200 bg-red-100 text-red-950 hover:border-red-300 hover:bg-red-200'
                        : question.isBoardQuestion
                          ? 'border-amber-300 bg-amber-50 text-stone-900 hover:border-amber-400 hover:bg-amber-100'
                          : 'border-stone-200 bg-white text-stone-900 hover:border-cyan-300'

                    return (
                      <button
                        key={question._id}
                        type="button"
                        onClick={() => openQuestionFromDashboard(index)}
                        className={`group flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:px-5 ${questionStatusClass}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${isCorrect ? 'bg-emerald-200 text-emerald-800' : isSubmitted && hasStoredResult ? 'bg-red-200 text-red-800' : 'bg-cyan-50 text-cyan-700'}`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-sm font-bold leading-6 text-stone-900 sm:text-base">
                          {question.question || 'Question'}
                        </span>
                        {question.isBoardQuestion && <span className="shrink-0 rounded-full bg-amber-200 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-900">Board</span>}
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${isCorrect ? 'bg-emerald-200 text-emerald-800 group-hover:bg-emerald-300' : isSubmitted && hasStoredResult ? 'bg-red-200 text-red-800 group-hover:bg-red-300' : 'bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white'}`}>
                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                        </span>
                      </button>
                    )
                  })}
                </div>

              </div>
            )}

            {mode === 'practice' && (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                          <span>{isCompleteTable ? 'Status' : 'Progress'}</span>
                          <span>{isCompleteTable ? (isDoneOnlyDone ? '100%' : '0%') : `${progressPercent}%`}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${isCompleteTable ? (isDoneOnlyDone ? 100 : 0) : progressPercent}%` }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDashboardOpen(true)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 text-sm font-bold text-white transition hover:bg-black sm:w-auto lg:hidden"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Dashboard
                      </button>
                    </div>
                    {!isCompleteTable && !isDiagram && <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-emerald-300 bg-emerald-200 px-2 py-2 shadow-sm sm:px-3">
                        <p className="text-xl font-black text-emerald-950">{answeredCount}</p>
                        <p className="text-[9px] font-black uppercase text-emerald-950 sm:text-[10px]">Attempted</p>
                      </div>
                      <div className="rounded-xl border border-amber-300 bg-amber-200 px-2 py-2 shadow-sm sm:px-3">
                        <p className="text-xl font-black text-amber-950">{markedLaterCount}</p>
                        <p className="text-[9px] font-black uppercase text-amber-950 sm:text-[10px]">Marked</p>
                      </div>
                      <div className="rounded-xl bg-stone-100 px-2 py-2 sm:px-3">
                        <p className="text-xl font-black text-stone-700">{remainingCount}</p>
                        <p className="text-[9px] font-bold uppercase text-stone-600 sm:text-[10px]">Remaining</p>
                      </div>
                    </div>}
                  </div>

                  {currentQuestion && (
                    <article className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${currentQuestion.isBoardQuestion ? 'border-amber-300 bg-amber-50/70' : 'border-stone-200 bg-white'}`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                            Question {String(currentQuestionIndex + 1).padStart(2, '0')} of {questions.length}
                          </p>
                          {currentQuestion.isBoardQuestion && <span className="whitespace-nowrap rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-wide text-amber-900">Board question</span>}
                          <button
                            type="button"
                            onClick={() => toggleMarkLater(currentQuestion._id)}
                            className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 text-[10px] font-bold transition sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[11px] ${markedLater[currentQuestion._id] ? 'border-amber-400 bg-amber-300 text-amber-950 shadow-sm' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}
                          >
                            <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {markedLater[currentQuestion._id] ? 'Marked' : 'Mark later'}
                          </button>
                        </div>
                        {currentQuestion.question?.trim() && (
                          <h2 className="w-full break-words text-base font-black leading-snug text-stone-950 sm:text-xl">
                            {currentQuestion.question}
                          </h2>
                        )}
                        {currentQuestion.imageUrl && (
                          <img
                            src={assetUrl(currentQuestion.imageUrl)}
                            alt=""
                            className="mt-1 max-h-[58vh] w-full rounded-2xl border border-stone-200 object-contain"
                          />
                        )}
                      </div>

                      {isMatching ? (
                        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:gap-3">
                          <div className="grid gap-2">
                            {(currentQuestion.pairs || []).map((pair, pairIndex) => {
                              const selectedOption = Array.isArray(answers[currentQuestion._id]) ? answers[currentQuestion._id][pairIndex] : undefined
                              const selectedText = selectedOption !== undefined ? currentQuestion.options[selectedOption] : ''

                              return (
                                <div key={`${currentQuestion._id}-pair-${pairIndex}`} className={`min-h-12 rounded-xl border px-3 py-2 text-xs font-black sm:min-h-14 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base ${matchColors[pairIndex % matchColors.length]}`}>
                                  <div className="flex min-h-8 items-center justify-between gap-2 sm:min-h-9">
                                    <span className="min-w-0 break-words leading-tight">{String.fromCharCode(65 + pairIndex)}. {pair.left}</span>
                                    <span className="min-w-0 max-w-[48%] break-words text-right text-[10px] font-bold uppercase leading-tight opacity-70 sm:text-xs">{selectedText || 'Select'}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="grid gap-2">
                            {(currentQuestion.displayOptions || (currentQuestion.options || []).map((option, index) => ({ text: option, originalIndex: index }))).map((option, optionIndex) => {
                              const currentAnswer = Array.isArray(answers[currentQuestion._id]) ? answers[currentQuestion._id] : []
                              const selectedOrder = currentAnswer.indexOf(option.originalIndex)
                              const isCorrectOption = currentQuestionSubmitted && currentCorrectAnswer?.correctOptions?.[selectedOrder] === option.originalIndex

                              return (
                                <button
                                  key={`${currentQuestion._id}-${optionIndex}`}
                                  type="button"
                                  onClick={() => selectAnswer(currentQuestion._id, option.originalIndex)}
                                  disabled={selectedOrder !== -1 || currentQuestionSubmitted}
                                  className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-bold leading-tight transition sm:min-h-14 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base ${currentQuestionSubmitted && isCorrectOption ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm' : currentQuestionSubmitted && selectedOrder !== -1 ? 'border-red-500 bg-red-500 text-white shadow-sm' : selectedOrder !== -1 ? `${matchColors[selectedOrder % matchColors.length]} shadow-sm` : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400 hover:bg-white'}`}
                                >
                                  {option.text}
                                </button>
                              )
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => clearAnswer(currentQuestion._id)}
                            disabled={currentQuestionSubmitted}
                            className="col-span-2 h-10 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:rounded-2xl sm:text-sm"
                          >
                            Clear option
                          </button>
                        </div>
                      ) : isCompleteTable || isDiagram ? (
                        <div className="mt-4 grid gap-3">
                          <button
                            type="button"
                            onClick={() => toggleAnswerReveal(currentQuestion._id)}
                            className="h-11 rounded-2xl border border-stone-200 bg-white text-sm font-bold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                          >
                            {revealedAnswers[currentQuestion._id] ? 'Hide answer' : 'Show answer'}
                          </button>
                          {revealedAnswers[currentQuestion._id] && (currentQuestion.answerImageUrl ? (
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Answer</p>
                              <img
                                src={assetUrl(currentQuestion.answerImageUrl)}
                                alt=""
                                className="mt-3 max-h-[58vh] w-full rounded-xl object-contain"
                              />
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center text-sm font-bold text-stone-500">
                              Answer is not uploaded yet.
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => markQuestionDone(currentQuestion._id)}
                            disabled={isSaving}
                            className={`h-12 w-full rounded-2xl border text-sm font-black transition disabled:cursor-not-allowed sm:text-base ${doneStates[currentQuestion._id] || answers[currentQuestion._id] !== undefined || isDoneOnlyDone ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm' : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500'}`}
                          >
                            {isSaving ? 'Saving...' : doneStates[currentQuestion._id] || answers[currentQuestion._id] !== undefined || isDoneOnlyDone ? 'Undo done' : 'Mark done'}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-2">
                          {(currentQuestion.displayOptions || (currentQuestion.options || []).map((option, index) => ({ text: option, originalIndex: index }))).map((option, optionIndex) => {
                            const isSelected = answers[currentQuestion._id] === option.originalIndex
                            const isCorrectOption = currentQuestionSubmitted && currentCorrectAnswer?.correctOption === option.originalIndex

                            return (
                              <button
                                key={`${currentQuestion._id}-${optionIndex}`}
                                type="button"
                                onClick={() => selectAnswer(currentQuestion._id, option.originalIndex)}
                                disabled={currentQuestionSubmitted}
                                className={`min-h-12 rounded-2xl border px-4 py-2.5 text-left text-sm font-bold transition disabled:cursor-default sm:text-base ${currentQuestionSubmitted && isCorrectOption ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm' : currentQuestionSubmitted && isSelected ? 'border-red-600 bg-red-500 text-white shadow-sm' : isSelected ? 'border-cyan-600 bg-cyan-500 text-white shadow-sm' : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400 hover:bg-white'}`}
                              >
                                {String.fromCharCode(65 + optionIndex)}. {option.text}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {isNumerical && currentQuestionSubmitted && currentCorrectAnswer && (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Correct answer and solution</p>
                          <p className="mt-2 text-sm font-black text-emerald-950">
                            {currentQuestion.options?.[currentCorrectAnswer.correctOption] || 'Answer unavailable'}
                          </p>
                          {currentCorrectAnswer.solution && (
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-stone-700">{currentCorrectAnswer.solution}</p>
                          )}
                          {currentCorrectAnswer.answerImageUrl && (
                            <img src={assetUrl(currentCorrectAnswer.answerImageUrl)} alt="Numerical solution" className="mt-3 max-h-[58vh] w-full rounded-xl object-contain" />
                          )}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.3fr_1fr]">
                        <button
                          type="button"
                          onClick={goToPreviousQuestion}
                          disabled={currentQuestionIndex === 0}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-2xl sm:px-4 sm:text-base"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        {!isSingleQuestionFlow && !isCompleteTable && !isDiagram && currentQuestionIndex === questions.length - 1 && (
                          <button
                            type="button"
                            onClick={submitPractice}
                            disabled={isSaving}
                            className="order-3 col-span-2 h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:order-none sm:col-span-1 sm:rounded-2xl sm:text-base"
                          >
                            {isSaving ? 'Submitting...' : 'Final Submit'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={goToNextQuestion}
                          disabled={currentQuestionIndex === questions.length - 1}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-2xl sm:px-4 sm:text-base"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  )}
                </div>
                <aside className="hidden h-fit rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:block">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-stone-500" />
                    <h2 className="font-serif text-2xl text-stone-950">Dashboard</h2>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {dashboardFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setDashboardFilter(filter.id)}
                        className={`min-h-11 rounded-xl border px-2 py-1.5 text-center text-xs font-black transition ${dashboardFilter === filter.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-400 hover:bg-white'}`}
                      >
                        <span className="block truncate">{filter.label}</span>
                        <span className="block text-[11px] opacity-75">{filter.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 xl:grid-cols-5">
                    {filteredDashboardQuestions.map(({ question, index }) => {
                      const isAnswered = isQuestionAnswered(question)
                      const isMarked = markedLater[question._id]
                      const isCurrent = index === currentQuestionIndex

                      return (
                        <button
                          key={question._id}
                          type="button"
                          onClick={() => goToQuestion(index)}
                          className={`h-10 rounded-xl border text-sm font-black transition ${isMarked ? 'border-amber-500 bg-amber-400 text-amber-950 shadow-sm' : isAnswered ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm' : isCurrent ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-400'} ${isCurrent && !isMarked ? 'ring-2 ring-stone-300 ring-offset-1' : isCurrent ? 'ring-2 ring-amber-200 ring-offset-1' : ''}`}
                        >
                          {index + 1}
                        </button>
                      )
                    })}
                  </div>

                  {filteredDashboardQuestions.length === 0 && (
                    <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-4 text-center text-sm font-semibold text-stone-500">
                      No questions in this filter.
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 text-xs font-bold text-stone-500">
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500 ring-1 ring-emerald-600" /> Attempted</div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-400 ring-1 ring-amber-500" /> Marked later</div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-stone-100 ring-1 ring-stone-200" /> Not attempted</div>
                  </div>
                </aside>
                {isDashboardOpen && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/45 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 lg:hidden" role="dialog" aria-modal="true" aria-label="Question dashboard">
                    <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
                      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-stone-500" />
                          <h2 className="font-serif text-2xl text-stone-950">Dashboard</h2>
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

                      <div className="max-h-[calc(92vh-5rem)] overflow-y-auto px-4 py-4 sm:px-5">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {dashboardFilters.map((filter) => (
                            <button
                              key={filter.id}
                              type="button"
                              onClick={() => setDashboardFilter(filter.id)}
                              className={`min-h-12 rounded-xl border px-2 py-2 text-center text-xs font-black transition ${dashboardFilter === filter.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-400 hover:bg-white'}`}
                            >
                              <span className="block truncate">{filter.label}</span>
                              <span className="mt-0.5 block text-[11px] opacity-75">{filter.count}</span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
                          {filteredDashboardQuestions.map(({ question, index }) => {
                            const isAnswered = isQuestionAnswered(question)
                            const isMarked = markedLater[question._id]
                            const isCurrent = index === currentQuestionIndex

                            return (
                              <button
                                key={question._id}
                                type="button"
                                onClick={() => goToQuestion(index)}
                                className={`h-12 rounded-xl border text-sm font-black transition sm:h-11 ${isMarked ? 'border-amber-500 bg-amber-400 text-amber-950 shadow-sm' : isAnswered ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm' : isCurrent ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-400'} ${isCurrent && !isMarked ? 'ring-2 ring-stone-300 ring-offset-1' : isCurrent ? 'ring-2 ring-amber-200 ring-offset-1' : ''}`}
                              >
                                {index + 1}
                              </button>
                            )
                          })}
                        </div>

                        {filteredDashboardQuestions.length === 0 && (
                          <p className="mt-5 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-center text-sm font-semibold text-stone-500">
                            No questions in this filter.
                          </p>
                        )}

                        <div className="mt-5 grid gap-2 text-xs font-bold text-stone-500 sm:grid-cols-3">
                          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500 ring-1 ring-emerald-600" /> Attempted</div>
                          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-400 ring-1 ring-amber-500" /> Marked later</div>
                          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-stone-100 ring-1 ring-stone-200" /> Not attempted</div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'result' && result && !isCompleteTable && (
              <div className="grid gap-6">
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                      <h2 className="mt-4 font-serif text-4xl text-stone-950">
                        {result.score}/{result.totalQuestions}
                      </h2>
                      <p className="mt-2 text-sm font-semibold text-stone-500">
                        Best score: {result.bestScore.bestScore}/{result.bestScore.totalQuestions}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startPractice(false)}
                      className="h-12 rounded-2xl bg-stone-900 px-6 font-bold text-white transition hover:bg-black"
                    >
                      Practice Again
                    </button>
                  </div>
                  <div className="mt-6">
                    <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-widest text-stone-400">
                      <span>Score line</span>
                      <span>{Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100)}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-300 bg-emerald-200 p-4 text-center">
                      <p className="text-3xl font-black text-emerald-950">{result.score}</p>
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-950">Correct</p>
                    </div>
                    <div className="rounded-2xl border border-red-300 bg-red-200 p-4 text-center">
                      <p className="text-3xl font-black text-red-950">{result.totalQuestions - result.score}</p>
                      <p className="text-xs font-black uppercase tracking-wide text-red-950">Wrong / Skipped</p>
                    </div>
                    <div className="rounded-2xl bg-stone-100 p-4 text-center">
                      <p className="text-3xl font-black text-stone-700">{answeredCount}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-stone-600">Attempted</p>
                    </div>
                  </div>
                </div>

                {result.progressReport && (
                  <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <h2 className="mt-3 font-serif text-2xl text-stone-950">AI Progress Card</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                          {result.progressReport.suggestion}
                        </p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${result.progressReport.improvement > 0 ? 'bg-emerald-100 text-emerald-700' : result.progressReport.improvement < 0 ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                        {result.progressReport.improvement > 0 ? `+${result.progressReport.improvement}` : result.progressReport.improvement} marks
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-stone-500">Previous best</p>
                        <p className="mt-2 font-serif text-3xl text-stone-950">
                          {result.progressReport.previousScore}/{result.progressReport.totalQuestions}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Current marks</p>
                        <p className="mt-2 font-serif text-3xl text-cyan-950">
                          {result.progressReport.currentScore}/{result.progressReport.totalQuestions}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Best saved</p>
                        <p className="mt-2 font-serif text-3xl text-emerald-950">
                          {result.bestScore.bestScore}/{result.bestScore.totalQuestions}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Right</p>
                        <p className="mt-2 text-3xl font-black text-emerald-950">{result.progressReport.correctCount}</p>
                      </div>
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-red-700">Wrong</p>
                        <p className="mt-2 text-3xl font-black text-red-950">{result.progressReport.wrongCount}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Skipped</p>
                        <p className="mt-2 text-3xl font-black text-amber-950">{result.progressReport.skippedCount}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <h3 className="font-bold text-stone-950">Areas to improve</h3>
                        <div className="mt-3 grid gap-2">
                          {(result.progressReport.focusAreas || []).map((area, index) => (
                            <p key={`${area}-${index}`} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-600">
                              {area}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <h3 className="font-bold text-stone-950">Clear solution</h3>
                        <div className="mt-3 grid gap-2">
                          {(result.progressReport.solutionSteps || []).map((step, index) => (
                            <p key={`${step}-${index}`} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-600">
                              {index + 1}. {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h2 className="font-serif text-2xl text-stone-950">Review attempted questions</h2>
                  <div className="mt-4 grid gap-3">
                    {questions.map((question, index) => {
                      const selectedOption = answers[question._id]
                      const correctAnswer = result.correctAnswers?.find((answer) => answer.questionId === question._id)
                      const isMatchReview = isMatching && Array.isArray(correctAnswer?.correctOptions)
                      const isAttempted = isMatchReview
                        ? Array.isArray(selectedOption) && selectedOption.length > 0
                        : selectedOption !== undefined
                      const isCorrect = isMatchReview
                        ? Array.isArray(selectedOption) &&
                          selectedOption.length === correctAnswer.correctOptions.length &&
                          selectedOption.every((optionIndex, pairIndex) => optionIndex === correctAnswer.correctOptions[pairIndex])
                        : isCompleteTable
                          ? isAttempted
                        : isAttempted && selectedOption === correctAnswer?.correctOption

                      return (
                        <article key={question._id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                                Question {String(index + 1).padStart(2, '0')}
                              </p>
                              {question.question?.trim() && (
                                <h3 className="mt-2 font-bold text-stone-950">{question.question}</h3>
                              )}
                              {question.imageUrl && (
                                <img
                                  src={assetUrl(question.imageUrl)}
                                  alt=""
                                  className="mt-3 max-h-80 w-full rounded-xl border border-stone-200 object-contain"
                                />
                              )}
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${isCorrect ? 'bg-emerald-500 text-white' : isAttempted ? 'bg-red-500 text-white' : 'bg-stone-300 text-stone-800'}`}>
                              {isCorrect ? 'Correct' : isAttempted ? 'Wrong' : 'Skipped'}
                            </span>
                          </div>
                          {!isCompleteTable && (
                          <div className="mt-3 grid gap-2">
                            {isMatchReview ? (question.pairs || []).map((pair, pairIndex) => {
                              const selectedIndex = Array.isArray(selectedOption) ? selectedOption[pairIndex] : undefined
                              const correctIndex = correctAnswer.correctOptions[pairIndex]
                              const rowCorrect = selectedIndex === correctIndex

                              return (
                                <div key={`${question._id}-review-match-${pairIndex}`} className={`rounded-xl border px-3 py-2 text-sm font-bold ${rowCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : selectedIndex !== undefined ? 'border-red-500 bg-red-500 text-white' : 'border-stone-200 bg-white text-stone-600'}`}>
                                  {pair.left}: {selectedIndex !== undefined ? question.options[selectedIndex] : 'Skipped'}
                                  {!rowCorrect && `  - Correct: ${question.options[correctIndex]}`}
                                </div>
                              )
                            }) : (question.displayOptions || (question.options || []).map((option, index) => ({ text: option, originalIndex: index }))).map((option, optionIndex) => {
                              const isSelected = selectedOption === option.originalIndex
                              const isRight = correctAnswer?.correctOption === option.originalIndex

                              return (
                                <div key={`${question._id}-review-${optionIndex}`} className={`rounded-xl border px-3 py-2 text-sm font-bold ${isRight ? 'border-emerald-500 bg-emerald-500 text-white' : isSelected ? 'border-red-500 bg-red-500 text-white' : 'border-stone-200 bg-white text-stone-600'}`}>
                                  {String.fromCharCode(65 + optionIndex)}. {option.text}
                                  {isSelected && '  - Your answer'}
                                  {isRight && '  - Correct answer'}
                                </div>
                              )
                            })}
                          </div>
                          )}
                          {isNumerical && correctAnswer && (
                            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Solution</p>
                              <p className="mt-1 text-sm font-black text-emerald-950">Correct answer: {question.options?.[correctAnswer.correctOption] || 'Unavailable'}</p>
                              {correctAnswer.solution && <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-stone-700">{correctAnswer.solution}</p>}
                              {correctAnswer.answerImageUrl && <img src={assetUrl(correctAnswer.answerImageUrl)} alt="Numerical solution" className="mt-3 max-h-80 w-full rounded-xl object-contain" />}
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openReportDialog(currentQuestion)}
        disabled={!currentQuestion || !isSignedIn}
        className="fixed right-4 top-4 z-[80] flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-950/20 transition hover:scale-105 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 sm:right-5 sm:top-5 sm:h-16 sm:w-16"
        aria-label="Report question mistake"
        title="Report this question"
      >
        <span className="text-xl font-black leading-none">!</span>
        <span className="text-[7px] font-black uppercase leading-[8px] tracking-wider">Report mistake</span>
      </button>

      {isTutorOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-end bg-stone-950/40 p-3 sm:items-center sm:p-5"
          onClick={() => setIsTutorOpen(false)}
        >
          <div
            className="flex h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-cyan-700">AI Teacher</p>
                <h3 className="mt-1 font-serif text-2xl text-stone-950">Ask a doubt</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTutorOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
                aria-label="Close AI teacher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-3">
                {tutorMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'assistant' ? 'bg-cyan-50 text-cyan-950' : 'ml-auto bg-stone-900 text-white'}`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={sendTutorMessage} className="border-t border-stone-100 p-4 sm:p-5">
              <label className="grid gap-2 text-sm font-bold text-stone-600">
                Ask about this question
                <textarea
                  rows={3}
                  value={tutorInput}
                  onChange={(event) => setTutorInput(event.target.value)}
                  placeholder="I am not getting this concept. Can you explain in easy words?"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                />
              </label>
              <button
                type="submit"
                disabled={isTutorSending || !tutorInput.trim()}
                className="mt-3 h-12 w-full rounded-2xl bg-stone-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTutorSending ? 'Thinking...' : 'Send to teacher'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isReportOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-950/55 px-3 py-4 backdrop-blur-sm">
          <form onSubmit={submitReport} className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-rose-700">Report mistake</p>
                <h3 className="mt-1 font-serif text-2xl text-stone-950">Let us fix the question</h3>
                {reportedQuestion?.question && (
                  <p className="mt-2 text-sm leading-6 text-stone-500">{reportedQuestion.question}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200"
                aria-label="Close report dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <p className="text-sm font-bold text-stone-700">What is wrong?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reportReasonOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReportReason(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${reportReason === option.value ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-white'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-bold text-stone-600">
                Details
                <textarea
                  rows={4}
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  placeholder="Add a short note for the teacher..."
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
                />
              </label>
            </div>

            {reportStatus && (
              <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {reportStatus}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="h-12 flex-1 rounded-2xl border border-stone-200 bg-white font-bold text-stone-700 transition hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-12 flex-1 rounded-2xl bg-stone-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        </div>
      )}

      <StarFeedbackModal
        open={!isAdmin && Boolean(feedbackPromptStage) && Boolean(pendingResult)}
        title={feedbackPromptStage === 'before' ? 'Rate this practice' : 'Rate the result too'}
        subtitle={feedbackPromptStage === 'before'
          ? 'Tap stars only. After you rate, we will show your result.'
          : 'Your result is visible now. If you skipped earlier, please leave a quick star rating.'}
        sourceType="objective"
        sourceKey={practiceFeedbackSourceKey}
        sourceLabel={title}
        onSubmitSuccess={handlePracticeFeedbackSubmitted}
        onSkip={handlePracticeFeedbackSkip}
      />
    </section>
  )
}

export default ObjectivePracticePage
