import { Bell, Check, ExternalLink, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import LoadingState from '../components/LoadingState'

const LONG_PRESS_MS = 550

const NotificationsPage = () => {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadNotifications = async () => {
      try {
        const data = await apiRequest('/api/notifications/me', { cache: 'no-store' })
        const items = Array.isArray(data.notifications) ? data.notifications : []
        if (active) setNotifications(items)

        await apiRequest('/api/notifications/read-all', { method: 'PATCH' })
        if (active) {
          const readAt = new Date().toISOString()
          setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })))
          window.dispatchEvent(new Event('notifications:read-all'))
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load notifications.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadNotifications()
    return () => { active = false }
  }, [])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications])
  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startLongPress = (id) => {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setSelectionMode(true)
      toggleSelected(id)
    }, LONG_PRESS_MS)
  }

  const stopLongPress = () => window.clearTimeout(timerRef.current)

  const markAsRead = async (notification) => {
    if (notification.readAt) return
    await apiRequest(`/api/notifications/${notification._id}/read`, { method: 'PATCH' }).catch(() => {})
    setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item))
  }

  const openNotification = async (notification) => {
    if (selectionMode) {
      toggleSelected(notification._id)
      return
    }
    await markAsRead(notification)
    if (notification.link?.startsWith('/')) navigate(notification.link)
  }

  const selectAll = () => setSelectedIds(allSelected ? new Set() : new Set(notifications.map((item) => item._id)))

  const deleteSelected = async () => {
    if (!selectedIds.size || deleting) return
    setDeleting(true)
    const ids = [...selectedIds]
    await Promise.all(ids.map((id) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => null)))
    setNotifications((current) => current.filter((item) => !selectedIds.has(item._id)))
    setSelectedIds(new Set())
    setSelectionMode(false)
    setDeleting(false)
  }

  if (loading) return <LoadingState label="Gathering your alerts" />

  return (
    <section className="select-none min-h-screen bg-slate-50 px-3 pb-24 pt-3 text-slate-950 sm:px-5 sm:pt-8" onCopy={(event) => event.preventDefault()}>
      <div className="mx-auto max-w-2xl">
        <header className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-5 shadow-sm sm:p-7">
          <div><h1 className="text-3xl font-black tracking-tight">Notifications</h1><p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Updates, web push messages, and important account alerts.</p></div>
          <div className="mt-5 flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-500">{unreadCount} unread</span>{selectionMode ? <div className="flex gap-2"><button type="button" onClick={selectAll} className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-700">{allSelected ? 'Clear all' : 'Select all'}</button><button type="button" onClick={deleteSelected} disabled={!selectedIds.size || deleting} className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"><Trash2 size={13} /> Delete {selectedIds.size || ''}</button><button type="button" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }} className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-500" aria-label="Cancel selection"><X size={15} /></button></div> : <span className="text-[10px] font-bold text-slate-400">Long press a message to select</span>}</div>
        </header>

        {error && <p className="mt-3 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
        <div className="mt-4 grid gap-2">
          {notifications.length ? notifications.map((notification) => {
            const selected = selectedIds.has(notification._id)
            return <article key={notification._id} onPointerDown={() => startLongPress(notification._id)} onPointerUp={stopLongPress} onPointerLeave={stopLongPress} onPointerCancel={stopLongPress} className={`rounded-2xl border p-4 transition ${selected ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200' : notification.readAt ? 'border-slate-200 bg-white' : 'border-cyan-200 bg-cyan-50/50'}`}>
              <button type="button" onClick={() => openNotification(notification)} className="w-full text-left"><div className="flex items-start gap-3"><span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notification.readAt ? 'bg-slate-100 text-slate-500' : 'bg-cyan-600 text-white'}`}><Bell size={18} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="font-black text-slate-950">{notification.title}</h2>{selected ? <Check className="shrink-0 text-cyan-700" size={18} /> : !notification.readAt ? <span className="rounded-full bg-cyan-600 px-2 py-1 text-[9px] font-black uppercase text-white">New</span> : null}</div><div className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600 [&_a]:font-bold [&_a]:text-cyan-700 [&_a]:underline" dangerouslySetInnerHTML={{ __html: notification.bodyHtml || notification.message || '' }} /><div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><span>{notification.type?.replaceAll('_', ' ') || 'Notification'}</span><span>·</span><span>{notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : ''}</span>{notification.link && <ExternalLink size={12} />}</div></div></div></button>
            </article>
          }) : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Bell className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-black text-slate-700">You are all caught up</p><p className="mt-1 text-sm text-slate-500">New updates will appear here.</p></div>}
        </div>
      </div>
    </section>
  )
}

export default NotificationsPage
