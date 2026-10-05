import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Edit3, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiRequest, assetUrl } from '../api'

const emptyType = { name: '', questionMode: 'text', solutionMode: 'text' }

const AddTheoryQuestion = () => {
  const { chapterNumber, topicId: routeTopicId } = useParams()
  const [searchParams] = useSearchParams()
  const topicId = routeTopicId || searchParams.get('topicId') || ''
  const navigate = useNavigate()
  const [chapter, setChapter] = useState(null)
  const [topics, setTopics] = useState([])
  const [types, setTypes] = useState([])
  const [selectedType, setSelectedType] = useState('')
  const [typeForm, setTypeForm] = useState(emptyType)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [selectedTopic, setSelectedTopic] = useState(topicId)
  const [questionImage, setQuestionImage] = useState(null)
  const [answerImage, setAnswerImage] = useState(null)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [questions, setQuestions] = useState([])
  const [editingType, setEditingType] = useState(null)
  const [editingQuestion, setEditingQuestion] = useState(null)

  const selected = useMemo(() => types.find((item) => item._id === selectedType), [types, selectedType])

  const load = async () => {
    try {
      const [typeData, topicData, questionData] = await Promise.all([
        apiRequest(`/api/chapters/${chapterNumber}/theory-types`, { cache: 'no-store' }),
        apiRequest(`/api/chapters/${chapterNumber}/topics`, { cache: 'no-store' }),
        apiRequest(`/api/chapters/${chapterNumber}/theory-questions`, { cache: 'no-store' }),
      ])
      setChapter(typeData.chapter)
      setTypes(typeData.theoryTypes || [])
      setTopics(topicData.topics || [])
      setQuestions(questionData.questions || [])
      if (!selectedType && typeData.theoryTypes?.[0]?._id) setSelectedType(typeData.theoryTypes[0]._id)
    } catch (err) { setError(err.message) }
  }

  useEffect(() => { load() }, [chapterNumber])

  const createType = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const path = editingType ? `/api/theory-types/${editingType._id}` : `/api/chapters/${chapterNumber}/theory-types`
      const data = await apiRequest(path, { method: editingType ? 'PATCH' : 'POST', body: JSON.stringify(typeForm) })
      setTypes((current) => editingType ? current.map((item) => item._id === editingType._id ? { ...item, ...data.theoryType } : item) : [...current, { ...data.theoryType, questionCount: 0 }])
      setSelectedType(data.theoryType._id); setTypeForm(emptyType); setShowTypeForm(false); setNotice('Theory question type created.')
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const editType = (type) => { setEditingType(type); setTypeForm({ name: type.name, questionMode: type.questionMode || 'text', solutionMode: type.solutionMode || 'text' }); setShowTypeForm(true) }
  const deleteType = async (type) => {
    if (!window.confirm(`Delete type "${type.name}" and its questions?`)) return
    try { await apiRequest(`/api/theory-types/${type._id}`, { method: 'DELETE' }); setTypes((current) => current.filter((item) => item._id !== type._id)); if (selectedType === type._id) setSelectedType(''); await load() } catch (err) { setError(err.message) }
  }

  const createQuestion = async (event) => {
    event.preventDefault()
    if (!selectedType) return setError('Create or select a theory question type first.')
    setSaving(true); setError(''); setNotice('')
    try {
      const body = new FormData()
      body.append('question', question)
      body.append('answer', answer)
      body.append('chapterId', chapter?._id || '')
      if (selectedTopic) body.append('topicId', selectedTopic)
      if (questionImage) body.append('questionImage', questionImage)
      if (answerImage) body.append('answerImage', answerImage)
      const path = editingQuestion ? `/api/theory-questions/${editingQuestion._id}` : `/api/theory-types/${selectedType}/questions`
      await apiRequest(path, { method: editingQuestion ? 'PATCH' : 'POST', body })
      setQuestion(''); setAnswer(''); setQuestionImage(null); setAnswerImage(null); setEditingQuestion(null); setNotice(editingQuestion ? 'Theory question updated.' : 'Theory question added successfully.'); await load()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const editQuestion = (item) => { setEditingQuestion(item); setSelectedType(item.theoryType?._id || selectedType); setSelectedTopic(item.topic?._id || ''); setQuestion(item.question || ''); setAnswer(item.answer || ''); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) }
  const deleteQuestion = async (item) => { if (!window.confirm('Delete this theory question?')) return; try { await apiRequest(`/api/theory-questions/${item._id}`, { method: 'DELETE' }); await load() } catch (err) { setError(err.message) } }

  return <main className="min-h-screen bg-[#fbfbfa] px-4 py-6 text-stone-800 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-4xl">
      <button type="button" onClick={() => navigate(topicId ? `/chapters/${chapterNumber}/topics/${topicId}/objectives` : `/chapters/${chapterNumber}/topics`)} className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600"><ArrowLeft size={16} /> Back</button>
      <h1 className="font-serif text-4xl text-stone-950">Theory questions</h1>
      <p className="mt-2 text-sm text-stone-500">{chapter?.name || `Chapter ${chapterNumber}`} · Create a reusable theory question type and add questions with answers.</p>
      {(error || notice) && <p className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</p>}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-slate-950">Choose question type</h2><button type="button" onClick={() => { setEditingType(null); setTypeForm(emptyType); setShowTypeForm((value) => !value) }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> New type</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{types.map((item) => <div key={item._id} className={`rounded-2xl border p-4 text-left transition ${selectedType === item._id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white'}`}><button type="button" onClick={() => setSelectedType(item._id)} className="w-full text-left"><span className="block font-black text-slate-900">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{item.questionCount || 0} question(s) · {item.questionMode || 'text'} question · {item.solutionMode || 'text'} solution</span></button><div className="mt-3 flex gap-2"><button type="button" onClick={() => editType(item)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600"><Edit3 size={13} /> Edit</button><button type="button" onClick={() => deleteType(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2 py-1 text-xs font-bold text-red-600"><Trash2 size={13} /> Delete</button></div></div>)}</div>
        {showTypeForm && <form onSubmit={createType} className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4"><div className="flex items-center justify-between"><h3 className="font-black">{editingType ? 'Edit type' : 'New type'}</h3><button type="button" onClick={() => setShowTypeForm(false)}><X size={18} /></button></div><label className="mt-3 grid gap-2 text-sm font-bold">Type name<input required value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} placeholder="e.g. Explain the following" className="h-11 rounded-xl border border-slate-200 bg-white px-3" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Question accepts<select value={typeForm.questionMode} onChange={(event) => setTypeForm({ ...typeForm, questionMode: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3"><option value="text">Text</option><option value="image">Image</option><option value="both">Text + image</option><option value="both-compulsory">Text + image compulsory</option></select></label><label className="grid gap-2 text-sm font-bold">Solution accepts<select value={typeForm.solutionMode} onChange={(event) => setTypeForm({ ...typeForm, solutionMode: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3"><option value="none">No solution</option><option value="text">Text</option><option value="image">Image</option><option value="both">Text + image</option><option value="both-compulsory">Text + image compulsory</option></select></label></div><button disabled={saving} className="mt-4 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white">Save type</button></form>}
      </section>

      <form onSubmit={createQuestion} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black text-slate-950">{editingQuestion ? 'Edit question' : 'Add question'}</h2><label className="mt-5 grid gap-2 text-sm font-bold">Topic (optional)<select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)} className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3"><option value="">Chapter-level question</option>{topics.map((item) => <option key={item._id} value={item._id}>{item.number}. {item.name}</option>)}</select></label><label className="mt-4 grid gap-2 text-sm font-bold">Question text<textarea required={['text', 'both', 'both-compulsory'].includes(selected?.questionMode || 'text')} value={question} onChange={(event) => setQuestion(event.target.value)} rows={5} className="rounded-xl border border-slate-200 bg-slate-50 p-3" placeholder="Write the theory question..." /></label>{['image', 'both', 'both-compulsory'].includes(selected?.questionMode) && <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm font-bold"><ImagePlus size={18} /> {editingQuestion ? 'Replace question image' : 'Upload question image'}<input type="file" accept="image/*" onChange={(event) => setQuestionImage(event.target.files?.[0] || null)} className="sr-only" /></label>}{selected?.solutionMode && selected.solutionMode !== 'none' && <>{['text', 'both', 'both-compulsory'].includes(selected.solutionMode) && <label className="mt-4 grid gap-2 text-sm font-bold">Answer / solution text<textarea required={['text', 'both', 'both-compulsory'].includes(selected.solutionMode)} value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} className="rounded-xl border border-slate-200 bg-slate-50 p-3" placeholder="Write the answer or solution..." /></label>}{['image', 'both', 'both-compulsory'].includes(selected.solutionMode) && <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm font-bold"><ImagePlus size={18} /> {editingQuestion ? 'Replace solution image' : 'Upload solution image'}<input type="file" accept="image/*" onChange={(event) => setAnswerImage(event.target.files?.[0] || null)} className="sr-only" /></label>}</>}<button disabled={saving || !selectedType} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white disabled:opacity-50"><Save size={17} /> {saving ? 'Saving...' : editingQuestion ? 'Update theory question' : 'Add theory question'}</button></form>
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black text-slate-950">Questions in this chapter</h2>{questions.length === 0 ? <p className="mt-3 text-sm text-slate-500">No theory questions added yet.</p> : <div className="mt-4 grid gap-3">{questions.map((item) => <article key={item._id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{item.question || 'Image question'}</p><p className="mt-1 text-xs text-slate-500">{item.theoryType?.name || 'Theory'}{item.topic?.name ? ` · ${item.topic.name}` : ''}</p></div><div className="flex gap-2"><button type="button" onClick={() => editQuestion(item)} className="rounded-lg border border-slate-200 p-2 text-slate-600"><Edit3 size={15} /></button><button type="button" onClick={() => deleteQuestion(item)} className="rounded-lg border border-red-100 p-2 text-red-600"><Trash2 size={15} /></button></div></div>{item.imageUrl && <img src={assetUrl(item.imageUrl)} alt="Question" className="mt-3 max-h-56 w-full rounded-xl object-contain" />}<p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{item.answer || 'Image solution'}</p>{item.answerImageUrl && <img src={assetUrl(item.answerImageUrl)} alt="Solution" className="mt-3 max-h-56 w-full rounded-xl object-contain" />}</article>)}</div>}</section>
    </div>
  </main>
}

export default AddTheoryQuestion
