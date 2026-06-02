import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BadgePlus, BellRing, BookOpen, Edit3, Search, Send, Shield, Sparkles, Trash2, Users, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'

const emptyClassForm = { name: '', description: '', grade: '' }

const Adminpage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const [activeTab, setActiveTab] = useState('students')
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentDetail, setStudentDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [classForm, setClassForm] = useState(emptyClassForm)
  const [editingClassId, setEditingClassId] = useState('')
  const [classSaving, setClassSaving] = useState(false)
  const [messageForm, setMessageForm] = useState({
    targetType: 'all',
    targetClassId: '',
    targetUserId: '',
    subject: '',
    body: '',
  })
  const [messageStatus, setMessageStatus] = useState('')
  const [messageSaving, setMessageSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [studentsData, classesData, reportsData] = await Promise.all([
        apiRequest(`/api/admin/students?search=${encodeURIComponent(search)}`),
        apiRequest('/api/admin/classes'),
        apiRequest('/api/admin/reports?limit=50'),
      ])

      setStudents(studentsData.students || [])
      setClasses(classesData.classes || [])
      setReports(reportsData.reports || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, search])

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

  const sendMessage = async (event) => {
    event.preventDefault()
    setMessageSaving(true)
    setMessageStatus('')
    setError('')

    try {
      await apiRequest('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({
          targetType: messageForm.targetType,
          targetClassId: messageForm.targetClassId,
          targetUserIds: messageForm.targetUserId ? [messageForm.targetUserId] : [],
          subject: messageForm.subject,
          body: messageForm.body,
        }),
      })

      setMessageStatus('Message sent successfully.')
      setMessageForm({
        targetType: 'all',
        targetClassId: '',
        targetUserId: '',
        subject: '',
        body: '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setMessageSaving(false)
    }
  }

  const classOptions = useMemo(() => classes, [classes])

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

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <Stat label="Students" value={students.length} />
              <Stat label="Classes" value={classes.length} />
              <Stat label="Reports" value={reports.length} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {['students', 'classes', 'messages', 'reports'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-3 text-sm font-black capitalize transition ${activeTab === tab ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {tab}
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
                        <p className="mt-1 text-sm text-slate-500">Search by name, email, or class.</p>
                      </div>
                      <label className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search students..."
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {students.map((student) => (
                        <article key={student.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() => openStudentDetail(student)}
                              className="text-left"
                            >
                              <h3 className="text-lg font-black text-slate-950">{student.name}</h3>
                              <p className="mt-1 text-sm text-slate-500">{student.email}</p>
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

                {activeTab === 'messages' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-cyan-700" />
                      <h2 className="font-serif text-3xl text-slate-950">Send message</h2>
                    </div>

                    <form onSubmit={sendMessage} className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          Audience
                          <select
                            value={messageForm.targetType}
                            onChange={(event) => setMessageForm({ ...messageForm, targetType: event.target.value })}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none"
                          >
                            <option value="all">All students</option>
                            <option value="class">By class</option>
                            <option value="user">Individual student</option>
                          </select>
                        </label>
                        {messageForm.targetType === 'class' ? (
                          <label className="grid gap-2 text-sm font-bold text-slate-600">
                            Class
                            <select
                              value={messageForm.targetClassId}
                              onChange={(event) => setMessageForm({ ...messageForm, targetClassId: event.target.value })}
                              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none"
                            >
                              <option value="">Select class</option>
                              {classes.map((classItem) => (
                                <option key={classItem._id} value={classItem._id}>
                                  {classItem.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : messageForm.targetType === 'user' ? (
                          <label className="grid gap-2 text-sm font-bold text-slate-600">
                            Student
                            <select
                              value={messageForm.targetUserId}
                              onChange={(event) => setMessageForm({ ...messageForm, targetUserId: event.target.value })}
                              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none"
                            >
                              <option value="">Select student</option>
                              {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                  {student.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                            Message will be sent to every student.
                          </div>
                        )}
                      </div>

                      <Field label="Subject" value={messageForm.subject} onChange={(value) => setMessageForm({ ...messageForm, subject: value })} />
                      <label className="grid gap-2 text-sm font-bold text-slate-600">
                        Message
                        <textarea
                          required
                          rows={6}
                          value={messageForm.body}
                          onChange={(event) => setMessageForm({ ...messageForm, body: event.target.value })}
                          className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400"
                        />
                      </label>
                      {messageStatus && (
                        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                          {messageStatus}
                        </p>
                      )}
                      <button type="submit" disabled={messageSaving} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50">
                        <Send className="h-4 w-4" />
                        {messageSaving ? 'Sending...' : 'Send once'}
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'reports' && (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-5 w-5 text-rose-700" />
                      <h2 className="font-serif text-3xl text-slate-950">Latest reports</h2>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {reports.map((report) => (
                        <article key={report._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                {report.user?.name || 'Student'} - {report.reason}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">
                                {report.details || 'No extra details.'}
                              </p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </article>
                      ))}
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
                    <Tip title="Messages" text="Send a message once to all students, a class, or a single student." />
                    <Tip title="Reports" text="Question reports are stored here so you can follow up quickly when something looks wrong." />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-3 py-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Student detail</p>
                <h2 className="mt-2 font-serif text-3xl text-slate-950">{selectedStudent.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedStudent.email}</p>
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
                    <p className="text-sm font-black text-slate-950">Recent attempts</p>
                    <p className="mt-2 text-lg font-bold text-slate-700">{studentDetail.progress?.latestAttempts?.length || 0}</p>
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

export default Adminpage
