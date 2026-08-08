import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  Edit3,
  Lock,
  LogOut,
  Mail,
  Save,
  User,
  X,
  ChevronRight,
  TrendingUp,
  Award,
  BookOpen,
  Activity
} from 'lucide-react'
import { apiRequest, assetUrl } from '../api'
import { clearAuth, getStoredAuth, updateStoredUser } from '../authStorage'

const createCroppedWebp = ({ imageSrc, zoom, offset }) => {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const size = 512
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      canvas.width = size
      canvas.height = size

      const scale = Math.max(size / image.width, size / image.height) * zoom
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const drawX = (size - drawWidth) / 2 + offset.x
      const drawY = (size - drawHeight) / 2 + offset.y

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, size, size)
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not prepare image.'))
            return
          }

          resolve(blob)
        },
        'image/webp',
        0.9,
      )
    }

    image.onerror = () => reject(new Error('Could not load image.'))
    image.src = imageSrc
  })
}

const modalClasses =
  'w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl relative z-[80]'

const Profilepage = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const dragRef = useRef(null)

  const [auth, setAuth] = useState(() => getStoredAuth())
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeEditor, setActiveEditor] = useState('')
  const [name, setName] = useState(auth?.user?.name || '')
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState(null)
  const [selectedImage, setSelectedImage] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!auth) return

    apiRequest('/api/auth/me')
      .then((data) => {
        const updatedAuth = updateStoredUser(data.user)
        setAuth(updatedAuth)
        setName(data.user.name)
      })
      .catch(() => setAuth(null))

    apiRequest('/api/progress/me')
      .then((data) => setProgress(data.progress || null))
      .catch(() => setProgress(null))
  }, [])

  const openEditor = (editor) => {
    setIsMenuOpen(false)
    setActiveEditor(editor)
    setError('')
    setMessage('')
  }

  const closeEditor = () => {
    setActiveEditor('')
    setError('')
    setIsSaving(false)
  }

  const handleLogout = () => {
    clearAuth()
    setAuth(null)
    navigate('/signin')
  }

  const saveName = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const data = await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      const updatedAuth = updateStoredUser(data.user)
      setAuth(updatedAuth)
      setMessage('Name updated successfully.')
      closeEditor()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const saveEmail = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const data = await apiRequest('/api/auth/update-email', {
        method: 'PATCH',
        body: JSON.stringify(emailForm),
      })
      const updatedAuth = updateStoredUser(data.user)
      setAuth(updatedAuth)
      setEmailForm({ newEmail: '', currentPassword: '' })
      setMessage('Email address updated successfully.')
      closeEditor()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setError('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsSaving(true)

    try {
      await apiRequest('/api/auth/update-password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage('Password changed successfully.')
      closeEditor()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  const startDrag = (event) => {
    const point = event.touches?.[0] || event
    dragRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      current: offset,
    }
  }

  const moveDrag = (event) => {
    if (!dragRef.current) return
    const point = event.touches?.[0] || event
    setOffset({
      x: dragRef.current.current.x + point.clientX - dragRef.current.startX,
      y: dragRef.current.current.y + point.clientY - dragRef.current.startY,
    })
  }

  const uploadProfileImage = async () => {
    setError('')
    setIsSaving(true)

    try {
      const blob = await createCroppedWebp({ imageSrc: selectedImage, zoom, offset })
      const formData = new FormData()
      formData.append('profileImage', blob, 'profile-image.webp')

      const data = await apiRequest('/api/auth/profile-image', {
        method: 'POST',
        body: formData,
      })

      const updatedAuth = updateStoredUser(data.user)
      setAuth(updatedAuth)
      setSelectedImage('')
      setMessage('Profile photo updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Auth Guard State UI
  if (!auth) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"
        >
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-cyan-50 text-cyan-600">
            <User className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profile Access</h1>
          <p className="mt-3 text-slate-500">Sign in to view your profile and analytics dashboard.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link to="/signin" className="flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 transition-all">
              Sign in
            </Link>
            <Link to="/signup" className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-bold text-white shadow-md shadow-cyan-100 hover:opacity-9p transition-all">
              Sign up
            </Link>
          </div>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="min-h-screen w-full bg-slate-50/50 p-4 sm:p-6 lg:p-8 flex items-center justify-center font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <div className="w-full max-w-6xl bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col lg:flex-row lg:h-[85vh] min-h-[600px]">
        
        {/* Left Side: Profile Information & Settings Anchor */}
        <div className="w-full lg:w-[35%] bg-slate-50/70 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 relative">
          
          {/* Settings Actions Menu Trigger */}
          <div className="absolute right-6 top-6 z-20">
            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-cyan-300 hover:bg-cyan-50/50 hover:text-cyan-600 active:scale-95"
              aria-label="Open profile edit menu"
            >
              <Edit3 className="h-5 w-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-14 z-20 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1 shadow-xl"
                  >
                    {[
                      { icon: User, text: 'Change name', action: () => openEditor('name') },
                      { icon: Mail, text: 'Change email', action: () => openEditor('email') },
                      { icon: Lock, text: 'Change password', action: () => openEditor('password') },
                      { icon: Camera, text: 'Change photo', action: () => { setIsMenuOpen(false); fileInputRef.current?.click() } },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={item.action}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-left"
                      >
                        <item.icon className="h-4 w-4 text-cyan-500" />
                        {item.text}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Core Identity Profile Info */}
          <div className="flex flex-col items-center text-center my-auto py-4">
            <div className="relative group">
              <div className="h-32 w-32 sm:h-36 sm:w-36 overflow-hidden rounded-full border-[6px] border-white bg-white shadow-md transition-transform duration-300 group-hover:scale-[1.02]">
                {auth.user.profileImageUrl ? (
                  <img
                    src={assetUrl(auth.user.profileImageUrl)}
                    alt={auth.user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-slate-100 text-slate-400">
                    <User className="h-14 w-14" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 bg-cyan-500 text-white p-2.5 rounded-full shadow-md hover:bg-cyan-600 transition-all active:scale-90 border-2 border-white"
                title="Change Avatar"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <h1 className="mt-5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{auth.user.name}</h1>
            <p className="mt-1 break-all text-sm font-medium text-slate-400 max-w-[240px]">{auth.user.email}</p>
            
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-50/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-700 border border-cyan-100/50">
              <BookOpen className="h-3 w-3" />
              {auth.user.className || 'No class assigned'}
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-100/50">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified Profile
            </div>

            {message && (
              <motion.p 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2"
              >
                {message}
              </motion.p>
            )}
          </div>

          {/* Sidebar Bottom Action: Logout */}
          <div className="mt-auto pt-4 border-t border-slate-200/60 lg:border-none flex justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/60 px-5 py-3 font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-600 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              Logout Account
            </button>
          </div>
        </div>

        {/* Right Side: Scrollable Progress Metrics Panel */}
        <div className="w-full lg:w-[65%] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto lg:h-full scrollbar-thin scrollbar-thumb-slate-200">
          
          {progress ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Header Context Indicator */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Performance Summary</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time educational platform progress analytics</p>
                </div>
                <Activity className="h-5 w-5 text-slate-300 hidden sm:block" />
              </div>

              {/* Stat Cards Matrix */}
              <div className="grid grid-cols-3 gap-3">
                <MiniStatCard 
                  label="Brain cells" 
                  value={progress.totalBrainCells || 0} 
                  icon={Award}
                  accentClass="bg-amber-50 text-amber-600 border-amber-100/70"
                />
                <MiniStatCard 
                  label="Average" 
                  value={`${progress.averagePercent || 0}%`} 
                  icon={TrendingUp}
                  accentClass="bg-cyan-50 text-cyan-600 border-cyan-100/70"
                />
                <MiniStatCard 
                  label="Attempts" 
                  value={progress.attemptCount || 0} 
                  icon={User}
                  accentClass="bg-indigo-50 text-indigo-600 border-indigo-100/70"
                />
              </div>

              {/* Progress Detail: Chapters Panel */}
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Chapter Milestones</span>
                    <h3 className="text-lg font-bold text-slate-900">Latest progress by chapter</h3>
                  </div>
                  <Link 
                    to="/improvement" 
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-cyan-700 shadow-md shadow-cyan-100 active:scale-95"
                  >
                    Improvement matrix
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid gap-3 max-h-[32vh] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {(progress.chapterReports || []).map((chapter, index) => (
                      <motion.article 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={chapter.chapterId} 
                        className="rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-cyan-100 group shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chapter {chapter.chapterNumber}</span>
                            <h4 className="text-base font-black text-slate-800 tracking-tight mt-0.5">{chapter.chapterName}</h4>
                          </div>
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 border border-cyan-100/50">
                            {chapter.latestPercent || 0}%
                          </span>
                        </div>
                        
                        {/* Micro Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${chapter.latestPercent || 0}%` }}
                          />
                        </div>

                        <div className="mt-3.5 grid grid-cols-3 gap-2 text-center pt-2.5 border-t border-slate-50">
                          <MiniStatDetail label="Latest Score" value={`${chapter.latestScore}/${chapter.latestTotalQuestions}`} />
                          <MiniStatDetail label="Best Avg" value={`${chapter.bestPercent || chapter.latestPercent || 0}%`} />
                          <MiniStatDetail label="Brain Cells Net" value={chapter.latestBrainCells || 0} />
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Recent Activity Pipeline */}
              {progress.latestAttempts?.length > 0 && (
                <div className="rounded-2xl border border-slate-100 p-4 bg-white shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recent attempts timeline</p>
                  <div className="mt-2.5 grid gap-2">
                    {progress.latestAttempts.slice(0, 3).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3.5 py-2 text-xs font-semibold text-slate-600 border border-slate-100/50">
                        <span className="truncate max-w-[240px] text-slate-700 font-bold">{attempt.sourceName || attempt.attemptType}</span>
                        <span className="text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-100">
                          {attempt.totalScore}/{attempt.totalQuestions} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 my-auto">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 animate-pulse">
                <Activity className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-700">No telemetry data recorded yet</p>
              <p className="text-xs text-slate-400 max-w-[240px] mt-1">Complete your diagnostic tasks or chapters to populate metric tracking insights.</p>
            </div>
          )}
        </div>

      </div>

      {/* Overlaid Modal Canvas Controllers */}
      <AnimatePresence>
        {activeEditor && (
          <EditorModal title={`Change ${activeEditor}`} onClose={closeEditor}>
            {activeEditor === 'name' && (
              <form onSubmit={saveName} className="grid gap-4">
                <FormInput label="Full name" value={name} onChange={setName} icon={User} />
                <FormError error={error} />
                <SubmitButton loading={isSaving} label="Save Name" />
              </form>
            )}

            {activeEditor === 'email' && (
              <form onSubmit={saveEmail} className="grid gap-4">
                <FormInput
                  label="New target email"
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(value) => setEmailForm({ ...emailForm, newEmail: value })}
                  icon={Mail}
                />
                <FormInput
                  label="Confirm Identity via Password"
                  type="password"
                  value={emailForm.currentPassword}
                  onChange={(value) => setEmailForm({ ...emailForm, currentPassword: value })}
                  icon={Lock}
                />
                <FormError error={error} />
                <SubmitButton loading={isSaving} label="Update Email Anchor" />
              </form>
            )}

            {activeEditor === 'password' && (
              <form onSubmit={savePassword} className="grid gap-4">
                <FormInput
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })}
                  icon={Lock}
                />
                <FormInput
                  label="New Key Signature"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
                  icon={Lock}
                />
                <FormInput
                  label="Confirm New Key Signature"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(value) => setPasswordForm({ ...passwordForm, confirmPassword: value })}
                  icon={Lock}
                />
                <FormError error={error} />
                <SubmitButton loading={isSaving} label="Commit Secure Update" />
              </form>
            )}
          </EditorModal>
        )}

        {/* Modular Avatar Cropper Sheet */}
        {selectedImage && (
          <EditorModal title="Refine Photo Composition" onClose={() => setSelectedImage('')}>
            <div
              role="presentation"
              onMouseDown={startDrag}
              onMouseMove={moveDrag}
              onMouseUp={() => { dragRef.current = null }}
              onMouseLeave={() => { dragRef.current = null }}
              onTouchStart={startDrag}
              onTouchMove={moveDrag}
              onTouchEnd={() => { dragRef.current = null }}
              className="mx-auto h-56 w-56 cursor-move touch-none overflow-hidden rounded-full border-4 border-slate-100 bg-slate-50 shadow-inner relative"
              style={{
                backgroundImage: `url(${selectedImage})`,
                backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${zoom * 100}% auto`,
              }}
            />
            <label className="mt-5 grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
              Adjust Zoom Scale
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-500 mt-1"
              />
            </label>
            <FormError error={error} />
            <button
              type="button"
              onClick={uploadProfileImage}
              disabled={isSaving}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 font-bold text-white shadow-lg shadow-cyan-100 transition-opacity disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {isSaving ? 'Uploading Matrix...' : 'Commit Photo Update'}
            </button>
          </EditorModal>
        )}
      </AnimatePresence>
    </section>
  )
}

/* Atomic Modular Subcomponents */

const EditorModal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 15 }}
      className={modalClasses}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </motion.div>
  </div>
)

const FormInput = ({ label, value, onChange, icon: Icon, type = 'text' }) => (
  <label className="grid gap-1.5 text-xs font-bold text-slate-500">
    {label}
    <div className="relative mt-0.5">
      <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-50"
      />
    </div>
  </label>
)

const FormError = ({ error }) =>
  error ? (
    <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-500">
      {error}
    </p>
  ) : null

const SubmitButton = ({ loading, label }) => (
  <button
    type="submit"
    disabled={loading}
    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-bold text-white shadow-md shadow-cyan-100 disabled:opacity-60 active:scale-[0.98] transition-transform mt-2"
  >
    <Save className="h-4 w-4" />
    {loading ? 'Saving...' : label}
  </button>
)

const MiniStatCard = ({ label, value, icon: Icon, accentClass }) => (
  <div className={`rounded-2xl border p-3 flex flex-col justify-between shadow-sm bg-white relative overflow-hidden group`}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <div className={`p-1.5 rounded-lg ${accentClass} border`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
    </div>
    <p className="mt-2.5 text-xl font-black text-slate-900 tracking-tight">{value}</p>
  </div>
)

const MiniStatDetail = ({ label, value }) => (
  <div className="bg-slate-50/60 rounded-xl py-1.5 px-1 border border-slate-100/50">
    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-0.5 text-xs font-bold text-slate-800">{value}</p>
  </div>
)

export default Profilepage;
