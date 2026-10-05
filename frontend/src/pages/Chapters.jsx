import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Edit3, Plus, Trash2, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const emptyForm = { number: '', name: '', marks: '', marksWithoutOption: '' }

const ChapterCard = ({ chapter, index, isAdmin, onEdit, onDelete }) => {
  const navigate = useNavigate()
  const marks = Number(chapter.marks) || 0
  const marksWithoutOption = Number(chapter.marksWithoutOption) || 0
  const progressPercentage = Math.min(Math.max(Number(chapter.progress?.percentage || 0), 0), 100)
  const correctQuestions = Number(chapter.progress?.correctQuestions || 0)
  const totalQuestions = Number(chapter.progress?.totalQuestions || 0)
  const theme =
    marks >= 9
      ? { bg: 'bg-orange-50/60', text: 'text-orange-950', border: 'border-orange-200/50', bar: 'bg-orange-700' }
      : marks >= 7
        ? { bg: 'bg-teal-50/60', text: 'text-teal-950', border: 'border-teal-200/50', bar: 'bg-teal-700' }
        : { bg: 'bg-stone-100/70', text: 'text-stone-900', border: 'border-stone-200/60', bar: 'bg-stone-600' }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/chapters/${chapter.number}/topics`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          navigate(`/chapters/${chapter.number}/topics`)
        }
      }}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_14px_32px_rgba(8,145,178,0.1)] sm:p-4"
      style={{
        animation: `editorialReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s forwards`,
        opacity: 0,
      }}
    >
      {isAdmin && (
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/chapters/${chapter.number}/theory-questions`)
            }}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-cyan-700 px-3 text-xs font-black text-white shadow-sm transition hover:bg-cyan-800"
          >
            <Plus className="h-4 w-4" /> Theory question
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(chapter)
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-100 hover:text-stone-950"
            aria-label="Edit chapter"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(chapter)
            }}
            className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-700"
            aria-label="Delete chapter"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div>
        <div className="pr-20">
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-cyan-50 px-3 font-mono text-xs font-black text-cyan-700 transition group-hover:bg-cyan-100 sm:h-11 sm:min-w-11">
            {chapter.number}
          </span>
          <div className="min-w-0">
            <h3 className="mt-3 text-base font-black leading-snug tracking-tight text-stone-900 transition-colors group-hover:text-black sm:text-lg lg:text-xl">
              {chapter.name}
            </h3>
            <div className="mt-3 flex items-center gap-2 whitespace-nowrap">
              <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] ${theme.bg} ${theme.text} ${theme.border}`}>
                {marks} with option
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500">
                {marksWithoutOption} without option
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wide text-cyan-700 sm:text-[11px]">
          <span>Progress</span>
          <span>{correctQuestions}/{totalQuestions} correct</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
          <div className={`h-full rounded-full transition-all duration-700 ${chapter.progress?.isDone ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${progressPercentage}%` }} />
        </div>
        <span className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-3 text-xs font-bold text-white transition group-hover:bg-cyan-800 sm:min-h-11 sm:px-4 sm:text-sm">
          Open Topics
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  )
}

const Chapters = () => {
  const navigate = useNavigate()
  const [chapters, setChapters] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)

  const loadChapters = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest('/api/chapters', { cache: 'no-store' })
      const nextChapters = Array.isArray(data.chapters) ? data.chapters : []
      const normalizedChapters = nextChapters.map((chapter) => ({
        ...(chapter || {}),
        sourceName: chapter.name || '',
        name: chapter.name || '',
      }))

      setChapters(normalizedChapters)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadChapters()

    const refreshChapters = () => {
      if (document.visibilityState === 'visible') {
        loadChapters()
      }
    }

    window.addEventListener('focus', refreshChapters)
    document.addEventListener('visibilitychange', refreshChapters)
    window.addEventListener('innovative-science-progress-updated', refreshChapters)

    return () => {
      window.removeEventListener('focus', refreshChapters)
      document.removeEventListener('visibilitychange', refreshChapters)
      window.removeEventListener('innovative-science-progress-updated', refreshChapters)
    }
  }, [])

  const filteredChapters = chapters

  const totalMarks = filteredChapters.reduce((sum, chapter) => sum + Number(chapter.marks || 0), 0)

  const openAddModal = () => {
    setEditingChapter(null)
    setForm(emptyForm)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (chapter) => {
    setEditingChapter(chapter)
    setForm({
      number: chapter.number,
      name: chapter.name,
      marks: chapter.marks,
      marksWithoutOption: chapter.marksWithoutOption || '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const saveChapter = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const path = editingChapter ? `/api/chapters/${editingChapter._id}` : '/api/chapters'
      const method = editingChapter ? 'PATCH' : 'POST'
      await apiRequest(path, {
        method,
        body: JSON.stringify(form),
      })
      setIsModalOpen(false)
      await loadChapters()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteChapter = async (chapter) => {
    const shouldDelete = window.confirm(`Delete chapter "${chapter.name}" and all its topics?`)

    if (!shouldDelete) return

    setError('')
    try {
      await apiRequest(`/api/chapters/${chapter._id}`, { method: 'DELETE' })
      await loadChapters()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="min-h-[calc(100vh-6rem)] w-full bg-[#fbfbfa] px-4 py-2 font-sans text-stone-800 antialiased selection:bg-stone-200 sm:px-6 sm:py-5 lg:px-10">
      <div className="mx-auto w-full max-w-none">
        <div className="mt-0 border-b border-stone-200 pb-5 sm:mt-2 sm:pb-6">
          <button
            type="button"
            // Chapters is the top of the learning hierarchy. Always return
            // to Home instead of depending on whichever page opened it.
            onClick={() => navigate('/')}
            className="group mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-[0_6px_16px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-x-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-[0_8px_20px_rgba(8,145,178,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2"
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-stone-400">Curriculum blueprint</p>
              <h1 className="mt-2 font-serif text-3xl tracking-tight text-stone-950 sm:text-4xl lg:text-5xl">Chapters</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">Choose a chapter to continue to its topics.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-500">
              <span className="rounded-full border border-stone-200 bg-white px-3 py-2">{filteredChapters.length} Chapters</span>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-2">{totalMarks} Marks</span>
              {isAdmin && (
                <button type="button" onClick={openAddModal} className="inline-flex h-10 items-center gap-2 rounded-xl bg-stone-900 px-4 text-white transition hover:bg-black">
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>
          </div>
          {error && !isModalOpen && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">{error}</p>}
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white/70 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:mt-6 sm:p-4">
          {isLoading ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">Loading chapters...</div>
          ) : filteredChapters.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredChapters.map((chapter, idx) => (
                <ChapterCard key={chapter._id} chapter={chapter} index={idx} isAdmin={isAdmin} onEdit={openEditModal} onDelete={deleteChapter} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center sm:p-16">
              <span className="font-serif text-2xl italic text-stone-300">No chapters</span>
              <p className="mt-2 text-sm text-stone-500">No chapters are saved in the database yet.</p>
              {isAdmin && <button onClick={openAddModal} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 font-bold text-white" type="button"><Plus className="h-4 w-4" />Add first chapter</button>}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <form onSubmit={saveChapter} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-3xl text-stone-950">{editingChapter ? 'Edit chapter' : 'Add chapter'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <Field label="Chapter number" type="number" value={form.number} onChange={(value) => setForm({ ...form, number: value })} />
              <Field label="Chapter name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="Weightage with option" type="number" value={form.marks} onChange={(value) => setForm({ ...form, marks: value })} />
              <Field label="Weightage without option" type="number" value={form.marksWithoutOption} onChange={(value) => setForm({ ...form, marksWithoutOption: value })} />
            </div>

            {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">{error}</p>}

            <button type="submit" disabled={isSaving} className="mt-6 h-12 w-full rounded-2xl bg-stone-900 font-bold text-white disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save chapter'}
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes editorialReveal {
          0% { opacity: 0; transform: translateY(25px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
        }
      `}</style>
    </section>
  )
}

const Field = ({ label, value, onChange, type = 'text' }) => (
  <label className="grid gap-2 text-sm font-bold text-stone-600">
    {label}
    <input
      type={type}
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
    />
  </label>
)

export default Chapters
