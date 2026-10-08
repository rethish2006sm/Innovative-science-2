import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Edit3, FileText, ImagePlus, Plus, Save, Shield, Trash2, Upload, X } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { getActiveScience, SCIENCE_CHANGED_EVENT, setActiveScience } from '../science'

const FALLBACK_MENUS = [
  { id: 'assignment', label: 'Assignment' },
  { id: 'practice-paper', label: 'Practice Paper' },
  { id: 'important-question', label: 'Important Question' },
  { id: 'chapter-marking', label: 'Chapter Wise Marking' },
  { id: 'notes', label: 'Notes' },
  { id: 'test-paper', label: 'Test Paper' },
]

const EMPTY_FORM = { chapterName: '', message: '', category: 'assignment', documentLink: '' }

const getChapterNumber = (post) => {
  const title = post?.chapterName || post?.message || ''
  const match = String(title).match(/\b(?:chp|chapter)\s*[-.:#]?\s*(\d+)/i)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

const AdminClassMaterialsPage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const [science, setScience] = useState(() => getActiveScience())
  const [classes, setClasses] = useState([])
  const [selectedClassIds, setSelectedClassIds] = useState([])
  const [previewClassId, setPreviewClassId] = useState('')
  const [categories, setCategories] = useState([])
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [photos, setPhotos] = useState([])
  const [pdf, setPdf] = useState(null)
  const [editingPostId, setEditingPostId] = useState('')
  const [newMenuName, setNewMenuName] = useState('')
  const [editingMenuId, setEditingMenuId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const menus = categories.length ? categories : FALLBACK_MENUS
  const selectedPreviewClass = classes.find((item) => String(item._id) === String(previewClassId))

  const loadClasses = useCallback(async () => {
    const data = await apiRequest('/api/admin/classes')
    const nextClasses = Array.isArray(data.classes) ? data.classes : []
    setClasses(nextClasses)
    setSelectedClassIds((current) => current.filter((id) => nextClasses.some((item) => String(item._id) === String(id))))
    setPreviewClassId((current) => current && nextClasses.some((item) => String(item._id) === String(current)) ? current : String(nextClasses[0]?._id || ''))
  }, [])

  const loadFeed = useCallback(async (classId) => {
    if (!classId) {
      setPosts([])
      setCategories([])
      return
    }

    const data = await apiRequest(`/api/classes/${classId}/feed?limit=all&category=all`)
    setPosts(Array.isArray(data.posts) ? data.posts : [])
    setCategories(Array.isArray(data.categories) ? data.categories : [])
  }, [])

  useEffect(() => {
    const syncScience = () => setScience(getActiveScience())
    window.addEventListener(SCIENCE_CHANGED_EVENT, syncScience)
    return () => window.removeEventListener(SCIENCE_CHANGED_EVENT, syncScience)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    loadClasses()
      .catch((err) => setError(err.message || 'Could not load classes.'))
      .finally(() => setLoading(false))
  }, [isAdmin, loadClasses])

  useEffect(() => {
    if (!isAdmin || !previewClassId) return
    loadFeed(previewClassId).catch((err) => setError(err.message || 'Could not load study materials.'))
  }, [isAdmin, loadFeed, previewClassId, science])

  const visiblePosts = useMemo(
    () => [...(categoryFilter === 'all' ? posts : posts.filter((post) => post.category === categoryFilter))].sort((a, b) => getChapterNumber(a) - getChapterNumber(b)),
    [categoryFilter, posts],
  )

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setPhotos([])
    setPdf(null)
    setEditingPostId('')
    setSelectedClassIds([])
  }

  const toggleClass = (classId) => {
    setSelectedClassIds((current) => current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId])
  }

  const saveMaterial = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedClassIds.length) {
      setError('Select at least one visible class.')
      return
    }

    if (!form.chapterName.trim() && !form.message.trim() && !form.documentLink.trim() && !photos.length && !pdf) {
      setError('Add a chapter name, message, document, photo, or PDF.')
      return
    }

    setSaving(true)
    try {
      const body = new FormData()
      body.append('chapterName', form.chapterName.trim())
      body.append('message', form.message)
      body.append('category', form.category)
      body.append('documentLink', form.documentLink.trim())
      body.append('classIds', JSON.stringify(selectedClassIds))
      body.append('classMessages', JSON.stringify(Object.fromEntries(selectedClassIds.map((id) => [id, form.message.trim()]))))
      photos.forEach((file) => body.append('photos', file))
      if (pdf) body.append('pdf', pdf)

      if (editingPostId) {
        body.append('classId', selectedClassIds[0])
        const data = await apiRequest(`/api/classes/${selectedClassIds[0]}/posts/${editingPostId}`, { method: 'PATCH', body })
        setPosts((current) => {
          const updated = Array.isArray(data.posts) && data.posts.length ? data.posts : data.post ? [data.post] : []
          return [...current.filter((post) => post.id !== editingPostId), ...updated]
        })
        setSuccess('Study material updated.')
      } else {
        const data = await apiRequest('/api/admin/class-board/posts', { method: 'POST', body })
        if (String(previewClassId) && selectedClassIds.includes(String(previewClassId))) {
          await loadFeed(previewClassId)
        } else if (data.posts?.length) {
          setPosts((current) => [...data.posts, ...current])
        }
        setSuccess('Study material uploaded.')
      }
      resetForm()
    } catch (err) {
      setError(err.message || 'Could not save study material.')
    } finally {
      setSaving(false)
    }
  }

  const editMaterial = (post) => {
    setEditingPostId(post.id)
    setForm({ chapterName: post.chapterName || '', message: post.message || '', category: post.category || 'assignment', documentLink: post.documentLink || '' })
    setSelectedClassIds([String(post.classId)])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteMaterial = async (post) => {
    if (!window.confirm('Delete this study material from the selected class?')) return
    try {
      await apiRequest(`/api/classes/${post.classId}/posts/${post.id}`, { method: 'DELETE' })
      setPosts((current) => current.filter((item) => item.id !== post.id))
      if (editingPostId === post.id) resetForm()
      setSuccess('Study material deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete study material.')
    }
  }

  const saveMenu = async () => {
    const name = newMenuName.trim()
    if (!name) return
    try {
      const editing = Boolean(editingMenuId)
      const data = await apiRequest(editing ? `/api/admin/class-board/categories/${editingMenuId}` : '/api/admin/class-board/categories', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ name }) })
      setCategories((current) => editing ? current.map((item) => item.categoryId === data.category.categoryId ? data.category : item) : [...current, data.category])
      setForm((current) => ({ ...current, category: data.category.id }))
      setNewMenuName('')
      setEditingMenuId('')
    } catch (err) {
      setError(err.message || 'Could not save menu.')
    }
  }

  const deleteMenu = async (menu) => {
    if (!menu.categoryId || !window.confirm(`Delete the “${menu.label}” menu?`)) return
    try {
      await apiRequest(`/api/admin/class-board/categories/${menu.categoryId}`, { method: 'DELETE' })
      setCategories((current) => current.filter((item) => item.categoryId !== menu.categoryId))
      setForm((current) => ({ ...current, category: 'assignment' }))
    } catch (err) {
      setError(err.message || 'Could not delete menu.')
    }
  }

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),#f8fafc] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-5 rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-200/50 backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-950"><ArrowLeft className="h-4 w-4" /> Back to admin</Link>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-700"><Shield className="h-3.5 w-3.5" /> Admin only</div>
            <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">Study materials</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Upload chapter materials to the correct menu and choose exactly which classes can see them.</p>
          </div>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Science
            <select value={science} onChange={(event) => setActiveScience(event.target.value)} className="h-11 rounded-xl border border-emerald-100 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400">
              <option value="science1">Science 1</option><option value="science2">Science 2</option>
            </select>
          </label>
        </header>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
          <form onSubmit={saveMaterial} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-7">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Upload className="h-5 w-5" /></div><div><h2 className="text-xl font-black text-slate-950">{editingPostId ? 'Edit material' : 'Upload material'}</h2><p className="text-sm text-slate-500">Chapter title and message are separate.</p></div></div>{editingPostId && <button type="button" onClick={resetForm} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>}</div>

            <label className="mt-6 grid gap-2 text-sm font-bold text-slate-600">Menu page<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none focus:border-emerald-400">{menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.label}</option>)}</select></label>
            <div className="mt-2 flex flex-wrap gap-2"><input value={newMenuName} onChange={(event) => setNewMenuName(event.target.value)} placeholder="New menu name" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400" /><button type="button" onClick={saveMenu} disabled={!newMenuName.trim()} className="inline-flex h-10 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> {editingMenuId ? 'Save' : 'Add'}</button>{categories.find((item) => item.id === form.category)?.categoryId && <><button type="button" onClick={() => { const menu = categories.find((item) => item.id === form.category); setEditingMenuId(menu.categoryId); setNewMenuName(menu.label) }} className="rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600">Edit</button><button type="button" onClick={() => deleteMenu(categories.find((item) => item.id === form.category))} className="rounded-xl border border-red-100 px-3 text-sm font-bold text-red-600">Delete</button></>}</div>

            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-600">Chapter name<input value={form.chapterName} onChange={(event) => setForm({ ...form, chapterName: event.target.value })} placeholder="e.g. CHAPTER 1 HEREDITY AND EVOLUTION" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none focus:border-emerald-400" /></label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-600">Base message<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={5} placeholder="Write the class message or instructions..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-400" /></label>
            <label className="mt-4 grid gap-2 text-sm font-bold text-slate-600">Document link<input type="url" value={form.documentLink} onChange={(event) => setForm({ ...form, documentLink: event.target.value })} placeholder="https://..." className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none focus:border-emerald-400" /></label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 hover:border-emerald-400"><ImagePlus className="h-5 w-5 text-emerald-600" /> Photos<input type="file" accept="image/*" multiple onChange={(event) => setPhotos(Array.from(event.target.files || []))} className="sr-only" /></label><label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 hover:border-emerald-400"><FileText className="h-5 w-5 text-rose-500" /> PDF<input type="file" accept="application/pdf" onChange={(event) => setPdf(event.target.files?.[0] || null)} className="sr-only" /></label></div>
            {(photos.length > 0 || pdf) && <p className="mt-2 text-xs font-semibold text-slate-500">{photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected` : ''}{photos.length && pdf ? ' · ' : ''}{pdf?.name || ''}</p>}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-slate-950">Visible classes</p><p className="text-xs text-slate-500">Choose where this material should appear.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">{selectedClassIds.length} selected</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{classes.map((item) => { const id = String(item._id); const checked = selectedClassIds.includes(id); return <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-bold transition ${checked ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700'}`}><input type="checkbox" checked={checked} onChange={() => toggleClass(id)} className="h-4 w-4 accent-emerald-600" />{item.name}{item.grade ? ` · ${item.grade}` : ''}</label> })}</div></div>
            <button type="submit" disabled={saving || loading} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{editingPostId ? <Save className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{saving ? 'Saving...' : editingPostId ? 'Save changes' : 'Upload material'}</button>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><BookOpen className="h-5 w-5" /></div><div><h2 className="text-xl font-black text-slate-950">Uploaded materials</h2><p className="text-sm text-slate-500">Preview and manage one class at a time.</p></div></div><label className="mt-5 grid gap-2 text-sm font-bold text-slate-600">Preview class<select value={previewClassId} onChange={(event) => setPreviewClassId(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none focus:border-cyan-400"><option value="">Select class</option>{classes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>{selectedPreviewClass && <p className="mt-3 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">{selectedPreviewClass.name} · {posts.length} total material{posts.length === 1 ? '' : 's'}</p>}<div className="mt-5 flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => setCategoryFilter('all')} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${categoryFilter === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>All</button>{menus.map((menu) => <button key={menu.id} type="button" onClick={() => setCategoryFilter(menu.id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${categoryFilter === menu.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{menu.label}</button>)}</div><div className="mt-4 space-y-3">{loading ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Loading classes...</p> : visiblePosts.length ? visiblePosts.map((post) => <article key={post.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-black text-slate-900">{post.chapterName || post.message?.split('\n')[0] || 'Untitled material'}</p><p className="mt-1 text-xs font-bold text-slate-500">{menus.find((menu) => menu.id === post.category)?.label || post.category}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => editMaterial(post)} className="rounded-lg p-2 text-cyan-700 hover:bg-cyan-100" title="Edit"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => deleteMaterial(post)} className="rounded-lg p-2 text-red-600 hover:bg-red-100" title="Delete"><Trash2 className="h-4 w-4" /></button></div></div>{post.message && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{post.message}</p>}</article>) : <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">No materials for this menu.</p>}</div></section>
        </div>
      </div>
    </main>
  )
}

export default AdminClassMaterialsPage
