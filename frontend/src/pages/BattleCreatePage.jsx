import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { saveBattleSession } from '../lib/battleSession'

const battleQuestionCounts = [10, 15, 20, 25]
const battleTimeLimits = [10, 15]
const battleObjectiveTypes = [
  { value: 'mcqs', label: 'MCQs', description: 'Classic multiple-choice battle questions.' },
  { value: 'true-or-false', label: 'True or False', description: 'Fast, decisive statement checks.' },
  { value: 'correlation', label: 'Correlations', description: 'Match the best relationship quickly.' },
]
const battleDifficultyOptions = [
  { value: 'easy', label: 'Easy', description: 'Faster pace, lighter pressure.' },
  { value: 'medium', label: 'Medium', description: 'Balanced battle rhythm.' },
  { value: 'hard', label: 'Hard', description: 'Sharper timing and tighter scoring.' },
]
const battleSteps = [
  { key: 'room', number: '1', title: 'Room name' },
  { key: 'questions', number: '2', title: 'Questions' },
  { key: 'time', number: '3', title: 'Time / question' },
  { key: 'settings', number: '4', title: 'Battle settings' },
]

const toggleValue = (items, value) => (items.includes(value) ? items.filter((item) => item !== value) : [...items, value])

const BattleCreatePage = () => {
  const navigate = useNavigate()
  const auth = getStoredAuth()
  const [chapters, setChapters] = useState([])
  const [selectedChapterIds, setSelectedChapterIds] = useState([])
  const [selectedObjectiveTypes, setSelectedObjectiveTypes] = useState(['mcqs', 'true-or-false', 'correlation'])
  const [settings, setSettings] = useState({
    roomName: '',
    questionsCount: 10,
    timeLimitSeconds: 10,
    difficulty: 'medium',
    emojiReactions: true,
    roomChat: true,
  })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingChapters, setLoadingChapters] = useState(true)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadChapters = async () => {
      setLoadingChapters(true)
      try {
        const data = await apiRequest('/api/chapters')
        if (!cancelled) {
          const availableChapters = Array.isArray(data.chapters) ? data.chapters : []
          setChapters(availableChapters)
          setSelectedChapterIds([])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoadingChapters(false)
        }
      }
    }

    loadChapters()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!auth?.token) {
      navigate('/signin')
    }
  }, [auth?.token, navigate])

  const createRoom = async () => {
    setCreating(true)
    setError('')

    try {
      if (!settings.roomName.trim()) {
        throw new Error('Room name is required.')
      }

      if (!selectedChapterIds.length) {
        throw new Error('Pick at least one chapter.')
      }

      if (!selectedObjectiveTypes.length) {
        throw new Error('Pick at least one objective type.')
      }

      const data = await apiRequest('/api/battle-mode/rooms', {
        method: 'POST',
        body: JSON.stringify({
          roomName: settings.roomName,
          chapterIds: selectedChapterIds,
          objectiveTypes: selectedObjectiveTypes,
          questionsCount: Number(settings.questionsCount),
          timeLimitSeconds: Number(settings.timeLimitSeconds),
          difficulty: settings.difficulty,
          emojiReactions: settings.emojiReactions,
          roomChat: settings.roomChat,
        }),
      })

      const room = data.room
      saveBattleSession({
        roomCode: room.code,
        roomId: room.id,
        status: room.status,
        route: 'lobby',
      })
      navigate(`/battle-mode/room/${room.code}/lobby`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handlePrimaryAction = async (event) => {
    event.preventDefault()

    if (step === 0) {
      if (!settings.roomName.trim()) {
        setError('Room name is required.')
        return
      }
      setError('')
      setStep(1)
      return
    }

    if (step === 1 && !selectedChapterIds.length) {
      setError('Pick at least one chapter.')
      return
    }

    if (step === 2 && !selectedObjectiveTypes.length) {
      setError('Pick at least one objective type.')
      return
    }

    if (step < 5) {
      setError('')
      setStep((current) => current + 1)
      return
    }

    await createRoom()
  }

  const handleBack = () => {
    setError('')
    setStep((current) => Math.max(0, current - 1))
  }

  if (!auth?.token) {
    return null
  }

  return (
    <section className="battle-create-shell h-screen overflow-hidden px-3 py-4 text-slate-950 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl items-center">
        <form
          onSubmit={handlePrimaryAction}
          className="battle-create-form w-full rounded-[2rem] border border-orange-100 bg-white/95 p-5 shadow-[0_24px_90px_rgba(255,105,0,0.1)] backdrop-blur-xl sm:p-6 lg:p-8"
        >
          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22 }}>
                {step === 0 && <div className="battle-create-step"><StepTitle title="Name your room" subtitle="Give your battle a name your squad will recognize." /><label className="grid gap-2 text-sm font-bold text-slate-600">Room name<input autoFocus value={settings.roomName} onChange={(event) => setSettings((current) => ({ ...current, roomName: event.target.value }))} className="h-14 rounded-2xl border border-orange-100 bg-orange-50/40 px-4 text-base font-bold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" placeholder="Brain Blitz" /></label></div>}
                {step === 1 && <div className="battle-create-step"><StepTitle title="Choose your chapters" subtitle="Pick the science chapters for this battle." /><SelectorGroup title="Chapters" subtitle="Select at least one chapter." count={selectedChapterIds.length} actionLabel="Clear" onAction={() => setSelectedChapterIds([])}>{loadingChapters ? <div className="rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-700">Loading chapters...</div> : <div className="grid max-h-[45vh] gap-2 overflow-y-auto sm:grid-cols-2">{chapters.map((chapter) => { const checked = selectedChapterIds.includes(String(chapter._id)); return <button key={chapter._id} type="button" onClick={() => setSelectedChapterIds((current) => toggleValue(current, String(chapter._id)))} className={`rounded-2xl border px-4 py-3 text-left transition ${checked ? 'border-orange-300 bg-orange-50 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-orange-50/40'}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-black">{chapter.name}</span>{checked && <Check className="h-4 w-4 text-orange-600" />}</div><span className="mt-1 block text-xs text-slate-500">Chapter {chapter.number}</span></button> })}</div>}</SelectorGroup></div>}
                {step === 2 && <div className="battle-create-step"><StepTitle title="Choose objective types" subtitle="Pick the question styles your arena will use." /><SelectorGroup title="Objective types" subtitle="Select at least one type." count={selectedObjectiveTypes.length} actionLabel="Select all" onAction={() => setSelectedObjectiveTypes(battleObjectiveTypes.map((item) => item.value))}><div className="grid gap-3">{battleObjectiveTypes.map((objective) => { const checked = selectedObjectiveTypes.includes(objective.value); return <button key={objective.value} type="button" onClick={() => setSelectedObjectiveTypes((current) => toggleValue(current, objective.value))} className={`rounded-3xl border p-4 text-left transition ${checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-orange-50/40'}`}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-[.16em]">{objective.label}</p><p className="mt-1 text-xs text-slate-500">{objective.description}</p></div>{checked ? <Check className="h-5 w-5 text-orange-600" /> : <span className="h-5 w-5 rounded-full border border-slate-300" />}</div></button> })}</div></SelectorGroup></div>}
                {step === 3 && <div className="battle-create-step"><StepTitle title="Choose question count" subtitle="Set the length of your live science battle." /><ChoiceGroup label="Questions" subtitle="Pick how many questions should be in the battle." value={settings.questionsCount} options={battleQuestionCounts} onPick={(value) => setSettings((current) => ({ ...current, questionsCount: value }))} /></div>}
                {step === 4 && <div className="battle-create-step"><StepTitle title="Set the battle pace" subtitle="Choose how many seconds players get per question." /><ChoiceGroup label="Time / question" subtitle="Pick the response time for every question." value={settings.timeLimitSeconds} options={battleTimeLimits} suffix="s" onPick={(value) => setSettings((current) => ({ ...current, timeLimitSeconds: value }))} /></div>}
                {step === 5 && <div className="battle-create-step grid gap-5"><StepTitle title="Make it your arena" subtitle="Choose your difficulty and battle controls." /><div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">Difficulty level</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{battleDifficultyOptions.map((option) => { const selected = settings.difficulty === option.value; return <button key={option.value} type="button" onClick={() => setSettings((current) => ({ ...current, difficulty: option.value }))} className={`rounded-3xl border p-4 text-left transition ${selected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-orange-50/40'}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">{option.label}</span>{selected ? <Check className="h-4 w-4 text-orange-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}</div><p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p></button> })}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Toggle label="Emoji reactions" checked={settings.emojiReactions} onChange={(checked) => setSettings((current) => ({ ...current, emojiReactions: checked }))} /><Toggle label="Room chat" checked={settings.roomChat} onChange={(checked) => setSettings((current) => ({ ...current, roomChat: checked }))} /></div></div></div>}
              </motion.div>
            </AnimatePresence>
            {false && (<>
            {step === 0 && (
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-bold text-slate-600">
                  Room name
                  <input
                    value={settings.roomName}
                    onChange={(event) => setSettings((current) => ({ ...current, roomName: event.target.value }))}
                    className="h-12 rounded-2xl border border-orange-100 bg-orange-50/40 px-4 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    placeholder="Brain Blitz"
                  />
                </label>

                <ChoiceGroup
                  label="Questions"
                  subtitle="Pick how many questions should be in the battle."
                  value={settings.questionsCount}
                  options={battleQuestionCounts}
                  onPick={(value) => setSettings((current) => ({ ...current, questionsCount: value }))}
                />

                <ChoiceGroup
                  label="Time / question"
                  subtitle="Pick how many seconds players get per question."
                  value={settings.timeLimitSeconds}
                  options={battleTimeLimits}
                  suffix="s"
                  onPick={(value) => setSettings((current) => ({ ...current, timeLimitSeconds: value }))}
                />

                <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Battle extras</p>
                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {battleDifficultyOptions.map((option) => {
                        const selected = settings.difficulty === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSettings((current) => ({ ...current, difficulty: option.value }))}
                            className={`rounded-3xl border p-4 text-left transition ${
                              selected ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-orange-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">{option.label}</span>
                              {selected ? <Check className="h-4 w-4 text-orange-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p>
                          </button>
                        )
                      })}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Toggle
                        label="Emoji reactions"
                        checked={settings.emojiReactions}
                        onChange={(checked) => setSettings((current) => ({ ...current, emojiReactions: checked }))}
                      />
                      <Toggle
                        label="Room chat"
                        checked={settings.roomChat}
                        onChange={(checked) => setSettings((current) => ({ ...current, roomChat: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="mt-5">
                <SelectorGroup
                  title="Chapters"
                  subtitle="Pick at least one chapter."
                  count={selectedChapterIds.length}
                  actionLabel="Clear"
                  onAction={() => setSelectedChapterIds([])}
                >
                  {loadingChapters ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Loading chapters...
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {chapters.map((chapter) => {
                        const checked = selectedChapterIds.includes(String(chapter._id))
                        return (
                          <button
                            key={chapter._id}
                            type="button"
                            onClick={() => setSelectedChapterIds((current) => toggleValue(current, String(chapter._id)))}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              checked ? 'border-orange-300 bg-orange-50 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-orange-50/40'
                            }`}
                          >
                            <p className="text-sm font-black">{chapter.name}</p>
                            <p className="mt-1 text-xs text-slate-500">Chapter {chapter.number}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </SelectorGroup>
              </div>
            )}

            {step === 2 && (
              <div className="mt-5">
                <SelectorGroup
                  title="Objectives"
                  subtitle="Choose which battle question styles to include."
                  count={selectedObjectiveTypes.length}
                  actionLabel="Default all"
                  onAction={() => setSelectedObjectiveTypes(['mcqs', 'true-or-false', 'correlation'])}
                >
                  <div className="grid gap-3">
                    {battleObjectiveTypes.map((objective) => {
                      const checked = selectedObjectiveTypes.includes(objective.value)

                      return (
                        <button
                          key={objective.value}
                          type="button"
                          onClick={() => setSelectedObjectiveTypes((current) => toggleValue(current, objective.value))}
                          className={`rounded-3xl border p-4 text-left transition ${
                              checked ? 'border-orange-300 bg-orange-50 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-orange-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black uppercase tracking-[0.18em]">{objective.label}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{objective.description}</p>
                            </div>
                            {checked ? <Check className="h-4 w-4 text-orange-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </SelectorGroup>
              </div>
            )}
            </>)}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0 || creating}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="submit"
              disabled={creating}
              className="battle-create-cta inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step < 5 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : creating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creating room...
                </>
              ) : (
                <>
                  Create Battle Room
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

const StepTitle = ({ title, subtitle }) => (
  <div className="mb-5 text-center sm:text-left">
    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Battle setup</p>
    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
  </div>
)

const ChoiceGroup = ({ label, subtitle, value, options, suffix = '', onPick }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-slate-950">{label}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
        {value}
        {suffix}
      </span>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-4">
      {options.map((option) => {
        const selected = value === option

        return (
          <button
            key={option}
            type="button"
            onClick={() => onPick(option)}
            className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
              selected ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-slate-200 bg-orange-50/30 text-slate-700 hover:bg-orange-50'
            }`}
          >
            {option}
            {suffix}
          </button>
        )
      })}
    </div>
  </div>
)

const Toggle = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-center justify-between gap-3 rounded-3xl border p-4 text-left transition ${
      checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white'
    }`}
  >
    <div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{checked ? 'Enabled' : 'Disabled'}</p>
    </div>
    <div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${checked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
      {checked ? 'ON' : 'OFF'}
    </div>
  </button>
)

const SelectorGroup = ({ title, subtitle, count, actionLabel, onAction, children }) => (
  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.22em] text-slate-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
          {count}
        </span>
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className="text-xs font-bold text-orange-700 transition hover:text-orange-600">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </div>
)

export default BattleCreatePage
