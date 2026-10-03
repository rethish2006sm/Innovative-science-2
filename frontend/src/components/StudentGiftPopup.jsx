import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const StudentGiftPopup = () => {
  const auth = getStoredAuth()
  const shouldLoad = Boolean(auth?.token) && !auth?.user?.isAdmin
  const [gift, setGift] = useState(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (!shouldLoad) {
      setGift(null)
      return undefined
    }

    let cancelled = false
    apiRequest('/api/gift', { cache: 'no-store' })
      .then((data) => {
        if (!cancelled) setGift(data?.gift || null)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [shouldLoad])

  useEffect(() => {
    if (!gift?.imageData || closed) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [closed, gift?.imageData])

  if (!shouldLoad || !gift?.imageData || closed) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/60 px-2 py-3 backdrop-blur-md sm:px-4 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-label="Gift image"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setClosed(true)
      }}
      tabIndex={-1}
    >
      <div className="flex max-h-full w-full max-w-[min(30rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:rounded-2xl">
        <div className="flex h-11 shrink-0 items-center justify-between bg-slate-950/90 px-3 text-white backdrop-blur-xl sm:h-12 sm:px-4">
          <span className="text-xs font-semibold tracking-wide text-white/80 sm:text-sm">Your gift</span>

          <div className="flex items-center gap-1">
            <a
              href={gift.imageData}
              download={gift.originalName || 'gift-image.webp'}
              className="grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
              aria-label="Download gift image"
            >
              <Download className="h-[18px] w-[18px]" />
            </a>
            <button
              type="button"
              onClick={() => setClosed(true)}
              className="grid h-8 w-8 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
              aria-label="Close gift"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <img
          src={gift.imageData}
          alt="Gift"
          className="max-h-[calc(100vh-5rem)] w-full min-h-0 object-contain"
        />
      </div>
    </div>
  )
}

export default StudentGiftPopup
