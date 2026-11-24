import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Send, Star, X } from 'lucide-react'
import { apiRequest } from '../api'
import { markFeedbackFlowSubmitted } from '../lib/feedbackFlow'
import { getStoredAuth } from '../authStorage'
import { getFeedbackClientKey } from '../lib/feedbackClient'

const StarFeedbackModal = ({
  open,
  title,
  subtitle,
  sourceType = 'general',
  sourceKey = '',
  sourceLabel = '',
  onSubmitSuccess,
  onSkip,
  initialRating = 5,
}) => {
  const [rating, setRating] = useState(initialRating)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const auth = getStoredAuth()
  const closeTimerRef = useRef(null)

  const stars = useMemo(() => [1, 2, 3, 4, 5], [])

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }

      setRating(initialRating)
      setError('')
      setIsSubmitting(false)
      setIsSubmitted(false)
      setSuccessMessage('')
    }
  }, [open, initialRating])

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const submitFeedback = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const data = await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          message: '',
          sourceType,
          sourceKey,
          sourceLabel,
          clientKey: getFeedbackClientKey(),
          name: auth?.user?.name || '',
          email: auth?.user?.email || '',
          phoneNumber: auth?.user?.phoneNumber || '',
        }),
      })

      markFeedbackFlowSubmitted(sourceType, sourceKey)
      setIsSubmitted(true)
      setSuccessMessage(data?.message || 'Thanks, your rating is saved. Showing your result now.')

      closeTimerRef.current = window.setTimeout(() => {
        onSubmitSuccess?.(rating, data)
      }, 850)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[260] flex items-end justify-center bg-slate-950/75 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.98, y: 28 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 28 }}
            className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-white/70 bg-white shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-amber-700">Quick rating</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Close feedback popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
              {isSubmitted ? (
                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Saved</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-emerald-950">
                        {successMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <p className="text-sm font-bold text-slate-600">Tap a star only. No text needed.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                    {stars.map((value) => {
                      const active = value <= rating

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                            active
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                          aria-label={`${value} star rating`}
                        >
                          <Star className={`h-4 w-4 ${active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submitFeedback}
                disabled={isSubmitting || isSubmitted}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 px-5 font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Send stars'}
                <Send className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSkip}
                disabled={isSubmitted}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5  font-black text-slate-700 transition hover:bg-slate-50"
              >
                Skip for now
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-xs font-bold leading-5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Submit your feedback.</span>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default StarFeedbackModal
