import { History, Trophy } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const BattleBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isHistory = location.pathname === '/battle-mode/history'
  const isRank = location.pathname === '/battle-mode/rank'

  return <nav className="battle-bottom-nav" aria-label="Battle Mode shortcuts"><button type="button" className={isHistory ? 'is-active' : ''} onClick={() => navigate('/battle-mode/history')}><History size={19} /><span>History</span></button><button type="button" className={isRank ? 'is-active' : ''} onClick={() => navigate('/battle-mode/rank')}><Trophy size={19} /><span>Ranks</span></button></nav>
}

export default BattleBottomNav
