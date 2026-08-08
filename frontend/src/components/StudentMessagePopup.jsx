import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircleMore, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const normalizeMessage = (message = {}) => ({
  id: String(message.id || message._id || '').trim(),
  body: String(message.body || '').trim(),
  acknowledgedByMe: Boolean(message.acknowledgedByMe),
})

const StudentMessagePopup = () => {
  const auth = getStoredAuth()
  const shouldLoad = Boolean(auth?.token) && !auth?.user?.isAdmin
  const [messages, setMessages] = useState([])
  const [temporaryHiddenIds, setTemporaryHiddenIds] = useState([])

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

        if (cancelled) {
          return
        }

        setMessages(Array.isArray(data.messages) ? data.messages.map(normalizeMessage).filter((item) => item.id) : [])
      } catch {
        // Keep the last known popup visible if a refresh fails.
      }
    }

    loadMessages()

    const timer = window.setInterval(loadMessages, 60000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [shouldLoad])

  const visibleMessages = useMemo(() => (
    messages.filter((message) => !temporaryHiddenIds.includes(message.id) && !message.acknowledgedByMe)
  ), [messages, temporaryHiddenIds])

  const activeMessage = visibleMessages[0] || null

  const dismissCurrentMessage = () => {
    if (!activeMessage?.id) {
      return
    }

    setTemporaryHiddenIds((current) => (
      current.includes(activeMessage.id) ? current : [...current, activeMessage.id]
    ))
  }

  const acknowledgeCurrentMessage = async () => {
    if (!activeMessage?.id) {
      return
    }

    try {
      await apiRequest(`/api/messages/${activeMessage.id}/acknowledge`, {
        method: 'POST',
      })

      setMessages((current) => current.map((message) => (
        message.id === activeMessage.id
          ? { ...message, acknowledgedByMe: true }
          : message
      )))
    } catch {
      // Keep the popup usable even if the acknowledgement call fails.
    } finally {
      dismissCurrentMessage()
    }
  }

  if (!shouldLoad || !activeMessage) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[220] pointer-events-none">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeMessage.id}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28, mass: 0.9 }}
          className="pointer-events-auto fixed bottom-4 left-4 right-4 mx-auto w-auto max-w-[420px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:left-auto sm:right-5"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="student-message-title"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500" />

          <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
              <MessageCircleMore className="h-6 w-6" />
            </div>

            <button
              type="button"
              onClick={dismissCurrentMessage}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
              aria-label="Close message"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5 sm:py-5">
              <p
                id="student-message-title"
                className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700 sm:text-base"
              >
                {activeMessage.body || 'No message text was provided.'}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={dismissCurrentMessage}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Dismiss message"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={acknowledgeCurrentMessage}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white transition hover:bg-black"
                aria-label="Acknowledge message"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default StudentMessagePopup
