import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import Aboutpage from './pages/Aboutpage'
import ChapterWeightage from './pages/Chapter_weightage'
import Chapters from './pages/Chapters'
import Completethetables from './pages/Completethetables'
import Contactpage from './pages/Contactpage'
import Correlation from './pages/Correlation'
import Diagrams from './pages/diagrams'
import Adminpage from './pages/Adminpage'
import Improvementpage from './pages/Improvementpage'
import Identifysymbol from './pages/Identifysymbol'
import Homepage from './pages/Homepage'
import LeaderboardPage from './pages/LeaderboardPage'
import Matchthefollowing from './pages/Matchthefollowing'
import MCQs from './pages/MCQs'
import Objectivepage from './pages/Objectivepage'
import Profilepage from './pages/Profilepage'
import Signinpage from './pages/Signinpage'
import Signuppage from './pages/Signuppage'
import PyqsPage from './pages/PyqsPage'
import Testbuilderpage from './pages/Testbuilderpage'
import Topicspage from './pages/Topicspage'
import TrueorFalse from './pages/TrueorFalse'
import { authEvents, getStoredAuth } from './authStorage'

const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

const AuthRedirect = ({ children }) => {
  if (getStoredAuth()) {
    return <Navigate to="/" replace />
  }

  return children
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

const AppLayout = () => {
  const { pathname } = useLocation()
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [showSigninReminder, setShowSigninReminder] = useState(false)
  const isObjectivePracticeRoute = /\/objectives\/[^/]+$/.test(pathname)
  const isAuthRoute = pathname === '/signin' || pathname === '/signup'

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
    if (auth?.token || isAuthRoute) {
      setShowSigninReminder(false)
      return undefined
    }

    const timer = window.setInterval(() => {
      setShowSigninReminder(true)
    }, 15000)

    return () => window.clearInterval(timer)
  }, [auth?.token, isAuthRoute, pathname])

  return (
    <>
      {!isObjectivePracticeRoute && <Navbar />}
      <main className={`min-h-screen w-full bg-slate-50 text-slate-950 ${isObjectivePracticeRoute ? 'pt-0' : 'pt-24'}`}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/about" element={<Aboutpage />} />
          <Route path="/contact" element={<Contactpage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/improvement" element={<Improvementpage />} />
          <Route
            path="/test-builder"
            element={
              auth?.token ? (
                <Testbuilderpage />
              ) : (
                <AuthRequiredScreen />
              )
            }
          />
          <Route path="/admin" element={<Adminpage />} />
          <Route path="/chapter-weightage" element={<ChapterWeightage />} />
          <Route path="/chapters" element={<Chapters />} />
          <Route path="/chapters/:chapterNumber/topics" element={<Topicspage />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives" element={<Objectivepage />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/mcqs" element={<MCQs />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/true-or-false" element={<TrueorFalse />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/correlation" element={<Correlation />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/match-the-following" element={<Matchthefollowing />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/complete-the-tables" element={<Completethetables />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/diagram-based-question" element={<Diagrams />} />
          <Route path="/chapters/:chapterNumber/topics/:topicId/objectives/identify-symbol" element={<Identifysymbol />} />
          <Route path="/profile" element={<Profilepage />} />
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
      </main>
      {!isObjectivePracticeRoute && <Footer />}
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
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
