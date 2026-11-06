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
    <section className="box-border min-h-[calc(100vh-6rem)] w-full overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_28%),linear-gradient(180deg,#fffaf5_0%,#f8fafc_48%,#ecfeff_100%)] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full min-w-0 max-w-xl items-center justify-center">
        <div className="box-border w-[calc(100vw-2rem)] max-w-xl min-w-0 overflow-hidden rounded-[2rem] border border-orange-200 bg-white p-5 shadow-[0_24px_80px_rgba(249,115,22,.12)] sm:w-full sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.26em] text-orange-600">Battle mode</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Join a battle</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">Enter the 6-character room code to join your squad.</p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600"><KeyRound className="h-6 w-6" /></div>
          </div>

          <form onSubmit={joinRoom} className="mt-7 grid gap-3">
            <label className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500" htmlFor="battle-room-code">Room code</label>
            <input id="battle-room-code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" autoFocus className="box-border h-16 w-full min-w-0 rounded-2xl border border-orange-100 bg-orange-50/40 px-2 text-center text-2xl font-black uppercase tracking-[.22em] text-slate-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 sm:px-4 sm:text-3xl sm:tracking-[.32em]" />
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{error}</p>}
            <button type="submit" disabled={loading} className="mt-1 inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff8a00] to-[#ff5500] px-6 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(249,115,22,.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Joining...' : 'Join room'}<ArrowRight className="h-4 w-4" /></button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link to="/battle-mode/create" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">Create room instead</Link>
            {resumePath && <button type="button" onClick={() => navigate(resumePath)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 text-xs font-black text-cyan-700 transition hover:bg-cyan-100"><RotateCcw className="h-3.5 w-3.5" /> Resume battle</button>}
          </div>
          {!auth?.token && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900">Sign in is required to join a room.</p>}
          <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure room validation and live battle sync</div>
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
