import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Brain, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react'
import { apiRequest } from '../api'

const Improvementpage = () => {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest('/api/progress/improvement')
        setProgress(data.progress || null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const summaryCards = useMemo(() => {
    if (!progress) return []

    return [
      { label: 'Total brain cells', value: progress.totalBrainCells || 0, tone: 'emerald' },
      { label: 'Average marks', value: `${progress.averagePercent || 0}%`, tone: 'cyan' },
      { label: 'Attempts saved', value: progress.attemptCount || 0, tone: 'slate' },
    ]
  }, [progress])

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_55%,#ecfeff_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                <TrendingUp className="h-3.5 w-3.5" />
                Improvement page
              </div>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                See what got stronger and what still needs work.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                The latest scores are saved chapter by chapter. This page highlights the most recent result, average marks, weak concepts, and the next action steps.
              </p>
            </div>

            <Link to="/test-builder" className="inline-flex h-12 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-black">
              Build a new test
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
              Loading improvement report...
            </div>
          ) : error ? (
            <div className="mt-8 rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : progress ? (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {summaryCards.map((card) => (
                  <article
                    key={card.label}
                    className={`rounded-3xl border p-5 ${card.tone === 'emerald' ? 'border-emerald-100 bg-emerald-50' : card.tone === 'cyan' ? 'border-cyan-100 bg-cyan-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <p className={`text-xs font-black uppercase tracking-[0.22em] ${card.tone === 'emerald' ? 'text-emerald-700' : card.tone === 'cyan' ? 'text-cyan-700' : 'text-slate-400'}`}>
                      {card.label}
                    </p>
                    <p className={`mt-2 text-4xl font-black ${card.tone === 'emerald' ? 'text-emerald-950' : card.tone === 'cyan' ? 'text-cyan-950' : 'text-slate-950'}`}>
                      {card.value}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-8 grid gap-4">
                {(progress.chapterReports || []).map((chapter) => (
                  <article key={chapter.chapterId} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                          Chapter {chapter.chapterNumber}
                        </p>
                        <h2 className="mt-2 font-serif text-3xl text-slate-950">
                          {chapter.chapterName}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                          Latest attempt: {chapter.latestScore}/{chapter.latestTotalQuestions} marks.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                        <MiniStat label="Latest score" value={`${chapter.latestScore}/${chapter.latestTotalQuestions}`} />
                        <MiniStat label="Average" value={`${chapter.bestPercent || chapter.latestPercent || 0}%`} />
                        <MiniStat label="Brain cells" value={chapter.latestBrainCells || 0} />
                      </div>
                    </div>

                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-500 transition-all duration-700"
                        style={{ width: `${chapter.latestPercent || 0}%` }}
                      />
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Weak concepts</p>
                        <div className="mt-3 grid gap-2">
                          {(chapter.weakAreas || []).length ? chapter.weakAreas.map((area, index) => (
                            <p key={`${area}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                              {area}
                            </p>
                          )) : (
                            <p className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-500">
                              No weak areas saved yet.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Next steps</p>
                        <div className="mt-3 grid gap-2">
                          {(chapter.solutionSteps || []).length ? chapter.solutionSteps.map((step, index) => (
                            <div key={`${step}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                              {index + 1}. {step}
                            </div>
                          )) : (
                            <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-500">
                              Practice again to generate personalized steps.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {progress.chapterReports?.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                    <Brain className="mx-auto h-12 w-12 text-slate-400" />
                    <h2 className="mt-4 text-2xl font-black text-slate-950">No chapter progress yet</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      Finish a practice set or test and your chapter improvement report will appear here.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/profile" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  Profile report card
                </Link>
                <Link to="/leaderboard" className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-700">
                  Compare ranks
                  <Sparkles className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
              Start a test to build your improvement report.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const MiniStat = ({ label, value }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-4 text-right">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
  </div>
)

export default Improvementpage
