import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BadgePlus,
  BellRing,
  BookOpen,
  CalendarDays,
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircleMore,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { apiRequest, assetUrl } from '../api'
import { getStoredAuth } from '../authStorage'

const emptyClassForm = { name: '', description: '', grade: '' }
const emptyClassShareForm = { message: '', category: 'assignment', documentLink: '' }
const CLASS_POST_CATEGORIES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'practice-paper', label: 'Practice Paper' },
  { value: 'important-question', label: 'Important Question' },
  { value: 'chapter-marking', label: 'Chapter Wise Marking' },
  { value: 'notes', label: 'Notes' },
  { value: 'test-paper', label: 'Test Paper' },
]

const CLASS_POST_CATEGORY_LABELS = CLASS_POST_CATEGORIES.reduce((accumulator, item) => {
  accumulator[item.value] = item.label
  return accumulator
}, {})

const syncClassShareTargets = (classItems = [], currentTargets = []) => {
  const targetMap = new Map(currentTargets.map((target) => [String(target.classId), target]))

  return classItems.map((classItem) => {
    const existingTarget = targetMap.get(String(classItem._id))

    return {
      classId: String(classItem._id),
      enabled: Boolean(existingTarget?.enabled),
      message: existingTarget?.message || '',
      className: classItem.name || '',
      grade: classItem.grade || '',
    }
  })
}

const Adminpage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const [activeTab, setActiveTab] = useState('students')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [studentClassFilter, setStudentClassFilter] = useState('')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [reports, setReports] = useState([])
  const [contacts, setContacts] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [classForm, setClassForm] = useState(emptyClassForm)
  const [editingClassId, setEditingClassId] = useState('')
  const [classSaving, setClassSaving] = useState(false)
  const [selectedClassFeedId, setSelectedClassFeedId] = useState('')
  const [classPosts, setClassPosts] = useState([])
  const [classFeedLoading, setClassFeedLoading] = useState(false)
  const [classFeedError, setClassFeedError] = useState('')
  const [classShareForm, setClassShareForm] = useState(emptyClassShareForm)
  const [classSharePhotos, setClassSharePhotos] = useState([])
  const [classSharePdf, setClassSharePdf] = useState(null)
  const [classShareSaving, setClassShareSaving] = useState(false)
  const [classShareTargets, setClassShareTargets] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [editingClassPostId, setEditingClassPostId] = useState('')
  const [reportsLoading, setReportsLoading] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const loadData = async (searchTerm = debouncedSearch) => {
    setError('')

    try {
      const [studentsData, classesData] = await Promise.all([
        apiRequest(`/api/admin/students?search=${encodeURIComponent(searchTerm)}`),
        apiRequest('/api/admin/classes'),
      ])

      setStudents(studentsData.students || [])
      setClasses(classesData.classes || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadClassFeed = async (classId) => {
    if (!classId) {
      setClassPosts([])
      return
    }

    setClassFeedLoading(true)
    setClassFeedError('')

    try {
      const data = await apiRequest(`/api/classes/${classId}/feed`)
      const nextPosts = data.posts || []
      setClassPosts(nextPosts)
    } catch (err) {
      setClassFeedError(err.message)
      setClassPosts([])
    } finally {
      setClassFeedLoading(false)
    }
  }

  const loadReports = async () => {
    if (reportsLoading || reports.length) {
      return
    }

    setReportsLoading(true)

    try {
      const data = await apiRequest('/api/admin/reports?limit=50')
      const nextReports = data.reports || []
      setReports(nextReports)
    } catch (err) {
      setError(err.message)
    } finally {
      setReportsLoading(false)
    }
  }

  const loadContacts = async () => {
    if (contactsLoading || contacts.length) {
      return
    }

    setContactsLoading(true)

    try {
      const data = await apiRequest('/api/admin/contacts?limit=50')
      const nextContacts = data.contacts || []
      setContacts(nextContacts)
    } catch (err) {
      setError(err.message)
    } finally {
      setContactsLoading(false)
    }
  }

  const loadFeedback = async () => {
    if (feedbackLoading || feedbacks.length) {
      return
    }

    setFeedbackLoading(true)

    try {
      const data = await apiRequest('/api/admin/feedback?limit=50')
      const nextFeedback = data.feedback || []
      setFeedbacks(nextFeedback)
    } catch (err) {
      setError(err.message)
    } finally {
      setFeedbackLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData(debouncedSearch)
    }
  }, [isAdmin, debouncedSearch])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    if (!classes.length) {
      setSelectedClassFeedId('')
      setClassPosts([])
      setClassShareTargets([])
      return
    }

    setSelectedClassFeedId((current) => {
      if (current && classes.some((classItem) => classItem._id === current)) {
        return current
      }

      return classes[0]._id
    })

    setClassShareTargets((current) => syncClassShareTargets(classes, current))
  }, [classes, selectedClassFeedId])

  useEffect(() => {
    if (activeTab === 'class-board' && selectedClassFeedId) {
      loadClassFeed(selectedClassFeedId)
    }
  }, [activeTab, selectedClassFeedId])

  useEffect(() => {
    if (!selectedClassFeedId || activeTab === 'class-board') {
      return
    }

    let cancelled = false

    const prefetch = async () => {
      try {
        const data = await apiRequest(`/api/classes/${selectedClassFeedId}/feed`)
        if (cancelled) {
          return
        }
      } catch (error) {
        // Background warm-up only.
      }
    }

    prefetch()

    return () => {
      cancelled = true
    }
  }, [activeTab, selectedClassFeedId])

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports()
    }

    if (activeTab === 'contacts') {
      loadContacts()
    }

    if (activeTab === 'feedback') {
      loadFeedback()
    }
  }, [activeTab])

  const openStudentDetail = async (student) => {
    setSelectedStudent(student)
    setDetailLoading(true)
    setStudentDetail(null)

    try {
      const data = await apiRequest(`/api/admin/students/${student.id}`)
      setStudentDetail(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const createClass = async (event) => {
    event.preventDefault()
    setClassSaving(true)
    setError('')

    try {
      const path = editingClassId ? `/api/admin/classes/${editingClassId}` : '/api/admin/classes'
      const method = editingClassId ? 'PATCH' : 'POST'

      await apiRequest(path, {
        method,
        body: JSON.stringify(classForm),
      })
      setClassForm(emptyClassForm)
      setEditingClassId('')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setClassSaving(false)
    }
  }

  const assignStudentClass = async (studentId, classId) => {
    try {
      await apiRequest(`/api/admin/students/${studentId}/class`, {
        method: 'PATCH',
        body: JSON.stringify({ classId }),
      })
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const openClassEdit = (classItem) => {
    setEditingClassId(classItem._id)
    setClassForm({
      name: classItem.name || '',
      description: classItem.description || '',
      grade: classItem.grade || '',
    })
    setError('')
  }

  const cancelClassEdit = () => {
    setEditingClassId('')
    setClassForm(emptyClassForm)
    setError('')
  }

  const formatReportChapter = (report) => {
    const chapter = report.chapterId || report.questionId?.objectiveType?.topic?.chapter || report.objectiveType?.topic?.chapter

    if (!chapter) {
      return 'N/A'
    }

    const chapterNumber = chapter.number || ''
    const chapterName = chapter.name || ''
    return `Chapter ${chapterNumber}${chapterName ? `: ${chapterName}` : ''}`.trim()
  }

  const deleteClass = async (classItem) => {
    if (!window.confirm(`Delete class "${classItem.name}"? Students will be unassigned from it.`)) {
      return
    }

    setError('')

    try {
      await apiRequest(`/api/admin/classes/${classItem._id}`, {
        method: 'DELETE',
      })

      if (editingClassId === classItem._id) {
        cancelClassEdit()
      }

      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const updateReport = async (reportId, status) => {
    try {
      await apiRequest(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setReports((current) => current.map((report) => (
        report._id === reportId ? { ...report, status } : report
      )))
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteReport = async (reportId) => {
    try {
      await apiRequest(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
      })
      setReports((current) => current.filter((report) => report._id !== reportId))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleFeedbackFeatured = async (feedbackItem) => {
    try {
      const data = await apiRequest(`/api/admin/feedback/${feedbackItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ featured: !feedbackItem.featured }),
      })

      setFeedbacks((current) => current.map((item) => (
        item.id === feedbackItem.id ? { ...item, featured: data.feedback?.featured ?? !feedbackItem.featured } : item
      )))
    } catch (err) {
      setError(err.message)
    }
  }

  const markFeedbackReviewed = async (feedbackItem) => {
    try {
      const data = await apiRequest(`/api/admin/feedback/${feedbackItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'reviewed' }),
      })

      setFeedbacks((current) => current.map((item) => (
        item.id === feedbackItem.id ? { ...item, status: data.feedback?.status || 'reviewed' } : item
      )))
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm('Delete this feedback?')) {
      return
    }

    try {
      await apiRequest(`/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE',
      })

      setFeedbacks((current) => current.filter((item) => item.id !== feedbackId))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleClassShareTarget = (classId) => {
    setClassShareTargets((current) =>
      current.map((target) =>
        target.classId === classId
          ? { ...target, enabled: !target.enabled }
          : target,
      ),
    )
  }

  const handlePreviewClassChange = (classId) => {
    setSelectedClassFeedId(classId)
  }

  const updateClassShareTargetMessage = (classId, message) => {
    setClassShareTargets((current) =>
      current.map((target) =>
        target.classId === classId
          ? { ...target, message }
          : target,
      ),
    )
  }

  const resetClassShareForm = () => {
    setClassShareForm(emptyClassShareForm)
    setClassSharePhotos([])
    setClassSharePdf(null)
    setEditingClassPostId('')
    setClassShareTargets((current) => current.map((target) => ({ ...target, enabled: false, message: '' })))
  }

  const shareClassMaterial = async (event) => {
    event.preventDefault()

    if (!selectedClassFeedId) {
      setClassFeedError('Choose a class first.')
      return
    }

    const selectedTargets = classShareTargets.filter((target) => target.enabled)
    const selectedTargetIds = selectedTargets.map((target) => target.classId)

    if (!selectedTargetIds.length) {
      setClassFeedError('Tick at least one class to publish this update.')
      return
    }

    const hasAnyMessage =
      classShareForm.message.trim() ||
      classShareForm.documentLink.trim() ||
      selectedTargets.some((target) => target.message.trim())

    if (!hasAnyMessage && !classSharePhotos.length && !classSharePdf) {
      setClassFeedError('Add a message, photo, PDF, or link before sharing.')
      return
    }

    setClassShareSaving(true)
    setClassFeedError('')

    try {
      const formData = new FormData()
      formData.append('message', classShareForm.message)
      formData.append('category', classShareForm.category || 'assignment')
      formData.append('documentLink', classShareForm.documentLink.trim())

      classSharePhotos.forEach((file) => {
        formData.append('photos', file)
      })

      if (classSharePdf) {
        formData.append('pdf', classSharePdf)
      }

      const isEditing = Boolean(editingClassPostId)

      if (isEditing) {
        if (!selectedTargetIds.length) {
          setClassFeedError('When editing, select at least one visible class.')
          return
        }

        formData.append('classId', selectedTargetIds[0])
        formData.append('classIds', JSON.stringify(selectedTargetIds))
        const classMessages = selectedTargets.reduce((accumulator, target) => {
          accumulator[target.classId] = target.message.trim() || classShareForm.message.trim()
          return accumulator
        }, {})
        formData.append('classMessages', JSON.stringify(classMessages))

        const data = await apiRequest(`/api/classes/${selectedClassFeedId}/posts/${editingClassPostId}`, {
          method: 'PATCH',
          body: formData,
        })

        setClassPosts((current) => {
          const nextPosts = Array.isArray(data.posts) && data.posts.length
            ? data.posts
            : data.post
              ? [data.post]
              : []

          const currentWithoutEdited = current.filter((post) => post.id !== editingClassPostId)
          return [...currentWithoutEdited, ...nextPosts].filter(
            (post, index, array) => index === array.findIndex((item) => item.id === post.id),
          )
        })
        resetClassShareForm()
        setSelectedClassFeedId(selectedTargetIds[0])
        await loadClassFeed(selectedTargetIds[0])
      } else {
        const classMessages = selectedTargets.reduce((accumulator, target) => {
          accumulator[target.classId] = target.message.trim() || classShareForm.message.trim()
          return accumulator
        }, {})

        formData.append('classIds', JSON.stringify(selectedTargetIds))
        formData.append('classMessages', JSON.stringify(classMessages))

        const data = await apiRequest('/api/admin/class-board/posts', {
          method: 'POST',
          body: formData,
        })

        const updatedPosts = Array.isArray(data.posts) ? data.posts : []
        if (selectedTargetIds.includes(selectedClassFeedId)) {
          await loadClassFeed(selectedClassFeedId)
        } else if (updatedPosts.length) {
          setClassPosts((current) => [...updatedPosts, ...current])
        }
        resetClassShareForm()
      }
    } catch (err) {
      setClassFeedError(err.message)
    } finally {
      setClassShareSaving(false)
    }
  }

  const buildProtectedPdfUrl = (pdfUrl, { download = false } = {}) => {
    const baseUrl = assetUrl(pdfUrl)

    if (!baseUrl) {
      return ''
    }

    const separator = baseUrl.includes('?') ? '&' : '?'
    const tokenUrl = `${baseUrl}${separator}token=${encodeURIComponent(auth?.token || '')}`
    return download ? `${tokenUrl}&download=1` : tokenUrl
  }

  const buildProtectedPhotoUrl = (photoUrl, { download = false } = {}) => {
    const baseUrl = assetUrl(photoUrl)

    if (!baseUrl) {
      return ''
    }

    const separator = baseUrl.includes('?') ? '&' : '?'
    const tokenUrl = `${baseUrl}${separator}token=${encodeURIComponent(auth?.token || '')}`
    return download ? `${tokenUrl}&download=1` : tokenUrl
  }

  const openClassPdf = (pdfUrl) => {
    const previewUrl = buildProtectedPdfUrl(pdfUrl)

    if (!previewUrl) {
      setClassFeedError('Could not open this PDF.')
      return
    }

    setSelectedPhoto(null)
    setSelectedPdf({
      name: 'Class PDF',
      previewUrl,
      downloadUrl: buildProtectedPdfUrl(pdfUrl, { download: true }),
    })
  }

  const openClassDocument = (post) => {
    if (post?.documentLink) {
      const anchor = document.createElement('a')
      anchor.href = post.documentLink
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      return
    }

    if (post?.pdf?.pdfUrl) {
      openClassPdf(post.pdf.pdfUrl)
      return
    }

    setClassFeedError('Could not open this document.')
  }

  const openClassPhoto = (photo) => {
    const previewUrl = buildProtectedPhotoUrl(photo.photoUrl)

    if (!previewUrl) {
      setClassFeedError('Could not open this image.')
      return
    }

    setSelectedPdf(null)
    setSelectedPhoto({
      ...photo,
      previewUrl,
      downloadUrl: buildProtectedPhotoUrl(photo.photoUrl, { download: true }),
    })
  }

  const openClassPostEdit = (post) => {
    setEditingClassPostId(post.id)
    setSelectedClassFeedId(post.classId || selectedClassFeedId)
    setClassShareForm({
      message: post.message || '',
      category: post.category || 'assignment',
      documentLink: post.documentLink || '',
    })
    const postClassId = String(post.classId || selectedClassFeedId || '')
    setClassShareTargets((current) => {
      if (!classes.length) {
        return current
      }

      return syncClassShareTargets(classes, current).map((target) => ({
        ...target,
        enabled: String(target.classId) === postClassId,
        message: String(target.classId) === postClassId ? target.message : '',
      }))
    })
    setClassSharePhotos([])
    setClassSharePdf(null)
    setClassFeedError('')
    setActiveTab('class-board')
  }

  const deleteClassPost = async (post) => {
    if (!window.confirm('Delete this class post?')) {
      return
    }

    try {
      await apiRequest(`/api/classes/${selectedClassFeedId}/posts/${post.id}`, {
        method: 'DELETE',
      })

      setClassPosts((current) => current.filter((item) => item.id !== post.id))

      if (editingClassPostId === post.id) {
        setEditingClassPostId('')
        setClassShareForm(emptyClassShareForm)
      }
    } catch (err) {
      setClassFeedError(err.message)
    }
  }

  const activeClassItem = classes.find((classItem) => classItem._id === selectedClassFeedId) || null

  const classOptions = useMemo(() => classes, [classes])
  const filteredStudents = useMemo(() => {
    if (!studentClassFilter) {
      return students
    }

    if (studentClassFilter === '__no_class__') {
      return students.filter((student) => !String(student.classId || '').trim())
    }

    return students.filter((student) => String(student.classId || '') === studentClassFilter)
  }, [students, studentClassFilter])
  const selectedClassTargetCount = classShareTargets.filter((target) => target.enabled).length
  const groupedClassPosts = useMemo(
    () =>
      CLASS_POST_CATEGORIES.map((category) => ({
        ...category,
        posts: classPosts.filter((post) => (post.category || 'assignment') === category.value),
      })),
    [classPosts],
  )
  const openReports = useMemo(() => reports.filter((report) => report.status === 'open'), [reports])

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.14),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_50%,#ecfeff_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-700">
                <Shield className="h-3.5 w-3.5" />
                Admin dashboard
              </div>
              <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Manage students, classes, messages, and reports.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Search students, open detailed progress popups, assign class membership, create groups, send messages once, and review mistake reports.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[560px] lg:grid-cols-4">
              <Stat label="Students" value={students.length} />
              <Stat label="Classes" value={classes.length} />
              <Stat label="Reports" value={reports.length} />
              <Stat label="Feedback" value={feedbacks.length} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {['students', 'classes', 'class-board', 'reports', 'contacts', 'feedback'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-3 text-sm font-black capitalize transition ${activeTab === tab ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {tab === 'class-board' ? 'class board' : tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
              Loading admin data...
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="grid gap-6">
                {activeTab === 'students' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-serif text-3xl text-slate-950">Students</h2>
                        <p className="mt-1 text-sm text-slate-500">Search by name, email, phone number, or class.</p>
                      </div>
                      <div className="grid gap-3 sm:min-w-[420px] sm:grid-cols-2">
                        <label className="relative w-full">
                          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search students..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          Class filter
                          <select
                            value={studentClassFilter}
                            onChange={(event) => setStudentClassFilter(event.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                          >
                            <option value="">All classes</option>
                            <option value="__no_class__">No class</option>
                            {classOptions.map((classItem) => (
                              <option key={classItem._id} value={classItem._id}>
                                {classItem.name}{classItem.grade ? ` (${classItem.grade})` : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {filteredStudents.map((student) => (
                        <article key={student.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() => openStudentDetail(student)}
                              className="text-left"
                            >
                              <h3 className="text-lg font-black text-slate-950">{student.name}</h3>
                              <p className="mt-1 text-sm text-slate-500">{student.email}</p>
                              <p className="mt-1 text-sm text-slate-500">{student.phoneNumber || 'No phone number shared'}</p>
                              <p className="mt-1 text-xs font-bold text-slate-400">Password: {student.password || 'Not available'}</p>
                              <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                {student.className || 'No class assigned'}
                              </p>
                            </button>

                            <div className="grid gap-2 sm:min-w-[250px]">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-2xl bg-white p-3 text-center">
                                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Brain cells</p>
                                  <p className="mt-2 text-xl font-black text-slate-950">{student.totalBrainCells}</p>
                                </div>
                                <div className="rounded-2xl bg-white p-3 text-center">
                                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Avg</p>
                                  <p className="mt-2 text-xl font-black text-slate-950">{student.averagePercent}%</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <select
                                  value={student.classId || ''}
                                  onChange={(event) => assignStudentClass(student.id, event.target.value)}
                                  className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                                >
                                  <option value="">No class</option>
                                  {classOptions.map((classItem) => (
                                    <option key={classItem._id} value={classItem._id}>
                                      {classItem.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => openStudentDetail(student)}
                                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-black"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                      {!filteredStudents.length && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          No students match this search or class filter.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'classes' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-3xl text-slate-950">Classes</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {editingClassId ? 'Edit the selected class or cancel to create a new one.' : 'Create and manage class groups.'}
                        </p>
                      </div>
                      {editingClassId && (
                        <button
                          type="button"
                          onClick={cancelClassEdit}
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    <form onSubmit={createClass} className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Class name" value={classForm.name} onChange={(value) => setClassForm({ ...classForm, name: value })} />
                        <Field label="Grade" value={classForm.grade} onChange={(value) => setClassForm({ ...classForm, grade: value })} />
                        <Field label="Description" value={classForm.description} onChange={(value) => setClassForm({ ...classForm, description: value })} />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button type="submit" disabled={classSaving} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
                        <BadgePlus className="h-4 w-4" />
                        {classSaving ? (editingClassId ? 'Updating...' : 'Creating...') : editingClassId ? 'Update class' : 'Create class'}
                        </button>
                        {editingClassId && (
                          <button
                            type="button"
                            onClick={cancelClassEdit}
                            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="mt-5 grid gap-3">
                      {classes.map((classItem) => (
                        <article key={classItem._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-lg font-black text-slate-950">{classItem.name}</h3>
                              <p className="mt-1 text-sm text-slate-500">{classItem.description || 'No description.'}</p>
                              <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                {classItem.grade || 'No grade'} - {classItem.studentCount || 0} students
                              </p>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <div className="rounded-2xl bg-white px-4 py-3 text-right">
                                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Students</p>
                                <p className="mt-2 text-2xl font-black text-slate-950">{classItem.studentCount || 0}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openClassEdit(classItem)}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                                aria-label={`Edit ${classItem.name}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteClass(classItem)}
                                className="grid h-11 w-11 place-items-center rounded-2xl border border-red-100 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-700"
                                aria-label={`Delete ${classItem.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'class-board' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-serif text-3xl text-slate-950">Class board</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Publish one upload to multiple classes and give each class its own message.
                        </p>
                      </div>
                      <label className="grid gap-2 text-sm font-bold text-slate-600 sm:w-80">
                        Preview class
                        <select
                          value={selectedClassFeedId}
                          onChange={(event) => handlePreviewClassChange(event.target.value)}
                          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                        >
                          {classOptions.length === 0 ? (
                            <option value="">No classes available</option>
                          ) : (
                            classOptions.map((classItem) => (
                              <option key={classItem._id} value={classItem._id}>
                                {classItem.name} {classItem.grade ? `(${classItem.grade})` : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </label>
                    </div>

                    {activeClassItem && (
                      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Preview class</p>
                        <h3 className="mt-2 text-lg font-black text-slate-950">{activeClassItem.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {activeClassItem.description || 'No description available.'}
                        </p>
                      </div>
                    )}

                    <form onSubmit={shareClassMaterial} className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-emerald-700" />
                        <h3 className="font-serif text-2xl text-slate-950">
                          {editingClassPostId ? 'Edit material' : 'Share class update'}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Upload the file once, then tick the classes that should see it. Each class can also get a different message.
                      </p>

                      <label className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
                        Category
                        <select
                          value={classShareForm.category}
                          onChange={(event) => setClassShareForm({ ...classShareForm, category: event.target.value })}
                          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-emerald-400"
                        >
                          {CLASS_POST_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs font-medium text-slate-400">
                          Choose from Assignment, Practice Paper, Important Question, Chapter Wise Marking, Notes, or Test Paper.
                        </p>
                      </label>

                      <label className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
                        Base message
                        <textarea
                          value={classShareForm.message}
                          onChange={(event) => setClassShareForm({ ...classShareForm, message: event.target.value })}
                          rows={4}
                          placeholder="Write homework, exam notice, revision tips, or any class update..."
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400"
                        />
                      </label>

                      <label className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
                        Document link
                        <input
                          type="url"
                          value={classShareForm.documentLink}
                          onChange={(event) => setClassShareForm({ ...classShareForm, documentLink: event.target.value })}
                          placeholder="https://drive.google.com/... or any PDF link"
                          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-emerald-400"
                        />
                        <p className="text-xs font-medium text-slate-400">
                          Students will only see a review button, not the raw link.
                        </p>
                      </label>

                      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-950">Visible classes</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              Tick the class boxes below. Override the message for any class if needed.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setClassShareTargets((current) =>
                                  current.map((target) => ({ ...target, enabled: true })),
                                )
                              }}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setClassShareTargets((current) =>
                                  current.map((target) => ({ ...target, enabled: false })),
                                )
                              }}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {classShareTargets.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            No classes available yet.
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {classShareTargets.map((target) => {
                              const classItem = classOptions.find((item) => item._id === target.classId)

                              return (
                                <div
                                  key={target.classId}
                                  className={`rounded-3xl border p-4 transition ${
                                    target.enabled ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
                                  }`}
                                >
                                  <label className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={target.enabled}
                                      onChange={() => toggleClassShareTarget(target.classId)}
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-black text-slate-950 truncate">
                                        {classItem?.name || target.className || 'Class'}
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-500">
                                        {classItem?.grade || target.grade || 'No grade'} - tick to show this update.
                                      </p>
                                    </div>
                                  </label>
                                  <label className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
                                    Class message
                                    <textarea
                                      value={target.message}
                                      onChange={(event) => updateClassShareTargetMessage(target.classId, event.target.value)}
                                      rows={3}
                                      placeholder="Optional custom message for this class..."
                                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
                                    />
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <label className="grid gap-2 rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-emerald-600" />
                            Photos
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => setClassSharePhotos(Array.from(event.target.files || []))}
                            className="text-sm font-medium text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-white file:font-bold"
                          />
                          <p className="text-xs font-medium text-slate-400">
                            Add one or more images.
                          </p>
                          {classSharePhotos.length > 0 && (
                            <div className="grid gap-2 pt-1">
                              {classSharePhotos.map((file, index) => (
                                <FileChip
                                  key={`${file.name}-${index}`}
                                  label={file.name}
                                  onRemove={() => setClassSharePhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                />
                              ))}
                            </div>
                          )}
                        </label>

                        <label className="grid gap-2 rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-600">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-600" />
                            PDF
                          </div>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(event) => setClassSharePdf(event.target.files?.[0] || null)}
                            className="text-sm font-medium text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-white file:font-bold"
                          />
                          <p className="text-xs font-medium text-slate-400">
                            Upload one PDF document.
                          </p>
                          {classSharePdf && (
                            <FileChip
                              label={classSharePdf.name}
                              onRemove={() => setClassSharePdf(null)}
                            />
                          )}
                        </label>
                      </div>

                      {classFeedError && (
                        <div className="mt-4 rounded-3xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          {classFeedError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={classShareSaving}
                        className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {classShareSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sharing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            {editingClassPostId ? 'Save changes' : `Share to ${selectedClassTargetCount || 'selected'} classes`}
                          </>
                        )}
                      </button>
                      {editingClassPostId && (
                        <button
                          type="button"
                          onClick={resetClassShareForm}
                          className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel edit
                        </button>
                      )}
                    </form>

                    <div className="mt-6 flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-slate-700" />
                      <h3 className="font-serif text-2xl text-slate-950">Latest uploads</h3>
                    </div>

                    {classFeedLoading ? (
                      <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                        Loading class feed...
                      </div>
                    ) : classPosts.length > 0 ? (
                      <div className="mt-4 grid gap-5">
                        {groupedClassPosts.map((group) => {
                          const hasPosts = group.posts.length > 0

                          return (
                            <section key={group.value} className="rounded-[1.75rem] border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                  <h4 className="text-lg font-black text-slate-950">{group.label}</h4>
                                  <p className="mt-1 text-xs font-medium text-slate-500">
                                    {hasPosts ? `${group.posts.length} upload${group.posts.length === 1 ? '' : 's'} available` : 'No uploads in this category yet.'}
                                  </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                                  {group.posts.length}
                                </span>
                              </div>

                              {hasPosts ? (
                                <div className="mt-4 grid gap-3">
                                  {group.posts.map((post) => (
                                    <article key={post.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div>
                                          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                                            {post.createdBy?.name || 'Admin'}
                                          </p>
                                          <p className="mt-1 text-sm text-slate-500">
                                            {new Date(post.createdAt).toLocaleString()}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => openClassPostEdit(post)}
                                            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                            aria-label="Edit post"
                                          >
                                            <Edit3 className="h-4 w-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => deleteClassPost(post)}
                                            className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-white text-red-500 transition hover:bg-red-50 hover:text-red-700"
                                            aria-label="Delete post"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>

                                      {post.message && (
                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                          {post.message}
                                        </p>
                                      )}

                                      {post.photos?.length > 0 && (
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                          {post.photos.map((photo) => {
                                            const previewUrl = buildProtectedPhotoUrl(photo.photoUrl)

                                            return (
                                              <button
                                                key={photo.id}
                                                type="button"
                                                onClick={() => openClassPhoto(photo)}
                                                className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                                              >
                                                <div className="relative">
                                                  <img
                                                    src={previewUrl || photo.dataUrl}
                                                    alt={photo.name}
                                                    className="h-56 w-full object-cover"
                                                  />
                                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                                                    View
                                                  </span>
                                                </div>
                                                <p className="truncate px-4 py-3 text-xs font-bold text-slate-500">{photo.name}</p>
                                              </button>
                                            )
                                          })}
                                        </div>
                                      )}

                                      {(post.documentLink || post.pdf?.pdfUrl) && (
                                        <button
                                          type="button"
                                          onClick={() => openClassDocument(post)}
                                          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                        >
                                          <FileText className="h-4 w-4 text-emerald-600" />
                                          Review Document
                                        </button>
                                      )}
                                    </article>
                                  ))}
                                </div>
                              ) : null}
                            </section>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                        No class uploads yet.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reports' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-5 w-5 text-rose-700" />
                      <h2 className="font-serif text-3xl text-slate-950">Latest reports</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Open reports will also show as a popup until they are marked done or deleted.
                    </p>

                    <div className="mt-5 grid gap-3">
                      {reportsLoading || (activeTab === 'reports' && !reports.length) ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          Loading reports...
                        </div>
                      ) : reports.length ? (
                        reports.map((report) => (
                        <article key={report._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                {report.user?.name || 'Student'} - {report.reason}
                              </p>
                              <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">
                                <DetailLine label="Student" value={report.user?.name || 'Student'} />
                                <DetailLine label="Message" value={report.details || 'No extra details.'} />
                                <DetailLine label="Chapter" value={formatReportChapter(report)} />
                                <DetailLine label="Topic" value={report.questionId?.objectiveType?.topic?.name || report.objectiveType?.topic?.name || 'N/A'} />
                                <DetailLine label="Objective" value={report.questionId?.objectiveType?.type || report.objectiveType?.type || 'N/A'} />
                                <DetailLine
                                  label="Question"
                                  value={report.questionId?.question || 'N/A'}
                                />
                                <DetailLine
                                  label="Options"
                                  value={Array.isArray(report.questionId?.options) && report.questionId.options.length
                                    ? report.questionId.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join(' | ')
                                    : 'N/A'}
                                />
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateReport(report._id, 'resolved')}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-emerald-700"
                                >
                                  Mark done
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteReport(report._id)}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-600 transition hover:bg-red-50"
                                >
                                  Delete
                                </button>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {report.status || 'open'}
                                </span>
                              </div>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </article>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          No reports available.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'contacts' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <MessageCircleMore className="h-5 w-5 text-emerald-700" />
                      <h2 className="font-serif text-3xl text-slate-950">Contact messages</h2>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {contactsLoading || (activeTab === 'contacts' && !contacts.length) ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          Loading contacts...
                        </div>
                      ) : contacts.length ? (
                        contacts.map((contact) => (
                        <article key={contact._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                {contact.name} - {contact.subject || 'General enquiry'}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {contact.message}
                              </p>
                              <p className="mt-2 text-xs font-bold text-slate-400">
                                {contact.email}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                              {new Date(contact.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </article>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          No contact messages available.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'feedback' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-600" />
                      <h2 className="font-serif text-3xl text-slate-950">Student feedback</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Pick the best feedback and it will appear on the home page.
                    </p>

                    <div className="mt-5 grid gap-3">
                      {feedbackLoading || (activeTab === 'feedback' && !feedbacks.length) ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          Loading feedback...
                        </div>
                      ) : feedbacks.length ? feedbacks.map((feedbackItem) => (
                        <article key={feedbackItem.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                {feedbackItem.name} {feedbackItem.className ? `- ${feedbackItem.className}` : ''}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                {Array.from({ length: 5 }).map((_, index) => (
                                  <Star
                                    key={`${feedbackItem.id}-star-${index}`}
                                    className={`h-4 w-4 ${index < feedbackItem.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                                  />
                                ))}
                                <span className={`ml-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${feedbackItem.featured ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                                  {feedbackItem.featured ? 'Featured' : 'Hidden'}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${feedbackItem.status === 'reviewed' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {feedbackItem.status || 'new'}
                                </span>
                              </div>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                              {new Date(feedbackItem.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {feedbackItem.message ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                              {feedbackItem.message}
                            </p>
                          ) : (
                            <p className="mt-3 text-sm leading-7 text-slate-400">
                              No text message was added.
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFeedbackFeatured(feedbackItem)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-black"
                            >
                              {feedbackItem.featured ? 'Unfeature' : 'Feature on home'}
                            </button>
                            <button
                              type="button"
                              onClick={() => markFeedbackReviewed(feedbackItem)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-700 transition hover:bg-cyan-50"
                            >
                              Mark reviewed
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFeedback(feedbackItem.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      )) : (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          No feedback has been submitted yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 self-start">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-slate-700" />
                    <h2 className="font-serif text-3xl text-slate-950">Admin tips</h2>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Tip title="Student popup" text="Click any student card to open detailed chapter progress, brain cells, and recent attempts." />
                    <Tip title="Class assignment" text="Use the class dropdown on each student card to move them into the right group immediately." />
                    <Tip title="Contacts" text="Open the contacts tab to review direct WhatsApp-style requests from students." />
                    <Tip title="Reports" text="Question reports are stored here so you can follow up quickly when something looks wrong." />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/90 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-[0_30px_120px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Photo open</p>
                <h3 className="truncate text-base font-black sm:text-lg">{selectedPhoto.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.downloadUrl}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-100"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                  aria-label="Close photo viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid flex-1 place-items-center overflow-auto bg-black/60 p-4">
              <img
                src={selectedPhoto.previewUrl}
                alt={selectedPhoto.name}
                className="max-h-[80vh] max-w-full rounded-[1.5rem] object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {selectedPdf && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/90 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-[0_30px_120px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-white sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">PDF open</p>
                <h3 className="truncate text-base font-black sm:text-lg">{selectedPdf.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPdf.downloadUrl}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-100"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPdf(null)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
                  aria-label="Close PDF viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid flex-1 place-items-center overflow-auto bg-black/60 p-4">
              <iframe
                src={selectedPdf.previewUrl}
                title={selectedPdf.name}
                className="h-[80vh] w-full rounded-[1.5rem] border-0 bg-white shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {openReports.length > 0 && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-rose-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">Report alert</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {openReports.length} open report{openReports.length === 1 ? '' : 's'} need attention
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Mark it done or delete it. The popup stays until every open report is handled.
                </p>
              </div>
              <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-rose-700">
                Pending
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                {openReports[0].user?.name || 'Student'} - {openReports[0].reason}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {openReports[0].details || 'No extra details.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateReport(openReports[0]._id, 'resolved')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-emerald-700"
                >
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => deleteReport(openReports[0]._id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-600 transition hover:bg-red-50"
                >
                  Delete report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-3 py-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Student detail</p>
                <h2 className="mt-2 font-serif text-3xl text-slate-950">{selectedStudent.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedStudent.email}</p>
                <p className="mt-1 text-sm text-slate-500">{selectedStudent.phoneNumber || 'No phone number shared'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Close student detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Loading student progress...
              </div>
            ) : studentDetail ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Stat label="Brain cells" value={studentDetail.progress?.totalBrainCells || 0} />
                  <Stat label="Average" value={`${studentDetail.progress?.averagePercent || 0}%`} />
                  <Stat label="Attempts" value={studentDetail.progress?.attemptCount || 0} />
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">Class</p>
                    <p className="mt-2 text-lg font-bold text-slate-700">{studentDetail.user.className || 'No class assigned'}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">Phone</p>
                    <p className="mt-2 text-lg font-bold text-slate-700">{studentDetail.user.phoneNumber || 'Not available'}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">Recent attempts</p>
                    <p className="mt-2 text-lg font-bold text-slate-700">{studentDetail.progress?.latestAttempts?.length || 0}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                    <p className="text-sm font-black text-slate-950">Password</p>
                    <p className="mt-2 text-lg font-bold text-slate-700">{studentDetail.user.password || 'Not available'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <p className="text-sm font-black text-slate-950">Chapter progress</p>
                  <div className="mt-4 grid gap-3">
                    {(studentDetail.progress?.chapterReports || []).map((chapter) => (
                      <article key={chapter.chapterId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                              Chapter {chapter.chapterNumber}
                            </p>
                            <h3 className="mt-2 text-lg font-black text-slate-950">{chapter.chapterName}</h3>
                            <p className="mt-2 text-sm text-slate-500">
                              Latest score {chapter.latestScore}/{chapter.latestTotalQuestions} - {chapter.latestPercent}% - {chapter.latestBrainCells} brain cells
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-4 py-3 text-right">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Best</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">{chapter.bestPercent || chapter.latestPercent || 0}%</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2">
                          {(chapter.weakAreas || []).map((area, index) => (
                            <p key={`${area}-${index}`} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                              {area}
                            </p>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

const Stat = ({ label, value }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
  </div>
)

const Field = ({ label, value, onChange }) => (
  <label className="grid gap-2 text-sm font-bold text-slate-600">
    {label}
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
    />
  </label>
)

const Tip = ({ title, text }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-black text-slate-950">{title}</p>
    <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
  </div>
)

const FileChip = ({ label, onRemove }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
    <span className="truncate text-xs font-semibold text-slate-600">{label}</span>
    <button
      type="button"
      onClick={onRemove}
      className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      aria-label={`Remove ${label}`}
    >
      <X className="h-4 w-4" />
    </button>
  </div>
)

const DetailLine = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-700">{value}</p>
  </div>
)

export default Adminpage
