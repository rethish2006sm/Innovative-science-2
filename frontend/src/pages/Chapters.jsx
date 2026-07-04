import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const emptyForm = { number: '', name: '', marks: '', marksWithoutOption: '' }

const ChapterCard = ({ chapter, index, isAdmin, onEdit, onDelete }) => {
  const navigate = useNavigate()
  const marks = Number(chapter.marks) || 0
  const marksWithoutOption = Number(chapter.marksWithoutOption) || 0
  const weightPercentage = Math.min(marks * 10, 100)
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
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-stone-400 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] sm:p-7"
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
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 pr-24">
          <span className="font-mono text-xs font-bold tracking-widest text-stone-400">
            [{chapter.number.toString().padStart(2, '0')}]
          </span>
          <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-tight ${theme.bg} ${theme.text} ${theme.border}`}>
            {chapter.marks} marks
          </span>
        </div>
        <h3 className="mt-6 font-serif text-lg font-medium leading-snug tracking-tight text-stone-800 transition-colors duration-300 group-hover:text-black sm:text-xl lg:text-2xl">
          {chapter.name}
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-stone-600">
          <span className="rounded-lg bg-stone-50 px-2.5 py-2">With option: {marks}</span>
          <span className="rounded-lg bg-stone-50 px-2.5 py-2">Without option: {marksWithoutOption}</span>
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-stone-400">
          <span>Weightage in Percent</span>
          <span className="font-bold text-stone-600">{weightPercentage}%</span>
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-stone-100">
          <div className={`h-full rounded-full transition-all duration-1000 ease-out group-hover:opacity-80 ${theme.bar}`} style={{ width: `${weightPercentage}%` }} />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-stone-400 transition-colors group-hover:text-stone-700">
          Open topics
        </p>
      </div>
    </article>
  )
}

const Chapters = () => {
  const [chapters, setChapters] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
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
    try {
      const data = await apiRequest('/api/chapters')
      const nextChapters = Array.isArray(data.chapters) ? data.chapters : []
      setChapters(nextChapters.map((chapter) => ({
        ...(chapter || {}),
        sourceName: chapter.name || '',
        name: chapter.name || '',
      })))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadChapters()
  }, [])

  const filteredChapters = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return chapters

    return chapters.filter(
      (chapter) =>
        chapter.name.toLowerCase().includes(query) ||
        chapter.number.toString().includes(query) ||
        chapter.marks.toString().includes(query) ||
        (chapter.marksWithoutOption || '').toString().includes(query),
    )
  }, [chapters, searchTerm])

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
    <section className="min-h-screen w-full bg-[#fbfbfa] font-sans text-stone-800 antialiased selection:bg-stone-200">
      <div className="fixed right-6 top-28 z-40 md:hidden">
        <div className={`flex h-12 items-center rounded-full border border-stone-200 bg-white shadow-xl transition-all duration-300 ease-out ${isMobileSearchOpen ? 'w-[calc(100vw-3rem)]' : 'w-12'}`}>
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-stone-600 transition-colors hover:text-stone-900"
            type="button"
          >
            {isMobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search chapters..."
            className={`h-full bg-transparent text-sm text-stone-800 outline-none transition-all duration-300 ${isMobileSearchOpen ? 'w-full px-4 opacity-100' : 'w-0 px-0 opacity-0'}`}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
          <div className="md:sticky md:top-32 md:col-span-4 md:self-start">
            <div className="inline-flex items-center gap-2 border-b border-stone-300 pb-2 font-mono text-xs uppercase tracking-widest text-stone-500">
              <span>Curriculum Blueprint</span>
              <span className="h-1 w-1 rounded-full bg-stone-400" />
              <span>SSC 2026</span>
            </div>

            <h1 className="mt-4 font-serif text-3xl font-normal tracking-tight text-stone-900 sm:text-4xl md:mt-6 lg:text-6xl">
              Syllabus <br className="hidden md:block" />Explorer
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500 md:mt-4">
              Chapters are loaded from the database. Admins can add and edit chapter names, numbers, marks with option, and marks without option.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-stone-200/80 py-4 md:mt-8 md:py-6">
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-wider text-stone-400">Chapters</span>
                <span className="font-serif text-2xl font-light text-stone-900 sm:text-3xl">{filteredChapters.length}</span>
              </div>
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-wider text-stone-400">Aggregate Marks</span>
                <span className="font-serif text-2xl font-light text-stone-900 sm:text-3xl">{totalMarks}</span>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-black"
              >
                <Plus className="h-5 w-5" />
                Add chapter
              </button>
            )}

            {error && !isModalOpen && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="md:col-span-8">
            <div className="mb-8 hidden md:block">
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-widest text-stone-400">Search Catalog</label>
              <div className="relative rounded-xl border border-stone-200 bg-white px-4 transition-all duration-300 focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-400">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Chapter number, name, marks..."
                  className="h-12 w-full bg-transparent pr-10 font-serif text-lg tracking-wide text-stone-800 placeholder-stone-300 outline-none"
                />
                {searchTerm ? (
                  <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900" type="button">
                    <X className="h-5 w-5" />
                  </button>
                ) : (
                  <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-300" />
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">Loading chapters...</div>
            ) : filteredChapters.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  {filteredChapters.map((chapter, idx) => (
                    <ChapterCard
                      key={chapter._id}
                      chapter={chapter}
                      index={idx}
                      isAdmin={isAdmin}
                      onEdit={openEditModal}
                      onDelete={deleteChapter}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 p-12 text-center sm:p-16">
                <span className="font-serif text-2xl italic text-stone-300">No chapters</span>
                <p className="mt-2 text-sm text-stone-500">
                  {searchTerm ? `Chapter not found "${searchTerm}".` : 'No chapters are saved in the database yet.'}
                </p>
                {isAdmin && (
                  <button
                    onClick={openAddModal}
                    className="mt-6 inline-flex items-center gap-2 border border-stone-800 bg-stone-900 px-5 py-2 font-mono text-xs uppercase tracking-widest text-white transition-all hover:bg-transparent hover:text-stone-900"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Add first chapter
                  </button>
                )}
              </div>
            )}
          </div>
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
