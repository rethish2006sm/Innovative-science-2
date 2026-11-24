import { Bell, Flame, Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import useScrollDirection from '../hooks/useScrollDirection'

const HomeBottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isVisible = useScrollDirection()
  const [unreadCount, setUnreadCount] = useState(0)
  const hasAuth = Boolean(getStoredAuth()?.token)

  useEffect(() => {
    if (!hasAuth) return undefined

    let cancelled = false
    const loadUnreadCount = async () => {
      const data = await apiRequest('/api/notifications/me', { cache: 'no-store' }).catch(() => null)
      if (!cancelled) setUnreadCount((data?.notifications || []).filter((item) => !item.readAt).length)
    }

    loadUnreadCount()
    const timer = window.setInterval(loadUnreadCount, 60000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [hasAuth, location.pathname])

  useEffect(() => {
    const handleNotificationsRead = () => setUnreadCount(0)
    window.addEventListener('notifications:read-all', handleNotificationsRead)
    return () => window.removeEventListener('notifications:read-all', handleNotificationsRead)
  }, [])

  const openProtected = (path) => {
    navigate(hasAuth ? path : '/signin')
  }

  return (
    <nav className={`home-bottom-nav ${isVisible ? '' : 'is-scroll-hidden'}`} aria-label="Quick actions">
      <button type="button" onClick={() => openProtected('/daily-streak')} aria-label="Open daily streak">
        <span className="home-bottom-nav-icon home-bottom-nav-streak"><Flame size={21} /></span>
        <span>Streak</span>
      </button>
      <button type="button" className="home-bottom-nav-battle" onClick={() => openProtected('/battle-mode')} aria-label="Open Battle Mode">
        <span className="home-bottom-nav-icon"><Swords size={25} /></span>
        <span>Battle</span>
      </button>
      <button type="button" onClick={() => openProtected('/notifications')} aria-label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
        <span className="home-bottom-nav-icon home-bottom-nav-notification"><Bell size={21} />{unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}</span>
        <span>Alerts</span>
      </button>
    </nav>
  )
}

export default HomeBottomNav
