import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

const NOTICE_THEMES = {
  amber: {
    outer: 'border-amber-200 bg-[linear-gradient(90deg,#fde68a_0%,#fef3c7_50%,#fde68a_100%)] text-slate-950 shadow-[0_8px_30px_rgba(251,191,36,0.18)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  teal: {
    outer: 'border-teal-200 bg-[linear-gradient(90deg,#ccfbf1_0%,#f0fdff_50%,#ccfbf1_100%)] text-slate-950 shadow-[0_8px_30px_rgba(20,184,166,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  rose: {
    outer: 'border-rose-200 bg-[linear-gradient(90deg,#ffe4e6_0%,#fff1f2_50%,#ffe4e6_100%)] text-slate-950 shadow-[0_8px_30px_rgba(244,63,94,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  sky: {
    outer: 'border-sky-200 bg-[linear-gradient(90deg,#e0f2fe_0%,#f0f9ff_50%,#e0f2fe_100%)] text-slate-950 shadow-[0_8px_30px_rgba(14,165,233,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  emerald: {
    outer: 'border-emerald-200 bg-[linear-gradient(90deg,#d1fae5_0%,#ecfdf5_50%,#d1fae5_100%)] text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  violet: {
    outer: 'border-violet-200 bg-[linear-gradient(90deg,#ede9fe_0%,#f5f3ff_50%,#ede9fe_100%)] text-slate-950 shadow-[0_8px_30px_rgba(139,92,246,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  orange: {
    outer: 'border-orange-200 bg-[linear-gradient(90deg,#ffedd5_0%,#fff7ed_50%,#ffedd5_100%)] text-slate-950 shadow-[0_8px_30px_rgba(249,115,22,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
  lime: {
    outer: 'border-lime-200 bg-[linear-gradient(90deg,#ecfccb_0%,#f7fee7_50%,#ecfccb_100%)] text-slate-950 shadow-[0_8px_30px_rgba(132,204,22,0.16)]',
    text: 'text-slate-900',
    close: 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950',
  },
}

const SiteNoticeBanner = ({ message, color = 'amber', onClose }) => {
  const displayMessage = String(message || '').trim()
  const theme = NOTICE_THEMES[String(color || 'amber').toLowerCase()] || NOTICE_THEMES.amber
  const containerRef = useRef(null)
  const measureRef = useRef(null)
  const [shouldScroll, setShouldScroll] = useState(false)

  useEffect(() => {
    if (!displayMessage) {
      setShouldScroll(false)
      return undefined
    }

    const measureOverflow = () => {
      const container = containerRef.current
      const text = measureRef.current
      if (!container || !text) {
        setShouldScroll(false)
        return
      }

      setShouldScroll(text.getBoundingClientRect().width > container.clientWidth + 8)
    }

    measureOverflow()

    const resizeObserver = typeof window !== 'undefined' && 'ResizeObserver' in window
      ? new ResizeObserver(measureOverflow)
      : null

    if (containerRef.current && resizeObserver) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', measureOverflow)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measureOverflow)
    }
  }, [displayMessage])

  if (!displayMessage) {
    return null
  }

  return (
    <div className={`border-b ${theme.outer}`}>
      <div className="mx-auto flex min-h-14 w-full items-center gap-3 px-4 py-2 sm:px-6 lg:px-10">
        <div ref={containerRef} className="relative flex min-w-0 flex-1 items-center overflow-hidden">
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-max whitespace-nowrap text-sm font-semibold leading-6 tracking-wide opacity-0"
          >
            {displayMessage}
          </span>
          {shouldScroll ? (
            <div
              className={`notice-marquee-track flex min-w-max items-center whitespace-nowrap text-sm font-semibold leading-6 tracking-wide ${theme.text}`}
              aria-live="polite"
            >
              <span className="px-4">{displayMessage}</span>
              <span className="px-4" aria-hidden="true">
                {displayMessage}
              </span>
            </div>
          ) : (
            <div
              className={`w-full text-center text-sm font-semibold leading-6 tracking-wide ${theme.text}`}
              aria-live="polite"
            >
              {displayMessage}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition sm:h-9 sm:w-9 ${theme.close}`}
          aria-label="Close notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default SiteNoticeBanner
