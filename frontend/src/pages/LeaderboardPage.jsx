import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, BarChart3, Crown, Medal, Shield, Sparkles, Trophy, Users } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const LeaderboardPage = () => {
  const [scope, setScope] = useState('all')
  const [leaderboard, setLeaderboard] = useState([])
  const [classOptions, setClassOptions] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(() => getStoredAuth()?.user?.classId || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [auth, setAuth] = useState(() => getStoredAuth())
  const canViewClassLeaderboard = Boolean(auth?.user?.classId)

  const loadLeaderboard = async (nextScope = scope, nextClassId = selectedClassId) => {
    setLoading(true)
    setError('')
    try {
      const classQuery = nextScope === 'class' && nextClassId ? `&classId=${nextClassId}` : ''
      const data = await apiRequest(`/api/leaderboard?scope=${nextScope}${classQuery}&limit=20`)
      setLeaderboard(data.leaderboard || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAuth(getStoredAuth())
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest('/api/classes')
        setClassOptions(data.classes || [])
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
    if (scope === 'class' && !selectedClassId) {
      if (classOptions.length) {
        setSelectedClassId(classOptions[0]._id)
      }
      return
    }
    loadLeaderboard(scope, selectedClassId)
  }, [scope, selectedClassId, classOptions.length])

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard])
  const currentUserRank = useMemo(() => {
    const userEmail = auth?.user?.email
    if (!userEmail) return null
    return leaderboard.findIndex((item) => item.email === userEmail) + 1 || null
  }, [auth, leaderboard])

  return (
    <section className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Main Card Container */}
        <div className="rounded-3xl border border-slate-200/60 bg-white/70 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8 lg:p-10">
          
          {/* Header Section */}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                <Crown className="h-4 w-4" />
                Brain Cell Ranking
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl text-balance">
                Leaderboard
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 sm:text-base">
                Students are ranked by total brain cells. Each unique correct question earns 1 brain cell, and repeating the same question does not add more.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[400px]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scope</p>
                <p className="mt-1.5 text-xl font-bold text-slate-800">{scope === 'all' ? 'Global' : 'Class'}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 transition-colors hover:bg-emerald-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Top Score</p>
                <p className="mt-1.5 text-xl font-bold text-emerald-900">{leaderboard[0]?.totalBrainCells || 0}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 transition-colors hover:bg-cyan-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600">Your Rank</p>
                <p className="mt-1.5 text-xl font-bold text-cyan-900">
                  {currentUserRank ? `#${currentUserRank}` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Controls & Filters */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-all sm:flex-none ${scope === 'all' ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
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
                className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-all sm:flex-none ${scope === 'class' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Users className="h-4 w-4" />
                By Class
              </button>
            </div>
            
            <Link to="/test-builder" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:ml-auto">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Create Test
            </Link>
          </div>

          {/* Class Selector (Conditional) */}
          {scope === 'class' && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Class</label>
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
                {selectedClassId
                  ? `Viewing leaderboard for ${classOptions.find((item) => item._id === selectedClassId)?.name || 'selected class'}`
                  : 'Choose a class to view its leaderboard'}
              </p>
            </div>
          )}

          {/* State Handling (Loading / Error / Empty) */}
          {loading ? (
            <div className="mt-10 rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500"></div>
              <p className="mt-4 text-sm font-medium text-slate-500">Loading rankings...</p>
            </div>
          ) : error ? (
            <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : leaderboard.length > 0 ? (
            
            /* Leaderboard Content Grid */
            /* Mobile: Podium on top. Desktop: Podium on right */
            <div className="mt-10 flex flex-col-reverse gap-8 lg:grid lg:grid-cols-[1fr_360px]">
              
              {/* Left Column: Full Rank Table */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Complete Rankings</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {leaderboard.map((student, index) => {
                    const isTopThree = index < 3
                    const bgStyle =
                      index === 0 ? 'bg-gradient-to-r from-amber-50 to-white hover:from-amber-100/50' :
                      index === 1 ? 'bg-gradient-to-r from-slate-100 to-white hover:from-slate-200/50' :
                      index === 2 ? 'bg-gradient-to-r from-orange-50 to-white hover:from-orange-100/50' :
                      'bg-white hover:bg-slate-50'

                    return (
                      <article key={student.id} className={`flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${bgStyle}`}>
                        {/* Avatar & User Info */}
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black shadow-sm ${isTopThree ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {index === 0 ? <Trophy className="h-5 w-5 text-amber-400" /> : 
                             index === 1 ? <Medal className="h-5 w-5 text-slate-300" /> : 
                             index === 2 ? <Award className="h-5 w-5 text-orange-400" /> : 
                             `#${index + 1}`}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">{student.name}</h3>
                              {student.className && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                  {student.className}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{student.email}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-600 sm:hidden">
                              {student.attemptCount} tests
                            </p>
                          </div>
                        </div>

                        {/* Stats - Stacks horizontally on mobile, side-by-side on desktop */}
                        <div className="ml-16 flex items-center justify-between gap-4 sm:ml-0 sm:justify-end">
                          <p className="hidden text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:block">
                            {student.attemptCount} tests
                          </p>
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:hidden">Brain Cells</p>
                            <p className="text-lg font-black text-slate-900 sm:text-xl">{student.totalBrainCells}</p>
                          </div>
                          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:hidden">Avg Score</p>
                            <p className="text-lg font-bold text-emerald-600 sm:text-xl sm:w-16">{student.averagePercent}%</p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>

              {/* Right Column / Top Mobile: Podium & Info */}
              <div className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  {topThree.map((student, index) => {
                    const podiumColors = 
                      index === 0 ? 'border-amber-200 bg-gradient-to-br from-amber-100 to-amber-50' : 
                      index === 1 ? 'border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50' : 
                      'border-orange-200 bg-gradient-to-br from-orange-100 to-orange-50'
                    
                    const textColors = 
                      index === 0 ? 'text-amber-700' : 
                      index === 1 ? 'text-slate-600' : 
                      'text-orange-700'

                    return (
                      <div key={student.id} className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${podiumColors}`}>
                        <div className={`absolute -right-4 -top-4 opacity-10 ${textColors}`}>
                          {index === 0 ? <Crown className="h-24 w-24" /> : index === 1 ? <Medal className="h-24 w-24" /> : <Award className="h-24 w-24" />}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${textColors}`}>Podium #{index + 1}</p>
                        <h3 className="mt-1 truncate text-xl font-black text-slate-900">{student.name}</h3>
                        
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white/60 p-3 backdrop-blur-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cells</p>
                            <p className="mt-0.5 text-lg font-black text-slate-900">{student.totalBrainCells}</p>
                          </div>
                          <div className="rounded-xl bg-white/60 p-3 backdrop-blur-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Avg</p>
                            <p className="mt-0.5 text-lg font-black text-slate-900">{student.averagePercent}%</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Info Box */}
                <div className="rounded-3xl border border-cyan-100 bg-cyan-50/50 p-6 sm:col-span-3 lg:col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-cyan-100 p-2 text-cyan-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-cyan-900">How it works</h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-cyan-800/80">
                    Brain cells are calculated from unique correct questions. Each right answer adds 1 brain cell the first time only, so repeated attempts do not inflate the score.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            
            /* Empty State */
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
