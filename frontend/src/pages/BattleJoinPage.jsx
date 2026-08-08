import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, RotateCcw, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { getBattleSession, getBattleSessionRoute, saveBattleSession } from '../lib/battleSession'

const BattleJoinPage = () => {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resumeSession, setResumeSession] = useState(() => getBattleSession())
  const auth = getStoredAuth()

  useEffect(() => {
    const syncSession = () => setResumeSession(getBattleSession())
    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [])

  const joinRoom = async (event) => {
    event.preventDefault()
    const code = roomCode.trim().toUpperCase()

    if (code.length !== 6) {
      setError('Enter the 6-character room code.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiRequest(`/api/battle-mode/rooms/${code}/join`, {
        method: 'POST',
      })
      const room = data.room
      saveBattleSession({
        roomCode: room.code,
        roomId: room.id,
        status: room.status,
        route: room.status === 'active' ? 'arena' : 'lobby',
      })
      navigate(`/battle-mode/room/${room.code}/${room.status === 'active' ? 'arena' : 'lobby'}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resumePath = resumeSession ? getBattleSessionRoute(resumeSession) : ''

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_24%),linear-gradient(180deg,#effdf5_0%,#f8fafc_34%,#ecfeff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
            <KeyRound className="h-4 w-4" />
            Join Room
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Enter the battle
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Type the 6-character code from the room creator. Once you are inside, the lobby will keep your seat reserved until the battle finishes.
          </p>

          <form onSubmit={joinRoom} className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-600">
              Room code
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black uppercase tracking-[0.35em] text-slate-950 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 text-sm font-bold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
              {loading ? 'Joining...' : 'Join room'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/battle-mode/create"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Create instead
            </Link>
            {resumePath && (
              <button
                type="button"
                onClick={() => navigate(resumePath)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                <RotateCcw className="h-4 w-4" />
                Resume active battle
              </button>
            )}
          </div>

          {!auth?.token && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You can browse the page, but joining a room needs sign in.
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 text-slate-950 shadow-[0_20px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
            <ShieldCheck className="h-4 w-4" />
            What happens next
          </div>
          <div className="mt-5 grid gap-4">
            <Step number="1" title="Enter the room" text="The server validates the code, lobby expiry, and player limit." />
            <Step number="2" title="Ready up" text="Everyone in the room must click Ready before the host can start." />
            <Step number="3" title="Battle sync" text="The arena, chat, reactions, and scoreboard all update live." />
            <Step number="4" title="Finish cleanly" text="Results unlock the normal site again when the match ends." />
          </div>
        </div>
      </div>
    </section>
  )
}

const Step = ({ number, title, text }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-sm font-black text-cyan-700">
        {number}
      </div>
      <div>
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  </div>
)

export default BattleJoinPage
