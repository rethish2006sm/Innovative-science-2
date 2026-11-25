import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ThumbsUp, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const normalizeRichHtml = (value = '') => String(value || '')
  .replace(/<(?:span|font)\b[^>]*style\s*=\s*["'][^"']*font-weight\s*:\s*(?:bold|bolder|[6-9]00)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|font)>/gi, '<strong>$1</strong>')
  .replace(/<\/?b\b[^>]*>/gi, (tag) => /^<\s*\//.test(tag) ? '</strong>' : '<strong>')

const normalizeMessage = (message = {}) => {
  const subject = String(message.subject || '').trim()
  const type = String(message.type || '').trim()
  const isRewardMessage = type === '100_DAY_REWARD_CLAIMED' || subject === '100-day reward claimed'
  const bodyHtml = normalizeRichHtml(message.bodyHtml || message.body).trim()
  return {
    id: String(message.id || message._id || '').trim(),
    type,
    link: String(message.link || '').trim(),
    subject,
    body: String(message.body || '').trim(),
    bodyHtml: isRewardMessage ? bodyHtml.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '') : bodyHtml,
    acknowledgedByMe: Boolean(message.acknowledgedByMe),
  }
}

const StudentMessagePopup = () => {
  const auth = getStoredAuth()
  const shouldLoad = Boolean(auth?.token) && !auth?.user?.isAdmin
  const reduceMotion = useReducedMotion()
  const closeButtonRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [temporaryHiddenIds, setTemporaryHiddenIds] = useState([])
  const [reacting, setReacting] = useState(false)
  const [reacted, setReacted] = useState(false)

  useEffect(() => {
    if (!shouldLoad) {
      setMessages([])
      setTemporaryHiddenIds([])
      return undefined
    }

    let cancelled = false

    const loadMessages = async () => {
      try {
        const data = await apiRequest('/api/messages/me')
        if (cancelled) return

        setMessages(Array.isArray(data.messages) ? data.messages.map(normalizeMessage).filter((item) => item.id) : [])
      } catch {
        // Keep the last known announcement visible if a refresh fails.
      }
    }

    loadMessages()
    const timer = window.setInterval(loadMessages, 60000)
    const handleNewMessage = (event) => {
      const message = normalizeMessage(event.detail || {})
      if (!message.id) return
      setMessages((current) => [message, ...current.filter((item) => item.id !== message.id)])
    }
    window.addEventListener('student-message:new', handleNewMessage)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('student-message:new', handleNewMessage)
    }
  }, [shouldLoad])

  const visibleMessages = useMemo(() => (
    messages.filter((message) => !temporaryHiddenIds.includes(message.id) && !message.acknowledgedByMe)
  ), [messages, temporaryHiddenIds])

  const activeMessage = visibleMessages[0] || null

  const dismissCurrentMessage = () => {
    if (!activeMessage?.id) return

    setTemporaryHiddenIds((current) => (
      current.includes(activeMessage.id) ? current : [...current, activeMessage.id]
    ))
  }

  const reactToCurrentMessage = async () => {
    if (!activeMessage?.id || reacting) return

    setReacting(true)
    setReacted(true)
    try {
      await apiRequest(`/api/messages/${activeMessage.id}/acknowledge`, { method: 'POST' })
    } catch {
      setReacted(false)
    } finally {
      setReacting(false)
    }
  }

  const openRewardMessageLink = (event) => {
    event.preventDefault()
    sessionStorage.setItem('open-100-day-reward', '1')
    dismissCurrentMessage()
    if (window.location.pathname === '/daily-streak') {
      window.dispatchEvent(new Event('daily-streak:open-100-reward'))
    } else {
      window.location.assign('/daily-streak')
    }
  }

  useEffect(() => {
    if (!activeMessage) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') dismissCurrentMessage()
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [activeMessage?.id])

  if (!shouldLoad) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[1400] overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {activeMessage && (
          <>
            <motion.div
              key={`announcement-backdrop-${activeMessage.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
              className="pointer-events-auto fixed inset-0 bg-slate-950/45 backdrop-blur-[3px]"
              aria-hidden="true"
            />

            <motion.div
              key={activeMessage.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              transition={reduceMotion ? { duration: 0.01 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.2)] sm:bottom-5 sm:left-auto sm:right-5 sm:w-[min(24rem,calc(100vw-2.5rem))]"
              role="status"
              aria-labelledby="student-message-title"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id="student-message-title" className="truncate text-base font-black leading-tight tracking-[-0.02em] text-slate-950">
                    {activeMessage.subject || 'Important announcement'}
                  </h2>
                  <div
                    className="student-rich-message mt-1.5 break-words text-sm leading-5 text-slate-600 [overflow-wrap:anywhere] [&_a]:text-cyan-700 [&_a]:underline [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:mb-1 [&_u]:underline [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: activeMessage.bodyHtml || activeMessage.body || 'No announcement text was provided.' }}
                  />
                  {(activeMessage.type === '100_DAY_REWARD_CLAIMED' || activeMessage.subject === '100-day reward claimed') && <a href="/daily-streak" onClick={openRewardMessageLink} className="mt-2 inline-flex font-bold text-cyan-700 underline underline-offset-2">Open and download your reward letter</a>}
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={dismissCurrentMessage}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 active:scale-95"
                  aria-label="Close announcement"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={reactToCurrentMessage}
                  disabled={reacting || reacted}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(249,115,22,0.3)] active:translate-y-0 disabled:cursor-wait disabled:opacity-100"
                  aria-label="React to announcement and hide it permanently"
                  title="React"
                >
                  <ThumbsUp className={`h-4 w-4 ${reacted ? 'fill-yellow-300 text-yellow-300' : 'text-white'}`} />
                </button>
                <p className="mt-1 text-[9px] font-medium text-slate-400">click on 👍 so message will not appear</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default StudentMessagePopup
