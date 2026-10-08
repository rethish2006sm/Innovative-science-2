import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Footer from './components/Footer'
import RankNotifier from './components/RankNotifier'
import Navbar from './components/Navbar'
import StudentMessagePopup from './components/StudentMessagePopup'
import StudentGiftPopup from './components/StudentGiftPopup'
import SiteNoticeBanner from './components/SiteNoticeBanner'
const Aboutpage = lazy(() => import('./pages/Aboutpage'))
const ChapterWeightage = lazy(() => import('./pages/Chapter_weightage'))
const Chapters = lazy(() => import('./pages/Chapters'))
const Completethetables = lazy(() => import('./pages/Completethetables'))
const Contactpage = lazy(() => import('./pages/Contactpage'))
const Correlation = lazy(() => import('./pages/Correlation'))
const Diagrams = lazy(() => import('./pages/diagrams'))
const Adminpage = lazy(() => import('./pages/Adminpage'))
const AdminClassMaterialsPage = lazy(() => import('./pages/AdminClassMaterialsPage'))
const AdminAnalysisPage = lazy(() => import('./pages/AdminAnalysisPage'))
const AdminQuestionListPage = lazy(() => import('./pages/AdminQuestionListPage'))
const AddTheoryQuestion = lazy(() => import('./pages/AddTheoryQuestion'))
const Classpage = lazy(() => import('./pages/Classpage'))
const Feedbackpage = lazy(() => import('./pages/Feedbackpage'))
const BattleModeHome = lazy(() => import('./pages/BattleModeHome'))
const BattleCreatePage = lazy(() => import('./pages/BattleCreatePage'))
const BattleJoinPage = lazy(() => import('./pages/BattleJoinPage'))
const BattleRoomPage = lazy(() => import('./pages/BattleRoomPage'))
const Improvementpage = lazy(() => import('./pages/Improvementpage'))
const Identifysymbol = lazy(() => import('./pages/Identifysymbol'))
const Homepage = lazy(() => import('./pages/Homepage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const DailyStreakPage = lazy(() => import('./pages/DailyStreakPage'))
const Matchthefollowing = lazy(() => import('./pages/Matchthefollowing'))
const MCQs = lazy(() => import('./pages/MCQs'))
const Numericals = lazy(() => import('./pages/Numericals'))
const Oddmanout = lazy(() => import('./pages/Oddmanout'))
const Objectivepage = lazy(() => import('./pages/Objectivepage'))
const Profilepage = lazy(() => import('./pages/Profilepage'))
const ProfilePerformancePage = lazy(() => import('./pages/ProfilePerformancePage'))
const Signinpage = lazy(() => import('./pages/Signinpage'))
const Signuppage = lazy(() => import('./pages/Signuppage'))
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PyqsPage = lazy(() => import('./pages/PyqsPage'))
const Testbuilderpage = lazy(() => import('./pages/Testbuilderpage'))
const Topicspage = lazy(() => import('./pages/Topicspage'))
const TrueorFalse = lazy(() => import('./pages/TrueorFalse'))
import Seo from './components/Seo'
import { io } from 'socket.io-client'
import { API_BASE_URL, apiRequest } from './api'
import { authEvents, getStoredAuth, updateStoredUser } from './authStorage'
import { clearBattleSession, getBattleSession, getBattleSessionRoute, saveBattleSession } from './lib/battleSession'
import { registerWebPush } from './lib/webPush'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getActiveScience, SCIENCE_CHANGED_EVENT } from './science'

const SITE_DESCRIPTION =
  'Innovative Science 2 helps students practice science chapters, solve objective questions, take tests, and track brain cell progress.'

const normalizeToHashRoute = () => {
  if (typeof window === 'undefined') {
    return false
  }

  const { pathname, search, hash } = window.location

  if (hash || pathname === '/' || pathname.startsWith('/api')) {
    return false
  }

  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const nextUrl = `${window.location.origin}/#${normalizedPath}${search}`
  window.location.replace(nextUrl)
  return true
}

const getSeoFromPathname = (pathname) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'

  if (normalizedPath === '/') {
    return {
      title: 'Home',
      description: SITE_DESCRIPTION,
    }
  }

  if (normalizedPath === '/about') {
    return {
      title: 'About Us',
      description: 'Learn about Innovative Science 2, a student-friendly science practice platform for Class 10.',
    }
  }

  if (normalizedPath === '/contact') {
    return {
      title: 'Contact',
      description: 'Get in touch with the Innovative Science 2 team for help, support, or feedback.',
    }
  }

  if (normalizedPath === '/feedback') {
    return {
      title: 'Feedback',
      description: 'Leave a star rating and an optional message for Innovative Science 2.',
    }
  }

  if (normalizedPath === '/leaderboard') {
    return {
      title: 'Leaderboard',
      description: 'See the top students ranked by brain cells, score, and overall practice progress.',
    }
  }

  if (normalizedPath === '/daily-streak') {
    return {
      title: 'Daily Streak',
      description: 'Build a daily science practice streak with a personalized challenge.',
      noindex: true,
    }
  }

  if (normalizedPath === '/battle-mode') {
    return {
      title: 'Battle Mode',
      description: 'Create or join a live science quiz battle room and compete in real time.',
    }
  }

  if (normalizedPath === '/battle-mode/create') {
    return {
      title: 'Create Battle Room',
      description: 'Set up a live Battle Mode room with chapters, topics, timing, and reactions.',
      noindex: true,
    }
  }

  if (normalizedPath === '/battle-mode/join') {
    return {
      title: 'Join Battle Room',
      description: 'Join a live Battle Mode room using the 6-character code.',
      noindex: true,
    }
  }

  if (/^\/battle-mode\/room\/[^/]+\/(lobby|arena|results)$/.test(normalizedPath)) {
    const code = normalizedPath.match(/^\/battle-mode\/room\/([^/]+)\//)?.[1]
    const mode = normalizedPath.match(/^\/battle-mode\/room\/[^/]+\/([^/]+)$/)?.[1]
    return {
      title: `Battle ${mode ? mode[0].toUpperCase() + mode.slice(1) : 'Room'}`,
      description: `Battle room ${code || ''}.`,
      noindex: true,
    }
  }

  if (normalizedPath === '/improvement') {
    return {
      title: 'Improvement',
      description: 'Review your latest practice progress, mistakes, and improvement suggestions.',
      noindex: true,
    }
  }

  if (normalizedPath === '/chapter-weightage') {
    return {
      title: 'Chapter Weightage',
      description: 'Check chapter-wise weightage and plan your science revision effectively.',
    }
  }

  if (normalizedPath === '/chapters') {
    return {
      title: 'Chapters',
      description: 'Browse the science chapters available for practice and revision.',
    }
  }

  if (/^\/chapters\/\d+\/topics$/.test(normalizedPath)) {
    const chapterNumber = normalizedPath.match(/^\/chapters\/(\d+)\/topics$/)?.[1]
    return {
      title: `Chapter ${chapterNumber} Topics`,
      description: `Explore topics and practice material for Chapter ${chapterNumber} in Science 2.`,
    }
  }

  if (/^\/chapters\/\d+\/topics\/[^/]+\/objectives$/.test(normalizedPath)) {
    const chapterNumber = normalizedPath.match(/^\/chapters\/(\d+)\/topics\/[^/]+\/objectives$/)?.[1]
    return {
      title: `Chapter ${chapterNumber} Objectives`,
      description: `Open objective practice sets for Chapter ${chapterNumber} and start solving questions.`,
    }
  }

  if (/\/objectives\/mcqs$/.test(normalizedPath)) {
    return {
      title: 'MCQs Practice',
      description: 'Practice science multiple-choice questions and track your correct answers.',
    }
  }

  if (/\/objectives\/true-or-false$/.test(normalizedPath)) {
    return {
      title: 'True or False',
      description: 'Solve true-or-false science questions and improve accuracy.',
    }
  }

  if (/\/objectives\/correlation$/.test(normalizedPath)) {
    return {
      title: 'Correlation Practice',
      description: 'Practice correlation questions with a simple, exam-focused workflow.',
    }
  }

  if (/\/objectives\/odd-man-out$/.test(normalizedPath)) {
    return {
      title: 'Odd Man Out Practice',
      description: 'Choose the science option that does not belong with the other three.',
    }
  }

  if (/\/objectives\/match-the-following$/.test(normalizedPath)) {
    return {
      title: 'Match the Following',
      description: 'Match related science concepts and strengthen chapter recall.',
    }
  }

  if (/\/objectives\/complete-the-tables$/.test(normalizedPath)) {
    return {
      title: 'Complete the Tables',
      description: 'Complete science tables and review chapter facts in a structured way.',
    }
  }

  if (/\/objectives\/diagram-based-question$/.test(normalizedPath)) {
    return {
      title: 'Diagram Questions',
      description: 'Answer diagram-based science questions and revise visual concepts.',
    }
  }

  if (/\/objectives\/identify-symbol$/.test(normalizedPath)) {
    return {
      title: 'Identify Symbol',
      description: 'Practice science symbol identification with quick objective questions.',
    }
  }

  if (normalizedPath === '/profile') {
    return {
      title: 'Profile',
      description: 'View your profile, class details, and personal progress.',
      noindex: true,
    }
  }

  if (normalizedPath === '/pyqs') {
    return {
      title: 'PYQs',
      description: 'Browse previous year question papers for Science 2.',
    }
  }

  if (/^\/class\/[^/]+$/.test(normalizedPath)) {
    return {
      title: 'Class Board',
      description: 'View your class notice board and admin updates.',
      noindex: true,
    }
  }

  if (normalizedPath === '/signin') {
    return {
      title: 'Sign In',
      description: 'Sign in to save progress, take tests, and view your science rankings.',
      noindex: true,
    }
  }

  if (normalizedPath === '/signup') {
    return {
      title: 'Sign Up',
      description: 'Create your account to start practicing Science 2 and track your progress.',
      noindex: true,
    }
  }

  if (normalizedPath === '/test-builder') {
    return {
      title: 'Test Builder',
      description: 'Create a custom science test and check your progress with saved scores.',
      noindex: true,
    }
  }

  if (normalizedPath === '/questions' || normalizedPath === '/admin' || normalizedPath === '/dashboard' || normalizedPath === '/admin/analysis' || normalizedPath === '/admin/questions' || normalizedPath === '/admin/class-materials') {
    return {
      title: normalizedPath === '/questions' ? 'Question Bank' : normalizedPath === '/admin/analysis' ? 'Student Analysis | Admin' : normalizedPath === '/admin/questions' ? 'Question List | Admin' : normalizedPath === '/admin/class-materials' ? 'Study Materials | Admin' : 'Admin Dashboard',
      description: normalizedPath === '/questions' || normalizedPath === '/admin/questions' ? 'Browse and review science questions.' : 'Review student activity, brain cells, daily streaks, and performance.',
      noindex: true,
    }
  }

  return {
    title: 'Innovative Science 2',
    description: SITE_DESCRIPTION,
  }
}

const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

const hasCompleteProfile = (profile = {}) => Boolean(
  profile.name?.trim() &&
  /^\d{10}$/.test(profile.phoneNumber || '') &&
  profile.dateOfBirth &&
  profile.gender &&
  profile.bloodGroup &&
  profile.state === 'Maharashtra' &&
  profile.city &&
  profile.area?.trim() &&
  profile.schoolName?.trim() &&
  profile.finalExamPercentage !== null &&
  profile.finalExamPercentage !== undefined &&
  profile.finalExamPercentage !== '',
)

const AuthRedirect = ({ children }) => {
  const { loading } = useAuth()
  const storedAuth = getStoredAuth()
  const storedUser = storedAuth?.user

  if (loading) {
    return <div className="grid min-h-[calc(100vh-6rem)] place-items-center bg-slate-50 text-sm font-bold text-slate-500">Checking your session…</div>
  }

  // Firebase can still have a client-side user while the backend session is
  // missing or has failed to sync. Treat that state as a guest session so the
  // public site and science selector remain usable before sign-in.
  if (!storedAuth?.token) return children

  return <Navigate to={hasCompleteProfile(storedUser) ? '/' : '/complete-profile'} replace />
}

const AuthRequiredScreen = () => (
  <section className="flex min-h-[calc(100vh-6rem)] w-full items-center justify-center bg-slate-50 px-4 py-10">
    <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-cyan-50 text-cyan-600">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 11V8a4 4 0 10-8 0v3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="11" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">Sign in required</h1>
      <p className="mt-3 text-slate-500">Please sign in to use the test builder and save your progress.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link
          to="/signin"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-black"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Sign up
        </Link>
      </div>
    </div>
  </section>
)

const PageLoading = () => (
  <div className="grid min-h-[calc(100vh-6rem)] place-items-center bg-slate-50 text-sm font-bold text-slate-500">
    Loading…
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { loading } = useAuth()

  if (loading) {
    return <div className="grid min-h-[calc(100vh-6rem)] place-items-center bg-slate-50 text-sm font-bold text-slate-500">Checking your session…</div>
  }

  return getStoredAuth()?.token ? children : <AuthRequiredScreen />
}

const AppLayout = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [showSigninReminder, setShowSigninReminder] = useState(false)
  const [siteNotice, setSiteNotice] = useState(null)
  const [dismissedNoticeKey, setDismissedNoticeKey] = useState('')
  const [activeScience, setActiveScience] = useState(() => getActiveScience())
  const isObjectivePracticeRoute = /\/objectives\/[^/]+$/.test(pathname)
  const isBattleRoute = pathname.startsWith('/battle-mode')
  const isAuthRoute = pathname === '/signin' || pathname === '/signup'
  const seo = getSeoFromPathname(pathname)
  const siteNoticeKey = siteNotice?.id ? `${siteNotice.id}:${siteNotice.updatedAt || ''}` : ''
  const showSiteNotice = Boolean(siteNotice?.message && !isObjectivePracticeRoute && !isBattleRoute && siteNoticeKey && dismissedNoticeKey !== siteNoticeKey)

  useEffect(() => {
    const syncScience = (event) => setActiveScience(event.detail?.science || getActiveScience())
    window.addEventListener(SCIENCE_CHANGED_EVENT, syncScience)
    return () => window.removeEventListener(SCIENCE_CHANGED_EVENT, syncScience)
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
    if (!auth?.token || auth?.user?.isAdmin) return undefined
    const setupPush = async () => {
      try {
        await registerWebPush()
      } catch (error) {
        console.warn('Could not enable browser notifications:', error.message)
      }
    }
    setupPush()
    window.addEventListener('innovative-science-push-updated', setupPush)
    return () => {
      window.removeEventListener('innovative-science-push-updated', setupPush)
    }
  }, [auth?.token, auth?.user?.isAdmin])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const socket = io(API_BASE_URL, {
      // Polling avoids a noisy failed WebSocket upgrade when the local backend
      // or proxy does not expose the Socket.IO WebSocket endpoint.
      transports: ['polling'],
      upgrade: false,
      withCredentials: true,
    })

    const dispatchProgressUpdate = (detail) => {
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated', { detail }))
    }

    const dispatchClassFeedUpdate = (detail) => {
      window.dispatchEvent(new CustomEvent('innovative-science-class-feed-updated', { detail }))
    }

    const dispatchClassRosterUpdate = (detail) => {
      window.dispatchEvent(new CustomEvent('innovative-science-class-roster-updated', { detail }))
    }

    const refreshCurrentAuthUser = async (detail) => {
      const currentAuth = getStoredAuth()
      const studentId = String(detail?.studentId || '')

      if (!currentAuth?.token || currentAuth?.user?.isAdmin) {
        return
      }

      if (studentId && String(currentAuth.user.id || '') !== studentId) {
        return
      }

      try {
        const data = await apiRequest('/api/auth/me')
        if (data?.user) {
          updateStoredUser(data.user)
        }
      } catch {
        // Keep the last known auth in place if the refresh call fails.
      }
    }

    const syncCurrentAuthUser = async (detail) => {
      const currentAuth = getStoredAuth()
      const studentId = String(detail?.studentId || '')

      dispatchClassRosterUpdate(detail)

      if (!currentAuth?.token || currentAuth?.user?.isAdmin || !studentId) {
        return
      }

      if (String(currentAuth.user.id || '') !== studentId) {
        return
      }

      try {
        const data = await apiRequest('/api/auth/me')
        if (data?.user) {
          updateStoredUser(data.user)
        }
      } catch {
        // Keep the last known auth in place if the refresh call fails.
      }
    }

    socket.on('student-progress-updated', dispatchProgressUpdate)
    socket.on('student-class-updated', syncCurrentAuthUser)
    socket.on('class-feed-updated', dispatchClassFeedUpdate)
    window.addEventListener('innovative-science-progress-updated', refreshCurrentAuthUser)

    return () => {
      socket.off('student-progress-updated', dispatchProgressUpdate)
      socket.off('student-class-updated', syncCurrentAuthUser)
      socket.off('class-feed-updated', dispatchClassFeedUpdate)
      window.removeEventListener('innovative-science-progress-updated', refreshCurrentAuthUser)
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (auth?.token || isAuthRoute || isBattleRoute) {
      setShowSigninReminder(false)
      return undefined
    }

    const timer = window.setInterval(() => {
      setShowSigninReminder(true)
    }, 15000)

    return () => window.clearInterval(timer)
  }, [auth?.token, isAuthRoute, isBattleRoute, pathname])

  useEffect(() => {
    let active = true

    const loadSiteNotice = async () => {
      try {
        const data = await apiRequest('/api/announcement')
        if (!active) {
          return
        }

        setSiteNotice(data.announcement || null)
      } catch {
        if (active) {
          setSiteNotice(null)
        }
      }
    }

    loadSiteNotice()

    const timer = window.setInterval(loadSiteNotice, 30000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [pathname])

  useEffect(() => {
    let cancelled = false

    const syncBattleSession = async () => {
      if (!auth?.token || isBattleRoute) {
        return
      }

      const localSession = getBattleSession()
      if (localSession?.roomCode) {
        navigate(getBattleSessionRoute(localSession), { replace: true })
        return
      }

      try {
        const data = await apiRequest('/api/battle-mode/active')
        if (cancelled) {
          return
        }

        if (data?.activeRoom?.code) {
          saveBattleSession({
            roomCode: data.activeRoom.code,
            roomId: data.activeRoom.id,
            status: data.activeRoom.status,
            route: data.activeRoom.route || (data.activeRoom.status === 'active' ? 'arena' : 'lobby'),
          })
          navigate(`/battle-mode/room/${data.activeRoom.code}/${data.activeRoom.route || (data.activeRoom.status === 'active' ? 'arena' : 'lobby')}`, { replace: true })
        }
      } catch {
        if (!cancelled) {
          clearBattleSession()
        }
      }
    }

    syncBattleSession()

    return () => {
      cancelled = true
    }
  }, [auth?.token, isBattleRoute, navigate, pathname])

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        noindex={seo.noindex}
        canonicalPath={pathname}
      />
      <RankNotifier />
      <StudentMessagePopup />
      {!isObjectivePracticeRoute && !isBattleRoute && <Navbar />}
      <StudentGiftPopup />
      <div className={isObjectivePracticeRoute || isBattleRoute ? '' : 'pt-24'}>
        {showSiteNotice && (
          <SiteNoticeBanner
            message={siteNotice.message}
            color={siteNotice.color}
            onClose={() => setDismissedNoticeKey(siteNoticeKey)}
          />
        )}
        <main className="min-h-screen w-full bg-slate-50 text-slate-950">
          <Suspense fallback={<PageLoading />}>
          <Routes key={activeScience}>
          <Route path="/" element={<Homepage />} />
          <Route path="/about" element={<Aboutpage />} />
          <Route path="/contact" element={<Contactpage />} />
          <Route path="/feedback" element={<Feedbackpage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/daily-streak" element={<ProtectedRoute><DailyStreakPage /></ProtectedRoute>} />
          <Route path="/battle-mode" element={<BattleModeHome />} />
          <Route path="/battle-mode/create" element={<ProtectedRoute><BattleCreatePage /></ProtectedRoute>} />
          <Route path="/battle-mode/join" element={<ProtectedRoute><BattleJoinPage /></ProtectedRoute>} />
          <Route path="/battle-mode/room/:roomCode/lobby" element={<BattleRoomPage />} />
          <Route path="/battle-mode/room/:roomCode/arena" element={<BattleRoomPage />} />
          <Route path="/battle-mode/room/:roomCode/results" element={<BattleRoomPage />} />
          <Route path="/improvement" element={<ProtectedRoute><Improvementpage /></ProtectedRoute>} />
          <Route
            path="/test-builder"
            element={
              <ProtectedRoute><Testbuilderpage /></ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Adminpage />} />
          <Route path="/dashboard" element={<Adminpage />} />
          <Route path="/admin/class-materials" element={<AdminClassMaterialsPage />} />
          <Route path="/admin/analysis" element={<AdminAnalysisPage />} />
          <Route path="/admin/questions" element={<AdminQuestionListPage />} />
          <Route path="/questions" element={<AdminQuestionListPage />} />
          <Route path="/chapters/:chapterNumber/theory-questions" element={<AddTheoryQuestion />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/theory-questions" element={<AddTheoryQuestion />} />
          <Route path="/chapter-weightage" element={<ChapterWeightage />} />
          <Route path="/chapters" element={<Chapters />} />
          <Route path="/class/:classId" element={<Classpage />} />
          <Route path="/chapters/:chapterNumber/topics" element={<Topicspage />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives" element={<Objectivepage />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/mcqs" element={<MCQs />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/true-or-false" element={<TrueorFalse />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/correlation" element={<Correlation />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/odd-man-out" element={<Oddmanout />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/match-the-following" element={<Matchthefollowing />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/complete-the-tables" element={<Completethetables />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/diagram-based-question" element={<Diagrams />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/identify-symbol" element={<Identifysymbol />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/numericals" element={<Numericals />} />
          <Route path="/profile" element={<ProtectedRoute><Profilepage /></ProtectedRoute>} />
          <Route path="/profile/performance" element={<ProtectedRoute><ProfilePerformancePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
          <Route path="/pyqs" element={<PyqsPage />} />
          <Route
            path="/signin"
            element={
              <AuthRedirect>
                <Signinpage />
              </AuthRedirect>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthRedirect>
                <Signuppage />
              </AuthRedirect>
            }
          />
          </Routes>
          </Suspense>
        </main>
      </div>
      {!isObjectivePracticeRoute && !isBattleRoute && <div className="app-footer"><Footer /></div>}
      {showSigninReminder && !auth?.token && !isAuthRoute && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Reminder</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Please sign in</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  You are browsing as a guest. Sign in to use AI Teacher, the test builder, and saved progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSigninReminder(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Close sign in reminder"
              >
                ×
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                to="/signin"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-black"
                onClick={() => setShowSigninReminder(false)}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowSigninReminder(false)}
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const App = () => {
  if (normalizeToHashRoute()) {
    return null
  }

  return (
    <AuthProvider>
      <HashRouter>
        <ScrollToTop />
        <AppLayout />
      </HashRouter>
    </AuthProvider>
  )
}

export default App
