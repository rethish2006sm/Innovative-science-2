import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Crown, Sparkles, Trophy, Users } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const LEADERBOARD_CACHE_KEY = 'innovative_science_2_leaderboard_cache'
const LEADERBOARD_REFRESH_MS = 5000

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
    // Ignore storage limits and keep the live UI working.
  }
}

const notifyLeaderboardUpdate = () => {
  window.dispatchEvent(new CustomEvent('innovative-science-leaderboard-updated'))
}

const normalizeLeaderboardRows = (rows = []) => (
  Array.isArray(rows) ? rows.map((row, index) => normalizeLeaderboardRow(row, index)) : []
)

const readLeaderboardCacheForView = (scope, selectedClassId) => {
  const cached = readLeaderboardCache()

  if (!cached || typeof cached !== 'object') {
    return null
  }

  if (String(cached.scope || 'all') !== String(scope || 'all')) {
    return null
  }

  if (String(cached.selectedClassId || '') !== String(selectedClassId || '')) {
    return null
  }

  return cached
}

const normalizeLeaderboardRow = (row, index) => ({
  id: String(row?.id || row?._id || row?.email || `leaderboard-row-${index}`),
  name: String(row?.name || 'Student').trim() || 'Student',
  className: String(row?.className || '').trim(),
  totalBrainCells: Number(row?.totalBrainCells || 0),
})

const compareLeaderboardRows = (left, right) => {
  if (right.totalBrainCells !== left.totalBrainCells) {
    return right.totalBrainCells - left.totalBrainCells
  }

  const nameCompare = left.name.localeCompare(right.name)
  if (nameCompare !== 0) {
    return nameCompare
  }

  return left.className.localeCompare(right.className)
}

const mergeRows = (leftRows, rightRows) => {
  const merged = []
  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < leftRows.length && rightIndex < rightRows.length) {
    if (compareLeaderboardRows(leftRows[leftIndex], rightRows[rightIndex]) <= 0) {
      merged.push(leftRows[leftIndex])
      leftIndex += 1
    } else {
      merged.push(rightRows[rightIndex])
      rightIndex += 1
    }
  }

  return merged.concat(leftRows.slice(leftIndex), rightRows.slice(rightIndex))
}

const mergeSortLeaderboard = (rows = []) => {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return Array.isArray(rows) ? rows : []
  }

  const middle = Math.floor(rows.length / 2)
  const leftRows = mergeSortLeaderboard(rows.slice(0, middle))
  const rightRows = mergeSortLeaderboard(rows.slice(middle))

  return mergeRows(leftRows, rightRows)
}

const LeaderboardRow = memo(({ student, rank, isCurrentUser }) => {
  const accentClasses =
    rank === 1
      ? 'border-amber-200 bg-amber-50/80'
      : isCurrentUser
        ? 'border-emerald-200 bg-emerald-50/80'
        : 'border-slate-200 bg-white/90'

  const rankClasses =
    rank === 1
      ? 'bg-amber-500 text-white'
      : rank === 2
        ? 'bg-slate-300 text-slate-900'
        : rank === 3
          ? 'bg-orange-400 text-white'
          : 'bg-slate-100 text-slate-600'

  return (
    <article className={`flex flex-col gap-3 rounded-3xl border p-4 shadow-sm transition sm:flex-row sm:items-center sm:gap-4 ${accentClasses}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black sm:h-12 sm:w-12 ${rankClasses}`}>
        {rank === 1 ? <Crown className="h-5 w-5" /> : `#${rank}`}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-black text-slate-950 sm:text-lg">{student.name}</h3>
          {student.className ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
              {student.className}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              No class
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 self-stretch sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:self-auto sm:text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brain cells</p>
        <p className="text-2xl font-black text-slate-950 sm:mt-1">{student.totalBrainCells}</p>
      </div>
    </article>
  )
})

const LeaderboardPage = () => {
  const initialCache = useMemo(() => readLeaderboardCache(), [])
  const requestIdRef = useRef(0)
  const [scope, setScope] = useState(() => initialCache?.scope || 'all')
  const [leaderboard, setLeaderboard] = useState(() => normalizeLeaderboardRows(initialCache?.leaderboard))
  const [classOptions, setClassOptions] = useState(() => initialCache?.classOptions || [])
  const [selectedClassId, setSelectedClassId] = useState(
    () => initialCache?.selectedClassId || getStoredAuth()?.user?.classId || '',
  )
  const [loading, setLoading] = useState(
    () => !Array.isArray(initialCache?.leaderboard) || !initialCache?.leaderboard.length,
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Number(initialCache?.cachedAt || 0))
  const [auth, setAuth] = useState(() => getStoredAuth())
  const canViewClassLeaderboard = Boolean(auth?.user?.classId)

  const syncLeaderboardFromCache = (nextScope = scope, nextClassId = selectedClassId) => {
    const cached = readLeaderboardCacheForView(nextScope, nextClassId)

    if (!cached) {
      return false
    }

    setLeaderboard(normalizeLeaderboardRows(cached.leaderboard))
    setClassOptions(Array.isArray(cached.classOptions) ? cached.classOptions : [])
    setLoading(false)
    setError('')
    setLastSyncedAt(Number(cached.cachedAt || Date.now()))

    return true
  }

  const loadLeaderboard = async (nextScope = scope, nextClassId = selectedClassId, { silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const cachedView = readLeaderboardCacheForView(nextScope, nextClassId)
    const hasCachedRows = Array.isArray(cachedView?.leaderboard) && cachedView.leaderboard.length > 0

    if (!hasCachedRows) {
      setLoading(true)
      setLeaderboard([])
    }

    if (!silent && !hasCachedRows) {
      setError('')
    }

    setIsRefreshing(hasCachedRows)

    try {
      const classQuery = nextScope === 'class' && nextClassId ? `&classId=${nextClassId}` : ''
      const data = await apiRequest(`/api/leaderboard?scope=${nextScope}${classQuery}&limit=20`)

      if (requestId !== requestIdRef.current) {
        return
      }

      const nextLeaderboard = Array.isArray(data.leaderboard)
        ? normalizeLeaderboardRows(data.leaderboard)
        : []
      const existingCache = readLeaderboardCache()

      setLeaderboard(nextLeaderboard)
      setError('')
      writeLeaderboardCache({
        scope: nextScope,
        selectedClassId: nextClassId,
        leaderboard: nextLeaderboard,
        classOptions: classOptions.length ? classOptions : existingCache?.classOptions || [],
      })
      setLastSyncedAt(Date.now())
      notifyLeaderboardUpdate()
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return
      }

      if (!hasCachedRows) {
        setError(err.message)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    setAuth(getStoredAuth())
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest('/api/classes')
        const nextClassOptions = data.classes || []
        setClassOptions(nextClassOptions)
        writeLeaderboardCache({
          scope,
          selectedClassId,
          leaderboard,
          classOptions: nextClassOptions,
        })
      } catch (err) {
        setError(err.message)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!selectedClassId && auth?.user?.classId) {
      setSelectedClassId(auth.user.classId)
    }
  }, [auth?.user?.classId, selectedClassId])

  useEffect(() => {
    if (!canViewClassLeaderboard && scope === 'class') {
      setScope('all')
    }
  }, [canViewClassLeaderboard, scope])

  useEffect(() => {
    if (scope === 'class' && !selectedClassId && classOptions.length) {
      setSelectedClassId(classOptions[0]._id)
    }
  }, [scope, selectedClassId, classOptions.length])

  useEffect(() => {
    if (scope === 'class' && !selectedClassId) {
      return
    }

    const hasCachedView = syncLeaderboardFromCache(scope, selectedClassId)
    loadLeaderboard(scope, selectedClassId, { silent: hasCachedView })
  }, [scope, selectedClassId, classOptions.length])

  useEffect(() => {
    const refreshFromProgress = () => {
      loadLeaderboard(scope, selectedClassId, { silent: true })
    }

    window.addEventListener('innovative-science-progress-updated', refreshFromProgress)

    return () => {
      window.removeEventListener('innovative-science-progress-updated', refreshFromProgress)
    }
  }, [scope, selectedClassId, classOptions.length])

  useEffect(() => {
    if (scope === 'class' && !selectedClassId) {
      return undefined
    }

    const refreshLeaderboard = () => {
      if (document.visibilityState === 'visible') {
        loadLeaderboard(scope, selectedClassId, { silent: true })
      }
    }

    const syncFromCache = () => {
      syncLeaderboardFromCache(scope, selectedClassId)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromCache()
        refreshLeaderboard()
      }
    }

    window.addEventListener('innovative-science-leaderboard-updated', syncFromCache)
    window.addEventListener('storage', syncFromCache)
    window.addEventListener('focus', refreshLeaderboard)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const intervalId = window.setInterval(refreshLeaderboard, LEADERBOARD_REFRESH_MS)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('innovative-science-leaderboard-updated', syncFromCache)
      window.removeEventListener('storage', syncFromCache)
      window.removeEventListener('focus', refreshLeaderboard)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [scope, selectedClassId, classOptions.length])

  const sortedLeaderboard = useMemo(() => mergeSortLeaderboard(leaderboard), [leaderboard])
  const topThree = useMemo(() => sortedLeaderboard.slice(0, 3), [sortedLeaderboard])
  const currentUserId = auth?.user?.id || auth?.user?.email || ''
  const currentUserRank = useMemo(() => {
    if (!currentUserId) {
      return null
    }

    return sortedLeaderboard.findIndex((item) => item.id === currentUserId || item.id === auth?.user?.email) + 1 || null
  }, [auth?.user?.email, currentUserId, sortedLeaderboard])
  const selectedClassName = classOptions.find((item) => item._id === selectedClassId)?.name || 'selected class'
  const hasLeaderboard = sortedLeaderboard.length > 0
  const showLoadingState = loading && !hasLeaderboard
  const showErrorState = Boolean(error) && !hasLeaderboard

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#ffffff_52%,#ecfeff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                <Crown className="h-4 w-4" />
                Brain Cell Ranking
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Leaderboard
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                We sort by brain cells first, then show only the three fields that matter most: name, class, and brain cells.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700">
                  Auto refresh every 5s
                </span>
                {isRefreshing && (
                  <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-cyan-700">
                    Syncing live cache
                  </span>
                )}
                {lastSyncedAt ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Cached locally
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[380px]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scope</p>
                <p className="mt-1.5 text-xl font-black text-slate-900">{scope === 'all' ? 'Global' : 'Class'}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Top Cells</p>
                <p className="mt-1.5 text-xl font-black text-emerald-900">{sortedLeaderboard[0]?.totalBrainCells || 0}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 sm:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Your Rank</p>
                <p className="mt-1.5 text-xl font-black text-cyan-900">{currentUserRank ? `#${currentUserRank}` : '-'}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center">
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-all sm:w-auto sm:flex-none ${scope === 'all' ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <BarChart3 className="h-4 w-4" />
                All Students
              </button>
              <button
                type="button"
                onClick={() => {
                  if (canViewClassLeaderboard) {
                    setScope('class')
                  }
                }}
                disabled={!classOptions.length || !canViewClassLeaderboard}
                title={!canViewClassLeaderboard ? 'Join a class to view the class leaderboard' : ''}
                className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-all sm:w-auto sm:flex-none ${scope === 'class' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Users className="h-4 w-4" />
                By Class
              </button>
            </div>

            <Link
              to="/test-builder"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:ml-auto sm:w-auto"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Create Test
            </Link>
          </div>

          {scope === 'class' && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Class</label>
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {classOptions.map((classItem) => (
                    <option key={classItem._id} value={classItem._id}>
                      {classItem.name} {classItem.grade ? `(${classItem.grade})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs font-medium text-slate-500 sm:text-right">
                {selectedClassId ? `Viewing leaderboard for ${selectedClassName}` : 'Choose a class to view its leaderboard'}
              </p>
            </div>
          )}

          {showLoadingState ? (
            <div className="mt-10 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`leaderboard-skeleton-${index}`} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white/70 p-4">
                  <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-2 h-3 w-1/3 animate-pulse rounded-full bg-slate-50" />
                  </div>
                  <div className="h-8 w-16 animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : showErrorState ? (
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : hasLeaderboard ? (
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="order-2 space-y-3 lg:order-1">
                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Sorted results</p>
                </div>
                <div className="space-y-3">
                  {sortedLeaderboard.map((student, index) => (
                    <LeaderboardRow
                      key={student.id}
                      student={student}
                      rank={index + 1}
                      isCurrentUser={student.id === currentUserId}
                    />
                  ))}
                </div>
              </div>

              <div className="order-1 space-y-5 lg:order-2">
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  {topThree.map((student, index) => (
                    <div
                      key={`podium-${student.id}`}
                      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${
                        index === 0
                          ? 'border-amber-200 bg-gradient-to-br from-amber-100 to-amber-50'
                          : index === 1
                            ? 'border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50'
                            : 'border-orange-200 bg-gradient-to-br from-orange-100 to-orange-50'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top #{index + 1}</p>
                      <h3 className="mt-2 truncate text-xl font-black text-slate-950">{student.name}</h3>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {student.className || 'No class'}
                      </p>
                      <div className="mt-4 rounded-2xl bg-white/70 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brain cells</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{student.totalBrainCells}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-cyan-100 p-2 text-cyan-600">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-cyan-900">Fast render mode</h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-cyan-800/80">
                    The list is trimmed to the fields we actually show and sorted with merge sort before rendering, so the UI stays light.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 px-6 text-center">
              <div className="rounded-full bg-white p-4 shadow-sm">
                <Trophy className="h-10 w-10 text-slate-300" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-800">No leaderboard data yet</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Students will appear here once they start solving objectives or completing test attempts.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default LeaderboardPage
