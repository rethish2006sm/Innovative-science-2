import { Bell, Check, Trash2, X, Inbox, AlertCircle, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../api'
import LoadingState from '../components/LoadingState'

const LONG_PRESS_MS = 550

const notificationDayKey = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

const notificationDateLabel = (value) => {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()

  yesterday.setDate(today.getDate() - 1)

  if (notificationDayKey(date) === notificationDayKey(today)) {
    return 'Today'
  }

  if (notificationDayKey(date) === notificationDayKey(yesterday)) {
    return 'Yesterday'
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const NotificationsPage = () => {
  const timerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const pointerActiveRef = useRef(false)

  const [notifications, setNotifications] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Load notifications
  useEffect(() => {
    let active = true

    const loadNotifications = async () => {
      try {
        const data = await apiRequest('/api/notifications/me', {
          cache: 'no-store',
        })

        const items = (
          Array.isArray(data.notifications)
            ? data.notifications
            : []
        ).filter(
          (item) =>
            !['WEB_PUSH', 'ADMIN_WEB_PUSH'].includes(item.type)
        )

        if (active) {
          setNotifications(items)
        }

        await apiRequest('/api/notifications/read-all', {
          method: 'PATCH',
        })

        if (active) {
          const readAt = new Date().toISOString()

          setNotifications((current) =>
            current.map((item) => ({
              ...item,
              readAt: item.readAt || readAt,
            }))
          )

          window.dispatchEvent(
            new Event('notifications:read-all')
          )
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || 'Could not load notifications.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadNotifications()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current)
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications]
  )

  const allSelected =
    notifications.length > 0 &&
    selectedIds.size === notifications.length

  // Selection
  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      if (next.size === 0) {
        setSelectionMode(false)
      }

      return next
    })
  }

  // Long press selection
  const startLongPress = (id) => {
    window.clearTimeout(timerRef.current)

    pointerActiveRef.current = true
    longPressTriggeredRef.current = false

    timerRef.current = window.setTimeout(() => {
      if (!pointerActiveRef.current) return

      longPressTriggeredRef.current = true
      setSelectionMode(true)

      setSelectedIds((current) => {
        const next = new Set(current)
        next.add(id)
        return next
      })
    }, LONG_PRESS_MS)
  }

  const stopLongPress = () => {
    pointerActiveRef.current = false
    window.clearTimeout(timerRef.current)
  }

  // Mark notification as read
  const markAsRead = async (notification) => {
    if (notification.readAt) return

    try {
      await apiRequest(
        `/api/notifications/${notification._id}/read`,
        { method: 'PATCH' }
      )

      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      )

      window.dispatchEvent(
        new Event('notifications:read-all')
      )
    } catch {
      // Keep notification unchanged if request fails.
    }
  }

  // Open notification
  const openNotification = async (notification) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    if (selectionMode) {
      toggleSelected(notification._id)
      return
    }

    await markAsRead(notification)
  }

  // Reward letter
  const openRewardLetter = async (notification, event) => {
    event.preventDefault()

    await markAsRead(notification)

    sessionStorage.setItem('open-100-day-reward', '1')

    window.location.assign(
      notification.link || '/daily-streak'
    )
  }

  // Select all
  const selectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      setSelectionMode(false)
    } else {
      setSelectedIds(
        new Set(notifications.map((item) => item._id))
      )
      setSelectionMode(true)
    }
  }

  // Cancel selection
  const cancelSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  // Delete selected notifications
  const deleteSelected = async () => {
    if (!selectedIds.size || deleting) return

    setDeleting(true)
    setError('')

    const ids = [...selectedIds]

    const results = await Promise.allSettled(
      ids.map((id) =>
        apiRequest(`/api/notifications/${id}`, {
          method: 'DELETE',
        })
      )
    )

    const deletedIds = new Set(
      ids.filter((_, index) =>
        results[index].status === 'fulfilled'
      )
    )

    setNotifications((current) =>
      current.filter(
        (item) => !deletedIds.has(item._id)
      )
    )

    setSelectedIds(new Set())
    setSelectionMode(false)
    setDeleting(false)

    if (deletedIds.size !== ids.length) {
      setError('Some notifications could not be deleted. Please try again.')
    }
  }

  if (loading) {
    return <LoadingState label="Gathering your alerts" />
  }

  const isReward = (item) =>
    item.type === '100_DAY_REWARD_CLAIMED'

  return (
    <section
      className="
        box-border min-h-screen w-full min-w-0
        overflow-x-clip bg-gradient-to-b
        from-slate-50 via-white to-cyan-50/40
        px-3 pb-24 pt-2 text-slate-950
        select-none sm:px-5 sm:pt-4
      "
      onCopy={(event) => event.preventDefault()}
    >
      <div className="mx-auto w-full min-w-0 max-w-2xl">

        {/* FIXED NOTIFICATION HEADER */}
        <header
          className={`
            sticky top-24 z-50
            mb-4 flex w-full min-w-0
            flex-wrap items-center justify-between
            gap-2 rounded-3xl border px-3 py-3
            shadow-lg backdrop-blur-xl
            transition-all duration-300
            sm:flex-nowrap sm:gap-4 sm:px-5 sm:py-4
            ${
              selectionMode
                ? 'border-cyan-200 bg-gradient-to-r from-cyan-50/95 via-white/95 to-cyan-50/95 shadow-cyan-200/40'
                : 'border-slate-200/80 bg-white/90 shadow-slate-200/50'
            }
          `}
        >
          {/* Title block */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`
                relative grid h-11 w-11 shrink-0
                place-items-center rounded-2xl
                transition-all duration-300
                sm:h-12 sm:w-12
                ${
                  unreadCount > 0
                    ? 'bg-gradient-to-br from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-200/60'
                    : 'bg-slate-100 text-slate-500'
                }
              `}
            >
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black text-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black tracking-tight sm:text-2xl">
                Notifications
              </h1>

              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                {unreadCount > 0
                  ? `${unreadCount} new update${unreadCount === 1 ? '' : 's'} waiting`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          {/* Selection actions */}
          {selectionMode ? (
            <div className="
              flex w-full min-w-0 items-center
              justify-end gap-1.5
              sm:w-auto sm:gap-2
            ">
              <button
                type="button"
                onClick={selectAll}
                className="
                  min-h-9 min-w-0 rounded-full
                  border border-slate-200
                  bg-white px-3 py-2
                  text-[10px] font-bold
                  text-slate-700 shadow-sm
                  transition-all hover:border-slate-300
                  hover:bg-slate-50
                  active:scale-95 sm:text-xs
                "
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>

              <button
                type="button"
                onClick={deleteSelected}
                disabled={!selectedIds.size || deleting}
                className="
                  inline-flex min-h-9 min-w-0
                  items-center justify-center gap-1.5
                  rounded-full bg-gradient-to-r
                  from-rose-500 to-rose-600
                  px-3 py-2 text-[10px]
                  font-bold text-white
                  shadow-md shadow-rose-200/60
                  transition-all hover:from-rose-600
                  hover:to-rose-700
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  disabled:shadow-none sm:text-xs
                "
              >
                <Trash2 size={14} />

                {deleting
                  ? 'Deleting...'
                  : `Delete (${selectedIds.size})`}
              </button>

              <button
                type="button"
                onClick={cancelSelection}
                aria-label="Cancel selection"
                className="
                  grid h-9 w-9 shrink-0
                  place-items-center rounded-full
                  bg-slate-100 text-slate-600
                  transition-colors hover:bg-slate-200
                  active:scale-90
                "
              >
                <X size={17} />
              </button>
            </div>
          ) : (
            <span className="
              inline-flex shrink-0 items-center gap-1.5
              rounded-full bg-slate-100
              px-2.5 py-1 text-[10px]
              font-semibold text-slate-500
              sm:text-xs
            ">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Long press to select
            </span>
          )}
        </header>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="
            mb-3 flex items-start gap-2
            rounded-2xl border border-rose-200
            bg-rose-50 p-3 text-xs
            font-semibold text-rose-700
            shadow-sm shadow-rose-100
          ">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* NOTIFICATION LIST */}
        <div className="flex min-w-0 flex-col gap-2">

          {notifications.length > 0 ? (
            notifications.map((notification, index) => {
              const selected = selectedIds.has(
                notification._id
              )

              const showDate =
                index === 0 ||
                notificationDayKey(notification.createdAt) !==
                  notificationDayKey(
                    notifications[index - 1].createdAt
                  )

              const reward = isReward(notification)

              return (
                <div
                  key={notification._id}
                  className="
                    min-w-0 w-full
                    animate-in fade-in slide-in-from-bottom-2
                    duration-300
                  "
                >
                  {/* DATE DIVIDER */}
                  {showDate && (
                    <div className="
                      mb-3 mt-5 flex items-center gap-3
                      first:mt-1
                    ">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />

                      <span className="
                        shrink-0 rounded-full
                        border border-slate-200/70
                        bg-white px-3 py-1
                        text-[10px] font-bold
                        text-slate-500 shadow-sm
                        sm:text-xs
                      ">
                        {notificationDateLabel(
                          notification.createdAt
                        )}
                      </span>

                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                    </div>
                  )}

                  {/* NOTIFICATION CARD */}
                  <article
                    onPointerDown={() =>
                      startLongPress(notification._id)
                    }
                    onPointerUp={stopLongPress}
                    onPointerLeave={stopLongPress}
                    onPointerCancel={stopLongPress}
                    onContextMenu={(event) =>
                      event.preventDefault()
                    }
                    className={`
                      group relative box-border
                      w-full min-w-0 overflow-hidden
                      rounded-2xl border
                      transition-all duration-200
                      ${
                        selected
                          ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-white ring-2 ring-cyan-200 shadow-md shadow-cyan-100'
                          : notification.readAt
                            ? 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md'
                            : reward
                              ? 'border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-white shadow-sm hover:shadow-md'
                              : 'border-cyan-100 bg-gradient-to-r from-cyan-50/60 via-white to-white shadow-sm hover:border-cyan-200 hover:shadow-md'
                      }
                    `}
                  >
                    {/* Left accent for unread */}
                    {!notification.readAt && !selected && (
                      <span
                        aria-hidden="true"
                        className={`
                          absolute bottom-2 left-0 top-2
                          w-1 rounded-r-full
                          ${reward ? 'bg-gradient-to-b from-amber-400 to-orange-500' : 'bg-gradient-to-b from-cyan-400 to-emerald-500'}
                        `}
                      />
                    )}

                    <button
                      type="button"
                      aria-pressed={
                        selectionMode ? selected : undefined
                      }
                      onClick={() =>
                        openNotification(notification)
                      }
                      className="
                        flex w-full min-w-0
                        items-start gap-3
                        p-3 pl-4 text-left
                        transition-colors duration-200
                        sm:gap-4 sm:p-4 sm:pl-5
                      "
                    >
                      {/* ICON */}
                      <span
                        className={`
                          relative mt-0.5
                          grid h-10 w-10 shrink-0
                          place-items-center rounded-xl
                          transition-all duration-200
                          sm:h-12 sm:w-12
                          ${
                            selected
                              ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-200/70'
                              : notification.readAt
                                ? 'bg-slate-100 text-slate-500'
                                : reward
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200/70'
                                  : 'bg-gradient-to-br from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-200/70'
                          }
                        `}
                      >
                        {selected ? (
                          <Check size={19} />
                        ) : reward ? (
                          <Sparkles size={19} />
                        ) : (
                          <Bell size={19} />
                        )}

                        {!notification.readAt &&
                          !selected && (
                            <span className="
                              absolute -right-0.5 -top-0.5
                              h-2.5 w-2.5 rounded-full
                              border-2 border-white
                              bg-rose-500
                            " />
                          )}
                      </span>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1">

                        {/* TITLE AND STATUS */}
                        <div className="
                          flex min-w-0 items-start
                          justify-between gap-2
                        ">
                          <h2 className="
                            min-w-0 flex-1
                            break-words
                            text-[13px] font-black
                            leading-5 text-slate-900
                            sm:text-[15px] sm:leading-6
                          ">
                            {notification.title}
                          </h2>

                          {selected ? (
                            <span className="
                              grid h-5 w-5 shrink-0
                              place-items-center rounded-full
                              bg-cyan-600 text-white
                              shadow-sm shadow-cyan-200
                            ">
                              <Check size={12} />
                            </span>
                          ) : !notification.readAt ? (
                            <span className={`
                              inline-flex shrink-0 items-center gap-1
                              rounded-full px-2 py-1
                              text-[8px] font-black
                              uppercase tracking-wider
                              shadow-sm
                              sm:text-[9px]
                              ${reward
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200/60'
                                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-cyan-200/60'}
                            `}>
                              <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                              New
                            </span>
                          ) : null}
                        </div>

                        {/* MESSAGE */}
                        <div
                          className="
                            mt-1.5 min-w-0 max-w-full
                            break-words whitespace-pre-wrap
                            text-[12px] leading-[1.6]
                            text-slate-600
                            sm:text-[13px] sm:leading-6
                            [&_a]:break-all
                            [&_a]:font-semibold
                            [&_a]:text-cyan-700
                            [&_a]:underline
                          "
                          dangerouslySetInnerHTML={{
                            __html:
                              notification.bodyHtml ||
                              notification.message ||
                              '',
                          }}
                        />

                      </div>
                    </button>

                    {/* REWARD LETTER */}
                    {notification.type ===
                      '100_DAY_REWARD_CLAIMED' &&
                      notification.link && (
                        <div className="px-3 pb-3 pl-4 sm:px-4 sm:pb-4 sm:pl-5">
                          <a
                            href={notification.link}
                            onClick={(event) =>
                              openRewardLetter(
                                notification,
                                event
                              )
                            }
                            className="
                              inline-flex max-w-full
                              items-center gap-1.5
                              rounded-full border
                              border-amber-200
                              bg-amber-50 px-3.5 py-2
                              text-[11px] font-bold
                              text-amber-700
                              shadow-sm
                              transition-colors
                              hover:border-amber-300
                              hover:bg-amber-100
                              sm:text-xs
                            "
                          >
                            <Sparkles size={13} />
                            Open and download your reward letter
                          </a>
                        </div>
                      )}

                  </article>
                </div>
              )
            })
          ) : (

            /* EMPTY STATE */
            <div className="
              relative flex min-h-[320px] flex-col
              items-center justify-center
              overflow-hidden rounded-3xl
              border border-dashed
              border-slate-300 bg-white p-8
              text-center
            ">
              {/* Decorative circles */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-full bg-cyan-50/70" />
                <div className="absolute h-24 w-24 rounded-full bg-cyan-100/60" />
              </div>

              <div className="
                relative grid h-16 w-16 place-items-center
                rounded-2xl bg-gradient-to-br
                from-cyan-500 to-emerald-500
                text-white
                shadow-xl shadow-cyan-200/60
              ">
                <Inbox size={28} />
              </div>

              <h2 className="
                relative mt-5 text-lg font-black text-slate-800
              ">
                You are all caught up
              </h2>

              <p className="
                relative mt-1 text-xs text-slate-500 sm:text-sm
              ">
                New updates will appear here.
              </p>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}

export default NotificationsPage
