import { Crown, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { authEvents, getStoredAuth } from '../authStorage'
import { apiRequest, assetUrl } from '../api'

const BattleNavbar = () => {
  const [user, setUser] = useState(() => getStoredAuth()?.user || {})
  const [battleRank, setBattleRank] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const syncUser = () => setUser(getStoredAuth()?.user || {})
    window.addEventListener(authEvents.changed, syncUser)
    window.addEventListener('storage', syncUser)
    return () => {
      window.removeEventListener(authEvents.changed, syncUser)
      window.removeEventListener('storage', syncUser)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/battle-mode/rankings', { cache: 'no-store' })
      .then((data) => { if (!cancelled) setBattleRank(data.me || null) })
      .catch(() => { if (!cancelled) setBattleRank(null) })
    return () => { cancelled = true }
  }, [user?.id, user?._id])

  return <header className="battle-navbar" aria-label="Battle Mode navigation"><button type="button" onClick={() => navigate('/battle-mode/rank')} className="battle-navbar-rank" aria-label="Open Battle Mode rankings"><div className="battle-rank-emblem"><Crown size={16} /></div><div><span>Battle rank</span><strong><b>#</b>{battleRank?.rank || '—'}</strong></div></button><button type="button" onClick={() => navigate('/battle-mode')} className="battle-navbar-identity" aria-label="Open Battle Mode"><span>GameID</span><strong>{user.gameId || '—'}</strong></button><button type="button" onClick={() => navigate('/battle-mode/profile?returnTo=/battle-mode')} className="battle-navbar-profile" aria-label="Open battle profile">{user.battleProfileImageUrl ? <img src={assetUrl(user.battleProfileImageUrl)} alt="Battle profile" /> : <UserRound size={23} />}<i /></button></header>
}

export default BattleNavbar
