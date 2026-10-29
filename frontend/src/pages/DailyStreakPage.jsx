import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Flame,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { apiRequest, assetUrl } from '../api'
import logo from '../assets/logo.svg'
import signature from '../assets/rethish_sign-removebg-preview.png'
import { getStoredAuth } from '../authStorage'

const DailyStreakPage = () => {
  const [data, setData] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [revealedDailyAnswers, setRevealedDailyAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true)
    setError('')

    try {
      const challengeData = await apiRequest('/api/daily-challenge', {
        cache: 'no-store',
      })

      setData(challengeData)

      const questions = challengeData.challenge?.questions || []
      const next = questions.findIndex((question) => !question.submitted)

      setIndex(
        next >= 0 ? next : Math.max(questions.length - 1, 0)
      )
      setSelected(null)
      setFeedback(null)
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your daily challenge.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial data loading intentionally hydrates local UI state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const challenge = data?.challenge
  const streak = data?.streak || {
    currentStreak: 0,
    longestStreak: 0,
  }

  const questions = challenge?.questions || []
  const question = questions[index]

  const preventQuestionCapture = (event) => {
    event.preventDefault()
  }

  const progress = challenge?.questionCount
    ? Math.round(
        (challenge.attemptedCount / challenge.questionCount) * 100
      )
    : 0

  const activeFeedback =
    feedback ||
    (question?.submitted
      ? {
          isCorrect: question.isCorrect,
          solution: question.solution || '',
        }
      : null)

  const activeSelection =
    selected ?? question?.selectedAnswer ?? null

  const goToQuestion = (nextIndex) => {
    if (
      nextIndex < 0 ||
      nextIndex >= questions.length ||
      submitting ||
      finishing
    ) {
      return
    }

    setIndex(nextIndex)
    setSelected(null)
    setFeedback(null)
    setError('')
    window.setTimeout(() => {
      document.getElementById('daily-question-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  const submit = async (selectionOverride = null) => {
    const selectedAnswer = selectionOverride ?? activeSelection

    if (
      selectedAnswer === null ||
      !question ||
      activeFeedback ||
      submitting
    ) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/daily-challenge/${challenge.id}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: question._id,
            selectedAnswer,
          }),
        }
      )

      const nextQuestions = challenge.questions.map((item) =>
        item._id === question._id
          ? {
              ...item,
              submitted: true,
              selectedAnswer,
              isCorrect: result.isCorrect,
              solution: result.solution || item.solution,
            }
          : item
      )

      setData((previous) => ({
        ...previous,
        challenge: {
          ...previous.challenge,
          questions: nextQuestions,
          attemptedCount: result.attemptedCount,
          correctCount: result.correctCount,
          score: result.score,
        },
      }))

      setFeedback(result)
    } catch (submitError) {
      setError(
        submitError.message || 'Could not submit your answer. Try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const finish = async () => {
    if (finishing) return

    setFinishing(true)
    setError('')

    try {
      const completedData = await apiRequest(
        `/api/daily-challenge/${challenge.id}/complete`,
        {
          method: 'POST',
          body: '{}',
        }
      )

      setCelebrating(Boolean(completedData.challenge?.streakQualified))
      await load(false)
    } catch (finishError) {
      setError(
        finishError.message || 'Unable to complete your challenge.'
      )
    } finally {
      setFinishing(false)
    }
  }

  const restoreBrokenStreak = async () => {
    if (restoring) return
    setRestoring(true)
    setError('')
    try {
      await apiRequest('/api/daily-streak/restore', { method: 'POST', body: '{}' })
      await load(false)
    } catch (restoreError) {
      setError(restoreError.message || 'Could not restore your streak.')
    } finally {
      setRestoring(false)
    }
  }

  const nextQuestion = () => {
    if (index + 1 < questions.length) {
      goToQuestion(index + 1)
    } else {
      finish()
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[65vh] place-items-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50">
            <RefreshCw
              size={22}
              className="animate-spin text-teal-600"
            />
          </div>
          <p className="mt-4 font-semibold text-slate-700">
            Preparing your daily challenge…
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Getting your questions ready
          </p>
        </div>
      </div>
    )
  }

  if (error && !challenge) {
    return (
      <div className="grid min-h-[65vh] place-items-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <RefreshCw size={28} className="mx-auto text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 break-words text-sm text-slate-500">
            {error}
          </p>
          <button
            onClick={() => load()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-semibold text-white transition hover:bg-teal-700"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!challenge?.eligibleChapterIds?.length) {
    return <EmptyState />
  }

  if (!challenge.questionCount) {
    return (
      <div className="grid min-h-[65vh] place-items-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <LockKeyhole
            size={36}
            className="mx-auto text-amber-500"
          />
          <h1 className="mt-4 text-2xl font-black text-slate-900">
            More questions needed
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your practised chapters are eligible, but there are no usable
            questions available yet. Please try again after your teacher
            adds questions.
          </p>
          <Link
            to="/chapters"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 font-semibold text-white"
          >
            Explore chapters
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfbfa] text-stone-800">
      <div className="relative mx-auto w-full max-w-[1180px] px-2 py-1 sm:px-3 lg:px-4">
        {/* Header */}
        <header className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-3 sm:gap-4 sm:pb-4">
          <div className="min-w-0">
            <Link
              to="/chapters"
              className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
            >
              <ArrowLeft size={16} />
              Back to chapters
            </Link>

            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-stone-900 text-white sm:h-12 sm:w-12">
                <Zap size={21} fill="currentColor" />
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400 sm:text-xs">
                  Daily challenge
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-serif tracking-tight text-stone-950 sm:text-3xl">
                    Daily Streak
                  </h1>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-700"
                    aria-label={`${streak.currentStreak} day streak`}
                  >
                    <span aria-hidden="true">🔥</span>
                    {streak.currentStreak}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800" title="Available streak restore keys">
              <KeyRound size={14} />
              {Number(streak.restoreKeys || 0)} keys
            </div>
            {streak.streakBroken && (
              <button type="button" onClick={restoreBrokenStreak} disabled={restoring || Number(streak.restoreKeys || 0) < 1} className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">
                <KeyRound size={13} />
                {restoring ? 'Restoring...' : Number(streak.restoreKeys || 0) > 0 ? 'Restore streak' : 'Need restore key'}
              </button>
            )}
          </div>

        </header>

        {/* Inline error */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <X size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Something needs attention</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
              className="shrink-0 rounded-lg p-1 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Completed state */}
        {challenge.status === 'completed' ? (
          <Completed challenge={challenge} streak={streak} celebrate={celebrating} />
        ) : (
          <section className="min-w-0">
            {/* Question panel */}
            <div id="daily-question-panel" className="min-w-0 scroll-mt-28 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {/* Progress header */}
              <div className="border-b border-stone-100 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-400">
                      Question {String(index + 1).padStart(2, '0')}
                      <span className="font-bold text-stone-400">
                        {' '}
                        of {challenge.questionCount}
                      </span>
                    </p>
                  </div>

                  <span className="shrink-0 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
                    {progress}% complete
                  </span>
                </div>

                <div
                  className="h-2 overflow-hidden rounded-full bg-stone-100"
                  role="progressbar"
                  aria-label="Challenge progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {question && (
                <div
                  className="question-protected p-3 sm:p-4"
                  onContextMenu={preventQuestionCapture}
                  onCopy={preventQuestionCapture}
                  onCut={preventQuestionCapture}
                  onDragStart={preventQuestionCapture}
                  onSelectStart={preventQuestionCapture}
                >
                  {/* Chapter / topic */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">
                      Chapter {question.chapterNumber}
                    </span>

                    {question.topicName && (
                      <span className="max-w-full break-words rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {question.topicName}
                      </span>
                    )}
                  </div>

                  {/* Diagram */}
                  {question.imageUrl && (
                    <div className="mb-3 flex min-h-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2 sm:mb-4 sm:min-h-28 sm:p-3">
                      <img
                        src={assetUrl(question.imageUrl)}
                        alt="Question diagram"
                        loading="eager"
                        className="max-h-52 max-w-full object-contain sm:max-h-60"
                      />
                    </div>
                  )}

                  {/* Question */}
                  <h2 className="whitespace-pre-wrap break-words text-base font-black leading-snug text-stone-950 sm:text-xl">
                    {question.question || 'Choose the correct answer.'}
                  </h2>

                  {/* Matching pairs */}
                  {question.pairs?.length > 0 && (
                    <div className="my-5 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <span>Column A</span>
                        <span>Column B</span>
                      </div>

                      {question.pairs.map((pair, pairIndex) => (
                        <div
                          key={`${pair.left}-${pair.right}`}
                          className={`grid grid-cols-2 gap-3 px-4 py-3 text-sm leading-6 ${
                            pairIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                          }`}
                        >
                          <span className="break-words font-medium text-slate-800">
                            {pair.left}
                          </span>
                          <span className="break-words text-slate-600">
                            {pair.right}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer options */}
                  <div className="mt-3 space-y-2 sm:mt-4">
                    {['diagram-based-question', 'complete-the-tables', 'identify-symbol'].includes(question.type) ? (
                      revealedDailyAnswers[question._id] ? (
                        <div id={`daily-answer-${question._id}`} className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950">
                          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Answer</p>
                          {question.answerImageUrl && (
                            <img src={assetUrl(question.answerImageUrl)} alt="Correct answer" className="mt-3 max-h-72 w-full rounded-xl object-contain" />
                          )}
                          <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6">
                            {question.correctAnswer || question.solution || question.options?.[0] || 'Answer is not available yet.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setRevealedDailyAnswers((current) => ({ ...current, [question._id]: false }))
                              if (!question.submitted) submit(0)
                            }}
                            disabled={submitting}
                            className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {question.submitted ? 'Done' : 'Done and continue'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRevealedDailyAnswers((current) => ({ ...current, [question._id]: true }))
                            window.setTimeout(() => document.getElementById(`daily-answer-${question._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
                          }}
                          disabled={submitting}
                          className="flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Show answer
                        </button>
                      )
                    ) : (
                    <>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Select your answer
                    </p>

                    {(question.options || []).map((option, optionIndex) => {
                      const isSelected =
                        activeSelection === optionIndex

                      const isSubmittedAnswer =
                        question.submitted &&
                        question.selectedAnswer === optionIndex

                      const isCorrectOption =
                        activeFeedback?.isCorrect &&
                        isSubmittedAnswer

                      let optionStyle =
                        'border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400 hover:bg-white'

                      if (isSelected && !activeFeedback) {
                          optionStyle =
                            'border-cyan-600 bg-cyan-500 text-white shadow-sm'
                      }

                      if (activeFeedback && isSubmittedAnswer) {
                        optionStyle = activeFeedback.isCorrect
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-rose-300 bg-rose-50'
                      }

                      return (
                          <button
                          key={`${option}-${optionIndex}`}
                          type="button"
                          disabled={Boolean(activeFeedback) || submitting}
                          onClick={() => {
                            setSelected(optionIndex)
                            submit(optionIndex)
                          }}
                          aria-pressed={isSelected}
                            className={`group flex min-h-10 w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-all duration-200 sm:min-h-11 sm:px-4 sm:text-base ${
                            optionStyle
                          } disabled:cursor-default`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold transition-colors ${
                              activeFeedback && isSubmittedAnswer
                                ? activeFeedback.isCorrect
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-400 text-white'
                                : isSelected
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700'
                            }`}
                          >
                            {activeFeedback && isSubmittedAnswer ? (
                              activeFeedback.isCorrect ? (
                                <Check size={17} />
                              ) : (
                                <X size={17} />
                              )
                            ) : (
                              String.fromCharCode(65 + optionIndex)
                            )}
                          </span>

                          <span className="min-w-0 flex-1 break-words pt-1 text-sm font-medium leading-6 text-slate-800 sm:text-base">
                            {option}
                          </span>

                          <span className="mt-1 shrink-0">
                            {activeFeedback && isCorrectOption && (
                              <CheckCircle2 size={19} className="text-emerald-600" />
                            )}
                          </span>
                        </button>
                      )
                    })}
                    </>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => goToQuestion(index - 1)}
                      disabled={index === 0 || submitting || finishing}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>

                    {!activeFeedback ? (
                      <button
                        type="button"
                        onClick={submit}
                        disabled={
                          activeSelection === null ||
                          submitting ||
                          finishing
                        }
                        className="hidden"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />
                            Checking…
                          </>
                        ) : (
                          <>
                            Check answer
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={nextQuestion}
                        disabled={finishing || submitting}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-50"
                      >
                        {finishing ? (
                          <>
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />
                            Finishing…
                          </>
                        ) : index + 1 === questions.length ? (
                          <>
                            Complete challenge
                            <CheckCircle2 size={17} />
                          </>
                        ) : (
                          <>
                            Next question
                            <ArrowRight size={17} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </section>
        )}
      </div>
    </main>
  )
}

/* ---------- Reusable components ---------- */

const Completed = ({ challenge, streak, celebrate = false }) => {
  const [expandedQuestion, setExpandedQuestion] = useState(null)
  const [revealedAnswers, setRevealedAnswers] = useState({})
  const [previewImage, setPreviewImage] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [downloadingCertificate, setDownloadingCertificate] = useState(false)
  const downloadInProgress = useRef(false)
  const studentName = getStoredAuth()?.user?.name || 'Student'
  const marksCounted = Number(challenge.scoredQuestionCount ?? challenge.questionCount ?? 0)
  const marksAttempted = Number(challenge.scoredAttemptedCount ?? 0)
  const currentStreak = Math.min(100, Math.max(0, Number(streak.currentStreak || 0)))
  const canDownloadCertificate = currentStreak >= 100
  const streakFillWidth = currentStreak === 100
    ? '100%'
    : currentStreak === 0
      ? '0%'
      : `max(0%, calc(${currentStreak}% - 20px))`
  const streakLabelPosition = currentStreak === 100
    ? '100%'
    : `min(${currentStreak}%, calc(100% - 42px))`

  const downloadCertificate = async () => {
    if (downloadInProgress.current) return
    downloadInProgress.current = true
    setDownloadingCertificate(true)

    const certificateDate = challenge.completedAt
      ? new Date(challenge.completedAt).toLocaleDateString()
      : new Date().toLocaleDateString()
    const certificateId = `SCI2-100-${String(challenge.localDate || '').replace(/[^0-9]/g, '') || 'STREAK'}`
    const loadImage = (source) => new Promise((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = source
    })
    const [logoImage, signatureImage] = await Promise.all([loadImage(logo), loadImage(signature)])
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1100
    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, 1600, 1100)
    gradient.addColorStop(0, '#fffdf5')
    gradient.addColorStop(1, '#fff7ed')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1600, 1100)
    context.strokeStyle = '#0f766e'
    context.lineWidth = 28
    context.strokeRect(24, 24, 1552, 1052)
    context.strokeStyle = '#f59e0b'
    context.lineWidth = 4
    context.strokeRect(52, 52, 1496, 996)
    if (logoImage) context.drawImage(logoImage, 755, 90, 90, 90)
    context.textAlign = 'center'
    context.fillStyle = '#b45309'
    context.font = '800 24px Arial'
    context.fillText('CERTIFICATE OF ACHIEVEMENT', 800, 245)
    context.fillStyle = '#0f766e'
    context.font = 'bold 68px Georgia'
    context.fillText('100-Day Streak', 800, 335)
    context.fillStyle = '#475569'
    context.font = '28px Arial'
    context.fillText('This certificate is proudly presented to', 800, 405)
    context.fillStyle = '#111827'
    context.font = 'bold 46px Georgia'
    context.fillText(studentName, 800, 490)
    context.strokeStyle = '#334155'
    context.lineWidth = 2
    context.beginPath(); context.moveTo(470, 510); context.lineTo(1130, 510); context.stroke()
    context.fillStyle = '#475569'
    context.font = '24px Arial'
    const achievementLines = [
      'For completing 100 consecutive days of the',
      'Innovative Science 2 Daily Streak Challenge',
      'with dedication, consistency, and a commitment to learning.',
    ]
    achievementLines.forEach((line, lineIndex) => {
      context.fillText(line, 800, 565 + lineIndex * 36)
    })
    context.textAlign = 'left'
    context.font = 'bold 20px Arial'
    context.fillText(`Completed on: ${certificateDate}`, 230, 790)
    context.fillText(`Certificate ID: ${certificateId}`, 230, 835)
    if (signatureImage) context.drawImage(signatureImage, 1160, 700, 190, 65)
    context.strokeStyle = '#334155'
    context.beginPath(); context.moveTo(1130, 785); context.lineTo(1380, 785); context.stroke()
    context.textAlign = 'center'
    context.font = '18px Arial'
    context.fillText('Authorized Signature', 1255, 820)
    context.font = 'bold 18px Arial'
    context.fillText('Innovative Science 2', 1255, 850)
    context.fillStyle = '#0f766e'
    context.font = 'bold 18px Arial'
    context.fillText('LEARN · PRACTICE · GROW', 800, 980)

    const jpegData = canvas.toDataURL('image/jpeg', 0.94)
    const jpegBytes = Uint8Array.from(atob(jpegData.split(',')[1]), (character) => character.charCodeAt(0))
    const encoder = new TextEncoder()
    const chunks = []
    const offsets = []
    let length = 0
    const add = (chunk) => { const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk; chunks.push(bytes); length += bytes.length }
    const object = (number, content) => { offsets[number] = length; add(`${number} 0 obj\n${content}\nendobj\n`) }
    add('%PDF-1.3\n%\xFF\xFF\xFF\xFF\n')
    object(1, '<< /Type /Catalog /Pages 2 0 R >>')
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
    object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>')
    const content = 'q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ'
    object(4, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`)
    offsets[5] = length
    add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width 1600 /Height 1100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
    add(jpegBytes)
    add('\nendstream\nendobj\n')
    const xrefOffset = length
    add(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
    const pdf = new Blob(chunks, { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(pdf)
    link.download = `innovative-science-100-day-streak-${String(challenge.localDate || 'certificate')}.pdf`
    link.click()
    URL.revokeObjectURL(link.href)
    downloadInProgress.current = false
    setDownloadingCertificate(false)
  }

  return (
    <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 px-4 py-4 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-700">100-day streak journey</p>
          <p className="mt-1 text-sm font-bold text-slate-700">Day {currentStreak} of 100</p>
        </div>
        <span className="sr-only">{currentStreak}% complete</span>
      </div>
      <div className="relative mt-7 h-4 rounded-full bg-orange-100/80 p-0.5 shadow-inner">
        <div className={`h-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 shadow-sm transition-[width] duration-1000 ease-out ${celebrate ? 'animate-pulse' : ''}`} style={{ width: streakFillWidth }} />
        <span
          className="absolute -top-7 -translate-x-1/2 text-sm font-black text-orange-700 transition-[left] duration-1000 ease-out"
          style={{ left: streakLabelPosition }}
        >
          {currentStreak}%
        </span>
        {challenge.streakMilestoneImage?.imageData ? (
          <button type="button" onClick={() => setPreviewImage(true)} aria-label="View streak milestone image" className={`absolute -right-1 -top-3 grid h-10 w-10 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white shadow-md transition hover:scale-110 ${celebrate ? 'animate-bounce' : ''}`}>
            <img src={challenge.streakMilestoneImage.imageData} alt="Streak milestone" className="h-full w-full object-cover" />
          </button>
        ) : <div className="absolute -right-1 -top-1 h-6 w-6 rounded-full border-4 border-white bg-yellow-300 shadow" />}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-orange-700/70"><span>Start</span><span>100 days</span></div>
      <>
        <button type="button" onClick={() => setShowReward(true)} className="ml-auto mt-3 flex w-fit min-h-8 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 px-4 py-1.5 text-xs font-black text-white shadow-md shadow-fuchsia-200 transition hover:scale-[1.03] hover:shadow-lg">
          <Sparkles size={13} />
          Claim reward
          <Sparkles size={13} />
        </button>
      </>
    </div>
    <div className="bg-gradient-to-br from-teal-700 to-cyan-700 px-4 py-7 text-center text-white sm:px-8 sm:py-9">
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20 ${celebrate ? 'animate-bounce' : ''}`}>
        <Trophy size={28} className="text-amber-300" />
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-100">
        Daily challenge
      </p>

      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
        Challenge complete!
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-teal-50">
        You showed up and put your science knowledge to the test.
      </p>
    </div>

    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-teal-50 p-3 text-center">
          <p className="text-xs font-semibold text-teal-700">Marks counted</p>
          <p className="mt-1 text-2xl font-black text-teal-900">
            {challenge.score ?? challenge.correctCount ?? 0}
            <span className="text-lg text-teal-500">
              /{marksCounted}
            </span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-teal-700">
            {marksAttempted} scorable attempted
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">Right questions</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">
            {challenge.correctCount ?? 0}
            <span className="text-lg text-emerald-500">/{challenge.questionCount ?? 0}</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-700">total correct</p>
        </div>

        <div className="rounded-2xl bg-sky-50 p-3 text-center">
          <p className="text-xs font-semibold text-sky-700">
            Accuracy
          </p>
          <p className="mt-1 text-2xl font-black text-sky-900">
            {challenge.accuracy ?? 0}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-3">
        <Flame size={24} className="shrink-0 text-orange-500" />
        <div>
          <p className="text-sm font-bold text-slate-900">
            {challenge.streakQualified
              ? `${streak.currentStreak}-day streak`
              : 'No streak credit today'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {challenge.streakQualified
              ? 'You got 10 or more eligible questions right. Keep practising to build your daily habit.'
              : 'Get at least 10 eligible questions right in a daily challenge to earn streak credit.'}
          </p>
        </div>
      </div>

      <div id="completed-questions" className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Today&apos;s question{challenge.questions?.length === 1 ? '' : 's'} ({challenge.questions?.length || 0})
        </p>
        <div className="mt-3 space-y-3">
          {(challenge.questions || []).map((question, questionIndex) => (
            <div
              key={question._id || questionIndex}
              className={`question-protected overflow-hidden rounded-xl border-2 ${
                !question.submitted
                  ? 'border-slate-200 bg-white'
                  : question.isScored === false
                    ? 'border-amber-300 bg-amber-50/30'
                    : question.isCorrect
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-rose-300 bg-rose-50/30'
              }`}
              onContextMenu={(event) => event.preventDefault()}
              onCopy={(event) => event.preventDefault()}
              onCut={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
              onSelectStart={(event) => event.preventDefault()}
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedQuestion(
                    expandedQuestion === questionIndex ? null : questionIndex
                  )
                }
                aria-expanded={expandedQuestion === questionIndex}
                className="w-full p-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-teal-700">
                    Question {questionIndex + 1}
                  </p>
                  {question.submitted && (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                      question.isScored === false
                        ? 'bg-amber-100 text-amber-800'
                        : question.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}>
                      {question.isScored === false
                        ? 'Not counted'
                        : question.isCorrect
                          ? 'Correct'
                          : 'Wrong'}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800 ${
                    expandedQuestion === questionIndex ? '' : 'line-clamp-2'
                  }`}
                >
                  {question.question || 'Question unavailable.'}
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {expandedQuestion === questionIndex
                    ? 'Hide answer'
                    : 'Tap to view your answer'}
                </p>
              </button>

              {expandedQuestion === questionIndex && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-4">
                  {question.imageUrl && (
                    <div className="mb-4 flex min-h-24 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <img
                        src={assetUrl(question.imageUrl)}
                        alt="Question diagram"
                        className="max-h-60 max-w-full object-contain"
                      />
                    </div>
                  )}

                  {question.pairs?.length > 0 && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                      {question.pairs.map((pair, pairIndex) => (
                        <div
                          key={`${pair.left}-${pair.right}`}
                          className={`grid grid-cols-2 gap-3 px-3 py-2 text-sm ${
                            pairIndex % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                          }`}
                        >
                          <span className="break-words font-medium text-slate-800">
                            {pair.left}
                          </span>
                          <span className="break-words text-slate-600">
                            {pair.right}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your selected answer
                  </p>
                  {['complete-the-tables', 'diagram-based-question'].includes(question.type) ? (
                    revealedAnswers[questionIndex] ? (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Answer</p>
                        <p className="mt-1 font-bold leading-6">{question.correctAnswer || question.solution || 'Answer unavailable.'}</p>
                        <button type="button" onClick={() => setRevealedAnswers((current) => ({ ...current, [questionIndex]: false }))} className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800">Done</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setRevealedAnswers((current) => ({ ...current, [questionIndex]: true }))} className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700">Show answer</button>
                    )
                  ) : (
                    <div className="space-y-2">
                      {(question.options || []).map((option, optionIndex) => {
                        const isSelected = question.selectedAnswer === optionIndex

                        return (
                          <div
                            key={`${option}-${optionIndex}`}
                            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                              isSelected
                                ? question.isScored === false
                                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                                  : question.isCorrect
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                  : 'border-rose-300 bg-rose-50 text-rose-900'
                                : 'border-slate-100 bg-slate-50 text-slate-500'
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span className="min-w-0 flex-1 break-words">{option}</span>
                            {isSelected && (
                              <span className="shrink-0 text-xs font-bold">
                                {question.isScored === false ? 'Not counted' : question.isCorrect ? 'Correct' : 'Wrong'}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {!question.isCorrect && question.correctAnswer && !['complete-the-tables', 'diagram-based-question'].includes(question.type) && (
                    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Correct answer</p>
                      <p className="mt-1 font-bold leading-6">{question.correctAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Link
          to="/chapters"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Back to chapters
        </Link>
      </div>
    </div>
    {previewImage && challenge.streakMilestoneImage?.imageData && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-5" role="dialog" aria-modal="true" aria-label="Streak milestone image" onClick={() => setPreviewImage(false)}>
        <div className="relative max-h-[85vh] max-w-[90vw] rounded-3xl bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setPreviewImage(false)} className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xl font-black text-white">×</button>
          <img src={challenge.streakMilestoneImage.imageData} alt="Streak milestone" className="max-h-[80vh] max-w-[85vw] rounded-2xl object-contain" />
        </div>
      </div>
    )}
    {showReward && (
      <div className="fixed inset-0 z-[300] grid place-items-center overflow-hidden bg-slate-950/85 p-5" role="dialog" aria-modal="true" aria-label="100-day streak reward" onClick={() => setShowReward(false)}>
        <div className="relative w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setShowReward(false)} aria-label="Close certificate" className="absolute right-5 top-7 z-[50] grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-rose-600 text-xl font-black leading-none text-white shadow-lg transition hover:bg-rose-700">×</button>
          <div className="relative p-5 text-center sm:p-7">
            <div className="relative mt-5 animate-[reward-pop_700ms_cubic-bezier(.2,.9,.2,1)] rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50 to-teal-50 p-4 text-left text-slate-800 shadow-2xl sm:p-6">
              <div className="text-center">
                <img src={logo} alt="Innovative Science 2" className="mx-auto h-14 w-14 object-contain" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Certificate of Achievement</p>
                <h4 className="mt-1 font-serif text-2xl font-black text-teal-800">100-Day Streak</h4>
                <p className="mt-3 text-xs text-slate-500">This certificate is proudly presented to</p>
                <p className="mt-2 border-b border-slate-400 pb-1 text-xl font-black text-slate-900">{studentName}</p>
                <p className="mt-4 text-xs leading-5 text-slate-600">For completing 100 consecutive days of the Innovative Science 2 Daily Streak Challenge with dedication and consistency.</p>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4 text-[10px] text-slate-500">
                <span>Completed: {challenge.completedAt ? new Date(challenge.completedAt).toLocaleDateString() : challenge.localDate || 'Today'}</span>
                <span className="text-center"><img src={signature} alt="Authorized signature" className="mx-auto mb-1 h-8 max-w-[110px] object-contain" /><span className="mx-auto block w-[110px] border-t border-slate-400 pt-1">Authorized Signature</span><strong>Innovative Science 2</strong></span>
              </div>
              {!canDownloadCertificate && (
                <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-slate-950/70 p-5 text-center text-white backdrop-blur-[2px]">
                  <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-900/90 ring-4 ring-white/30">
                      <LockKeyhole size={34} />
                    </div>
                    <p className="mt-3 text-sm font-black">Certificate locked</p>
                    <p className="mt-1 text-xs font-semibold text-white/80">Complete 100 days to unlock your certificate and PDF download.</p>
                  </div>
                </div>
              )}
            </div>
            {canDownloadCertificate && (
              <button type="button" onClick={downloadCertificate} disabled={downloadingCertificate} className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-black text-violet-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">{downloadingCertificate ? 'Preparing PDF...' : 'Download certificate as PDF'}</button>
            )}
          </div>
        </div>
      </div>
    )}
    </section>
  )
}

const EmptyState = () => (
  <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-12">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-600">
        <LockKeyhole size={30} />
      </div>

      <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
        Your streak starts here
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Practise at least one regular question from a chapter to unlock that
        chapter for your personalised daily challenge. Skipped questions do
        not unlock a chapter.
      </p>

      <Link
        to="/chapters"
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white transition hover:bg-teal-700"
      >
        Start practising
        <ArrowRight size={17} />
      </Link>
    </section>
  </main>
)

export default DailyStreakPage
