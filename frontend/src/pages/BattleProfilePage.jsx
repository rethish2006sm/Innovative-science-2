import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Gamepad2, Loader2, Sparkles, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiRequest, assetUrl } from '../api'
import { getStoredAuth, updateStoredUser } from '../authStorage'
import BattleNavbar from '../components/BattleNavbar'
import { useAuth } from '../context/AuthContext'

const BattleProfilePage = () => {
  const navigate = useNavigate()
  const { completeProfile } = useAuth()
  const savedUser = getStoredAuth()?.user || {}
  const [gameId, setGameId] = useState(savedUser.gameId || '')
  const [battleImage, setBattleImage] = useState(null)
  const [battleImagePreview, setBattleImagePreview] = useState(savedUser.battleProfileImageUrl ? assetUrl(savedUser.battleProfileImageUrl) : '')
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [availability, setAvailability] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const chooseBattleImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setBattleImage(file)
    setBattleImagePreview(URL.createObjectURL(file))
    setShowImageMenu(false)
    setError('')
    setImageUploading(true)
    try {
      const imageData = new FormData()
      imageData.append('battleProfileImage', file)
      const result = await apiRequest('/api/auth/battle-profile-image', { method: 'POST', body: imageData })
      if (result?.user) updateStoredUser(result.user)
      setBattleImage(null)
    } catch (uploadError) {
      setError(uploadError.message || 'Could not save Battle profile image.')
    } finally { setImageUploading(false) }
  }

  const removeBattleImage = async () => {
    setShowImageMenu(false)
    setBattleImage(null)
    setBattleImagePreview('')
    if (!getStoredAuth()?.user?.battleProfileImageUrl) return
    try {
      const result = await apiRequest('/api/auth/battle-profile-image', { method: 'DELETE' })
      if (result?.user) updateStoredUser(result.user)
    } catch (removeError) { setError(removeError.message || 'Could not remove Battle profile image.') }
  }

  const handleImageButtonClick = () => {
    if (!battleImagePreview) { fileInputRef.current?.click(); return }
    setShowImageMenu((current) => !current)
  }

  const normalizedGameId = gameId.trim()
  const hasAllowedCharacters = /^[A-Za-z0-9_]*$/.test(normalizedGameId)
  const isValid = /(?=.*\d)^[A-Za-z0-9_]{6,14}$/.test(normalizedGameId)
  const validationMessage = !normalizedGameId
    ? 'Choose a Game ID to enter the Battle Arena.'
    : !hasAllowedCharacters
      ? 'Use only letters, numbers, and underscores.'
      : normalizedGameId.length < 6
        ? `Add ${6 - normalizedGameId.length} more character${6 - normalizedGameId.length === 1 ? '' : 's'} to unlock your ID.`
        : normalizedGameId.length > 14
          ? 'Keep your Game ID within 14 characters.'
          : !/\d/.test(normalizedGameId)
            ? 'Add at least one number to make your Game ID valid.'
            : availability === 'taken'
              ? 'That Game ID is already taken. Choose another one.'
              : availability === 'available'
                ? 'Game ID unlocked. You are ready to battle.'
                : 'Checking your Game ID availability...'

  useEffect(() => {
    if (!gameId) { setAvailability(null); setChecking(false); return undefined }
    if (!isValid) { setAvailability(null); setChecking(false); return undefined }
    setChecking(true)
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiRequest(`/api/battle-mode/game-id-availability/${encodeURIComponent(normalizedGameId)}`, { cache: 'no-store' })
        setAvailability(result.available ? 'available' : 'taken')
      } catch { setAvailability(null) } finally { setChecking(false) }
    }, 420)
    return () => window.clearTimeout(timer)
  }, [gameId, isValid, normalizedGameId])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!isValid) { setError(validationMessage); return }
    if (availability === 'taken') { setError('That Game ID is already taken. Try another one.'); return }
    setLoading(true)
    try {
      const profileResult = await completeProfile({ gameId: normalizedGameId })
      if (battleImage) {
        const imageData = new FormData()
        imageData.append('battleProfileImage', battleImage)
        const imageResult = await apiRequest('/api/auth/battle-profile-image', { method: 'POST', body: imageData })
        if (imageResult?.user) updateStoredUser(imageResult.user)
      } else if (profileResult) updateStoredUser(profileResult)
      navigate(new URLSearchParams(window.location.search).get('returnTo') || '/battle-mode', { replace: true })
    } catch (submitError) { setError(submitError.message || 'Could not save your Battle GameID.') } finally { setLoading(false) }
  }

  return <main className="battle-profile-shell relative min-h-screen overflow-hidden px-4 py-5 text-slate-900 sm:px-6 sm:py-8 lg:px-8"><div className="relative z-20 mx-auto max-w-5xl"><BattleNavbar /></div><motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }} className="relative z-10 mx-auto mt-6 max-w-5xl sm:mt-8"><div className="grid items-start gap-4 lg:grid-cols-[1fr_430px] lg:items-center lg:gap-14"><section className="flex flex-col items-center text-center lg:items-start lg:text-left"><div className={`battle-image-picker mx-auto lg:mx-0 ${showImageMenu ? 'has-menu' : ''}`} aria-label="Battle Mode profile image">{battleImagePreview ? <img src={battleImagePreview} alt="Battle profile preview" /> : <UserRound size={48} strokeWidth={2.2} />}<button type="button" className="battle-image-add" onClick={handleImageButtonClick} aria-label={battleImagePreview ? 'Manage Battle profile image' : 'Add Battle profile image'} aria-expanded={showImageMenu}>+</button>{showImageMenu && battleImagePreview && <div className="battle-image-menu"><button type="button" onClick={() => { setShowImageMenu(false); fileInputRef.current?.click() }}>Change photo</button><button type="button" onClick={removeBattleImage} className="is-danger">Remove photo</button></div>}<input ref={fileInputRef} type="file" accept="image/*" onChange={chooseBattleImage} /></div><div className="mt-7 hidden items-center gap-2 rounded-full border border-orange-200 bg-white/85 px-4 py-2 text-[10px] font-black uppercase tracking-[.28em] text-orange-600 shadow-sm lg:inline-flex"><Sparkles size={13} /> Battle Arena</div><h1 className="mt-5 hidden text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:block">Choose Your<br /><span className="battle-gradient-text">Battle Identity</span></h1><p className="mx-auto mt-5 hidden max-w-lg text-base font-medium leading-7 text-slate-500 lg:block lg:mx-0">Your identity. Your arena. Your victory.</p><p className="mt-4 hidden text-xs font-bold text-slate-400 lg:block">Tap the profile icon to add your Battle Mode profile image.</p></section><motion.form initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .18, duration: .5 }} onSubmit={submit} className="battle-id-card"><div className={`battle-input-wrap ${isValid ? 'is-valid' : ''} ${availability === 'taken' ? 'is-taken' : ''}`}><Gamepad2 size={19} className="text-orange-400" /><input value={gameId} onChange={(event) => setGameId(event.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 14))} placeholder="e.g. cosmic_fox7" maxLength={14} autoFocus aria-describedby="gameid-help" required />{checking ? <Loader2 size={18} className="animate-spin text-orange-400" /> : isValid && availability !== 'taken' ? <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}><Check size={19} className="text-emerald-500" /></motion.span> : availability === 'taken' ? <X size={19} className="text-rose-500" /> : null}</div><AnimatePresence mode="wait"><motion.p key={validationMessage} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className={`mt-3 flex items-center gap-2 text-xs font-black ${isValid && availability !== 'taken' ? 'text-emerald-600' : 'text-orange-600'}`}><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-orange-100">{isValid && availability !== 'taken' ? <Check size={11} /> : '!'}</span>{validationMessage}</motion.p></AnimatePresence>{error && <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p>}<motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: .98 }} type="submit" disabled={loading || checking || availability === 'taken'} className="battle-enter-button mt-6">{loading ? <Loader2 size={19} className="animate-spin" /> : <><span>Enter the Battle Arena</span><ArrowRight size={19} /></>}</motion.button></motion.form></div></motion.div></main>
}

export default BattleProfilePage
