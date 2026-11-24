import { History, Home, Trophy } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import useScrollDirection from '../hooks/useScrollDirection'

const BattleBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isVisible = useScrollDirection()
  const isHistory = location.pathname === '/battle-mode/history'
  const isRank = location.pathname === '/battle-mode/rank'

  return <nav className={`battle-bottom-nav ${isVisible ? '' : 'is-scroll-hidden'}`} aria-label="Battle Mode shortcuts"><button type="button" className={isHistory ? 'is-active' : ''} onClick={() => navigate('/battle-mode/history')}><History size={19} /><span>History</span></button><button type="button" className="battle-home-button" onClick={() => navigate('/')} aria-label="Go to website home"><Home size={22} /></button><button type="button" className={isRank ? 'is-active' : ''} onClick={() => navigate('/battle-mode/rank')}><Trophy size={19} /><span>Ranks</span></button></nav>
}

export default BattleBottomNav
