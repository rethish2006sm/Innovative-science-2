import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2, Flame, MessageCircleMore, Pencil, Plus, Send, Star, Swords, Target, Trophy, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest } from '../api'
import { authEvents, getStoredAuth } from '../authStorage'
import { getFeedbackClientKey } from '../lib/feedbackClient'

const CHAPTER_WEIGHTAGE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6']

const getLocalDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeUntilTomorrow = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  const remainingSeconds = Math.max(0, Math.ceil((tomorrow - now) / 1000))
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s left`
}

const polarToCartesian = (center, radius, angle) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  }
}

const createWeightageArc = (center, radius, startAngle, endAngle) => {
  const start = polarToCartesian(center, radius, endAngle)
  const end = polarToCartesian(center, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

const ChapterWeightageInline = ({ chapters = [], distributionMode = 'withOption' }) => {
  const [activeIndex, setActiveIndex] = useState(null)

  const totalMarks = chapters.reduce(
    (total, chapter) => total + (Number(chapter.marks) || 0),
    0
  )

  const segments = useMemo(() => [...chapters]
    .sort((a, b) => {
      const aNumber = Number(a.number)
      const bNumber = Number(b.number)
      if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber
      return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true })
    })
    .map((chapter, index) => ({
      ...chapter,
      value: Number(chapter.marks) || 0,
      color: CHAPTER_WEIGHTAGE_COLORS[index % CHAPTER_WEIGHTAGE_COLORS.length],
    }))
    .map((chapter, index) => ({
      ...chapter,
      percentage: totalMarks ? ((chapter.value / totalMarks) * 100) : 0,
      rank: 0,
    })), [chapters, totalMarks])

  const chartSegments = useMemo(() => {
    let currentAngle = 0
    const gap = segments.length > 1 ? 3 : 0

    return segments.map((chapter) => {
      const angle = totalMarks ? (chapter.value / totalMarks) * 360 : 0
      const nextSegment = {
        ...chapter,
        startAngle: currentAngle + gap / 2,
        endAngle: Math.max(currentAngle + angle - gap / 2, currentAngle + gap / 2),
      }
      currentAngle += angle
      return nextSegment
    })
  }, [segments, totalMarks])

  const selectedIndex = activeIndex === null ? -1 : Math.min(activeIndex, Math.max(segments.length - 1, 0))
  const selectedChapter = selectedIndex >= 0 ? segments[selectedIndex] : null
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-3xl sm:p-6">
      {segments.length ? (
        <>
          <div className="flex justify-center">
            <div className="relative shrink-0">
              <svg viewBox="0 0 300 300" className="h-[250px] w-[250px] sm:h-[330px] sm:w-[330px]" role="img" aria-label="Interactive chapter weightage chart">
                <circle cx="150" cy="150" r="111" fill="none" stroke="#f1f5f9" strokeWidth="42" />
                {chartSegments.map((chapter, index) => {
                  const isActive = selectedIndex === index
                  const arcPath = createWeightageArc(150, isActive ? 118 : 108, chapter.startAngle, chapter.endAngle)
                  return (
                    <motion.path
                      key={chapter._id || chapter.number || index}
                      fill="none"
                      stroke={chapter.color}
                      strokeWidth={isActive ? 46 : 40}
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                      initial={{ d: arcPath, opacity: 0 }}
                      animate={{
                        d: arcPath,
                        opacity: 1,
                        strokeWidth: isActive ? 46 : 40,
                      }}
                      transition={{
                        d: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.3, delay: index * 0.03 },
                        strokeWidth: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                      }}
                      className="cursor-pointer"
                      onClick={() => {
                        setActiveIndex(index)
                      }}
                      aria-label={`Select ${chapter.name}`}
                    />
                  )
                })}
              </svg>
              <div className="pointer-events-auto absolute inset-0 m-auto flex h-[150px] w-[150px] flex-col items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-center shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:h-[178px] sm:w-[178px]">
                <AnimatePresence mode="wait">
                  {selectedChapter ? (
                    <motion.div
                      key={selectedChapter._id || selectedChapter.number || selectedChapter.name}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="flex w-full flex-col items-center"
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-700">Selected</p>
                      <p className="mt-1 max-w-full break-words text-[clamp(0.68rem,2.4vw,0.95rem)] font-black leading-tight text-slate-950" title={selectedChapter.name}>
                        {selectedChapter.name}
                      </p>
                      <Link
                        to={`/chapters/${selectedChapter.number}/topics`}
                        className="mt-2 inline-flex items-center justify-center rounded-lg bg-cyan-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-cyan-700"
                      >
                        Open Chp
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-slate-500 sm:text-xs">Overview</p>
                      <p className="mt-2 text-3xl font-black leading-none text-slate-950 sm:text-4xl">{totalMarks}</p>
                      <p className="mt-2 text-xs text-slate-500 sm:text-sm">Total Marks</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
          <p className="mt-3 text-center text-[10px] text-slate-500">{distributionMode === 'withOption' ? 'Weightage includes options.' : 'Weightage excludes options.'} Select a slice to highlight it.</p>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No chapter weightage data available yet.</div>
      )}
    </div>
  )
}

const normalizeTopFiveRows = (rows = []) => (Array.isArray(rows) ? rows.slice(0, 5) : [])

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

// --- Animation Variants ---
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const AnimatedBattleModeLink = motion.create(Link)
const AnimatedActionLink = motion.create(Link)

const Homepage = () => {
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [classOptions, setClassOptions] = useState([])
  const [leaderboardScope, setLeaderboardScope] = useState('all')
  const [selectedClassId, setSelectedClassId] = useState(() => getStoredAuth()?.user?.classId || '')
  const [chapters, setChapters] = useState([])
  const [dailyStreakData, setDailyStreakData] = useState(null)
  const [timeUntilTomorrow, setTimeUntilTomorrow] = useState(formatTimeUntilTomorrow)
  const [featuredFeedback, setFeaturedFeedback] = useState([])
  const [feedbackForm, setFeedbackForm] = useState({ name: '', email: '', message: '' })
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState('')
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [refreshTick, setRefreshTick] = useState(0)
  const [isAiTeacherOpen, setIsAiTeacherOpen] = useState(false)
  const [aiTeacherInput, setAiTeacherInput] = useState('')
  const [aiTeacherMessages, setAiTeacherMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me any science doubt or any question about this website. I will explain in simple English.',
    },
  ])
  const [isAiTeacherSending, setIsAiTeacherSending] = useState(false)
  const canViewClassLeaderboard = Boolean(auth?.user?.classId)
  const studentClassId = auth?.user?.classId?._id || auth?.user?.classId || ''

  useEffect(() => {
    const updateTimeUntilTomorrow = () => setTimeUntilTomorrow(formatTimeUntilTomorrow())
    const intervalId = window.setInterval(updateTimeUntilTomorrow, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadLeaderboard = async () => {
      setLeaderboardLoading(true)

      if (leaderboardScope === 'class' && !selectedClassId && classOptions.length) {
        setSelectedClassId(classOptions[0]._id)
        return
      }

      try {
        const classQuery = leaderboardScope === 'class' && selectedClassId ? `&classId=${selectedClassId}` : ''
        const data = await apiRequest(`/api/leaderboard?scope=${leaderboardScope}${classQuery}&limit=5`)
        if (cancelled) return

        const nextLeaderboard = normalizeTopFiveRows(data.leaderboard)
        setLeaderboard(nextLeaderboard)
      } catch (error) {
        if (!cancelled && leaderboard.length === 0) {
          setLeaderboard([])
        }
      } finally {
        if (!cancelled) {
          setLeaderboardLoading(false)
        }
      }
    }
    loadLeaderboard().catch(() => {
      if (!cancelled && leaderboard.length === 0) {
        setLeaderboard([])
        setLeaderboardLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [leaderboardScope, selectedClassId, classOptions.length, refreshTick])

  useEffect(() => {
    const refreshProgress = () => {
      setRefreshTick((current) => current + 1)
    }

    window.addEventListener('innovative-science-progress-updated', refreshProgress)

    return () => {
      window.removeEventListener('innovative-science-progress-updated', refreshProgress)
    }
  }, [])

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
    setFeedbackForm((current) => ({
      ...current,
      name: auth?.user?.name || current.name,
      email: auth?.user?.email || current.email,
    }))
  }, [auth?.user?.email, auth?.user?.name])

  useEffect(() => {
    let cancelled = false

    const loadChapterData = async () => {
      setChaptersLoading(true)

      try {
        const chaptersData = await apiRequest('/api/chapters').catch(() => null)

        if (cancelled) return

        setChapters(chaptersData?.chapters || [])
      } finally {
        if (!cancelled) {
          setChaptersLoading(false)
        }
      }
    }

    const loadBackgroundData = async () => {
      try {
        const [classesData, feedbackData] = await Promise.all([
          apiRequest('/api/classes').catch(() => null),
          apiRequest('/api/feedback/featured?limit=3').catch(() => ({ feedback: [] })),
        ])

        if (cancelled) return

        if (classesData) {
          setClassOptions(classesData.classes || [])
        }

        setFeaturedFeedback(feedbackData.feedback || [])
      } catch (error) {
        if (!cancelled) {
          setFeaturedFeedback([])
        }
      }
    }

    loadChapterData().catch(() => {
      if (!cancelled) {
        setChaptersLoading(false)
      }
    })

    const scheduleBackgroundLoad = () => {
      loadBackgroundData()
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(scheduleBackgroundLoad)
      return () => {
        cancelled = true
        window.cancelIdleCallback(idleId)
      }
    }

    const timeoutId = window.setTimeout(scheduleBackgroundLoad, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [auth?.token])

  useEffect(() => {
    let cancelled = false

    const loadDailyStreak = async () => {
      if (!auth?.token) {
        setDailyStreakData(null)
        return
      }

      try {
        const data = await apiRequest('/api/daily-challenge/history', { cache: 'no-store' })
        if (!cancelled) setDailyStreakData(data)
      } catch (error) {
        if (!cancelled) setDailyStreakData(null)
      }
    }

    loadDailyStreak()

    return () => {
      cancelled = true
    }
  }, [auth?.token, refreshTick])

  useEffect(() => {
    if (!auth?.user?.classId) {
      setSelectedClassId('')
      return
    }

    if (selectedClassId !== auth.user.classId) {
      setSelectedClassId(auth.user.classId)
    }
  }, [auth?.user?.classId, selectedClassId])

  useEffect(() => {
    if (!canViewClassLeaderboard && leaderboardScope === 'class') {
      setLeaderboardScope('all')
    }
  }, [canViewClassLeaderboard, leaderboardScope])

  const stats = useMemo(() => [
    { label: 'Chapters', value: chapters.length || 0, icon: BookOpen },
    { label: 'Top students', value: leaderboard.length || 0, icon: Trophy },
    { label: 'Brain cells / question', value: '1', icon: Brain },
  ], [chapters.length, leaderboard.length])

  const streakCalendar = useMemo(() => {
    const today = new Date()
    const completedDates = new Set(
      (dailyStreakData?.challenges || [])
        .filter((challenge) => challenge.status === 'completed')
        .map((challenge) => challenge.localDate)
    )

    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - offset))
      return {
        key: getLocalDateKey(date),
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        day: date.getDate(),
        isToday: offset === 6,
      }
    }).map((day) => ({ ...day, completed: completedDates.has(day.key) }))
  }, [dailyStreakData])

  const openAiTeacher = () => {
    if (!getStoredAuth()?.token) {
      navigate('/signin')
      return
    }

    setIsAiTeacherOpen(true)
    setAiTeacherInput((current) => (current.trim() ? current : 'I have a science doubt. Can you explain it in simple words?'))
  }

  const sendAiTeacherMessage = async (event) => {
    event.preventDefault()

    const prompt = aiTeacherInput.trim()
    if (!prompt) return
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

    const nextUserMessage = {
      role: 'user',
      content: prompt,
    }

    const nextMessages = [...aiTeacherMessages, nextUserMessage]
    setAiTeacherMessages(nextMessages)
    setAiTeacherInput('')
    setIsAiTeacherSending(true)

    try {
      const data = await apiRequest('/api/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({
          question: prompt,
          objectiveType: 'general',
          topicName: '',
          chapterName: '',
          contextText: '',
          profileContext,
          appHelpContext,
          conversation: nextMessages.slice(-6),
        }),
      })

      setAiTeacherMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.reply || 'I could not generate a response just now.',
        },
      ])
    } catch (error) {
      setAiTeacherMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error.message,
        },
      ])
    } finally {
      setIsAiTeacherSending(false)
    }
  }

  const submitHomepageFeedback = async (event) => {
    event.preventDefault()
    setFeedbackSubmitting(true)
    setFeedbackError('')
    setFeedbackSuccess('')

    try {
      await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating: feedbackRating,
          name: feedbackForm.name,
          email: feedbackForm.email,
          message: feedbackForm.message,
          clientKey: getFeedbackClientKey(),
        }),
      })

      setFeedbackSuccess('Thanks! Your feedback was sent to admin.')
      setFeedbackForm({
        name: auth?.user?.name || '',
        email: auth?.user?.email || '',
        message: '',
      })
      setFeedbackRating(5)
    } catch (error) {
      setFeedbackError(error.message)
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-slate-50 px-0 py-0 sm:px-0 sm:py-0">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 z-0 hidden overflow-hidden pointer-events-none sm:block">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-cyan-400/20 blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-emerald-400/20 blur-[120px]" 
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-2 py-2 min-[380px]:px-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
          
          {/* Main Hero Card */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex min-w-0 flex-col rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_8px_32px_-14px_rgba(0,0,0,0.12)] backdrop-blur-lg min-[380px]:p-4 sm:rounded-[2rem] sm:backdrop-blur-2xl sm:p-7 lg:p-9"
          >
            <motion.div variants={fadeUp} className="mt-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50/70 p-3 min-[380px]:p-3.5 sm:mt-5 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500 text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl">
                    <Flame className="h-5 w-5" fill="currentColor" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Daily streak</p>
                    <div
                      className={`mt-1 inline-flex max-w-full items-center gap-1 whitespace-nowrap text-[11px] font-black tracking-tight sm:text-sm ${dailyStreakData?.streak?.currentStreak ? 'text-amber-500' : 'text-slate-400'}`}
                      aria-label={`${dailyStreakData?.streak?.currentStreak || 0} day streak`}
                    >
                      <Flame className="h-4 w-4" fill="currentColor" />
                      <span>{dailyStreakData?.streak?.currentStreak || 0}</span>
                      <span className="ml-1 whitespace-nowrap text-[10px] font-bold text-slate-500 sm:text-xs">· {timeUntilTomorrow}</span>
                    </div>
                  </div>
                </div>
                <Link to="/daily-streak" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-bold leading-none text-orange-700 shadow-sm transition hover:bg-orange-100">
                  Practice today
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/70 p-2 min-[380px]:gap-2 min-[380px]:p-2.5 sm:mt-4 sm:rounded-2xl">
                <CalendarDays className="h-4 w-4 shrink-0 text-orange-500" />
                <div className="grid flex-1 grid-cols-7 gap-1.5">
                  {streakCalendar.map((day) => (
                    <div key={day.key} className="text-center">
                      <p className="text-[9px] font-bold uppercase text-slate-400">{day.label}</p>
                      <div className={`mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-[11px] font-black ${day.completed ? 'bg-emerald-500 text-white' : day.isToday ? 'border-2 border-orange-400 bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                        {day.completed ? <Check className="h-4 w-4 text-white" aria-label="Completed" /> : day.day}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-4 grid grid-cols-2 gap-2 min-[520px]:flex min-[520px]:flex-wrap min-[520px]:items-center min-[520px]:gap-3 sm:mt-6">
              <AnimatedBattleModeLink
                to="/battle-mode"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative inline-flex min-h-10 w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-2.5 py-2.5 text-xs font-black text-white shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition-all hover:shadow-[0_12px_30px_rgba(249,115,22,0.28)] active:scale-[0.98] min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm"
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ y: [0, -3, 0], rotate: [-6, 8, -6], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10"
                >
                  <Flame className="h-4 w-4 text-yellow-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]" />
                </motion.span>
                <span className="relative z-10">Battle Mode</span>
                <Swords className="relative z-10 h-4 w-4 text-white/90 transition-transform group-hover:translate-x-1" />
                <motion.span
                  aria-hidden="true"
                  animate={{ x: ['-30%', '130%'] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] opacity-70"
                />
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_transparent_40%)] opacity-70" />
              </AnimatedBattleModeLink>
              <AnimatedActionLink
                to="/questions"
                whileHover={{ scale: 1.035, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="question-bank-link group relative inline-flex min-h-10 w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-cyan-300/80 px-2.5 py-2.5 text-xs font-black text-cyan-950 shadow-[0_8px_24px_rgba(6,182,212,0.14)] transition-shadow min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm"
              >
                <span aria-hidden="true" className="question-bank-orbit"><span /></span>
                <span className="question-bank-icon relative z-10 grid h-5 w-5 place-items-center rounded-full bg-white/75 text-cyan-600 shadow-sm">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="relative z-10">Question Bank</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </AnimatedActionLink>
              <AnimatedActionLink to="/pyqs" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="homepage-action-link action-sky group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs font-bold transition-all min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm">
                <BookOpen className="h-4 w-4" />
                PYQs
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </AnimatedActionLink>
              <AnimatedActionLink to="/chapters" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="homepage-action-link action-neutral group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs font-bold transition-all min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm">
                Browse chapters
              </AnimatedActionLink>
              <AnimatedActionLink to="/test-builder" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="homepage-action-link action-dark group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl px-2.5 py-2.5 text-xs font-bold text-white transition-all min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm">
                Create test
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </AnimatedActionLink>
              <AnimatedActionLink to={studentClassId ? `/class/${studentClassId}` : '/feedback'} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className={`homepage-action-link group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs font-bold transition-all min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm ${studentClassId ? 'action-class-highlight text-white' : 'action-amber'}`}>
                {studentClassId ? <BookOpen className="h-4 w-4" /> : <MessageCircleMore className="h-4 w-4" />}
                {studentClassId ? 'My class' : 'Feedback'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </AnimatedActionLink>
              <AnimatedActionLink to="/profile/performance" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="homepage-action-link action-violet group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs font-bold transition-all min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm">
                Performance
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </AnimatedActionLink>
              <AnimatedActionLink to="/leaderboard" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="homepage-action-link action-emerald group inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs font-bold transition-all min-[520px]:w-auto min-[520px]:rounded-full min-[520px]:px-5 sm:py-3 sm:text-sm">
                Leaderboard
              </AnimatedActionLink>
            </motion.div>

            <motion.div variants={staggerContainer} className="mt-4 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-3">
              {stats.map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} whileHover={{ y: -5 }} className="min-w-0 rounded-xl border border-white/70 bg-white/65 p-2.5 shadow-sm backdrop-blur-md transition-colors hover:bg-white/85 min-[380px]:p-3 sm:rounded-2xl sm:p-4">
                  <stat.icon className="h-4 w-4 text-cyan-600 sm:h-5 sm:w-5" />
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-500 min-[380px]:text-[10px] sm:mt-3 sm:text-xs sm:tracking-widest">{stat.label}</p>
                  <p className="mt-1 text-lg font-black text-slate-900 min-[380px]:text-xl sm:text-2xl">{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>

          </motion.div>

          {/* Right Column / Leaderboard */}
          <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:gap-6">
            <div className="min-w-0 rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_8px_32px_-14px_rgba(0,0,0,0.12)] backdrop-blur-md min-[380px]:p-4 sm:rounded-[2rem] sm:backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 sm:text-xs">Top 5 students</p>
                  <h2 className="mt-1.5 font-serif text-2xl text-slate-900 sm:mt-2 sm:text-3xl">
                    {leaderboardScope === 'class' ? (classOptions.find((item) => item._id === selectedClassId)?.name || 'Class board') : 'Hall of Fame'}
                  </h2>
                </div>
                <div className="rounded-2xl bg-amber-100 p-2.5 sm:p-3">
                  <Trophy className="h-7 w-7 text-amber-500 sm:h-8 sm:w-8" />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1 sm:mt-5 sm:rounded-full">
                <button
                  onClick={() => setLeaderboardScope('all')}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${leaderboardScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Global
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (canViewClassLeaderboard) {
                      setLeaderboardScope('class')
                    }
                  }}
                  disabled={!classOptions.length || !canViewClassLeaderboard}
                  title={!canViewClassLeaderboard ? 'Join a class to view the class leaderboard' : ''}
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${leaderboardScope === 'class' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  By Class
                </button>
              </div>

              <AnimatePresence mode="wait">
                {leaderboardScope === 'class' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 overflow-hidden sm:mt-4"
                  >
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full appearance-none rounded-2xl border-none bg-slate-100/80 px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-2 ring-transparent transition-all focus:bg-white focus:ring-emerald-400 sm:px-5 sm:py-3.5"
                    >
                      {classOptions.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} {item.grade ? `(${item.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-3 min-h-0 sm:mt-5 sm:min-h-[260px]">
                {leaderboardLoading ? (
                  <div className="flex h-full flex-col justify-center rounded-3xl border-2 border-dashed border-slate-200 px-4 py-10 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 opacity-50" />
                      <span>Loading top 5 students...</span>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={`leaderboard-placeholder-${index}`}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/70 p-3"
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-400">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="h-3.5 w-2/3 rounded-full bg-slate-200" />
                            <div className="mt-2 h-3 w-1/3 rounded-full bg-slate-100" />
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="h-3 w-10 rounded-full bg-slate-100" />
                            <div className="mt-2 h-5 w-14 rounded-full bg-slate-200" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : leaderboard.length ? (
                  <div className="grid gap-2.5 sm:gap-3">
                    {leaderboard.map((student, index) => (
                      <article 
                        key={student.id} 
                        className="group flex items-center gap-3 rounded-2xl border border-white/50 bg-white/40 p-3 shadow-sm transition-all hover:bg-white/80 hover:shadow-md sm:gap-4 sm:p-3"
                      >
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white text-sm font-black shadow-inner sm:h-12 sm:w-12 sm:text-base ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-700' : 'bg-slate-900'}`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black text-slate-900 group-hover:text-cyan-700 transition-colors">{student.name}</h3>
                          <p className="truncate text-xs font-medium text-slate-500">{student.className || 'Independent'}</p>
                        </div>
                        <div className="shrink-0 text-right px-1 sm:px-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brain Cells</p>
                          <p className="font-mono text-lg font-black text-slate-900 sm:text-xl">{student.totalBrainCells}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 px-4 py-12 text-center text-sm text-slate-500">
                    No leaderboard entries yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <motion.div
          id="home-feedback"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-7 sm:p-6 lg:p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 sm:text-xs">Student feedback</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFeedbackError('')
                setFeedbackSuccess('')
                setIsFeedbackOpen(true)
              }}
              aria-label="Add feedback"
              title="Add feedback"
              className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600 shadow-sm ring-1 ring-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md active:scale-95 sm:h-14 sm:w-14"
            >
              <Pencil className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-950 text-white ring-2 ring-white" aria-hidden="true">
                <Plus className="h-3 w-3" />
              </span>
            </button>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />Student voices</div>
            </div>

            <div className="min-w-0">
              {featuredFeedback.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredFeedback.map((item) => (
                    <article key={item.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-amber-200 hover:shadow-sm sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-sm font-black text-cyan-700">{(item.name || 'S').trim().charAt(0).toUpperCase()}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-nowrap items-center gap-2 whitespace-nowrap">
                            <p className="shrink min-w-0 truncate text-xs font-bold leading-5 text-slate-900">{item.name || 'Student'}</p>
                            <div className="flex shrink-0 items-center gap-0.5" aria-label={`${item.rating} out of 5 stars`}>
                              {Array.from({ length: 5 }).map((_, index) => <Star key={`${item.id}-star-${index}`} className={`h-3.5 w-3.5 ${index < item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                            </div>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{[item.className, formatFeedbackSourceLabel(item)].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                      <p className="mt-4 flex-1 whitespace-pre-wrap break-words text-sm leading-[1.9] text-black">{item.message || 'Shared a rating for their learning experience.'}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <MessageCircleMore className="h-7 w-7 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">Your voice matters</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Featured student reviews will appear here once approved by admin.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {isFeedbackOpen && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-3 sm:p-5"
            onClick={() => setIsFeedbackOpen(false)}
          >
            <div
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/30 bg-white p-5 shadow-2xl sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 sm:text-xs">Student feedback</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">How was your experience?</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Your feedback helps us make learning better.</p>
                </div>
                <button type="button" onClick={() => setIsFeedbackOpen(false)} aria-label="Close feedback form" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={submitHomepageFeedback} className="mt-5 grid gap-3">
                <div className="flex items-center gap-1" role="group" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => setFeedbackRating(value)} aria-label={`${value} star${value > 1 ? 's' : ''}`} aria-pressed={feedbackRating === value} className={`grid h-10 w-10 place-items-center rounded-xl transition active:scale-90 ${value <= feedbackRating ? 'bg-amber-100 text-amber-500' : 'bg-slate-50 text-slate-300 hover:bg-amber-50 hover:text-amber-400'}`}>
                      <Star className={`h-5 w-5 ${value <= feedbackRating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-semibold text-slate-500">{feedbackRating}/5</span>
                </div>
                <input value={feedbackForm.name} onChange={(event) => setFeedbackForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" aria-label="Your name" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                <input type="email" value={feedbackForm.email} onChange={(event) => setFeedbackForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email (optional)" aria-label="Email (optional)" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                <textarea rows={4} value={feedbackForm.message} onChange={(event) => setFeedbackForm((current) => ({ ...current, message: event.target.value }))} placeholder="What did you like? What can we improve?" aria-label="Your feedback" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                {feedbackError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{feedbackError}</p>}
                {feedbackSuccess && <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium leading-5 text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{feedbackSuccess}</p>}
                <button type="submit" disabled={feedbackSubmitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                  {feedbackSubmitting ? 'Sending feedback...' : 'Send feedback'}<Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {isAiTeacherOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-end bg-slate-950/40 p-3 sm:items-center sm:p-5"
          onClick={() => setIsAiTeacherOpen(false)}
        >
          <div
            className="flex h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-cyan-700">AI Teacher</p>
                <h3 className="mt-1 font-serif text-2xl text-slate-950">Ask a doubt</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiTeacherOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close AI teacher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid gap-2.5 sm:gap-3">
                {aiTeacherMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'assistant' ? 'bg-cyan-50 text-cyan-950' : 'ml-auto bg-slate-950 text-white'}`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={sendAiTeacherMessage} className="border-t border-slate-100 p-4 sm:p-5">
              <label className="grid gap-2 text-sm font-bold text-slate-600">
                Ask anything
                <textarea
                  rows={3}
                  value={aiTeacherInput}
                  onChange={(event) => setAiTeacherInput(event.target.value)}
                  placeholder="I have a science doubt. Can you explain it in simple words?"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
                />
              </label>
              <button
                type="submit"
                disabled={isAiTeacherSending || !aiTeacherInput.trim()}
                className="mt-3 h-12 w-full rounded-2xl bg-slate-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAiTeacherSending ? 'Thinking...' : 'Send to teacher'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default Homepage
