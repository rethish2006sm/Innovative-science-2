import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Plus, Trash2 } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

export const objectiveOptions = [
  { type: 'mcqs', label: 'MCQs', description: 'Multiple choice objective questions.' },
  { type: 'true-or-false', label: 'True or False', description: 'Mark each statement as true or false.' },
  { type: 'correlation', label: 'Correlation', description: 'Solve analogy and word-correlation questions.' },
  { type: 'match-the-following', label: 'Match the Following', description: 'Match terms with the correct answers.' },
  { type: 'complete-the-tables', label: 'Complete the Tables', description: 'Fill missing values in structured tables.' },
  { type: 'diagram-based-question', label: 'Diagram Based Question', description: 'Answer questions from labelled diagrams.' },
  { type: 'identify-symbol', label: 'Identify Symbol', description: 'Choose the correct symbol from the given image.' },
]

const Objectivepage = () => {
  const { chapterNumber, topicId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const boardOnly = searchParams.get('boardOnly') === '1' || searchParams.get('boardOnly') === 'true'
  const [topic, setTopic] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [objectiveTypes, setObjectiveTypes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)

  const selectedTypes = useMemo(
    () => new Set(objectiveTypes.map((item) => item.type)),
    [objectiveTypes],
  )
  const availableOptions = objectiveOptions.filter((option) => !selectedTypes.has(option.type))

  const loadObjectiveTypes = async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await apiRequest(`/api/topics/${topicId}/objective-types`)
      setTopic({
        ...(data.topic || {}),
        sourceName: data.topic?.name || '',
        name: data.topic?.name || '',
      })
      setChapter({
        ...(data.chapter || {}),
        sourceName: data.chapter?.name || '',
        name: data.chapter?.name || '',
      })
      setObjectiveTypes(data.objectiveTypes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadObjectiveTypes()
  }, [topicId])

  const addObjectiveType = async (type) => {
    setIsSaving(true)
    setError('')

    try {
      await apiRequest(`/api/topics/${topicId}/objective-types`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      navigate(`/chapters/${chapterNumber}/topics/${topicId}/objectives/${type}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteObjectiveType = async (objectiveType) => {
    const option = objectiveOptions.find((item) => item.type === objectiveType.type)
    const shouldDelete = window.confirm(`Delete "${option?.label || objectiveType.type}" from this topic?`)

    if (!shouldDelete) return

    setError('')
    try {
      await apiRequest(`/api/objective-types/${objectiveType._id}`, { method: 'DELETE' })
      await loadObjectiveTypes()
    } catch (err) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-[#fbfbfa] px-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 text-stone-500 shadow-xl">
          Loading objective types...
        </div>
      </section>
    )
  }

  if (!topic) {
    return (
      <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-[#fbfbfa] px-4">
        <div className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
          <h1 className="font-serif text-3xl text-stone-900">Topic not found</h1>
          <p className="mt-3 text-sm text-stone-500">{error}</p>
          <Link to={`/chapters/${chapterNumber}/topics`} className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white">
            Back to topics
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-[calc(100vh-6rem)] w-full bg-[#fbfbfa] px-4 py-2 text-stone-800 sm:px-6 sm:py-5 lg:px-10">
      <div className="mx-auto w-full max-w-none">
        <div className="mt-0 border-b border-stone-200 pb-5 sm:mt-2 sm:pb-6">
          <button
            type="button"
            onClick={() => navigate(`/chapters/${chapterNumber}/topics`)}
            className="group mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-x-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-[0_8px_20px_rgba(8,145,178,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2"
            aria-label="Back to topics"
            title="Back to topics"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          <h1 className="font-serif text-3xl tracking-tight text-stone-950 sm:text-4xl lg:text-5xl">
            {topic.name}
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-stone-400 sm:text-sm">
            Chapter {chapter.name}
          </p>
          <div className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-white p-1 shadow-[0_4px_12px_rgba(15,23,42,0.12)]">
            {[
              { id: 'all', label: 'All' },
              { id: 'board', label: 'Board question' },
            ].map((filter) => {
              const selected = filter.id === 'board' ? boardOnly : !boardOnly
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSearchParams(filter.id === 'board' ? { boardOnly: '1' } : {})}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition sm:text-sm ${selected ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-amber-400 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">{error}</p>
          )}
        </div>

        {objectiveTypes.filter((objectiveType) => !boardOnly || Number(objectiveType.boardQuestionCount || 0) > 0).length > 0 ? (
          <div className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:mt-6 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {objectiveTypes.filter((objectiveType) => !boardOnly || Number(objectiveType.boardQuestionCount || 0) > 0).map((objectiveType) => {
                const option = objectiveOptions.find((item) => item.type === objectiveType.type)
                const totalQuestions = Number(boardOnly ? objectiveType.boardQuestionCount || 0 : objectiveType.questionCount || objectiveType.bestScore?.totalQuestions || 0)
                const attemptedQuestions = Math.min(
                  Number(boardOnly ? objectiveType.boardCorrectQuestions || 0 : objectiveType.bestScore?.attemptedQuestions ?? (objectiveType.bestScore?.isDone && objectiveType.bestScore?.totalQuestions >= totalQuestions ? totalQuestions : 0)),
                  totalQuestions,
                )
                const savedQuestionTotal = Number(boardOnly ? objectiveType.boardQuestionCount || 0 : objectiveType.bestScore?.totalQuestions || 0)
                const progressPercentage = totalQuestions ? Math.round((attemptedQuestions / totalQuestions) * 100) : 0
                const isDone = totalQuestions > 0
                  && savedQuestionTotal >= totalQuestions
                  && attemptedQuestions >= totalQuestions

                return (
                  <article key={objectiveType._id} className="group relative rounded-[1.25rem] border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_14px_32px_rgba(8,145,178,0.1)] sm:p-4">
                    {isAdmin && (
                      <button type="button" onClick={() => deleteObjectiveType(objectiveType)} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-700" aria-label="Delete objective type">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <Link to={`/chapters/${chapterNumber}/topics/${topicId}/objectives/${objectiveType.type}${boardOnly ? '?boardOnly=1' : ''}`} className={`flex h-full flex-col gap-4 ${isAdmin ? 'pr-14' : ''}`}>
                      <div className="flex min-w-0 items-start gap-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700 transition group-hover:bg-cyan-100 sm:h-11 sm:w-11">
                          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-base font-black leading-snug tracking-tight text-stone-900 sm:text-lg lg:text-xl">{option?.label || objectiveType.type}</h2>
                          <p className="mt-1.5 text-xs leading-5 text-stone-500 sm:mt-2 sm:text-sm sm:leading-6">{option?.description || 'Open this objective section.'}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-500 sm:px-2.5 sm:text-[10px] sm:tracking-[0.1em]">
                              {boardOnly ? objectiveType.boardQuestionCount || 0 : objectiveType.questionCount || 0} {boardOnly ? 'Board Questions' : 'Total Questions'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!isAdmin && (
                        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wide text-cyan-700 sm:text-[11px]">
                            <span>Progress</span>
                            <span>{attemptedQuestions}/{totalQuestions} attempted</span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                            <div className={`h-full rounded-full transition-all duration-700 ${isDone ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${progressPercentage}%` }} />
                          </div>
                        </div>
                      )}
                      <span className="mt-auto flex w-full shrink-0 flex-col items-center gap-1.5">
                        <span className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-white transition sm:min-h-11 sm:px-4 sm:text-sm ${isDone ? 'bg-[#2f7541] group-hover:bg-[#285f36]' : 'bg-cyan-700 group-hover:bg-cyan-800'}`}>
                          Start Practice
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                        {isDone && <span className="text-[10px] font-black uppercase tracking-widest text-[#2f7541]">Completed</span>}
                      </span>
                    </Link>
                  </article>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center sm:p-16">
            <span className="font-serif text-2xl italic text-stone-300">No objective types</span>
            <p className="mt-2 text-sm text-stone-500">{isAdmin ? 'Add objective types for this topic.' : 'Objective types are not added for this topic yet.'}</p>
          </div>
        )}

        {isAdmin && availableOptions.length > 0 && (
          <div className="mt-8 rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:mt-10 sm:p-5">
            <h2 className="font-serif text-2xl text-stone-950">Add objective type</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableOptions.map((option) => (
                <button key={option.type} type="button" disabled={isSaving} onClick={() => addObjectiveType(option.type)} className="flex min-h-24 items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-900 text-white"><Plus className="h-4 w-4" /></span>
                  <span><span className="block font-bold text-stone-900">{option.label}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{option.description}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Objectivepage
