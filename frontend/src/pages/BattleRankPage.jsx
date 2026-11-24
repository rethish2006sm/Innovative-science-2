import { ArrowLeft, Crown, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BattleNavbar from '../components/BattleNavbar'
import { apiRequest, assetUrl } from '../api'

const BattleRankPage = () => {
  const navigate = useNavigate()
  const [rankings, setRankings] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/battle-mode/rankings', { cache: 'no-store' })
      .then((data) => {
        if (cancelled) return
        setRankings(data.rankings || [])
        setMe(data.me || null)
      })
      .catch(() => { if (!cancelled) setRankings([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="battle-lobby min-h-screen px-4 pb-12 pt-5 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <BattleNavbar />
        <main className="battle-rank-shell">
          <button type="button" className="battle-back-button" onClick={() => navigate('/battle-mode')}>
            <ArrowLeft size={17} /> Back to arena
          </button>
          <section className="battle-rank-card">
            <div className="battle-rank-heading">
              <div className="battle-rank-heading-icon"><Trophy size={25} /></div>
              <div><span>Battle Mode</span><h1>Top Players</h1><p>Climb the leaderboard with every match.</p></div>
            </div>
            {me && <div className="battle-rank-self"><span>Your position</span><strong>#{me.rank}</strong><small>{me.battlePoints} pts</small></div>}
            <div className="battle-rank-list">
              {loading ? <p className="battle-rank-empty">Loading rankings...</p> : rankings.length ? rankings.map((player) => (
                <div className={`battle-rank-row ${me?.userId === player.userId ? 'is-you' : ''}`} key={player.userId}>
                  {!player.profileImageUrl && <div className="battle-rank-position">{player.rank <= 3 ? <Crown size={17} /> : `#${player.rank}`}</div>}
                  {player.profileImageUrl && <div className="battle-rank-player-avatar"><img src={assetUrl(player.profileImageUrl)} alt={`${player.name} Battle profile`} /></div>}
                  <div className="battle-rank-player"><strong>{player.name}</strong><span>{player.gameId || (me?.userId === player.userId ? 'You' : `Position ${player.rank}`)}</span></div>
                  <b>{player.battlePoints} pts</b>
                </div>
              )) : <p className="battle-rank-empty">Play a match to become the first ranked player.</p>}
            </div>
          </section>
        </main>
      </div>
    </section>
  )
}

export default BattleRankPage
