import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, Swords, Trophy, Users, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { getBattleSession, getBattleSessionRoute } from '../lib/battleSession'

const featureCards = [
  {
    title: 'Real-time battles',
    text: 'Room code joins, ready checks, live scoring, and instant question transitions.',
    icon: Swords,
  },
  {
    title: 'Mobile-first arena',
    text: 'The layout collapses cleanly on phones while keeping the battle energy intact.',
    icon: Zap,
  },
  {
    title: 'Rewards that matter',
    text: 'Top ranks earn Brain Cells and the entire match stays server-authoritative.',
    icon: Trophy,
  },
]

const BattleModeHome = () => {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(() => getStoredAuth())
  const [activeBattle, setActiveBattle] = useState(() => getBattleSession())

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth())
    const syncBattle = () => setActiveBattle(getBattleSession())

    syncAuth()
    syncBattle()
    window.addEventListener('storage', syncAuth)
    window.addEventListener('storage', syncBattle)

    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('storage', syncBattle)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadActiveBattle = async () => {
      if (!auth?.token) {
        return
      }

      try {
        const data = await apiRequest('/api/battle-mode/active')
        if (cancelled || !data?.activeRoom?.code) {
          return
        }

        const nextSession = {
          roomCode: data.activeRoom.code,
          roomId: data.activeRoom.id,
          status: data.activeRoom.status,
          route: data.activeRoom.route || 'lobby',
        }
        setActiveBattle(nextSession)
      } catch (error) {
        if (!cancelled) {
          setActiveBattle(getBattleSession())
        }
      }
    }

    loadActiveBattle()

    return () => {
      cancelled = true
    }
  }, [auth?.token])

  const resumePath = activeBattle ? getBattleSessionRoute(activeBattle) : ''

  return (
    <section className="relative min-h-[calc(100vh-6rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_32%),linear-gradient(180deg,#f8feff_0%,#f8fafc_45%,#eef9f6_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-opacity='0.35' stroke='rgba(255,255,255,0.05)'%3E%3Cpath d='M0 60h120M60 0v120'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8 lg:p-10"
          >
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-cyan-100">
                <Sparkles className="h-4 w-4" />
                Highlighted feature
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
                Battle Mode
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                A competitive 2 to 4 player quiz arena with live scoring, ready checks, reactions, chat, streak bonuses, and mobile-friendly battle screens.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/battle-mode/create"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] hover:shadow-cyan-500/30"
                >
                  Create Battle Room
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/battle-mode/join"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Join with code
                </Link>
                {resumePath && (
                  <button
                    type="button"
                    onClick={() => navigate(resumePath)}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-amber-300/20 bg-amber-400/10 px-6 text-sm font-bold text-amber-100 transition hover:bg-amber-400/15"
                  >
                    Resume active battle
                  </button>
                )}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {featureCards.map((feature) => (
                  <div key={feature.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <feature.icon className="h-5 w-5 text-cyan-300" />
                    <h2 className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-700">Battle Rules</p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
                <p>1. A room code is valid for 10 minutes.</p>
                <p>2. Minimum 2 players, maximum 4 players.</p>
                <p>3. The creator starts only after everyone is ready.</p>
                <p>4. Scores and ranks update live without page reloads.</p>
                <p>5. Reconnects and refreshes restore the active battle session.</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-700">Quick Stats</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Players" value="2-4" />
                <Stat label="Code" value="6 chars" />
                <Stat label="Rewards" value="30 BC" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-amber-700">Need a hint?</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you already have a battle code, head straight to join. If the battle is already running, the site will bring you back into the room automatically.
              </p>
              <button
                type="button"
                onClick={() => navigate('/battle-mode/join')}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Enter room code
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const Stat = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 text-center shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
  </div>
)

export default BattleModeHome
