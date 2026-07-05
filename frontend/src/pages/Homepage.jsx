import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, Brain, CheckCircle2, MessageCircleMore, Sparkles, Star, Trophy, TrendingUp, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import ChapterWeightageGraph from '../components/ChapterWeightageGraph'

const HOMEPAGE_CACHE_KEY = 'innovative_science_2_homepage_cache'
const LEADERBOARD_CACHE_KEY = 'innovative_science_2_leaderboard_cache'

const readHomepageCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(HOMEPAGE_CACHE_KEY) || 'null')

    if (!cached || typeof cached !== 'object') {
      return null
    }

    return cached
  } catch (error) {
    localStorage.removeItem(HOMEPAGE_CACHE_KEY)
    return null
  }
}

const writeHomepageCache = (payload) => {
  try {
    localStorage.setItem(
      HOMEPAGE_CACHE_KEY,
      JSON.stringify({
        ...payload,
        cachedAt: Date.now(),
      }),
    )
  } catch (error) {
    // Ignore storage quota issues and keep the live UI working.
  }
}

const readLeaderboardCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(LEADERBOARD_CACHE_KEY) || 'null')

    if (!cached || typeof cached !== 'object') {
      return null
    }

    return cached
  } catch (error) {
    localStorage.removeItem(LEADERBOARD_CACHE_KEY)
    return null
  }
}

const writeLeaderboardCache = (payload) => {
  try {
    localStorage.setItem(
      LEADERBOARD_CACHE_KEY,
      JSON.stringify({
        ...payload,
        cachedAt: Date.now(),
      }),
    )
  } catch (error) {
    // Ignore storage quota issues and keep the live UI working.
  }
}

const clearHomepageCache = () => {
  localStorage.removeItem(HOMEPAGE_CACHE_KEY)
}

const normalizeTopFiveRows = (rows = []) => (Array.isArray(rows) ? rows.slice(0, 5) : [])

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

const Homepage = () => {
  const navigate = useNavigate()
  const homepageCache = useMemo(() => readHomepageCache(), [])
  const leaderboardCache = useMemo(() => readLeaderboardCache(), [])
  const initialLeaderboardCache = useMemo(() => {
    const homepageHasLeaderboard = Array.isArray(homepageCache?.leaderboard) && homepageCache.leaderboard.length > 0
    const leaderboardHasLeaderboard = Array.isArray(leaderboardCache?.leaderboard) && leaderboardCache.leaderboard.length > 0

    if (!homepageHasLeaderboard && !leaderboardHasLeaderboard) {
      return null
    }

    if (homepageHasLeaderboard && leaderboardHasLeaderboard) {
      return Number(leaderboardCache?.cachedAt || 0) >= Number(homepageCache?.cachedAt || 0)
        ? leaderboardCache
        : homepageCache
    }

    return leaderboardHasLeaderboard ? leaderboardCache : homepageCache
  }, [homepageCache, leaderboardCache])
  const hasCachedLeaderboard = Array.isArray(initialLeaderboardCache?.leaderboard) && initialLeaderboardCache.leaderboard.length > 0
  const hasCachedChapters = Array.isArray(homepageCache?.chapters) && homepageCache.chapters.length > 0
  const [leaderboard, setLeaderboard] = useState(() => normalizeTopFiveRows(initialLeaderboardCache?.leaderboard))
  const [classOptions, setClassOptions] = useState(() => homepageCache?.classOptions || leaderboardCache?.classOptions || [])
  const [leaderboardScope, setLeaderboardScope] = useState(() => initialLeaderboardCache?.leaderboardScope || initialLeaderboardCache?.scope || homepageCache?.leaderboardScope || leaderboardCache?.scope || 'all')
  const [selectedClassId, setSelectedClassId] = useState(() => initialLeaderboardCache?.selectedClassId || homepageCache?.selectedClassId || leaderboardCache?.selectedClassId || getStoredAuth()?.user?.classId || '')
  const [chapters, setChapters] = useState(() => homepageCache?.chapters || [])
  const [progress, setProgress] = useState(() => homepageCache?.progress || null)
  const [featuredFeedback, setFeaturedFeedback] = useState(() => homepageCache?.featuredFeedback || [])
  const [leaderboardLoading, setLeaderboardLoading] = useState(() => !hasCachedLeaderboard)
  const [chaptersLoading, setChaptersLoading] = useState(() => !hasCachedChapters)
  const [leaderboardRefreshTick, setLeaderboardRefreshTick] = useState(0)
  const [auth, setAuth] = useState(() => getStoredAuth())
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

  useEffect(() => {
    let cancelled = false

    const loadLeaderboard = async () => {
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
        writeLeaderboardCache({
          scope: leaderboardScope,
          selectedClassId,
          leaderboard: nextLeaderboard,
          classOptions,
        })
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
  }, [leaderboardScope, selectedClassId, classOptions.length, leaderboardRefreshTick])

  useEffect(() => {
    const syncLeaderboardFromCache = () => {
      const cached = readLeaderboardCache()
      if (!cached) {
        setLeaderboardRefreshTick((current) => current + 1)
        return
      }

      const sameScope = String(cached.scope || 'all') === String(leaderboardScope || 'all')
      const sameClass = String(cached.selectedClassId || '') === String(selectedClassId || '')

      if (sameScope && sameClass) {
        setLeaderboard(normalizeTopFiveRows(cached.leaderboard))
        setLeaderboardLoading(false)
      }

      setLeaderboardRefreshTick((current) => current + 1)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLeaderboardFromCache()
      }
    }

    window.addEventListener('innovative-science-leaderboard-updated', syncLeaderboardFromCache)
    window.addEventListener('storage', syncLeaderboardFromCache)
    window.addEventListener('focus', syncLeaderboardFromCache)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('innovative-science-progress-updated', syncLeaderboardFromCache)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncLeaderboardFromCache()
      }
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('innovative-science-leaderboard-updated', syncLeaderboardFromCache)
      window.removeEventListener('storage', syncLeaderboardFromCache)
      window.removeEventListener('focus', syncLeaderboardFromCache)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('innovative-science-progress-updated', syncLeaderboardFromCache)
    }
  }, [leaderboardScope, selectedClassId])

  useEffect(() => {
    let cancelled = false

    const loadStaticContent = async () => {
      if (!homepageCache?.chapters) {
        setChaptersLoading(true)
      }

      try {
        const [chaptersData, classesData, feedbackData, progressData] = await Promise.all([
          apiRequest('/api/chapters').catch(() => null),
          apiRequest('/api/classes').catch(() => null),
          apiRequest('/api/feedback/featured?limit=3').catch(() => ({ feedback: [] })),
          auth?.token ? apiRequest('/api/progress/me').catch(() => null) : Promise.resolve(null),
        ])

        if (cancelled) return

        if (chaptersData) {
          setChapters(chaptersData.chapters || [])
        }

        if (classesData) {
          setClassOptions(classesData.classes || [])
        }

        setFeaturedFeedback(feedbackData.feedback || [])
        setProgress(progressData?.progress || null)
      } finally {
        if (!cancelled) {
          setChaptersLoading(false)
        }
      }
    }

    loadStaticContent().catch(() => {
      if (!cancelled) {
        setChaptersLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [auth?.token, homepageCache?.chapters])

  useEffect(() => {
    if (!selectedClassId && auth?.user?.classId) {
      setSelectedClassId(auth.user.classId)
    }
  }, [auth?.user?.classId, selectedClassId])

  useEffect(() => {
    if (!canViewClassLeaderboard && leaderboardScope === 'class') {
      setLeaderboardScope('all')
    }
  }, [canViewClassLeaderboard, leaderboardScope])

  useEffect(() => {
    const handleClose = () => {
      clearHomepageCache()
    }

    window.addEventListener('beforeunload', handleClose)
    window.addEventListener('pagehide', handleClose)

    return () => {
      window.removeEventListener('beforeunload', handleClose)
      window.removeEventListener('pagehide', handleClose)
    }
  }, [])

  useEffect(() => {
    writeHomepageCache({
      chapters,
      leaderboard: normalizeTopFiveRows(leaderboard),
      classOptions,
      featuredFeedback,
      leaderboardScope,
      selectedClassId,
      progress,
      profile: auth?.user || null,
    })
  }, [chapters, leaderboard, classOptions, featuredFeedback, leaderboardScope, selectedClassId, progress, auth?.user])

  const stats = useMemo(() => [
    { label: 'Chapters', value: chapters.length || 0, icon: BookOpen },
    { label: 'Top students', value: leaderboard.length || 0, icon: Trophy },
    { label: 'Brain cells / question', value: '1', icon: Brain },
  ], [chapters.length, leaderboard.length])

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

      <div className="relative z-10 mx-auto w-full max-w-none px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
          
          {/* Main Hero Card */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col rounded-[1.75rem] border border-white/60 bg-white/60 p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] backdrop-blur-lg sm:rounded-[2.5rem] sm:backdrop-blur-2xl sm:p-10"
          >
            <motion.div variants={fadeUp} className="inline-flex self-start items-center gap-2 rounded-full border border-cyan-200 bg-cyan-100/50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-800 backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              Innovative Science 2
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="mt-5 font-serif text-3xl leading-[1.08] tracking-tight text-slate-900 sm:mt-6 sm:text-5xl lg:text-7xl">
              Practice science in a way that actually <span className="bg-gradient-to-r from-cyan-600 to-emerald-500 bg-clip-text text-transparent">shows progress.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
              Work through objective questions, track chapter-wise improvement, earn brain cells, and conquer the leaderboard.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Link to="/test-builder" className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-950 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-900 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 sm:w-auto sm:px-8 sm:py-4">
                Create test
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/chapters" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 sm:w-auto sm:px-8 sm:py-4">
                Browse chapters
              </Link>
              <Link to="/leaderboard" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-6 py-3.5 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md active:scale-95 sm:w-auto sm:px-8 sm:py-4">
                Leaderboard
              </Link>
              <Link to="/feedback" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50/80 px-6 py-3.5 text-sm font-bold text-amber-700 transition-all hover:bg-amber-100 hover:shadow-md active:scale-95 sm:w-auto sm:px-8 sm:py-4">
                Leave feedback
                <MessageCircleMore className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div variants={staggerContainer} className="mt-8 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:mt-12 sm:grid-cols-3 sm:gap-4">
              {stats.map((stat, i) => (
                <motion.div key={stat.label} variants={fadeUp} whileHover={{ y: -5 }} className="rounded-3xl border border-white/50 bg-white/40 p-4 shadow-sm backdrop-blur-md transition-colors hover:bg-white/60 sm:p-5">
                  <stat.icon className="h-6 w-6 text-cyan-600" />
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 sm:mt-4 sm:text-xs">{stat.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>

            {progress && (
              <motion.div variants={fadeUp} className="mt-6 relative overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
                <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 sm:text-xs">Your latest progress</p>
                    <h2 className="mt-2 font-serif text-xl text-slate-900 sm:text-2xl">
                      {auth?.user?.name ? `${auth.user.name}'s report card` : 'Your report card'}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                      <span className="font-bold text-emerald-700">{progress.averagePercent}% average</span> across your saved attempts and <span className="font-bold text-emerald-700">{progress.totalBrainCells} brain cells</span> collected.
                    </p>
                  </div>
                  <Link to="/improvement" className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 sm:w-auto sm:px-6 sm:py-4">
                    View MY IMPROVEMENT
                    <TrendingUp className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column / Leaderboard */}
          <div className="flex flex-col gap-4 lg:gap-6">
            <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md sm:rounded-[2.5rem] sm:backdrop-blur-xl sm:p-8">
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

              <div className="mt-5 flex flex-wrap gap-2 rounded-full bg-slate-100 p-1 sm:mt-6">
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

              <div className="mt-5 min-h-[260px] sm:mt-6 sm:min-h-[300px]">
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
                  <div className="grid gap-3">
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
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cells</p>
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 rounded-[1.75rem] border border-white/60 bg-white/60 p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md sm:mt-6 sm:rounded-[2.5rem] sm:backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 sm:text-xs">
                Chapter weightage
              </p>
              <h2 className="mt-1.5 font-serif text-2xl text-slate-900 sm:mt-2 sm:text-3xl">
                Study priorities at a glance
              </h2>
            </div>
            <div className="rounded-2xl bg-cyan-100 p-2.5 sm:p-3">
              <BookOpen className="h-7 w-7 text-cyan-600 sm:h-8 sm:w-8" />
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-3 sm:mt-6 sm:rounded-[2rem] sm:p-5">
            {chaptersLoading ? (
              <div className="grid gap-3 rounded-[1.25rem] border border-dashed border-slate-200 bg-white/80 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
                <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-slate-200/80 sm:h-32 sm:w-32" />
                <div className="grid gap-2">
                  <div className="h-4 w-40 rounded-full bg-slate-200/80" />
                  <div className="h-3 w-56 rounded-full bg-slate-200/80" />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="h-16 rounded-2xl bg-slate-100" />
                    <div className="h-16 rounded-2xl bg-slate-100" />
                    <div className="h-16 rounded-2xl bg-slate-100" />
                  </div>
                </div>
              </div>
            ) : (
              <ChapterWeightageGraph chapters={chapters} animateIntro={false} />
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 rounded-[1.75rem] border border-white/60 bg-white/60 p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md sm:mt-6 sm:rounded-[2.5rem] sm:backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 sm:text-xs">
                Feedback picked by admin
              </p>
              <h2 className="mt-1.5 font-serif text-2xl text-slate-900 sm:mt-2 sm:text-3xl">
                Real voices from the classroom
              </h2>
            </div>
            <div className="rounded-2xl bg-amber-100 p-2.5 sm:p-3">
              <Star className="h-7 w-7 text-amber-500 sm:h-8 sm:w-8" />
            </div>
          </div>

          {featuredFeedback.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {featuredFeedback.map((item) => (
                <article key={item.id} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        {item.name} {item.className ? `• ${item.className}` : ''}
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
                    <MessageCircleMore className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {item.message || 'No message was added, but the rating still counts.'}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              No featured feedback yet. Visit the feedback page and send the first good note.
            </div>
          )}
        </motion.div>

        {/* Bottom Bento Grid section */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]"
        >
          <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl sm:p-10">
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-cyan-600/30 blur-[80px]" />
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-400">Practice flow</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Three simple steps</h2>
              <div className="mt-8 grid gap-5">
                <StepCard number="01" title="Choose chapters" text="Pick one or more chapters and then choose the objective types you want." />
                <StepCard number="02" title="Practice or test" text="Answer one-mark questions, reveal hints, and submit your work." />
                <StepCard number="03" title="Track improvement" text="Scores, weak concepts, and class rankings are saved automatically." />
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-[2.5rem] border border-cyan-100/50 bg-white/60 p-8 shadow-sm backdrop-blur-md sm:backdrop-blur-xl sm:p-10">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Why students like it</p>
            <h2 className="mt-3 font-serif text-3xl text-slate-900 sm:text-4xl">Everything needed to keep moving</h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              Combines chapter learning, objective practice, AI help, and reporting so you always know exactly what to study next.
            </p>
            <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
              <MiniStat icon={Award} title="Brain cells" value="Earn brain cell by Solving objectives" delay={0.1} />
              <MiniStat icon={CheckCircle2} title="Reports" value="Saved after attempts" delay={0.2} />
              <MiniStat icon={TrendingUp} title="Improvement" value="Live tracking visible" delay={0.3} />
              <MiniStat icon={BookOpen} title="Questions" value="MCQ to completion" delay={0.4} />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (isAiTeacherOpen) {
            setIsAiTeacherOpen(false)
            return
          }

          openAiTeacher()
        }}
        className="fixed bottom-5 right-5 z-[110] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-600 via-sky-500 to-emerald-500 text-white shadow-2xl shadow-cyan-950/25 transition hover:scale-105 hover:shadow-cyan-950/35"
        aria-label="Open AI teacher"
      >
        <Sparkles className="h-6 w-6" />
      </button>

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
              <div className="grid gap-3">
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

// Sub-components updated for styling & subtle animations
const StepCard = ({ number, title, text }) => (
  <motion.div whileHover={{ x: 5 }} className="group rounded-3xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10">
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-black text-cyan-300 ring-1 ring-cyan-500/30">
        {number}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
    <p className="mt-3 pl-14 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300">{text}</p>
  </motion.div>
)

const MiniStat = ({ icon: Icon, title, value, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ y: -4 }}
    className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm transition-all hover:shadow-md"
  >
    <div className="inline-flex rounded-xl bg-cyan-50 p-2 text-cyan-600">
      <Icon className="h-5 w-5" />
    </div>
    <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
  </motion.div>
)

export default Homepage
