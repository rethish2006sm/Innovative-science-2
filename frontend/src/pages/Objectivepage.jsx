import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, FlaskConical, Plus, Trash2 } from 'lucide-react'
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
      setTopic(data.topic)
      setChapter(data.chapter)
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
    <section className="min-h-[calc(100vh-6rem)] bg-[#fbfbfa] px-4 py-10 text-stone-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to={`/chapters/${chapterNumber}/topics`} className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-500 transition hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" />
          Back to topics
        </Link>

        <div className="mt-6 border-b border-stone-200 pb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-stone-400">
            Chapter {chapter?.number?.toString().padStart(2, '0')} / Topic {topic.number?.toString().padStart(2, '0')}
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-stone-950 sm:text-5xl">
            {topic.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">
            Select an objective type to open its practice page.
          </p>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Mixed test option</p>
              <p className="mt-1 text-sm leading-6 text-cyan-950/80">
                Pick one or more chapters, mix the question types, and create a 1-mark test from the builder.
              </p>
            </div>
            <Link to="/test-builder" className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-700 px-5 text-sm font-bold text-white transition hover:bg-cyan-800">
              <FlaskConical className="h-4 w-4" />
              Create test
            </Link>
          </div>
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
              {error}
            </p>
          )}
        </div>

        {objectiveTypes.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {objectiveTypes.map((objectiveType) => {
              const option = objectiveOptions.find((item) => item.type === objectiveType.type)
              const bestMarks = Number(objectiveType.bestScore?.bestScore || 0)
              const totalMarks = Number(objectiveType.bestScore?.totalQuestions || objectiveType.questionCount || 0)
              const percentage = totalMarks ? Math.round((bestMarks / totalMarks) * 100) : 0
              const hasPracticeScore = Boolean(objectiveType.bestScore)
              const isDone = Boolean(objectiveType.isDone || objectiveType.bestScore?.isDone)
              const isDoneOnlyType = objectiveType.type === 'complete-the-tables'

              return (
                <article key={objectiveType._id} className="group relative rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-stone-400 hover:shadow-lg">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => deleteObjectiveType(objectiveType)}
                      className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                      aria-label="Delete objective type"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <Link to={`/chapters/${chapterNumber}/topics/${topicId}/objectives/${objectiveType.type}`} className={`grid gap-4 ${!isAdmin ? 'sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center' : 'pr-14'}`}>
                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone-900 text-white">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-bold text-stone-900 sm:text-xl">
                            {option?.label || objectiveType.type}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-stone-500">
                            {option?.description || 'Open this objective section.'}
                          </p>
                          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-600">
                            <span className="text-stone-950">{objectiveType.questionCount || 0}</span>
                            Total Questions
                          </div>
                          {isDone && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Done
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isAdmin && isDoneOnlyType ? (
                      <div className={`rounded-2xl border p-4 ${isDone ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                        <p className={`text-[11px] font-black uppercase tracking-wide ${isDone ? 'text-emerald-700' : 'text-amber-700'}`}>
                          Status
                        </p>
                        <p className={`mt-2 text-2xl font-black ${isDone ? 'text-emerald-950' : 'text-amber-950'}`}>
                          {isDone ? 'Done' : 'Pending'}
                        </p>
                      </div>
                    ) : !isAdmin && (
                      <div className={`rounded-2xl border p-4 ${hasPracticeScore ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <div>
                            <p className={`text-[11px] font-black uppercase tracking-wide ${hasPracticeScore ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {hasPracticeScore ? 'Your best marks' : 'Practice not attempted'}
                            </p>
                            <p className={`mt-1 text-2xl font-black leading-none ${hasPracticeScore ? 'text-emerald-950' : 'text-amber-950'}`}>
                              {bestMarks}/{totalMarks}
                            </p>
                          </div>
                          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-base font-black ${hasPracticeScore ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
                            {percentage}%
                          </div>
                        </div>
                        <div className={`mt-3 h-2 overflow-hidden rounded-full ${hasPracticeScore ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                          <div
                            className={`h-full rounded-full transition-all ${hasPracticeScore ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center">
            <span className="font-serif text-2xl italic text-stone-300">No objective types</span>
            <p className="mt-2 text-sm text-stone-500">
              {isAdmin ? 'Add objective types for this topic.' : 'Objective types are not added for this topic yet.'}
            </p>
          </div>
        )}

        {isAdmin && availableOptions.length > 0 && (
          <div className="mt-10">
            <h2 className="font-serif text-2xl text-stone-950">Add objective type</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  disabled={isSaving}
                  onClick={() => addObjectiveType(option.type)}
                  className="flex min-h-24 items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-900 text-white">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-bold text-stone-900">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">{option.description}</span>
                  </span>
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
