import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BadgePlus,
  BellRing,
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

const formatFeedbackSourceLabel = (item = {}) => {
  if (item.sourceType === 'topic') {
    return item.sourceLabel ? `Chapter: ${item.sourceLabel}` : 'Chapter feedback'
  }

  if (item.sourceLabel) {
    return item.sourceLabel
  }

  if (item.sourceType === 'test') {
    return 'Test feedback'
  }

  if (item.sourceType === 'objective') {
    return 'Practice feedback'
  }

  return 'General feedback'
}

const NOTICE_COLOR_OPTIONS = [
  { value: 'amber', label: 'Amber' },
  { value: 'teal', label: 'Teal' },
  { value: 'rose', label: 'Rose' },
  { value: 'sky', label: 'Sky' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'violet', label: 'Violet' },
  { value: 'orange', label: 'Orange' },
  { value: 'lime', label: 'Lime' },
]
const CLASS_POST_CATEGORIES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'practice-paper', label: 'Practice Paper' },
  { value: 'important-question', label: 'Important Question' },
  { value: 'chapter-marking', label: 'Chapter Wise Marking' },
  { value: 'notes', label: 'Notes' },
  { value: 'test-paper', label: 'Test Paper' },
]

const STUDENT_PAGE_SIZE = 20

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

const getStudentRowId = (student) => String(student?.id || student?._id || '')

const formatPopupAudienceLabel = (message = {}) => {
  if (message.targetType === 'all') {
    return 'All students'
  }

  if (message.targetType === 'class') {
    return message.targetClassName ? `Class: ${message.targetClassName}` : 'Class message'
  }

  if (message.targetType === 'user') {
    return message.audienceCount > 1
      ? `Specific students (${message.audienceCount})`
      : 'Personal message'
  }

  return 'Student message'
}

const Adminpage = () => {
  const auth = getStoredAuth()
  const isAdmin = Boolean(auth?.user?.isAdmin)
  const [activeTab, setActiveTab] = useState('students')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [studentClassFilter, setStudentClassFilter] = useState('')
  const [studentQuery, setStudentQuery] = useState({
    search: '',
    classId: '',
    page: 1,
  })
  const [dashboardCounts, setDashboardCounts] = useState({
    totalStudents: null,
    totalClasses: null,
    totalReports: null,
    totalFeedback: null,
  })
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [studentsTotalCount, setStudentsTotalCount] = useState(0)
  const [studentsTotalPages, setStudentsTotalPages] = useState(0)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsReady, setStudentsReady] = useState(false)
  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [contacts, setContacts] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [siteNotice, setSiteNotice] = useState(null)
  const [siteNoticeMessage, setSiteNoticeMessage] = useState('')
  const [siteNoticeColor, setSiteNoticeColor] = useState('amber')
  const [messageTargetType, setMessageTargetType] = useState('all')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageRecipients, setMessageRecipients] = useState([])
  const [messageRecipientsLoading, setMessageRecipientsLoading] = useState(false)
  const [messageRecipientsLoaded, setMessageRecipientsLoaded] = useState(false)
  const [messageRecipientSearch, setMessageRecipientSearch] = useState('')
  const [messageSelectedUserIds, setMessageSelectedUserIds] = useState([])
  const [messageSending, setMessageSending] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [messageSuccess, setMessageSuccess] = useState('')
  const [adminMessages, setAdminMessages] = useState([])
  const [adminMessagesLoading, setAdminMessagesLoading] = useState(false)
  const [adminMessagesLoaded, setAdminMessagesLoaded] = useState(false)
  const [adminMessagesError, setAdminMessagesError] = useState('')
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [noticeSaving, setNoticeSaving] = useState(false)
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
  const [classBoardCategoryFilter, setClassBoardCategoryFilter] = useState('all')
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

  const dashboardRequestRef = useRef(0)
  const studentsRequestRef = useRef(0)
  const classesRequestRef = useRef(0)
  const adminMessagesRequestRef = useRef(0)
  const studentQueryRef = useRef(null)

  const filteredMessageRecipients = useMemo(() => {
    const query = messageRecipientSearch.trim().toLowerCase()

    if (!query) {
      return messageRecipients
    }

    return messageRecipients.filter((student) => {
      const haystack = [
        student.name,
        student.email,
        student.phoneNumber,
        student.className,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [messageRecipientSearch, messageRecipients])

  const selectedMessageRecipients = useMemo(() => {
    if (!messageSelectedUserIds.length) {
      return []
    }

    const selectedIdSet = new Set(messageSelectedUserIds.map((value) => String(value || '')))
    return messageRecipients.filter((student) => selectedIdSet.has(getStudentRowId(student)))
  }, [messageRecipients, messageSelectedUserIds])

  const updateDashboardCount = (key, delta) => {
    setDashboardCounts((current) => {
      const nextValue = Math.max((Number(current[key]) || 0) + delta, 0)
      return {
        ...current,
        [key]: nextValue,
      }
    })
  }

  const mergeStudentRecord = (student, patch = {}) => {
    const nextClassId = Object.prototype.hasOwnProperty.call(patch, 'classId')
      ? String(patch.classId || '')
      : String(student?.classId || '')
    const nextClassName = Object.prototype.hasOwnProperty.call(patch, 'className')
      ? String(patch.className || '')
      : String(student?.className || '')
    return {
      ...student,
      ...patch,
      id: student?.id || student?._id || patch.id || '',
      classId: nextClassId,
      className: nextClassName,
      totalBrainCells: Number(patch.totalBrainCells ?? student?.totalBrainCells ?? 0),
      averagePercent: Number(patch.averagePercent ?? student?.averagePercent ?? 0),
      attemptCount: Number(patch.attemptCount ?? student?.attemptCount ?? 0),
      totalScore: Number(patch.totalScore ?? student?.totalScore ?? 0),
      totalQuestions: Number(patch.totalQuestions ?? student?.totalQuestions ?? 0),
    }
  }

  const patchStudentState = (studentId, patch = {}) => {
    const normalizedId = String(studentId || '')

    setStudents((current) => current.map((student) => (
      getStudentRowId(student) === normalizedId
        ? mergeStudentRecord(student, patch)
        : student
    )))

    setSelectedStudent((current) => (
      current && getStudentRowId(current) === normalizedId
        ? mergeStudentRecord(current, patch)
        : current
    ))

    setStudentDetail((current) => {
      if (!current || getStudentRowId(current.user) !== normalizedId) {
        return current
      }

      return {
        ...current,
        user: {
          ...current.user,
          ...patch,
          id: current.user.id || normalizedId,
          classId: Object.prototype.hasOwnProperty.call(patch, 'classId')
            ? String(patch.classId || '')
            : String(current.user.classId || ''),
          className: Object.prototype.hasOwnProperty.call(patch, 'className')
            ? String(patch.className || '')
            : String(current.user.className || ''),
        },
      }
    })
  }

  const updateStudentsForClassChange = (classId, patch = {}) => {
    const normalizedClassId = String(classId || '')
    const normalizedPatch = {
      ...patch,
      classId: Object.prototype.hasOwnProperty.call(patch, 'classId') ? patch.classId : normalizedClassId,
    }

    setStudents((current) =>
      current.map((student) =>
        String(student.classId || '') === normalizedClassId
          ? mergeStudentRecord(student, normalizedPatch)
          : student,
      ),
    )

    setSelectedStudent((current) => (
      current && String(current.classId || '') === normalizedClassId
        ? mergeStudentRecord(current, normalizedPatch)
        : current
    ))

    setStudentDetail((current) => {
      if (!current || String(current.user?.classId || '') !== normalizedClassId) {
        return current
      }

      return {
        ...current,
        user: {
          ...current.user,
          ...normalizedPatch,
          classId: Object.prototype.hasOwnProperty.call(normalizedPatch, 'classId')
            ? String(normalizedPatch.classId || '')
            : String(current.user.classId || ''),
          className: Object.prototype.hasOwnProperty.call(normalizedPatch, 'className')
            ? String(normalizedPatch.className || '')
            : String(current.user.className || ''),
        },
      }
    })
  }

  const loadDashboard = async () => {
    const requestId = dashboardRequestRef.current + 1
    dashboardRequestRef.current = requestId
    setDashboardLoading(true)

    try {
      const data = await apiRequest('/api/admin/dashboard')
      if (requestId !== dashboardRequestRef.current) {
        return
      }

      setDashboardCounts(data.counts || {
        totalStudents: 0,
        totalClasses: 0,
        totalReports: 0,
        totalFeedback: 0,
      })
    } catch (err) {
      if (requestId !== dashboardRequestRef.current) {
        return
      }
      setError(err.message)
    } finally {
      if (requestId === dashboardRequestRef.current) {
        setDashboardLoading(false)
      }
    }
  }

  const loadStudents = async ({ page = 1, searchTerm = studentQuery.search, classId = studentQuery.classId, silent = false, markReady = false } = {}) => {
    const requestId = studentsRequestRef.current + 1
    studentsRequestRef.current = requestId
    setStudentsLoading(true)

    if (!silent) {
      setError('')
    }

    try {
      const params = new URLSearchParams({
        page: String(Math.max(Number(page) || 1, 1)),
        limit: String(STUDENT_PAGE_SIZE),
      })

      const normalizedSearch = String(searchTerm || '').trim()
      const normalizedClassId = String(classId || '').trim()

      if (normalizedSearch) {
        params.set('search', normalizedSearch)
      }

      if (normalizedClassId) {
        params.set('classId', normalizedClassId)
      }

      const data = await apiRequest(`/api/admin/students?${params.toString()}`)

      if (requestId !== studentsRequestRef.current) {
        return
      }

      const nextStudents = Array.isArray(data.students) ? data.students : []
      const nextPage = Math.max(Number(data.page) || page || 1, 1)
      setStudents(nextStudents)
      setStudentsTotalCount(Number(data.totalStudents || 0))
      setStudentsTotalPages(Number(data.totalPages || 0))
      setStudentQuery({
        search: normalizedSearch,
        classId: normalizedClassId,
        page: nextPage,
      })
      studentQueryRef.current = {
        search: normalizedSearch,
        classId: normalizedClassId,
        page: nextPage,
      }
    } catch (err) {
      if (requestId !== studentsRequestRef.current) {
        return
      }

      setError(err.message)
    } finally {
      if (requestId === studentsRequestRef.current) {
        setStudentsLoading(false)
      }

      if (markReady) {
        setStudentsReady(true)
      }
    }
  }

  const loadClasses = async ({ silent = false } = {}) => {
    const requestId = classesRequestRef.current + 1
    classesRequestRef.current = requestId
    setClassesLoading(true)

    if (!silent) {
      setError('')
    }

    try {
      const data = await apiRequest('/api/admin/classes')
      if (requestId !== classesRequestRef.current) {
        return
      }

      setClasses(data.classes || [])
    } catch (err) {
      if (requestId !== classesRequestRef.current) {
        return
      }

      setError(err.message)
    } finally {
      if (requestId === classesRequestRef.current) {
        setClassesLoading(false)
      }
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
      const data = await apiRequest(`/api/classes/${classId}/feed?limit=all&category=all`)
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
    if (reportsLoading || reportsLoaded) {
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
      setReportsLoaded(true)
      setReportsLoading(false)
    }
  }

  const loadContacts = async () => {
    if (contactsLoading || contactsLoaded) {
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
      setContactsLoaded(true)
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

  const loadSiteNotice = async () => {
    if (noticeLoading) {
      return
    }

    setNoticeLoading(true)
    setError('')

    try {
      const data = await apiRequest('/api/admin/announcement')
      const nextNotice = data.announcement || null
      setSiteNotice(nextNotice)
      setSiteNoticeMessage(nextNotice?.message || '')
      setSiteNoticeColor(nextNotice?.color || 'amber')
    } catch (err) {
      setError(err.message)
    } finally {
      setNoticeLoading(false)
    }
  }

  const saveSiteNotice = async (event) => {
    event.preventDefault()
    setNoticeSaving(true)
    setError('')

    try {
      const data = await apiRequest('/api/admin/announcement', {
        method: 'POST',
        body: JSON.stringify({ message: siteNoticeMessage, color: siteNoticeColor }),
      })

      const nextNotice = data.announcement || null
      setSiteNotice(nextNotice)
      setSiteNoticeMessage(nextNotice?.message || '')
      setSiteNoticeColor(nextNotice?.color || 'amber')
    } catch (err) {
      setError(err.message)
    } finally {
      setNoticeSaving(false)
    }
  }

  const removeSiteNotice = async () => {
    if (!window.confirm('Remove the current site notice?')) {
      return
    }

    setNoticeSaving(true)
    setError('')

    try {
      await apiRequest('/api/admin/announcement', {
        method: 'DELETE',
      })

      setSiteNotice(null)
      setSiteNoticeMessage('')
      setSiteNoticeColor('amber')
    } catch (err) {
      setError(err.message)
    } finally {
      setNoticeSaving(false)
    }
  }

  const loadMessageRecipients = async () => {
    if (messageRecipientsLoading || messageRecipientsLoaded) {
      return
    }

    setMessageRecipientsLoading(true)
    setMessageError('')

    try {
      const firstPage = await apiRequest('/api/admin/students?limit=100&page=1')
      const totalPages = Math.max(Number(firstPage.totalPages || 0), 0)
      const allRecipients = Array.isArray(firstPage.students) ? [...firstPage.students] : []

      if (totalPages > 1) {
        const requests = []

        for (let page = 2; page <= totalPages; page += 1) {
          requests.push(apiRequest(`/api/admin/students?limit=100&page=${page}`))
        }

        const remainingPages = await Promise.all(requests)
        remainingPages.forEach((pageData) => {
          if (Array.isArray(pageData.students)) {
            allRecipients.push(...pageData.students)
          }
        })
      }

      setMessageRecipients(allRecipients)
    } catch (err) {
      setMessageRecipients([])
      setMessageError(err.message)
    } finally {
      setMessageRecipientsLoading(false)
      setMessageRecipientsLoaded(true)
    }
  }

  const loadAdminMessages = async ({ silent = false } = {}) => {
    const requestId = adminMessagesRequestRef.current + 1
    adminMessagesRequestRef.current = requestId
    setAdminMessagesLoading(true)

    if (!silent) {
      setAdminMessagesError('')
    }

    try {
      const data = await apiRequest('/api/admin/messages?limit=100')
      if (requestId !== adminMessagesRequestRef.current) {
        return
      }

      setAdminMessages(Array.isArray(data.messages) ? data.messages : [])
    } catch (err) {
      if (requestId !== adminMessagesRequestRef.current) {
        return
      }

      setAdminMessages([])
      setAdminMessagesError(err.message)
    } finally {
      if (requestId === adminMessagesRequestRef.current) {
        setAdminMessagesLoaded(true)
        setAdminMessagesLoading(false)
      }
    }
  }

  const deleteAdminMessage = async (messageId) => {
    if (!messageId || !window.confirm('Delete this popup message?')) {
      return
    }

    try {
      await apiRequest(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
      })

      setAdminMessages((current) => current.filter((message) => message.id !== messageId))
      setMessageSuccess('Popup message deleted successfully.')
    } catch (err) {
      setAdminMessagesError(err.message)
    }
  }

  const toggleMessageRecipient = (studentId) => {
    const normalizedId = String(studentId || '')
    if (!normalizedId) {
      return
    }

    setMessageSelectedUserIds((current) => (
      current.includes(normalizedId)
        ? current.filter((item) => item !== normalizedId)
        : [...current, normalizedId]
    ))
  }

  const selectVisibleMessageRecipients = () => {
    setMessageSelectedUserIds((current) => {
      const next = new Set(current.map((value) => String(value || '')))
      filteredMessageRecipients.forEach((student) => {
        const studentId = getStudentRowId(student)
        if (studentId) {
          next.add(studentId)
        }
      })

      return [...next]
    })
  }

  const clearMessageRecipientsSelection = () => {
    setMessageSelectedUserIds([])
  }

  const sendStudentPopupMessage = async (event) => {
    event.preventDefault()
    setMessageSending(true)
    setMessageError('')
    setMessageSuccess('')

    try {
      const normalizedBody = messageBody.trim()
      const normalizedSubject = messageSubject.trim()

      if (!normalizedBody) {
        throw new Error('Please write the popup message first.')
      }

      if (messageTargetType === 'user' && !messageSelectedUserIds.length) {
        throw new Error('Please select at least one student.')
      }

      const data = await apiRequest('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({
          targetType: messageTargetType,
          targetUserIds: messageTargetType === 'user' ? messageSelectedUserIds : [],
          subject: normalizedSubject,
          body: normalizedBody,
        }),
      })

      setMessageSuccess(`Popup message sent to ${data.audienceCount || 0} student${Number(data.audienceCount || 0) === 1 ? '' : 's'}.`)
      setMessageBody('')
      setMessageSubject('')
      setMessageSelectedUserIds([])
      setMessageTargetType('all')
      loadAdminMessages({ silent: true })
    } catch (err) {
      setMessageError(err.message)
    } finally {
      setMessageSending(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      return undefined
    }

    loadDashboard()

    const scheduleInitialLoad = () => {
      loadClasses({ silent: true })
      loadStudents({
        page: 1,
        searchTerm: '',
        classId: '',
        silent: true,
        markReady: true,
      })
      loadReports()
      loadContacts()
    }

    const idleId = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(scheduleInitialLoad)
      : window.setTimeout(scheduleInitialLoad, 0)

    return () => {
      if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function' && typeof idleId === 'number') {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }
    }
  }, [isAdmin])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    setStudentQuery((current) => {
      const nextSearch = debouncedSearch.trim()
      const nextClassId = studentClassFilter.trim()

      if (current.search === nextSearch && current.classId === nextClassId && current.page === 1) {
        return current
      }

      return {
        search: nextSearch,
        classId: nextClassId,
        page: 1,
      }
    })
  }, [debouncedSearch, studentClassFilter])

  useEffect(() => {
    if (!isAdmin || !studentsReady) {
      return
    }

    const currentQuery = studentQueryRef.current
    if (
      currentQuery &&
      currentQuery.search === studentQuery.search &&
      currentQuery.classId === studentQuery.classId &&
      currentQuery.page === studentQuery.page
    ) {
      return
    }

    loadStudents({
      page: studentQuery.page,
      searchTerm: studentQuery.search,
      classId: studentQuery.classId,
    })
  }, [isAdmin, studentsReady, studentQuery])

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

    const prefetch = async () => {
      try {
        await apiRequest(`/api/classes/${selectedClassFeedId}/feed?limit=all&category=all`)
      } catch {
        // Background warm-up only.
      }
    }

    prefetch()
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

    if (activeTab === 'message') {
      loadSiteNotice()
      loadMessageRecipients()
      loadAdminMessages()

      const timer = window.setInterval(() => {
        loadAdminMessages({ silent: true })
      }, 30000)

      return () => window.clearInterval(timer)
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

      const data = await apiRequest(path, {
        method,
        body: JSON.stringify(classForm),
      })

      const savedClass = {
        ...(classes.find((classItem) => classItem._id === editingClassId) || {}),
        ...(data.class || {}),
      }

      setClassForm(emptyClassForm)
      setEditingClassId('')

      if (editingClassId) {
        setClasses((current) =>
          current.map((classItem) =>
            classItem._id === editingClassId
              ? {
                  ...classItem,
                  ...savedClass,
                  studentCount: classItem.studentCount || 0,
                }
              : classItem,
          ),
        )
        updateStudentsForClassChange(editingClassId, { className: savedClass.name || classForm.name || '' })
      } else if (savedClass?._id) {
        setClasses((current) => [
          {
            ...savedClass,
            studentCount: 0,
          },
          ...current,
        ])
        updateDashboardCount('totalClasses', 1)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setClassSaving(false)
    }
  }

  const assignStudentClass = async (studentId, classId) => {
    try {
      const data = await apiRequest(`/api/admin/students/${studentId}/class`, {
        method: 'PATCH',
        body: JSON.stringify({ classId }),
      })

      const updatedUser = data.user || {}
      patchStudentState(studentId, {
        classId: updatedUser.classId ?? classId ?? '',
        className: updatedUser.className || '',
      })

      const currentQuery = studentQueryRef.current
      if (currentQuery && (currentQuery.search || currentQuery.classId)) {
        await loadStudents({
          page: currentQuery.page,
          searchTerm: currentQuery.search,
          classId: currentQuery.classId,
          silent: true,
        })
      }
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

      setClasses((current) => current.filter((item) => item._id !== classItem._id))
      updateDashboardCount('totalClasses', -1)
      updateStudentsForClassChange(classItem._id, {
        classId: '',
        className: '',
      })
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
      updateDashboardCount('totalReports', -1)
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
      updateDashboardCount('totalFeedback', -1)
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
  const selectedClassTargetCount = classShareTargets.filter((target) => target.enabled).length
  const groupedClassPosts = useMemo(
    () => {
      const visibleCategories = classBoardCategoryFilter === 'all'
        ? CLASS_POST_CATEGORIES
        : CLASS_POST_CATEGORIES.filter((category) => category.value === classBoardCategoryFilter)

      return visibleCategories.map((category) => ({
        ...category,
        posts: classPosts.filter((post) => (post.category || 'assignment') === category.value),
      }))
    },
    [classBoardCategoryFilter, classPosts],
  )
  const visibleClassPostCount = useMemo(
    () => groupedClassPosts.reduce((sum, group) => sum + group.posts.length, 0),
    [groupedClassPosts],
  )
  const openReports = useMemo(() => reports.filter((report) => report.status === 'open'), [reports])

  const renderReportsContent = () => {
    if (reportsLoading || (activeTab === 'reports' && !reportsLoaded)) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Loading reports...
        </div>
      )
    }

    if (!reports.length) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          No reports available.
        </div>
      )
    }

    return reports.map((report) => (
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
  }

  const renderContactsContent = () => {
    if (contactsLoading || (activeTab === 'contacts' && !contactsLoaded)) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Loading contacts...
        </div>
      )
    }

    if (!contacts.length) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          No contact messages available.
        </div>
      )
    }

    return contacts.map((contact) => (
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
  }

  const renderFeedbackContent = () => {
    if (feedbackLoading || (activeTab === 'feedback' && !feedbacks.length)) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Loading feedback...
        </div>
      )
    }

    if (!feedbacks.length) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          No feedback has been submitted yet.
        </div>
      )
    }

    return feedbacks.map((feedbackItem) => (
      <article key={feedbackItem.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              {feedbackItem.name} {feedbackItem.className ? `- ${feedbackItem.className}` : ''}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              {formatFeedbackSourceLabel(feedbackItem)}
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
    ))
  }

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
              <Stat label="Students" value={dashboardCounts.totalStudents ?? '—'} loading={dashboardLoading} />
              <Stat label="Classes" value={dashboardCounts.totalClasses ?? '—'} loading={dashboardLoading} />
              <Stat label="Reports" value={dashboardCounts.totalReports ?? '—'} loading={dashboardLoading} />
              <Stat label="Feedback" value={dashboardCounts.totalFeedback ?? '—'} loading={dashboardLoading} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {['students', 'classes', 'class-board', 'reports', 'contacts', 'feedback', 'message'].map((tab) => (
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
                    {studentsLoading && !students.length ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="h-5 w-44 rounded bg-slate-200" />
                          <div className="mt-3 h-4 w-56 rounded bg-slate-200" />
                          <div className="mt-3 h-4 w-40 rounded bg-slate-200" />
                          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_250px]">
                            <div className="h-20 rounded-2xl bg-white" />
                            <div className="h-20 rounded-2xl bg-white" />
                          </div>
                        </div>
                      ))
                    ) : students.length ? (
                      students.map((student) => (
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
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                        No students match this search or class filter.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {studentsLoading
                        ? 'Loading the current student page...'
                        : `${studentsTotalCount} student${studentsTotalCount === 1 ? '' : 's'} found`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStudentQuery((current) => ({ ...current, page: Math.max((current.page || 1) - 1, 1) }))}
                        disabled={studentsLoading || studentQuery.page <= 1}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-semibold text-slate-500">
                        Page {studentsTotalPages ? Math.min(studentQuery.page, studentsTotalPages) : 0} of {studentsTotalPages || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStudentQuery((current) => ({ ...current, page: current.page + 1 }))}
                        disabled={studentsLoading || !studentsTotalPages || studentQuery.page >= studentsTotalPages}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
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
                      {classesLoading && !classes.length ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          Loading classes...
                        </div>
                      ) : classes.length ? (
                        classes.map((classItem) => (
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
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                          No classes created yet.
                        </div>
                      )}
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
                            <option value="">{classesLoading ? 'Loading classes...' : 'No classes available'}</option>
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
                            {classesLoading ? 'Loading classes...' : 'No classes available yet.'}
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

                    <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:justify-between">
                      <label className="grid gap-2 text-sm font-bold text-slate-600 sm:min-w-[260px]">
                        Filter uploads
                        <select
                          value={classBoardCategoryFilter}
                          onChange={(event) => setClassBoardCategoryFilter(event.target.value)}
                          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
                        >
                          <option value="all">All categories</option>
                          {CLASS_POST_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                        Showing {visibleClassPostCount} upload{visibleClassPostCount === 1 ? '' : 's'}
                      </div>
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
                      {renderReportsContent()}
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
                      {renderContactsContent()}
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
                      {renderFeedbackContent()}
                    </div>
                  </div>
                )}

                {activeTab === 'message' && (
                  <div className="grid gap-6">
                    <div className="rounded-[1.75rem] border border-cyan-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircleMore className="h-5 w-5 text-cyan-600" />
                          <h2 className="font-serif text-3xl text-slate-950">Student popup message</h2>
                        </div>
                        <div className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                          Popup overlay
                        </div>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Send an attention-grabbing popup to all students or to selected students only. On the student side,
                        the close and dislike actions are temporary, while thumbs up hides the message after reload.
                      </p>

                      {messageError && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          {messageError}
                        </div>
                      )}

                      {messageSuccess && (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                          {messageSuccess}
                        </div>
                      )}

                      <form onSubmit={sendStudentPopupMessage} className="mt-5 grid gap-4 rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <label className="grid gap-2 text-sm font-bold text-slate-600">
                            Message title
                            <input
                              value={messageSubject}
                              onChange={(event) => setMessageSubject(event.target.value)}
                              placeholder="Optional title for the popup"
                              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-400"
                            />
                          </label>

                          <div className="grid gap-2 text-sm font-bold text-slate-600">
                            Audience
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${messageTargetType === 'all' ? 'border-cyan-300 bg-cyan-50 text-cyan-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                                <input
                                  type="radio"
                                  name="messageTargetType"
                                  checked={messageTargetType === 'all'}
                                  onChange={() => setMessageTargetType('all')}
                                  className="h-4 w-4 accent-cyan-600"
                                />
                                <span>
                                  <span className="block text-sm font-black">All students</span>
                                  <span className="block text-xs font-semibold text-slate-500">Send to every non-admin account.</span>
                                </span>
                              </label>

                              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${messageTargetType === 'user' ? 'border-cyan-300 bg-cyan-50 text-cyan-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                                <input
                                  type="radio"
                                  name="messageTargetType"
                                  checked={messageTargetType === 'user'}
                                  onChange={() => setMessageTargetType('user')}
                                  className="h-4 w-4 accent-cyan-600"
                                />
                                <span>
                                  <span className="block text-sm font-black">Specific students</span>
                                  <span className="block text-xs font-semibold text-slate-500">Pick one or more students.</span>
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          Popup text
                          <textarea
                            value={messageBody}
                            onChange={(event) => setMessageBody(event.target.value)}
                            rows={6}
                            placeholder="Write the message that should appear as a popup on student screens..."
                            className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400"
                          />
                        </label>

                        {messageTargetType === 'user' && (
                          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-slate-950">Choose students</p>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                  Search and tick one or more students. The popup will be sent to everyone selected here.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={selectVisibleMessageRecipients}
                                  disabled={!filteredMessageRecipients.length}
                                  className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Select visible
                                </button>
                                <button
                                  type="button"
                                  onClick={clearMessageRecipientsSelection}
                                  disabled={!messageSelectedUserIds.length}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Clear selected
                                </button>
                              </div>
                            </div>

                            <label className="relative mt-4 block">
                              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                value={messageRecipientSearch}
                                onChange={(event) => setMessageRecipientSearch(event.target.value)}
                                placeholder="Search by name, email, phone, or class..."
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                              />
                            </label>

                            {selectedMessageRecipients.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {selectedMessageRecipients.slice(0, 8).map((student) => (
                                  <span
                                    key={getStudentRowId(student)}
                                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800"
                                  >
                                    {student.name}
                                  </span>
                                ))}
                                {selectedMessageRecipients.length > 8 && (
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                    +{selectedMessageRecipients.length - 8} more
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-4 max-h-[340px] overflow-auto rounded-3xl border border-slate-200 bg-slate-50">
                              {messageRecipientsLoading ? (
                                <div className="px-4 py-6 text-sm font-semibold text-slate-500">
                                  Loading students...
                                </div>
                              ) : filteredMessageRecipients.length ? (
                                <div className="grid divide-y divide-slate-200">
                                  {filteredMessageRecipients.map((student) => {
                                    const studentId = getStudentRowId(student)
                                    const checked = messageSelectedUserIds.includes(studentId)

                                    return (
                                      <label
                                        key={studentId}
                                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${checked ? 'bg-cyan-50/80' : 'hover:bg-white'}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleMessageRecipient(studentId)}
                                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-black text-slate-900">{student.name}</p>
                                          <p className="truncate text-xs font-semibold text-slate-500">
                                            {student.email}
                                            {student.phoneNumber ? ` | ${student.phoneNumber}` : ''}
                                          </p>
                                        </div>
                                        <div className="text-right text-xs font-bold text-slate-500">
                                          <p>{student.className || 'No class'}</p>
                                          {checked && (
                                            <p className="mt-1 text-cyan-700">Selected</p>
                                          )}
                                        </div>
                                      </label>
                                    )
                                  })}
                                </div>
                              ) : messageRecipientsLoaded ? (
                                <div className="px-4 py-6 text-sm font-semibold text-slate-500">
                                  No students match your search.
                                </div>
                              ) : (
                                <div className="px-4 py-6 text-sm font-semibold text-slate-500">
                                  Load student list first.
                                </div>
                              )}
                            </div>

                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                              {messageSelectedUserIds.length
                                ? `${messageSelectedUserIds.length} student${messageSelectedUserIds.length === 1 ? '' : 's'} selected`
                                : 'Select at least one student to send a private popup.'}
                            </p>
                          </div>
                        )}

                        <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm leading-6 text-cyan-950">
                          This popup appears on top of the student screen, so it is much harder to miss than the scrolling notice.
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="submit"
                            disabled={messageSending}
                            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {messageSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {messageSending ? 'Sending...' : 'Send popup message'}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="font-serif text-3xl text-slate-950">Sent popup messages</h2>
                          <p className="mt-2 text-sm text-slate-500">
                            Track who has seen each popup and delete any message when you no longer need it.
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                          {adminMessages.length}
                        </span>
                      </div>

                      {adminMessagesError && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                          {adminMessagesError}
                        </div>
                      )}

                      <div className="mt-5 grid gap-3">
                        {adminMessagesLoading && !adminMessages.length ? (
                          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                            Loading sent messages...
                          </div>
                        ) : adminMessages.length ? (
                          adminMessages.map((message) => (
                            <article key={message.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                                    {formatPopupAudienceLabel(message)}
                                  </p>
                                  <h3 className="mt-2 truncate text-xl font-black tracking-tight text-slate-950">
                                    {message.subject || 'Important message'}
                                  </h3>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    {message.createdBy?.name || 'Admin'}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                                    Seen {message.acknowledgedCount || 0}/{message.audienceCount || 0}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteAdminMessage(message.id)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                                    aria-label="Delete popup message"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {message.body ? (
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                  {message.body}
                                </p>
                              ) : null}
                            </article>
                          ))
                        ) : adminMessagesLoaded ? (
                          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                            No popup messages sent yet.
                          </div>
                        ) : (
                          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                            Open this tab to load sent messages.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <BellRing className="h-5 w-5 text-amber-600" />
                        <h2 className="font-serif text-3xl text-slate-950">Site notice</h2>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        This is the scrolling banner below the navbar. Use it for short announcements; use the popup above for messages that need special attention.
                      </p>

                      <form onSubmit={saveSiteNotice} className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          Message
                          <textarea
                            value={siteNoticeMessage}
                            onChange={(event) => setSiteNoticeMessage(event.target.value)}
                            rows={4}
                            placeholder="Type the notice message that should scroll right to left..."
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400"
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-bold text-slate-600">
                          Colour theme
                          <select
                            value={siteNoticeColor}
                            onChange={(event) => setSiteNoticeColor(event.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-amber-400"
                          >
                            {NOTICE_COLOR_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="submit"
                            disabled={noticeSaving}
                            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {noticeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {noticeSaving ? 'Saving...' : 'Save notice'}
                          </button>
                          <button
                            type="button"
                            onClick={removeSiteNotice}
                            disabled={noticeSaving || !siteNotice}
                            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-red-100 bg-white font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remove notice
                          </button>
                        </div>
                      </form>

                      <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Current notice</p>
                        {noticeLoading ? (
                          <div className="mt-3 rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-4 text-sm text-amber-700">
                            Loading current notice...
                          </div>
                        ) : siteNotice?.message ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm leading-7 text-slate-700">{siteNotice.message}</p>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                              Theme: {siteNotice.color || 'amber'}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-7 text-slate-500">
                            No notice is active right now.
                          </p>
                        )}
                      </div>
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

const Stat = ({ label, value, loading = false }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    {loading ? (
      <div className="mt-3 h-8 w-20 animate-pulse rounded-2xl bg-slate-200" />
    ) : (
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    )}
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
