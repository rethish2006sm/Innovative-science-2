import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Crown,
  BellRing,
  LogOut,
  MessageCircleMore,
  Send,
  Settings2,
  ShieldAlert,
  Swords,
  Trophy,
  Users,
  Save,
  Trash2,
  Zap,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest } from '../api'
import { getStoredAuth } from '../authStorage'
import { createBattleSocket } from '../lib/battleSocket'
import { clearBattleSession, getBattleSession, saveBattleSession } from '../lib/battleSession'

const reactionChoices = ['🔥', '😂', '😎', '😱', '💪', '👏', '❤️', '🤣', '🚀', '🎯', '🧠']
const correctAnswerCards = [
  {
    title: 'Clean hit',
    message: 'That was sharp. Your timing and instinct lined up perfectly.',
    emojis: ['🔥', '✨', '🎯'],
  },
  {
    title: 'Great answer',
    message: 'You just turned the pressure into points.',
    emojis: ['🚀', '⚡', '🏆'],
  },
  {
    title: 'Locked in',
    message: 'Focus, pace, and confidence all paid off there.',
    emojis: ['💚', '🌟', '🧠'],
  },
]

const wrongAnswerCards = [
  {
    title: 'Nice try',
    message: 'That one missed, but the next swing can still land big.',
    emojis: ['💡', '🌱', '🛠️'],
  },
  {
    title: 'Keep moving',
    message: 'Reset, breathe, and come back stronger on the next question.',
    emojis: ['💪', '🔁', '🎯'],
  },
  {
    title: 'Almost there',
    message: 'You were close. The next one is yours.',
    emojis: ['🧠', '✨', '🔥'],
  },
]

const battleQuestionCounts = [10, 15, 20, 25]
const battleTimeLimits = [10, 15]
const battleDifficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const buildLobbySettingsDraft = (room = {}) => ({
  roomName: String(room.settings?.roomName || 'Battle Room'),
  questionsCount: String(room.settings?.questionsCount || 10),
  timeLimitSeconds: String(room.settings?.timeLimitSeconds || 20),
  difficulty: room.settings?.difficulty || 'medium',
  emojiReactions: Boolean(room.settings?.emojiReactions),
  roomChat: Boolean(room.settings?.roomChat),
})

const pickCard = (cards) => cards[Math.floor(Math.random() * cards.length)]

const buildAnswerFeedback = ({ isCorrect, streakAfter = 0, scoreAwarded = 0, correctOption = null }) => {
  if (isCorrect) {
    const card = pickCard(correctAnswerCards)
    return {
      tone: 'success',
      badge: streakAfter >= 2 ? `Streak x${streakAfter}` : 'Correct answer',
      title: card.title,
      message: `${card.message}${scoreAwarded ? ` +${scoreAwarded} points.` : ''}`,
      emojis: card.emojis,
      correctOption,
    }
  }

  const card = pickCard(wrongAnswerCards)
  return {
    tone: 'danger',
    badge: 'Wrong answer',
    title: card.title,
    message: card.message,
    emojis: card.emojis,
    correctOption,
  }
}

const normalizeRoom = (room = {}, authUserId = '') => {
  const players = Array.isArray(room.players)
    ? room.players.map((player) => ({
        ...player,
        isSelf: String(player.userId || '') === String(authUserId),
      }))
    : []

  return {
    ...room,
    players,
    leaderboard: Array.isArray(room.leaderboard) ? room.leaderboard : [],
    chatMessages: Array.isArray(room.chatMessages) ? room.chatMessages : [],
    reactions: Array.isArray(room.reactions) ? room.reactions : [],
    currentQuestion: room.currentQuestion || null,
    settings: {
      roomName: room.settings?.roomName || 'Battle Room',
      chapterIds: Array.isArray(room.settings?.chapterIds) ? room.settings.chapterIds : [],
      topicIds: Array.isArray(room.settings?.topicIds) ? room.settings.topicIds : [],
      objectiveTypeIds: Array.isArray(room.settings?.objectiveTypeIds) ? room.settings.objectiveTypeIds : [],
      questionsCount: Number(room.settings?.questionsCount || 0),
      timeLimitSeconds: Number(room.settings?.timeLimitSeconds || 20),
      difficulty: room.settings?.difficulty || 'medium',
      emojiReactions: Boolean(room.settings?.emojiReactions),
      roomChat: Boolean(room.settings?.roomChat),
      maxPlayers: Number(room.settings?.maxPlayers || 4),
      minPlayers: Number(room.settings?.minPlayers || 2),
    },
  }
}

const BattleRoomPage = () => {
  const { roomCode, stage = 'lobby' } = useParams()
  const navigate = useNavigate()
  const auth = getStoredAuth()
  const socketRef = useRef(null)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [socketState, setSocketState] = useState('connecting')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [floatingReactions, setFloatingReactions] = useState([])
  const [toast, setToast] = useState('')
  const [answerFeedback, setAnswerFeedback] = useState(null)
  const [roomAction, setRoomAction] = useState('')
  const [lobbyReminder, setLobbyReminder] = useState('')
  const answerFeedbackTimerRef = useRef(null)
  const lobbyReminderTimerRef = useRef(null)
  const lastFeedbackKeyRef = useRef('')

  const activeBattle = room?.status === 'active'
  const currentQuestion = room?.currentQuestion || null
  const visibleStage = room?.status === 'active'
    ? 'arena'
    : room?.status === 'finished'
      ? 'results'
      : 'lobby'
  const currentQuestionTimeLeft = useMemo(() => {
    if (!room?.questionEndsAt) {
      return 0
    }

    return Math.max(0, Math.ceil((new Date(room.questionEndsAt).getTime() - now) / 1000))
  }, [now, room?.questionEndsAt])
  const currentQuestionProgress = useMemo(() => {
    if (!room?.totalQuestions) {
      return 0
    }

    const denominator = room.totalQuestions
    const numerator = Math.max(0, Math.min(room.currentQuestionIndex - 1, denominator))
    return Math.min(100, Math.round((numerator / denominator) * 100))
  }, [room?.currentQuestionIndex, room?.totalQuestions])
  const allReady = Boolean(room?.players?.length) && room.players.every((player) => player.ready)
  const isCreator = Boolean(room) && String(room.createdBy) === String(auth?.user?.id)
  const selfPlayer = room?.players?.find((player) => player.isSelf) || null
  const alreadyAnswered = Boolean(selfPlayer?.answeredQuestions?.some((answer) => answer.questionIndex === room?.currentQuestionIndex - 1))
  const canAnswer = room?.status === 'active' && currentQuestion && !selectedAnswer && !alreadyAnswered && currentQuestionTimeLeft > 0

  useEffect(() => {
    let cancelled = false

    const loadRoom = async () => {
      if (!auth?.token) {
        navigate('/signin')
        return
      }

      try {
        const data = await apiRequest(`/api/battle-mode/rooms/${roomCode}`)
        if (cancelled) {
          return
        }

        const nextRoom = normalizeRoom(data.room, auth.user.id)
        setRoom(nextRoom)
        saveBattleSession({
          roomCode: nextRoom.code,
          roomId: nextRoom.id,
          status: nextRoom.status,
          route: nextRoom.status === 'active' ? 'arena' : nextRoom.status === 'finished' ? 'results' : 'lobby',
        })

        if (nextRoom.status === 'active' && stage !== 'arena') {
          navigate(`/battle-mode/room/${nextRoom.code}/arena`, { replace: true })
        }

        if (nextRoom.status === 'finished' && stage !== 'results') {
          navigate(`/battle-mode/room/${nextRoom.code}/results`, { replace: true })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadRoom()

    return () => {
      cancelled = true
    }
  }, [auth?.token, auth?.user?.id, navigate, roomCode, stage])

  useEffect(() => {
    if (!auth?.token || !room?.code) {
      return undefined
    }

    const socket = createBattleSocket(auth.token)
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketState('connected')
      socket.emit('battle:subscribe', { roomCode: room.code })
    })

    socket.on('disconnect', () => {
      setSocketState('offline')
    })

    socket.on('battle:error', (payload) => {
      setToast(payload?.message || 'Battle update failed.')
      window.setTimeout(() => setToast(''), 2600)
    })

    socket.on('battle:room-update', (payload) => {
      const nextRoom = normalizeRoom(payload?.room || {}, auth.user.id)
      setRoom(nextRoom)
      saveBattleSession({
        roomCode: nextRoom.code,
        roomId: nextRoom.id,
        status: nextRoom.status,
        route: nextRoom.status === 'active' ? 'arena' : nextRoom.status === 'finished' ? 'results' : 'lobby',
      })

      if (nextRoom.status === 'active' && stage !== 'arena') {
        navigate(`/battle-mode/room/${nextRoom.code}/arena`, { replace: true })
      }

      if (nextRoom.status === 'finished' && stage !== 'results') {
        navigate(`/battle-mode/room/${nextRoom.code}/results`, { replace: true })
      }

      if (nextRoom.status === 'finished') {
        window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
      }
    })

    socket.on('battle:room-deleted', (payload) => {
      const message = payload?.message || 'The room was deleted.'
      setToast(message)
      clearBattleSession()
      window.setTimeout(() => {
        navigate('/battle-mode', { replace: true })
      }, 1200)
    })

    socket.on('battle:ready-reminder', (payload) => {
      if (String(payload?.targetUserId || '') !== String(auth.user.id)) {
        return
      }

      const message = payload?.message || 'Please click Ready.'
      setLobbyReminder(message)
      window.clearTimeout(lobbyReminderTimerRef.current)
      lobbyReminderTimerRef.current = window.setTimeout(() => setLobbyReminder(''), 2600)
    })

    socket.on('battle:question-update', (payload) => {
      const nextRoom = normalizeRoom(payload?.room || {}, auth.user.id)
      setRoom(nextRoom)
      setSelectedAnswer(null)
      setAnswerFeedback(null)
      lastFeedbackKeyRef.current = ''
      saveBattleSession({
        roomCode: nextRoom.code,
        roomId: nextRoom.id,
        status: nextRoom.status,
        route: 'arena',
      })
      if (stage !== 'arena' && nextRoom.status === 'active') {
        navigate(`/battle-mode/room/${nextRoom.code}/arena`, { replace: true })
      }
    })

    socket.on('battle:chat-message', (payload) => {
      setRoom((current) => {
        if (!current) return current
        return {
          ...current,
          chatMessages: [...(current.chatMessages || []), payload.message].slice(-40),
        }
      })
    })

    socket.on('battle:reaction', (payload) => {
      const reaction = payload?.reaction
      if (!reaction) {
        return
      }

      setFloatingReactions((current) => [
        ...current.slice(-10),
        {
          id: reaction.id,
          emoji: reaction.emoji,
          name: reaction.name || 'Player',
          x: 12 + Math.random() * 76,
          travel: Math.min(620, Math.max(300, window.innerHeight * 0.68)),
        },
      ])
      window.setTimeout(() => {
        setFloatingReactions((current) => current.filter((item) => item.id !== reaction.id))
      }, 2200)
    })

    socket.on('battle:answer-received', (payload) => {
      if (String(payload?.userId || '') !== String(auth.user.id)) {
        return
      }

      const feedbackKey = `${payload.questionIndex}:${payload.isCorrect ? 'correct' : 'wrong'}:${payload.answerIndex}`
      if (lastFeedbackKeyRef.current === feedbackKey) {
        return
      }

      lastFeedbackKeyRef.current = feedbackKey

      const nextFeedback = buildAnswerFeedback({
        isCorrect: Boolean(payload?.isCorrect),
        streakAfter: Number(payload?.streakAfter || 0),
        scoreAwarded: Number(payload?.scoreAwarded || 0),
        correctOption: Number(payload?.correctOption ?? -1),
      })

      setAnswerFeedback(nextFeedback)
      window.clearTimeout(answerFeedbackTimerRef.current)
      answerFeedbackTimerRef.current = window.setTimeout(() => {
        setAnswerFeedback(null)
      }, 2600)
    })

    socket.on('battle:battle-end', (payload) => {
      const nextRoom = normalizeRoom(payload?.room || {}, auth.user.id)
      setRoom(nextRoom)
      window.clearTimeout(answerFeedbackTimerRef.current)
      setAnswerFeedback(null)
      setSelectedAnswer(null)
      lastFeedbackKeyRef.current = ''
      saveBattleSession({
        roomCode: nextRoom.code,
        roomId: nextRoom.id,
        status: nextRoom.status,
        route: 'results',
      })
      window.dispatchEvent(new CustomEvent('innovative-science-progress-updated'))
      navigate(`/battle-mode/room/${nextRoom.code}/results`, { replace: true })
    })

    return () => {
      window.clearTimeout(answerFeedbackTimerRef.current)
      socket.disconnect()
      socketRef.current = null
    }
  }, [auth?.token, auth?.user?.id, navigate, room?.code, stage])

  useEffect(() => {
    if (!activeBattle) {
      return undefined
    }

    const beforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
      return ''
    }

    const trapBack = () => {
      window.history.pushState(null, '', window.location.href)
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('popstate', trapBack)

    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('popstate', trapBack)
    }
  }, [activeBattle])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => window.clearTimeout(lobbyReminderTimerRef.current), [])

  useEffect(() => {
    if (!room?.code) {
      return undefined
    }

    if (room.status === 'finished' && stage !== 'results') {
      navigate(`/battle-mode/room/${room.code}/results`, { replace: true })
      return undefined
    }

    if (room.status === 'active' && stage !== 'arena') {
      navigate(`/battle-mode/room/${room.code}/arena`, { replace: true })
      return undefined
    }

    return undefined
  }, [navigate, room?.code, room?.status, stage])

  useEffect(() => {
    if (visibleStage !== 'results') {
      return undefined
    }

    window.clearTimeout(answerFeedbackTimerRef.current)
    setAnswerFeedback(null)
    setSelectedAnswer(null)
    lastFeedbackKeyRef.current = ''

    return undefined
  }, [visibleStage])

  const sendReady = () => {
    socketRef.current?.emit('battle:ready', { roomCode, ready: !selfPlayer?.ready })
  }

  const startBattle = () => {
    if (!roomCode) {
      return
    }

    apiRequest(`/api/battle-mode/rooms/${roomCode}/start`, {
      method: 'POST',
    })
      .then((data) => {
        const nextRoom = normalizeRoom(data.room || {}, auth.user.id)
        setRoom(nextRoom)
        saveBattleSession({
          roomCode: nextRoom.code,
          roomId: nextRoom.id,
          status: nextRoom.status,
          route: nextRoom.status === 'active' ? 'arena' : 'lobby',
        })

        if (nextRoom.status === 'active') {
          navigate(`/battle-mode/room/${nextRoom.code}/arena`, { replace: true })
        }
      })
      .catch((err) => {
        setToast(err.message || 'Could not start the battle.')
        window.setTimeout(() => setToast(''), 2600)
      })
  }

  const sendChat = (message) => {
    const text = String(message || '').trim()
    if (!text) {
      return
    }

    socketRef.current?.emit('battle:chat', { roomCode, message: text })
  }

  const sendReaction = (emoji) => {
    socketRef.current?.emit('battle:reaction', { roomCode, emoji })
  }

  const sendReadyReminder = (targetUserId, targetName) => {
    if (!targetUserId) {
      return
    }

    socketRef.current?.emit('battle:ready-reminder', { roomCode, targetUserId })
    setToast(`Reminder sent to ${targetName || 'player'}.`)
    window.setTimeout(() => setToast(''), 2200)
  }

  const leaveLobby = async () => {
    if (!room || room.status !== 'lobby') {
      setToast('You can only leave before the battle starts.')
      window.setTimeout(() => setToast(''), 2200)
      return
    }

    if (isCreator) {
      setToast('Delete the room instead of leaving it.')
      window.setTimeout(() => setToast(''), 2200)
      return
    }

    try {
      setRoomAction('leaving')
      await apiRequest(`/api/battle-mode/rooms/${roomCode}/leave`, {
        method: 'POST',
      })
      clearBattleSession()
      navigate('/battle-mode', { replace: true })
    } catch (err) {
      setToast(err.message || 'Could not leave the room.')
      window.setTimeout(() => setToast(''), 2600)
    } finally {
      setRoomAction('')
    }
  }

  const deleteLobby = async () => {
    if (!room || room.status !== 'lobby' || !isCreator) {
      return
    }

    const confirmed = window.confirm('Delete this room and remove everyone from the lobby?')
    if (!confirmed) {
      return
    }

    try {
      setRoomAction('deleting')
      await apiRequest(`/api/battle-mode/rooms/${roomCode}`, {
        method: 'DELETE',
      })
    } catch (err) {
      setToast(err.message || 'Could not delete the room.')
      window.setTimeout(() => setToast(''), 2600)
    } finally {
      setRoomAction('')
    }
  }

  const saveLobbySettings = async (nextSettings) => {
    if (!room || room.status !== 'lobby' || !isCreator) {
      throw new Error('Only the room creator can edit the lobby settings.')
    }

    const data = await apiRequest(`/api/battle-mode/rooms/${roomCode}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(nextSettings),
    })

    const nextRoom = normalizeRoom(data.room || {}, auth.user.id)
    setRoom(nextRoom)
    setToast('Room settings updated.')
    window.setTimeout(() => setToast(''), 2200)
    return nextRoom
  }

  const submitAnswer = (optionIndex) => {
    if (!canAnswer) {
      return
    }

    setSelectedAnswer(optionIndex)
    setAnswerFeedback({
      tone: 'pending',
      badge: 'Answer locked',
      title: 'Locked in',
      message: 'Waiting for the result to land...',
      emojis: ['⏳', '🎧', '⚡'],
    })
    window.clearTimeout(answerFeedbackTimerRef.current)
    socketRef.current?.emit('battle:answer', { roomCode, answerIndex: optionIndex })
  }

  const leaveToHome = () => {
    if (room?.status === 'lobby') {
      leaveLobby()
      return
    }

    if (room?.status === 'active') {
      setToast('The battle is locked until the match ends.')
      window.setTimeout(() => setToast(''), 2200)
      return
    }

    clearBattleSession()
    navigate('/')
  }

  if (!auth?.token) {
    return null
  }

  if (loading) {
    return (
      <section className="min-h-[calc(100vh-6rem)] bg-[linear-gradient(180deg,#f8feff_0%,#f8fafc_45%,#eef9f6_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto flex max-w-4xl items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
          Loading battle room...
        </div>
      </section>
    )
  }

  if (error && !room) {
    return (
      <section className="min-h-[calc(100vh-6rem)] bg-[linear-gradient(180deg,#f8feff_0%,#f8fafc_45%,#eef9f6_100%)] px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">Battle room unavailable</p>
          <p className="mt-3 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={leaveToHome}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 text-sm font-bold text-slate-950"
          >
            Return home
          </button>
        </div>
      </section>
    )
  }

  if (!room) {
    return null
  }

  return (
    <section className={`relative overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.1),_transparent_26%),linear-gradient(180deg,#f8feff_0%,#f8fafc_46%,#eef9f6_100%)] text-slate-950 ${visibleStage === 'arena' ? 'min-h-[calc(100dvh-6rem)] px-2 py-2 pb-28 sm:px-4 sm:py-4 sm:pb-32 lg:pb-24' : 'min-h-[calc(100vh-6rem)] px-3 py-3 sm:px-4 sm:py-4'}`}>
      <div className={`mx-auto flex w-full max-w-[1600px] flex-col gap-3 lg:gap-4 ${visibleStage === 'arena' ? 'min-h-[calc(100dvh-6rem)]' : 'min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-8rem)]'}`}>
        <header className="shrink-0 rounded-[1.75rem] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={leaveToHome}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Return home"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">Battle Room</p>
                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  {room.settings.roomName}
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  {room.status === 'lobby' ? 'Lobby opens' : room.status === 'active' ? 'Question in progress' : 'Results ready'}
                </p>
              </div>
            </div>

            <div className="hidden gap-1.5 sm:grid sm:grid-cols-2 sm:gap-2 md:flex md:flex-wrap md:items-center">
              <StatusPill label="Room code" value={room.code} />
              <StatusPill label="Players" value={`${room.players.length}/${room.settings.maxPlayers}`} />
              <StatusPill label="Socket" value={socketState} />
              {room.status === 'active' && (
                <StatusPill label="Timer" value={`${currentQuestionTimeLeft}s`} accent={currentQuestionTimeLeft <= 5 ? 'danger' : 'cyan'} />
              )}
            </div>
          </div>
        </header>

        {visibleStage === 'lobby' && <LobbyStage room={room} isCreator={isCreator} allReady={allReady} onReady={sendReady} onStart={startBattle} onReaction={sendReaction} onSendMessage={sendChat} onSendReadyReminder={sendReadyReminder} onLeaveLobby={leaveLobby} onDeleteLobby={deleteLobby} onSaveSettings={saveLobbySettings} roomAction={roomAction} />}
        {visibleStage === 'arena' && <ArenaStage room={room} currentQuestion={currentQuestion} selectedAnswer={selectedAnswer} answerFeedback={answerFeedback} canAnswer={canAnswer} currentQuestionTimeLeft={currentQuestionTimeLeft} currentQuestionProgress={currentQuestionProgress} onAnswer={submitAnswer} reactions={reactionChoices} onReaction={sendReaction} onSendMessage={sendChat} />}
        {visibleStage === 'results' && <ResultsStage room={room} leaveToHome={leaveToHome} />}

        <AnimatePresence>
          {lobbyReminder && visibleStage === 'lobby' && (
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed left-1/2 top-4 z-[175] w-[min(92vw,30rem)] -translate-x-1/2"
              aria-live="polite"
            >
              <div className="flex items-center gap-3 rounded-full border border-cyan-200 bg-white px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-700">
                  <BellRing className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold text-slate-900">{lobbyReminder}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {answerFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -22, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.96 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="fixed left-1/2 top-4 z-[170] w-[min(92vw,34rem)] -translate-x-1/2"
              aria-live="polite"
            >
              <div
                className={`overflow-hidden rounded-[1.75rem] border bg-white/95 shadow-[0_26px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl ${
                  answerFeedback.tone === 'success'
                    ? 'border-emerald-200'
                    : answerFeedback.tone === 'danger'
                      ? 'border-red-200'
                      : 'border-amber-200'
                }`}
              >
                <div
                  className={`flex items-start gap-3 px-4 py-4 sm:px-5 ${
                    answerFeedback.tone === 'success'
                      ? 'bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(34,211,238,0.08))]'
                      : answerFeedback.tone === 'danger'
                        ? 'bg-[linear-gradient(135deg,rgba(248,113,113,0.14),rgba(251,146,60,0.1))]'
                        : 'bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(251,191,36,0.08))]'
                  }`}
                >
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg shadow-sm ${
                      answerFeedback.tone === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : answerFeedback.tone === 'danger'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {answerFeedback.tone === 'success' ? <CheckCircle2 className="h-5 w-5" /> : answerFeedback.tone === 'danger' ? <ShieldAlert className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.28em] ${
                        answerFeedback.tone === 'success'
                          ? 'text-emerald-700'
                          : answerFeedback.tone === 'danger'
                            ? 'text-red-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {answerFeedback.badge}
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                      {answerFeedback.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {answerFeedback.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {answerFeedback.emojis.map((emoji) => (
                        <span
                          key={`${answerFeedback.title}-${emoji}`}
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white text-lg shadow-sm"
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {toast && (
          <div className="fixed bottom-4 left-1/2 z-[120] -translate-x-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg">
            {toast}
          </div>
        )}

        <AnimatePresence>
          {floatingReactions.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: [0, 1, 1, 0], y: -item.travel, scale: [0.9, 1, 1, 0.96] }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              style={{ left: `${item.x}%` }}
              className="pointer-events-none fixed bottom-6 z-[110] -translate-x-1/2"
            >
              <div className="flex flex-col items-center gap-1 px-2 py-1 text-slate-950 drop-shadow-[0_1px_6px_rgba(255,255,255,0.75)]">
                <span className="max-w-[9rem] truncate text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">
                  {item.name}
                </span>
                <span className="text-3xl leading-none sm:text-4xl">{item.emoji}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

const StatusPill = ({ label, value, accent = 'slate' }) => (
  <div className={`rounded-2xl border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] sm:px-4 sm:py-2 ${
    accent === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900'
      : accent === 'cyan'
      ? 'border-cyan-200 bg-cyan-50 text-cyan-900'
      : 'border-slate-200 bg-white text-slate-700'
  }`}>
    <span className="block text-[8px] text-slate-500 sm:text-[9px]">{label}</span>
    <span className="mt-0.5 block text-[13px] font-black tracking-normal text-slate-950 sm:mt-1 sm:text-sm">{value}</span>
  </div>
)

const LobbyStage = ({ room, isCreator, allReady, onReady, onStart, onReaction, onSendMessage, onSendReadyReminder, onLeaveLobby, onDeleteLobby, onSaveSettings, roomAction }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isReadyDialogOpen, setIsReadyDialogOpen] = useState(false)
  const [readyNotice, setReadyNotice] = useState('')
  const selfPlayer = room.players.find((player) => player.isSelf) || null
  const selfReady = Boolean(selfPlayer?.ready)
  const expiryMs = Math.max(0, new Date(room.codeExpiresAt).getTime() - Date.now())
  const minutes = Math.floor(expiryMs / 60000)
  const seconds = Math.floor((expiryMs % 60000) / 1000)

  useEffect(() => {
    if (!isSettingsOpen && !isReadyDialogOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false)
        setIsReadyDialogOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, isReadyDialogOpen])

  useEffect(() => {
    if (!readyNotice) {
      return undefined
    }

    const timer = window.setTimeout(() => setReadyNotice(''), 2600)
    return () => window.clearTimeout(timer)
  }, [readyNotice])

  return (
    <>
      <AnimatePresence>
        {readyNotice && (
          <motion.div
            initial={{ opacity: 0, y: -22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed left-1/2 top-3 z-[170] w-[min(92vw,28rem)] -translate-x-1/2 rounded-full border border-cyan-200 bg-white px-4 py-3 text-center text-sm font-bold text-cyan-800 shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
          >
            {readyNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.08fr)_380px]">
        <div className="space-y-4 pb-28 lg:pb-0">
          <div className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
                  <Swords className="h-4 w-4" />
                  Lobby ready
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Room code</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2 sm:gap-3">
                    <h2 className="text-3xl font-black tracking-[0.2em] text-slate-950 sm:text-5xl sm:tracking-[0.25em]">{room.code}</h2>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 sm:text-xs">
                      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')} left
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Everyone must click Ready before the host can unlock Start Battle.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="grid h-12 w-12 shrink-0 place-items-center self-start rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:self-auto"
                aria-label={isCreator && room.status === 'lobby' ? 'Edit battle settings' : 'Open battle settings'}
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <motion.button
                type="button"
                onClick={() => setIsReadyDialogOpen(true)}
                disabled={roomAction === 'leaving' || roomAction === 'deleting'}
                animate={
                  selfReady
                    ? {
                        y: [0, -2, 0],
                        scale: [1, 1.02, 1],
                        boxShadow: [
                          '0 12px 32px rgba(16,185,129,0.14)',
                          '0 18px 54px rgba(16,185,129,0.24)',
                          '0 12px 32px rgba(16,185,129,0.14)',
                        ],
                      }
                    : {
                        y: [0, -5, 0],
                        scale: [1, 1.02, 1],
                        boxShadow: [
                          '0 12px 34px rgba(245,158,11,0.14)',
                          '0 20px 60px rgba(245,158,11,0.28)',
                          '0 12px 34px rgba(245,158,11,0.14)',
                        ],
                      }
                }
                transition={{ duration: selfReady ? 2.2 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`group relative overflow-hidden rounded-[1.25rem] border p-3 text-left shadow-sm transition hover:shadow-lg sm:rounded-[1.5rem] sm:p-4 ${
                  selfReady
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <motion.span
                  aria-hidden="true"
                  animate={{ x: ['-130%', '130%'] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0),rgba(255,255,255,0.45),rgba(255,255,255,0))]"
                />
                <motion.span
                  aria-hidden="true"
                  animate={{ opacity: [0.18, 0.6, 0.18], scale: [0.98, 1.03, 0.98] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  className={`pointer-events-none absolute inset-[2px] rounded-[1.15rem] border ${
                    selfReady ? 'border-emerald-300/70' : 'border-amber-300/70'
                  }`}
                />
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm sm:h-11 sm:w-11 ${
                    selfReady ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 sm:text-sm sm:tracking-[0.18em]">{selfReady ? 'Ready' : 'Ready up'}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-600 sm:text-xs sm:leading-5">
                      {selfReady ? 'Tap to switch back to not ready.' : 'Tap when you are set and want to lock in.'}
                    </p>
                  </div>
                </div>
              </motion.button>

              <button
                type="button"
                onClick={isCreator ? onDeleteLobby : onLeaveLobby}
                disabled={roomAction === 'leaving' || roomAction === 'deleting'}
                className={`group rounded-[1.25rem] border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[1.5rem] sm:p-4 ${
                  isCreator
                    ? 'border-red-200 bg-red-500 hover:bg-red-600'
                    : 'border-slate-200 bg-slate-900 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-sm sm:h-11 sm:w-11 ${
                    isCreator ? 'bg-white/15 text-white' : 'bg-white/10 text-white'
                  }`}>
                    {isCreator ? <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white sm:text-sm sm:tracking-[0.18em]">
                      {isCreator ? 'Delete room' : 'Leave group'}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-white/85 sm:text-xs sm:leading-5">
                      {isCreator ? 'Remove everyone and close the lobby.' : 'Exit safely before the battle starts.'}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {isCreator && allReady && (
              <button
                type="button"
                onClick={onStart}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.24)] transition hover:scale-[1.01]"
              >
                Start Battle
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">Players</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{room.players.length} joined</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                {room.players.filter((player) => player.ready).length}/{room.players.length} ready
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {room.players.map((player) => (
                <PlayerCard key={player.userId} player={player} compact onSendReadyReminder={onSendReadyReminder} />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-10rem)] lg:min-h-0 lg:inset-auto lg:z-auto">
          <ChatPanel
            room={room}
            onSendMessage={onSendMessage}
            sendReaction={onReaction}
            disabled={!room.settings.roomChat}
            reactionsEnabled={room.settings.emojiReactions}
            compact
          />
        </div>
      </div>

      <MobileChatDock
        room={room}
        onSendMessage={onSendMessage}
        disabled={!room.settings.roomChat}
      />

      <MobileReactionDock
        onReaction={onReaction}
        enabled={room.settings.emojiReactions}
      />

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} room={room} isCreator={isCreator && room?.status === 'lobby'} onSave={onSaveSettings} />
      <ReadyConfirmModal
        open={isReadyDialogOpen}
        onClose={() => setIsReadyDialogOpen(false)}
        onConfirm={() => {
          setIsReadyDialogOpen(false)
          onReady()
          setReadyNotice(selfReady ? 'Ready removed. You can adjust your setup.' : 'Ready sent. Waiting for everyone to start the match.')
        }}
        ready={selfReady}
      />
    </>
  )
}

const ArenaStage = ({ room, currentQuestion, selectedAnswer, answerFeedback, canAnswer, currentQuestionTimeLeft, currentQuestionProgress, onAnswer, reactions, onReaction, onSendMessage }) => {
  const isCriticalTimer = currentQuestionTimeLeft > 0 && currentQuestionTimeLeft <= 5

  return (
    <>
      <div className="grid flex-1 min-h-0 gap-3 items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:min-h-0">
        <div className="flex h-full min-h-0 flex-col gap-2 rounded-[2rem] border border-white/80 bg-white p-2.5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-4 lg:h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
          <div className="sticky top-0 z-20 rounded-[1.25rem] border border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">Live leaderboard</p>
                <h3 className="mt-1 text-sm font-black text-slate-950">Ranks</h3>
              </div>
              <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {room.leaderboard.slice(0, 4).map((player) => (
                <div
                  key={player.userId}
                  className={`rounded-2xl border px-2 py-2 ${
                    player.isSelf ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                    <span>🔥</span>
                    <span>{player.streak || 0}</span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] font-black leading-tight text-slate-950">
                      {player.rank}. {player.name}
                    </p>
                    <p className="shrink-0 text-sm font-black text-cyan-700">{player.score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-row items-start justify-between gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2.5 sm:items-center sm:gap-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                Question {room.currentQuestionIndex}/{room.totalQuestions}
              </p>
              <h2 className="mt-1 text-[14px] font-black leading-tight text-slate-950 sm:text-2xl lg:text-[2rem] lg:leading-tight">
                {currentQuestion?.question || 'Preparing the next question...'}
              </h2>
            </div>
            <div className="grid shrink-0 gap-1 text-right sm:gap-2 sm:justify-items-end">
              <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${isCriticalTimer ? 'animate-pulse text-red-600' : 'text-amber-700'}`}>
                Time left
              </p>
              <p className={`text-[1.6rem] font-black leading-none sm:text-3xl ${isCriticalTimer ? 'animate-pulse text-red-600' : 'text-slate-950'}`}>
                {currentQuestionTimeLeft}s
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-start justify-center">
            <div className="flex h-full min-h-0 w-full max-w-4xl flex-col">
              <div className="h-2 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                    style={{ width: `${currentQuestionProgress}%` }}
                  />
              </div>
              <div className="mt-2 grid flex-1 gap-1.5 sm:mt-4 sm:grid-cols-2 sm:gap-3">
                  {(currentQuestion?.options || []).map((option, index) => (
                    <button
                      key={`${option}-${index}`}
                      type="button"
                      onClick={() => onAnswer(index)}
                      disabled={!canAnswer}
                      aria-pressed={selectedAnswer === index}
                      className={`min-h-[3.2rem] rounded-2xl border px-3 py-2 text-left text-[12px] font-bold leading-4 transition sm:min-h-[5rem] sm:rounded-3xl sm:px-4 sm:py-3 sm:text-base ${
                        selectedAnswer === index
                          ? answerFeedback?.tone === 'success'
                            ? 'border-emerald-800 bg-emerald-700 text-white shadow-[0_0_0_1px_rgba(4,120,87,0.28)]'
                          : answerFeedback?.tone === 'danger'
                              ? 'border-red-800 bg-red-700 text-white shadow-[0_0_0_1px_rgba(153,27,27,0.28)]'
                              : 'border-cyan-300 bg-cyan-50 text-slate-950'
                          : answerFeedback?.tone === 'danger' && answerFeedback?.correctOption === index
                            ? 'border-emerald-800 bg-emerald-700 text-white shadow-[0_0_0_1px_rgba(4,120,87,0.22)]'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span className={`block text-[9px] font-black uppercase tracking-[0.18em] sm:tracking-[0.22em] ${
                        selectedAnswer === index && answerFeedback?.tone === 'success'
                          ? 'text-emerald-100'
                          : selectedAnswer === index && answerFeedback?.tone === 'danger'
                            ? 'text-red-100'
                            : answerFeedback?.tone === 'danger' && answerFeedback?.correctOption === index
                              ? 'text-emerald-100'
                              : 'text-slate-500'
                      }`}>
                        Option {index + 1}
                      </span>
                      <span className="mt-1.5 block sm:mt-2">{option}</span>
                    </button>
                  ))}
                </div>
            </div>
          </div>

          <div className="hidden shrink-0 rounded-[1.5rem] border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3 lg:block lg:sticky lg:bottom-0 lg:z-10 lg:bg-white/95 lg:backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">Live leaderboard</p>
                <h3 className="mt-1 text-sm font-black text-slate-950 sm:text-base">Ranks</h3>
              </div>
              <Trophy className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" />
            </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {room.leaderboard.map((player) => (
                <div
                  key={player.userId}
                  className={`min-w-[7.3rem] rounded-2xl border px-2 py-1.5 ${
                    player.isSelf ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                    <span className="text-[11px] leading-none">🔥</span>
                    <span>{player.streak || 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-slate-950">
                        {player.rank}. {player.name}
                      </p>
                    </div>
                    <p className="text-sm font-black text-cyan-700 sm:text-base">{player.score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden min-h-0 lg:flex lg:h-[calc(100vh-9rem)] lg:flex-col lg:gap-3">
          <ChatPanel
            room={room}
            onSendMessage={onSendMessage}
            disabled={!room.settings.roomChat}
            compact
            scrollable
            messageLimit={6}
          />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] hidden justify-center lg:flex">
        <div className="pointer-events-auto flex max-w-[min(90vw,42rem)] items-center gap-2 overflow-x-auto px-2 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {reactions.slice(0, 10).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReaction(emoji)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl transition hover:-translate-y-0.5 hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <MobileChatDock
        room={room}
        onSendMessage={onSendMessage}
        disabled={!room.settings.roomChat}
      />

      <MobileReactionDock
        onReaction={onReaction}
        enabled={room.settings.emojiReactions}
      />
    </>
  )
}

const ResultsStage = ({ room, leaveToHome }) => {
  const rewards = room.battleSummary?.rewards || []
  const podiumRanks = [1, 2, 3, 4].map((rank) => {
    const reward = rewards.find((item) => Number(item.rank) === rank)
    const player = reward ? room.players.find((item) => String(item.userId) === String(reward.userId)) : null

    return {
      rank,
      label: `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}`,
      reward,
      player,
    }
  })

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">
          <Crown className="h-4 w-4" />
          Battle results
        </div>
        <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Final standings</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          The room is finished. Brain Cells were awarded by rank and the normal website is unlocked again after you leave this page.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {podiumRanks.map((entry) => {
            const reward = entry.reward

            return (
              <div
                key={entry.rank}
                className={`rounded-[1.5rem] border p-4 ${
                  entry.rank === 1
                    ? 'border-amber-300 bg-amber-50'
                    : entry.rank === 2
                      ? 'border-slate-300 bg-slate-50'
                      : entry.rank === 3
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  {entry.label} place
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {entry.player?.name || 'Waiting for player'}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-600">
                  {entry.player ? (
                    <>
                      <Crown className="h-4 w-4 text-amber-500" />
                      Rank {entry.rank}
                    </>
                  ) : (
                    'Open slot'
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Score" value={reward?.score || 0} />
                  <Metric label="Brain Cells" value={reward?.brainCells || 0} />
                  <Metric label="Correct" value={entry.player?.correctCount || 0} />
                  <Metric label="Highest streak" value={entry.player?.highestStreak || 0} />
                </div>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={leaveToHome}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 text-sm font-black text-slate-950 transition hover:scale-[1.01]"
        >
          Return to website
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">Final leaderboard</p>
          <div className="mt-4 grid gap-2">
            {room.leaderboard.map((player) => (
              <div key={player.userId} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${player.isSelf ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                    <span className="text-[11px] leading-none">🔥</span>
                    <span>{player.streak || 0}</span>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {player.rank === 1 ? '1st' : player.rank === 2 ? '2nd' : player.rank === 3 ? '3rd' : `${player.rank}th`} {player.name}
                  </p>
                  <p className="text-[11px] text-slate-500">{player.correctCount} correct, {player.wrongCount} wrong</p>
                </div>
                <p className="text-lg font-black text-amber-700">{player.score}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Match summary</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <MetricRow label="Questions played" value={room.battleSummary?.totalQuestions || room.totalQuestions || 0} />
            <MetricRow label="Players" value={room.battleSummary?.totalPlayers || room.players.length} />
            <MetricRow label="Chat" value={room.settings.roomChat ? 'Enabled' : 'Disabled'} />
            <MetricRow label="Reactions" value={room.settings.emojiReactions ? 'Enabled' : 'Disabled'} />
          </div>
        </div>
      </div>
    </div>
  )
}

const SettingsModal = ({ open, onClose, room, isCreator = false, onSave }) => {
  const [draft, setDraft] = useState(() => buildLobbySettingsDraft(room))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      return undefined
    }

    setDraft(buildLobbySettingsDraft(room))
    setSaving(false)
    setError('')
    return undefined
  }, [open, room])

  const editable = Boolean(isCreator && room.status === 'lobby')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!editable) {
      return
    }

    try {
      setSaving(true)
      setError('')
      await onSave?.({
        roomName: draft.roomName,
        questionsCount: Number(draft.questionsCount),
        timeLimitSeconds: Number(draft.timeLimitSeconds),
        difficulty: draft.difficulty,
        emojiReactions: Boolean(draft.emojiReactions),
        roomChat: Boolean(draft.roomChat),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save the room settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 px-3 py-3 backdrop-blur-sm sm:items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                  {editable ? 'Edit room settings' : 'Battle settings'}
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {editable ? 'Update lobby options' : 'Room configuration'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Close settings"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editable ? (
              <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Room name</span>
                  <input
                    type="text"
                    value={draft.roomName}
                    onChange={(event) => setDraft((current) => ({ ...current, roomName: event.target.value }))}
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white"
                    maxLength={120}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Questions</span>
                    <select
                      value={draft.questionsCount}
                      onChange={(event) => setDraft((current) => ({ ...current, questionsCount: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white"
                    >
                      {battleQuestionCounts.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Time / question</span>
                    <select
                      value={draft.timeLimitSeconds}
                      onChange={(event) => setDraft((current) => ({ ...current, timeLimitSeconds: event.target.value }))}
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-300 focus:bg-white"
                    >
                      {battleTimeLimits.map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {seconds}s
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Difficulty</span>
                  <div className="grid grid-cols-3 gap-2">
                    {battleDifficultyOptions.map((option) => {
                      const selected = draft.difficulty === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, difficulty: option.value }))}
                          className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                            selected
                              ? 'border-cyan-300 bg-cyan-50 text-cyan-800 shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, emojiReactions: !current.emojiReactions }))}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      draft.emojiReactions
                        ? 'border-cyan-200 bg-cyan-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Emoji reactions</span>
                      <span className="mt-1 block text-sm font-bold text-slate-950">
                        {draft.emojiReactions ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                      draft.emojiReactions ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {draft.emojiReactions ? 'On' : 'Off'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, roomChat: !current.roomChat }))}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      draft.roomChat
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Room chat</span>
                      <span className="mt-1 block text-sm font-bold text-slate-950">
                        {draft.roomChat ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${
                      draft.roomChat ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {draft.roomChat ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Updating these settings resets every player to not ready so the lobby stays in sync.
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-12 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.24)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-5 grid gap-2">
                  <SettingRow label="Questions" value={room.settings.questionsCount} />
                  <SettingRow label="Time / question" value={`${room.settings.timeLimitSeconds}s`} />
                  <SettingRow label="Difficulty" value={room.settings.difficulty} />
                  <SettingRow label="Emoji reactions" value={room.settings.emojiReactions ? 'On' : 'Off'} />
                  <SettingRow label="Room chat" value={room.settings.roomChat ? 'On' : 'Off'} />
                  <SettingRow label="Players" value={`${room.players.length}/${room.settings.maxPlayers}`} />
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {room.status === 'lobby'
                    ? 'Only the room creator can edit these lobby settings.'
                    : 'The room is locked now. Reconnects restore the same settings and players.'}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

const ReadyConfirmModal = ({ open, onClose, onConfirm, ready }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[135] flex items-end justify-center bg-slate-950/55 px-3 py-3 backdrop-blur-sm sm:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 18 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Ready check</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">
                {ready ? 'Switch back to not ready?' : 'Mark yourself ready?'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Close ready dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            {ready
              ? 'You are already locked in. This will unlock your ready state so you can change settings or step away.'
              : 'This will tell the host you are set. The Start Battle button unlocks only when everyone is ready.'}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex h-12 items-center justify-center rounded-[1.25rem] bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.24)] transition hover:scale-[1.01]"
            >
              {ready ? 'Unready' : 'Ready up'}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
)

const ChatPanel = ({ room, onSendMessage, sendReaction, disabled = false, reactionsEnabled = true, compact = false, scrollable = true, messageLimit = 10, reverseMessages = false, hideScrollbar = true, autoScroll = true }) => {
  const [message, setMessage] = useState('')
  const messagesRef = useRef(null)

  const send = (event) => {
    event.preventDefault()
    const value = message.trim()
    if (!value) {
      return
    }

    onSendMessage?.(value)
    setMessage('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send(event)
    }
  }

  useEffect(() => {
    if (!autoScroll || !messagesRef.current) {
      return undefined
    }

    const node = messagesRef.current
    const scrollToLatest = () => {
      node.scrollTop = node.scrollHeight
    }

    const frame = window.requestAnimationFrame(scrollToLatest)
    return () => window.cancelAnimationFrame(frame)
  }, [autoScroll, reverseMessages, room.chatMessages, messageLimit])

  const visibleMessages = reverseMessages
    ? [...(room.chatMessages || [])].slice(-messageLimit).reverse()
    : [...(room.chatMessages || [])].slice(-messageLimit)

  const messageListClassName = [
    'mt-4 space-y-2 pr-1',
    scrollable ? 'min-h-0 flex-1 overflow-y-auto' : '',
    hideScrollbar ? 'no-scrollbar' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Room chat</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Battle banter</h3>
        </div>
        <MessageCircleMore className="h-5 w-5 text-cyan-700" />
      </div>
      {disabled ? (
        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Room chat is off for this lobby, so only the host can move the room forward.
        </div>
      ) : (
        <>
          <div ref={messagesRef} className={messageListClassName}>
            {visibleMessages.map((item) => (
              <div key={item.id || `${item.userId}-${item.createdAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">{item.name}</p>
                <p className="mt-1 leading-6 text-slate-600">{item.message}</p>
              </div>
            ))}
            {!room.chatMessages?.length && <p className="text-sm text-slate-500">No chat yet. Say hello or drop a reaction.</p>}
          </div>

          {onSendMessage && (
            <form onSubmit={send} className="mt-4 space-y-3">
              <textarea
                rows={compact ? 2 : 3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-24 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-50"
              />

              {sendReaction && reactionsEnabled && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {reactionChoices.slice(0, 10).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendReaction(emoji)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-xl transition hover:-translate-y-0.5 hover:bg-slate-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {sendReaction && !reactionsEnabled && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  Emoji reactions are turned off for this room.
                </div>
              )}

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.24)] transition hover:scale-[1.01]"
              >
                <Send className="h-4 w-4" />
                Send message
              </button>
              <p className="text-[11px] font-medium text-slate-500">Press Enter to send, Shift+Enter for a new line.</p>
            </form>
          )}
        </>
      )}
    </div>
  )
}

const MobileChatDock = ({ room, onSendMessage, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [floatingMessages, setFloatingMessages] = useState([])
  const messagesRef = useRef(null)
  const seenChatKeysRef = useRef(new Set())
  const initializedRef = useRef(false)
  const cleanupTimersRef = useRef([])
  const messages = Array.isArray(room.chatMessages) ? room.chatMessages : []
  const hasMessages = messages.length > 0

  const buildChatKey = (item) => item.id || `${item.userId || 'chat'}-${item.createdAt || ''}-${item.message || ''}`

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    setFloatingMessages([])
    return undefined
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !messagesRef.current) {
      return undefined
    }

    const node = messagesRef.current
    const frame = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, messages])

  useEffect(() => {
    const nextKeys = messages.map(buildChatKey)

    if (!initializedRef.current) {
      nextKeys.forEach((key) => seenChatKeysRef.current.add(key))
      initializedRef.current = true
      return undefined
    }

    const freshMessages = messages.filter((item) => !seenChatKeysRef.current.has(buildChatKey(item)))
    nextKeys.forEach((key) => seenChatKeysRef.current.add(key))

    if (!isOpen && freshMessages.length) {
      const floatItems = freshMessages.slice(-3).map((item) => ({
        id: buildChatKey(item),
        name: item.name || 'Player',
        message: item.message || '',
      }))

      setFloatingMessages((current) => [...current, ...floatItems].slice(-6))

      floatItems.forEach((item, index) => {
        const timer = window.setTimeout(() => {
          setFloatingMessages((current) => current.filter((entry) => entry.id !== item.id))
        }, 2600 + index * 120)
        cleanupTimersRef.current.push(timer)
      })
    }

    return undefined
  }, [isOpen, messages])

  useEffect(() => () => {
    cleanupTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    cleanupTimersRef.current = []
  }, [])

  if (disabled) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const value = message.trim()
    if (!value) {
      return
    }

    onSendMessage?.(value)
    setMessage('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <div className="lg:hidden">
      <AnimatePresence>
        {!isOpen && floatingMessages.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: [0, 1, 1, 0], y: -80 - index * 20, scale: [0.96, 1, 1, 0.98] }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
            className="pointer-events-none fixed bottom-24 right-4 z-[140] max-w-[min(18rem,calc(100vw-5rem))]"
          >
            <div className="rounded-2xl border border-white/70 bg-slate-950/90 px-3 py-2 text-sm text-white shadow-2xl backdrop-blur-md">
              <span className="font-black text-cyan-100">{item.name}:</span>{' '}
              <span className="text-white/90">{item.message}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-4 right-4 z-[150] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-[0_18px_50px_rgba(34,211,238,0.35)] transition hover:scale-[1.03]"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <MessageCircleMore className="h-6 w-6" />
        {hasMessages && !isOpen && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-lg">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-3 bottom-3 z-[145] rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_30px_100px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Room chat</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Battle banter</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={messagesRef} className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto pr-1 no-scrollbar">
              {messages.slice(-12).map((item) => (
                <div key={item.id || `${item.userId}-${item.createdAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p className="font-black text-cyan-700">
                    {item.name}: <span className="font-medium text-slate-700">{item.message}</span>
                  </p>
                </div>
              ))}
              {!messages.length && <p className="text-sm text-slate-500">No chat yet. Be the first to say hi.</p>}
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  rows={2}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="min-h-24 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-50"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 text-sm font-black text-slate-950 shadow-[0_12px_40px_rgba(34,211,238,0.24)] transition hover:scale-[1.01]"
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const MobileReactionDock = ({ onReaction, enabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!enabled) {
    return null
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-4 left-4 z-[150] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_18px_50px_rgba(251,191,36,0.35)] transition hover:scale-[1.03]"
        aria-label={isOpen ? 'Close reactions' : 'Open reactions'}
      >
        <span className="text-xl">😊</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -28, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 left-4 z-[145] w-[min(20rem,calc(100vw-5rem))] rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_30px_100px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Quick reactions</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Tap a vibe</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Close reactions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {reactionChoices.slice(0, 10).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReaction?.(emoji)
                    setIsOpen(false)
                  }}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-xl transition hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const PlayerCard = ({ player, compact = false, onSendReadyReminder = null }) => {
  if (compact) {
    return (
      <div className={`relative rounded-[1.4rem] border px-4 py-3 pr-12 ${player.isSelf ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
        {onSendReadyReminder && (
          <button
            type="button"
            onClick={() => onSendReadyReminder(player.userId, player.name)}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-cyan-200 bg-white text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-50 hover:text-cyan-800"
            aria-label={`Send ready reminder to ${player.name}`}
            title={`Send ready reminder to ${player.name}`}
          >
            <BellRing className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-black text-slate-950">{player.name}</h4>
            <p className="mt-1 text-[11px] text-slate-500">{player.isSelf ? 'You' : 'Player'}</p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
              player.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {player.ready ? 'Ready' : 'Not ready'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[1.5rem] border px-4 py-4 ${player.isSelf ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-sm font-black text-white">
          {player.name?.slice(0, 1)?.toUpperCase() || 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-black text-slate-950">{player.name}</h4>
            {player.ready ? <BadgeCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-500" />}
          </div>
          {player.className ? <p className="truncate text-[11px] text-slate-500">{player.className}</p> : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-600">
        <div className="rounded-2xl bg-white px-2 py-2">
          <p className="text-slate-500">Score</p>
          <p className="mt-1 text-slate-950">{player.score}</p>
        </div>
        <div className="rounded-2xl bg-white px-2 py-2">
          <p className="text-slate-500">Streak</p>
          <p className="mt-1 text-slate-950">{player.streak}</p>
        </div>
        <div className="rounded-2xl bg-white px-2 py-2">
          <p className="text-slate-500">Answer</p>
          <p className="mt-1 text-slate-950">{player.answeredQuestions?.length ? 'Done' : 'Waiting'}</p>
        </div>
      </div>
    </div>
  )
}

const CornerPlayerPosition = ({ align, player }) => {
  if (!player) return null

  const positionMap = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  return (
    <div className={`absolute ${positionMap[align]} w-64 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm backdrop-blur-xl`}>
      <PlayerCard player={player} />
    </div>
  )
}

const SettingRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
    <span className="text-slate-500">{label}</span>
    <span className="font-black text-slate-950">{value}</span>
  </div>
)

const Metric = ({ label, value }) => (
  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
  </div>
)

const MetricRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
    <span className="text-slate-500">{label}</span>
    <span className="font-black text-slate-950">{value}</span>
  </div>
)

export default BattleRoomPage
