import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Trophy, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { apiRequest } from '../api'
import { authEvents, getStoredAuth } from '../authStorage'

const RANK_STATE_KEY = 'innovative_science_2_rank_state'

const readRankState = () => {
  try {
    return JSON.parse(localStorage.getItem(RANK_STATE_KEY) || 'null')
  } catch (error) {
    localStorage.removeItem(RANK_STATE_KEY)
    return null
  }
}

const writeRankState = (payload) => {
  try {
    localStorage.setItem(RANK_STATE_KEY, JSON.stringify(payload))
  } catch (error) {
    // Ignore storage issues and keep the popup working.
  }
}

const RankNotifier = () => {
  const { pathname } = useLocation()
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [notification, setNotification] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

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
    const refreshRank = () => {
      setRefreshTick((current) => current + 1)
    }

    window.addEventListener('innovative-science-progress-updated', refreshRank)

    return () => {
      window.removeEventListener('innovative-science-progress-updated', refreshRank)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadRank = async () => {
      if (!auth?.token || auth?.user?.isAdmin) {
        setNotification(null)
        return
      }

      try {
        const data = await apiRequest('/api/leaderboard/me')

        if (cancelled || !data?.rank) {
          return
        }

        const userKey = auth.user.email || auth.user.id || auth.user.name || 'guest'
        const storedState = readRankState()
        const previousRank = storedState?.userKey === userKey ? Number(storedState.rank) : null
        const seenSessionKey = `innovative_science_2_rank_seen_${userKey}`
        const hasSeenThisSession = sessionStorage.getItem(seenSessionKey) === '1'
        const rankImproved = Number.isFinite(previousRank) && data.rank < previousRank
        const shouldShow = !hasSeenThisSession || rankImproved

        writeRankState({
          userKey,
          rank: data.rank,
          updatedAt: Date.now(),
        })

        if (!shouldShow) {
          return
        }

        sessionStorage.setItem(seenSessionKey, '1')
        setNotification({
          rank: data.rank,
          previousRank,
          totalStudents: data.totalStudents || 0,
          currentUser: data.currentUser || null,
          rankImproved,
        })
      } catch (error) {
        // Keep the UI quiet if rank data cannot be loaded.
      }
    }

    loadRank()

    return () => {
      cancelled = true
    }
  }, [auth?.token, auth?.user?.email, auth?.user?.isAdmin, pathname, refreshTick])

  if (!notification) {
    return null
  }

  const title = notification.rankImproved
    ? 'Rank up!'
    : 'Your rank is ready'

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={`${notification.rank}-${notification.previousRank || 'first'}`}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          className="fixed bottom-5 right-5 z-[210] w-[min(92vw,420px)] rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Ranking update</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hi {notification.currentUser?.name || auth?.user?.name || 'Student'}, {notification.rankImproved && notification.previousRank
                  ? `You moved from #${notification.previousRank} to #${notification.rank}. Keep the streak going.`
                  : `You are currently ranked #${notification.rank}. Great job, keep pushing forward.`}
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {notification.totalStudents ? `${notification.totalStudents} students are ranked right now.` : 'Your progress is being tracked.'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Close rank notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default RankNotifier
