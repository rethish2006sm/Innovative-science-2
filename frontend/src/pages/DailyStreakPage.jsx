import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Flame,
  LockKeyhole,
  RefreshCw,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { apiRequest, assetUrl } from '../api'

const DailyStreakPage = () => {
  const [data, setData] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
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
          score: result.correctCount,
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
      await apiRequest(
        `/api/daily-challenge/${challenge.id}/complete`,
        {
          method: 'POST',
          body: '{}',
        }
      )

      await load(false)
    } catch (finishError) {
      setError(
        finishError.message || 'Unable to complete your challenge.'
      )
    } finally {
      setFinishing(false)
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
          <Completed challenge={challenge} streak={streak} />
        ) : (
          <section className="min-w-0">
            {/* Question panel */}
            <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              {/* Progress header */}
              <div className="border-b border-stone-100 px-3 py-3 sm:px-4 sm:py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
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
                <div className="p-4 sm:p-5">
                  {/* Chapter / topic */}
                  <div className="mb-5 flex flex-wrap items-center gap-2">
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
                    <div className="mb-6 flex min-h-32 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-5">
                      <img
                        src={assetUrl(question.imageUrl)}
                        alt="Question diagram"
                        loading="eager"
                        className="max-h-72 max-w-full object-contain"
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
                  <div className="mt-6 space-y-3">
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
                            className={`group flex min-h-12 w-full items-start gap-3 rounded-2xl border px-4 py-2.5 text-left text-sm font-bold transition-all duration-200 sm:text-base ${
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
                  </div>

                  {/* Navigation */}
                  <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
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

const Completed = ({ challenge, streak }) => {
  const [expandedQuestion, setExpandedQuestion] = useState(null)

  return (
    <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="bg-gradient-to-br from-teal-700 to-cyan-700 px-4 py-7 text-center text-white sm:px-8 sm:py-9">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
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
          <p className="text-xs font-semibold text-teal-700">Your score</p>
          <p className="mt-1 text-2xl font-black text-teal-900">
            {challenge.score ?? challenge.correctCount ?? 0}
            <span className="text-lg text-teal-500">
              /{challenge.questionCount}
            </span>
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">
            Accuracy
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-900">
            {challenge.accuracy ?? 0}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-3">
        <Flame size={24} className="shrink-0 text-orange-500" />
        <div>
          <p className="text-sm font-bold text-slate-900">
            {streak.currentStreak}-day streak
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Keep practising to build your daily habit.
          </p>
        </div>
      </div>

      <div id="completed-questions" className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Today&apos;s question{challenge.questions?.length === 1 ? '' : 's'}
        </p>
        <div className="mt-3 space-y-3">
          {(challenge.questions || []).map((question, questionIndex) => (
            <div
              key={question._id || questionIndex}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
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
                <p className="text-xs font-bold text-teal-700">
                  Question {questionIndex + 1}
                </p>
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
                  <div className="space-y-2">
                    {(question.options || []).map((option, optionIndex) => {
                      const isSelected = question.selectedAnswer === optionIndex

                      return (
                        <div
                          key={`${option}-${optionIndex}`}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                            isSelected
                              ? question.isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : 'border-rose-300 bg-rose-50 text-rose-900'
                              : 'border-slate-100 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <span className="font-bold">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          <span className="min-w-0 flex-1 break-words">
                            {option}
                          </span>
                          {isSelected && (
                            <span className="shrink-0 text-xs font-bold">
                              {question.isCorrect ? 'Correct' : 'Selected'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
        Practise at least one question from a chapter to unlock your
        personalised daily challenge.
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
