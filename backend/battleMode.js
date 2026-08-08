const crypto = require('crypto')
const { Server } = require('socket.io')

const DEFAULT_MAX_PLAYERS = 4
const DEFAULT_MIN_PLAYERS = 2
const DEFAULT_CODE_TTL_MS = 10 * 60 * 1000
const DEFAULT_CLEANUP_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_QUESTION_TIME_SECONDS = 20
const DEFAULT_QUESTIONS_COUNT = 8

const BATTLE_REWARD_CONFIG = {
  1: Number(process.env.BATTLE_REWARD_RANK_1 || 30),
  2: Number(process.env.BATTLE_REWARD_RANK_2 || 25),
  3: Number(process.env.BATTLE_REWARD_RANK_3 || 20),
  4: Number(process.env.BATTLE_REWARD_RANK_4 || 15),
}

const difficultyMultipliers = {
  easy: 0.9,
  medium: 1,
  hard: 1.15,
}

const battleChatLimit = 40
const battleReactionLimit = 40
const battleAnswerLimit = 100
const battleEmojis = ['🔥', '😂', '😎', '😱', '💪', '👏', '❤️', '🤣', '🚀', '🎯', '🧠']
const allowedBattleObjectiveTypes = ['mcqs', 'true-or-false', 'correlation']

const battleRoomPlayerSchema = {
  userId: {
    type: mongooseTypes().ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  className: {
    type: String,
    trim: true,
    maxlength: 120,
    default: '',
  },
  profileImageUrl: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  ready: {
    type: Boolean,
    default: false,
  },
  connected: {
    type: Boolean,
    default: true,
  },
  seat: {
    type: Number,
    default: 0,
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
  },
  correctCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  wrongCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  skippedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  streak: {
    type: Number,
    default: 0,
    min: 0,
  },
  highestStreak: {
    type: Number,
    default: 0,
    min: 0,
  },
  fastestAnswerMs: {
    type: Number,
    default: null,
  },
  answers: {
    type: [
      {
        questionIndex: Number,
        chosenOption: Number,
        correct: Boolean,
        elapsedMs: Number,
        answeredAt: Date,
        scoreAwarded: Number,
      },
    ],
    default: [],
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}

const battleQuestionSchema = {
  questionId: {
    type: mongooseTypes().ObjectId,
    default: null,
  },
  objectiveTypeId: {
    type: mongooseTypes().ObjectId,
    default: null,
  },
  chapterId: {
    type: mongooseTypes().ObjectId,
    default: null,
  },
  topicId: {
    type: mongooseTypes().ObjectId,
    default: null,
  },
  chapterName: {
    type: String,
    trim: true,
    default: '',
  },
  topicName: {
    type: String,
    trim: true,
    default: '',
  },
  objectiveLabel: {
    type: String,
    trim: true,
    default: '',
  },
  question: {
    type: String,
    trim: true,
    default: '',
  },
  options: {
    type: [String],
    default: [],
  },
  correctOption: {
    type: Number,
    default: 0,
  },
  points: {
    type: Number,
    default: 100,
  },
  questionTimeSeconds: {
    type: Number,
    default: DEFAULT_QUESTION_TIME_SECONDS,
  },
}

function mongooseTypes() {
  return require('mongoose').Schema.Types
}

const battleRoomSchema = new (require('mongoose').Schema)(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    createdBy: {
      type: mongooseTypes().ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    creatorSnapshot: {
      userId: {
        type: mongooseTypes().ObjectId,
        ref: 'User',
      },
      name: String,
      className: String,
      profileImageUrl: String,
    },
    status: {
      type: String,
      enum: ['lobby', 'active', 'finished', 'expired'],
      default: 'lobby',
      index: true,
    },
    settings: {
      roomName: {
        type: String,
        trim: true,
        maxlength: 120,
        default: 'Battle Room',
      },
      chapterIds: {
        type: [mongooseTypes().ObjectId],
        default: [],
      },
      objectiveTypes: {
        type: [String],
        default: [],
      },
      topicIds: {
        type: [mongooseTypes().ObjectId],
        default: [],
      },
      objectiveTypeIds: {
        type: [mongooseTypes().ObjectId],
        default: [],
      },
      questionsCount: {
        type: Number,
        default: DEFAULT_QUESTIONS_COUNT,
        min: 1,
        max: 20,
      },
      timeLimitSeconds: {
        type: Number,
        default: DEFAULT_QUESTION_TIME_SECONDS,
        min: 5,
        max: 120,
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
      },
      emojiReactions: {
        type: Boolean,
        default: true,
      },
      roomChat: {
        type: Boolean,
        default: true,
      },
      maxPlayers: {
        type: Number,
        default: DEFAULT_MAX_PLAYERS,
      },
      minPlayers: {
        type: Number,
        default: DEFAULT_MIN_PLAYERS,
      },
    },
    players: {
      type: [battleRoomPlayerSchema],
      default: [],
    },
    questions: {
      type: [battleQuestionSchema],
      default: [],
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionStartedAt: {
      type: Date,
      default: null,
    },
    questionEndsAt: {
      type: Date,
      default: null,
    },
    codeExpiresAt: {
      type: Date,
      required: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    cleanupAt: {
      type: Date,
      default: null,
    },
    chatMessages: {
      type: [
        {
          id: String,
          userId: mongooseTypes().ObjectId,
          name: String,
          message: String,
          createdAt: Date,
        },
      ],
      default: [],
    },
    reactions: {
      type: [
        {
          id: String,
          userId: mongooseTypes().ObjectId,
          name: String,
          emoji: String,
          createdAt: Date,
        },
      ],
      default: [],
    },
    battleSummary: {
      type: {
        totalQuestions: Number,
        totalPlayers: Number,
        winnerIds: [mongooseTypes().ObjectId],
        rewards: [
          {
            userId: mongooseTypes().ObjectId,
            rank: Number,
            score: Number,
            brainCells: Number,
          },
        ],
      },
      default: undefined,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

battleRoomSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0, sparse: true })
battleRoomSchema.index({ codeExpiresAt: 1 })

const getBattleRoomModel = (mongoose) => mongoose.models.BattleRoom || mongoose.model('BattleRoom', battleRoomSchema)

const safeLower = (value) => String(value || '').trim().toLowerCase()
const safeUpper = (value) => String(value || '').trim().toUpperCase()
const safeString = (value) => String(value || '').trim()
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const shuffle = (items) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const createRoomCode = async (BattleRoom) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('')
    const existing = await BattleRoom.findOne({ code }).select('_id').lean()

    if (!existing) {
      return code
    }
  }

  throw new Error('Could not create a unique room code.')
}

const getBattleReward = (rank) => {
  const parsedRank = Math.max(1, Math.min(4, safeNumber(rank, 4)))
  return Math.max(0, BATTLE_REWARD_CONFIG[parsedRank] || 0)
}

const getSeatNumber = (players = []) => {
  const used = new Set(players.map((player) => safeNumber(player.seat, 0)).filter(Boolean))

  for (let seat = 1; seat <= DEFAULT_MAX_PLAYERS; seat += 1) {
    if (!used.has(seat)) {
      return seat
    }
  }

  return DEFAULT_MAX_PLAYERS
}

const publicPlayer = (player, viewerUserId = '') => ({
  userId: String(player.userId || ''),
  name: player.name || 'Student',
  className: player.className || '',
  profileImageUrl: player.profileImageUrl || '',
  ready: Boolean(player.ready),
  connected: Boolean(player.connected),
  seat: safeNumber(player.seat, 0),
  score: safeNumber(player.score, 0),
  correctCount: safeNumber(player.correctCount, 0),
  wrongCount: safeNumber(player.wrongCount, 0),
  skippedCount: safeNumber(player.skippedCount, 0),
  streak: safeNumber(player.streak, 0),
  highestStreak: safeNumber(player.highestStreak, 0),
  fastestAnswerMs: player.fastestAnswerMs ?? null,
  answeredQuestions: Array.isArray(player.answers)
    ? player.answers.map((answer) => ({
        questionIndex: safeNumber(answer.questionIndex, 0),
        correct: Boolean(answer.correct),
        elapsedMs: safeNumber(answer.elapsedMs, 0),
        answeredAt: answer.answeredAt || null,
        scoreAwarded: safeNumber(answer.scoreAwarded, 0),
      }))
    : [],
  isSelf: viewerUserId ? String(player.userId || '') === String(viewerUserId) : false,
  lastSeenAt: player.lastSeenAt || null,
})

const publicQuestion = (question, revealAnswer = false) => ({
  questionId: String(question.questionId || ''),
  chapterId: question.chapterId ? String(question.chapterId) : '',
  topicId: question.topicId ? String(question.topicId) : '',
  chapterName: question.chapterName || '',
  topicName: question.topicName || '',
  objectiveLabel: question.objectiveLabel || '',
  question: question.question || '',
  options: Array.isArray(question.options) ? question.options : [],
  points: safeNumber(question.points, 0),
  questionTimeSeconds: safeNumber(question.questionTimeSeconds, DEFAULT_QUESTION_TIME_SECONDS),
  correctOption: revealAnswer ? safeNumber(question.correctOption, 0) : null,
})

const computeLeaderboard = (players = []) => {
  const sorted = [...players].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    if (right.correctCount !== left.correctCount) return right.correctCount - left.correctCount
    if (left.wrongCount !== right.wrongCount) return left.wrongCount - right.wrongCount
    return safeString(left.name).localeCompare(safeString(right.name))
  })

  let rank = 0
  let previous = null

  return sorted.map((player, index) => {
    const snapshot = `${player.score}:${player.correctCount}:${player.wrongCount}`
    if (snapshot !== previous) {
      rank = index + 1
      previous = snapshot
    }

    return {
      ...publicPlayer(player),
      rank,
    }
  })
}

const battleRoomView = (room, viewerUserId = '') => {
  const activeQuestion = room.status === 'active'
    ? room.questions[room.currentQuestionIndex] || null
    : null
  const questionIndex = room.status === 'active' ? room.currentQuestionIndex + 1 : room.currentQuestionIndex
  const leaderboard = computeLeaderboard(room.players || [])

  return {
    id: String(room._id),
    code: room.code,
    status: room.status,
    createdBy: String(room.createdBy || ''),
    creatorSnapshot: room.creatorSnapshot || null,
    settings: {
      roomName: room.settings?.roomName || 'Battle Room',
      chapterIds: (room.settings?.chapterIds || []).map((item) => String(item)),
      objectiveTypes: (room.settings?.objectiveTypes || []).map((item) => String(item)),
      questionsCount: safeNumber(room.settings?.questionsCount, DEFAULT_QUESTIONS_COUNT),
      timeLimitSeconds: safeNumber(room.settings?.timeLimitSeconds, DEFAULT_QUESTION_TIME_SECONDS),
      difficulty: room.settings?.difficulty || 'medium',
      emojiReactions: Boolean(room.settings?.emojiReactions),
      roomChat: Boolean(room.settings?.roomChat),
      maxPlayers: safeNumber(room.settings?.maxPlayers, DEFAULT_MAX_PLAYERS),
      minPlayers: safeNumber(room.settings?.minPlayers, DEFAULT_MIN_PLAYERS),
    },
    players: (room.players || []).map((player) => publicPlayer(player, viewerUserId)),
    leaderboard,
    currentQuestion: activeQuestion ? publicQuestion(activeQuestion, false) : null,
    currentQuestionIndex: questionIndex,
    totalQuestions: room.questions?.length || 0,
    questionStartedAt: room.questionStartedAt || null,
    questionEndsAt: room.questionEndsAt || null,
    codeExpiresAt: room.codeExpiresAt || null,
    startedAt: room.startedAt || null,
    finishedAt: room.finishedAt || null,
    cleanupAt: room.cleanupAt || null,
    chatMessages: Boolean(room.settings?.roomChat)
      ? (room.chatMessages || []).slice(-battleChatLimit)
      : [],
    reactions: Boolean(room.settings?.emojiReactions)
      ? (room.reactions || []).slice(-battleReactionLimit)
      : [],
    battleSummary: room.battleSummary || null,
    viewerUserId: String(viewerUserId || ''),
  }
}

const chooseQuestions = async ({ room, models }) => {
  const { ObjectiveType, ObjectiveQuestion } = models
  const chapterIds = (room.settings.chapterIds || []).map((value) => String(value))
  const selectedObjectiveTypes = (room.settings.objectiveTypes || [])
    .map((value) => safeLower(value))
    .filter((value) => allowedBattleObjectiveTypes.includes(value))
  const objectiveTypesToUse = selectedObjectiveTypes.length ? selectedObjectiveTypes : [...allowedBattleObjectiveTypes]

  let effectiveObjectiveTypes = await ObjectiveType.find({ type: { $in: objectiveTypesToUse } })
    .populate({
      path: 'topic',
      populate: { path: 'chapter' },
    })
    .lean()

  if (chapterIds.length) {
    const chapterIdSet = new Set(chapterIds)
    effectiveObjectiveTypes = effectiveObjectiveTypes.filter((item) => {
      const chapterId = String(item?.topic?.chapter?._id || item?.topic?.chapter || '')
      return chapterIdSet.has(chapterId)
    })
  }

  const objectiveTypeIdSet = new Set(effectiveObjectiveTypes.map((item) => String(item._id)))

  if (!objectiveTypeIdSet.size) {
    throw new Error('No objective types are available for the selected battle settings.')
  }

  const candidateQuestions = await ObjectiveQuestion.find({ objectiveType: { $in: [...objectiveTypeIdSet] } })
    .populate({
      path: 'objectiveType',
      populate: {
        path: 'topic',
        populate: { path: 'chapter' },
      },
    })
    .lean()

  const mappedQuestions = candidateQuestions
    .map((question) => {
      const objectiveType = question.objectiveType || {}
      const topic = objectiveType.topic || {}
      const chapter = topic.chapter || {}
      const basePoints = 100
      const difficultyMultiplier = difficultyMultipliers[safeLower(room.settings.difficulty)] || 1

      return {
        questionId: String(question._id),
        objectiveTypeId: String(objectiveType._id || ''),
        chapterId: chapter._id ? String(chapter._id) : '',
        topicId: topic._id ? String(topic._id) : '',
        chapterName: chapter.name || '',
        topicName: topic.name || '',
        objectiveLabel: objectiveType.type || '',
        question: question.question || '',
        options: Array.isArray(question.options) ? question.options : [],
        correctOption: safeNumber(question.correctOption, 0),
        points: Math.max(50, Math.round(basePoints * difficultyMultiplier)),
        questionTimeSeconds: safeNumber(room.settings.timeLimitSeconds, DEFAULT_QUESTION_TIME_SECONDS),
      }
    })
    .filter((question) => question.question && Array.isArray(question.options) && question.options.length >= 2)

  if (!mappedQuestions.length) {
    throw new Error('No battle questions were found for the selected chapters and objectives.')
  }

  const desiredCount = Math.min(
    Math.max(safeNumber(room.settings.questionsCount, DEFAULT_QUESTIONS_COUNT), 1),
    mappedQuestions.length,
  )

  return shuffle(mappedQuestions).slice(0, desiredCount)
}

const ensureBattlePlayer = (room, user) => {
  const userId = String(user._id)
  let player = (room.players || []).find((item) => String(item.userId) === userId)

  if (player) {
    player.name = user.name || player.name
    player.className = user.classId?.name || player.className || ''
    player.profileImageUrl = user.profileImageUrl ? `/api/users/${user._id}/profile-image` : ''
    player.connected = true
    player.lastSeenAt = new Date()
    player.updatedAt = new Date()
    return player
  }

  if ((room.players || []).length >= safeNumber(room.settings.maxPlayers, DEFAULT_MAX_PLAYERS)) {
    throw new Error('This room is already full.')
  }

  player = {
    userId: user._id,
    name: user.name || 'Student',
    className: user.classId?.name || '',
    profileImageUrl: user.profileImage?.data
      ? `/api/auth/users/${user._id}/avatar?v=${user.profileImage.updatedAt?.getTime() || Date.now()}`
      : '',
    ready: false,
    connected: true,
    seat: getSeatNumber(room.players || []),
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    skippedCount: 0,
    streak: 0,
    highestStreak: 0,
    fastestAnswerMs: null,
    answers: [],
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  }

  room.players.push(player)
  return player
}

const markBattleCleanup = (room, { expired = false } = {}) => {
  room.status = expired ? 'expired' : 'finished'
  room.finishedAt = room.finishedAt || new Date()
  room.cleanupAt = new Date(Date.now() + DEFAULT_CLEANUP_TTL_MS)
  room.lastActivityAt = new Date()
}

const finalizeQuestion = async ({ room, io, models, reason = 'timer' }) => {
  if (room.status !== 'active') {
    return room
  }

  const currentQuestion = room.questions[room.currentQuestionIndex]
  if (!currentQuestion) {
    markBattleCleanup(room)
    await room.save()
    return room
  }

  const answeredUserIds = new Set((room.players || []).map((player) => String(player.userId)))
  room.players.forEach((player) => {
    const hasAnswered = (player.answers || []).some((answer) => safeNumber(answer.questionIndex, -1) === room.currentQuestionIndex)
    if (!hasAnswered) {
      player.skippedCount = safeNumber(player.skippedCount, 0) + 1
      player.streak = 0
    }
  })

  room.currentQuestionIndex += 1
  room.lastActivityAt = new Date()

  if (room.currentQuestionIndex >= room.questions.length) {
    await finishBattle({ room, io, models })
    return room
  }

  room.questionStartedAt = new Date()
  room.questionEndsAt = new Date(Date.now() + safeNumber(currentQuestion.questionTimeSeconds, DEFAULT_QUESTION_TIME_SECONDS) * 1000)
  room.players.forEach((player) => {
    player.updatedAt = new Date()
  })
  await room.save()

  io.to(room.code).emit('battle:room-update', {
    room: battleRoomView(room),
    reason,
  })
  io.to(room.code).emit('battle:question-update', {
    room: battleRoomView(room),
    question: publicQuestion(room.questions[room.currentQuestionIndex], false),
  })

  return room
}

const finishBattle = async ({ room, io, models }) => {
  const { User } = models
  if (room.status === 'finished') {
    return room
  }

  const orderedPlayers = [...room.players].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    if (right.correctCount !== left.correctCount) return right.correctCount - left.correctCount
    if (left.wrongCount !== right.wrongCount) return left.wrongCount - right.wrongCount
    return safeString(left.name).localeCompare(safeString(right.name))
  })

  const rewards = orderedPlayers.map((player, index) => {
    const rank = index + 1
    const attemptedQuestionCount = new Set(
      (player.answers || [])
        .map((answer) => safeNumber(answer.questionIndex, -1))
        .filter((questionIndex) => questionIndex >= 0),
    ).size
    const hasRealBattleProgress = attemptedQuestionCount > 0 && safeNumber(player.score, 0) > 0

    return {
      userId: player.userId,
      rank,
      score: safeNumber(player.score, 0),
      brainCells: hasRealBattleProgress ? getBattleReward(rank) : 0,
    }
  })

  for (const reward of rewards) {
    await User.updateOne(
      { _id: reward.userId, isAdmin: false },
      {
        $inc: {
          totalScore: reward.score,
          totalBrainCells: reward.brainCells,
          totalCorrect: 0,
          totalMarks: room.questions.length,
          totalAttempts: 1,
        },
      },
    )

    io.emit('student-progress-updated', {
      studentId: String(reward.userId),
      reason: 'battle-finished',
    })
  }

  room.battleSummary = {
    totalQuestions: room.questions.length,
    totalPlayers: room.players.length,
    winnerIds: rewards.slice(0, 1).map((reward) => reward.userId),
    rewards,
  }
  room.status = 'finished'
  room.finishedAt = new Date()
  room.cleanupAt = new Date(Date.now() + DEFAULT_CLEANUP_TTL_MS)
  room.lastActivityAt = new Date()
  room.players.forEach((player) => {
    player.ready = false
    player.connected = true
  })
  await room.save()

  io.to(room.code).emit('battle:room-update', {
    room: battleRoomView(room),
    reason: 'finished',
  })
  io.to(room.code).emit('battle:battle-end', {
    room: battleRoomView(room),
  })

  return room
}

const processBattleAnswer = async ({ room, user, answerIndex, io, models }) => {
  if (room.status !== 'active') {
    throw new Error('This battle is not active.')
  }

  const player = (room.players || []).find((item) => String(item.userId) === String(user._id))
  if (!player) {
    throw new Error('You are not part of this battle room.')
  }

  const currentQuestion = room.questions[room.currentQuestionIndex]
  if (!currentQuestion) {
    throw new Error('No active question is available.')
  }

  const alreadyAnswered = (player.answers || []).some((answer) => safeNumber(answer.questionIndex, -1) === room.currentQuestionIndex)
  if (alreadyAnswered) {
    throw new Error('You already answered this question.')
  }

  const deadline = room.questionEndsAt ? new Date(room.questionEndsAt).getTime() : 0
  const answeredAt = Date.now()
  const elapsedMs = room.questionStartedAt ? Math.max(0, answeredAt - new Date(room.questionStartedAt).getTime()) : 0
  if (deadline && answeredAt > deadline) {
    throw new Error('Time is up for this question.')
  }

  const isCorrect = safeNumber(answerIndex, -1) === safeNumber(currentQuestion.correctOption, -2)
  const timeBonus = Math.max(0, Math.round(((safeNumber(currentQuestion.questionTimeSeconds, DEFAULT_QUESTION_TIME_SECONDS) * 1000 - elapsedMs) / 1000) * 2))
  const streakBefore = safeNumber(player.streak, 0)
  const streakAfter = isCorrect ? streakBefore + 1 : 0
  const streakBonus = isCorrect && streakAfter >= 3 ? Math.min(50, (streakAfter - 2) * 10) : 0
  const scoreAwarded = isCorrect ? safeNumber(currentQuestion.points, 100) + timeBonus + streakBonus : 0

  if (isCorrect) {
    player.score = safeNumber(player.score, 0) + scoreAwarded
    player.correctCount = safeNumber(player.correctCount, 0) + 1
    player.streak = streakAfter
    player.highestStreak = Math.max(safeNumber(player.highestStreak, 0), streakAfter)
    player.fastestAnswerMs = player.fastestAnswerMs == null ? elapsedMs : Math.min(player.fastestAnswerMs, elapsedMs)
  } else {
    player.wrongCount = safeNumber(player.wrongCount, 0) + 1
    player.streak = 0
  }

  player.answers.push({
    questionIndex: room.currentQuestionIndex,
    chosenOption: safeNumber(answerIndex, -1),
    correct: isCorrect,
    elapsedMs,
    answeredAt: new Date(),
    scoreAwarded,
  })
  player.answers = player.answers.slice(-battleAnswerLimit)
  player.updatedAt = new Date()
  player.lastSeenAt = new Date()
  room.lastActivityAt = new Date()

  await room.save()

  io.to(room.code).emit('battle:room-update', {
    room: battleRoomView(room, String(user._id)),
    reason: 'answer',
  })
  io.to(room.code).emit('battle:answer-received', {
    userId: String(user._id),
    questionIndex: room.currentQuestionIndex,
    answered: true,
    isCorrect,
    answerIndex: safeNumber(answerIndex, -1),
    correctOption: safeNumber(currentQuestion.correctOption, -1),
    streakBefore,
    streakAfter,
    scoreAwarded,
  })

  const everyoneAnswered = (room.players || []).every((entry) =>
    (entry.answers || []).some((answer) => safeNumber(answer.questionIndex, -1) === room.currentQuestionIndex),
  )

  if (everyoneAnswered) {
    await new Promise((resolve) => {
      setTimeout(resolve, 850)
    })
    await finalizeQuestion({ room, io, models, reason: 'all-answered' })
  }

  return room
}

const processRoomExpiry = async ({ BattleRoom, io, models }) => {
  const now = new Date()
  const expiredRooms = await BattleRoom.find({
    status: 'lobby',
    codeExpiresAt: { $lte: now },
  })

  for (const room of expiredRooms) {
    markBattleCleanup(room, { expired: true })
    await room.save()
    io.to(room.code).emit('battle:room-update', {
      room: battleRoomView(room),
      reason: 'expired',
    })
  }

  const activeRooms = await BattleRoom.find({ status: 'active', questionEndsAt: { $lte: now } })
  for (const room of activeRooms) {
    await finalizeQuestion({ room, io, models, reason: 'timer' })
  }
}

const normalizeBattleSettings = (body = {}) => {
  const settings = {
    roomName: safeString(body.roomName || 'Battle Room').slice(0, 120) || 'Battle Room',
    chapterIds: Array.isArray(body.chapterIds) ? body.chapterIds.map((item) => String(item)).filter(Boolean) : [],
    objectiveTypes: Array.isArray(body.objectiveTypes)
      ? body.objectiveTypes.map((item) => safeLower(item)).filter((item) => allowedBattleObjectiveTypes.includes(item))
      : [],
    questionsCount: Math.min(Math.max(safeNumber(body.questionsCount, DEFAULT_QUESTIONS_COUNT), 1), 20),
    timeLimitSeconds: Math.min(Math.max(safeNumber(body.timeLimitSeconds, DEFAULT_QUESTION_TIME_SECONDS), 5), 120),
    difficulty: ['easy', 'medium', 'hard'].includes(safeLower(body.difficulty)) ? safeLower(body.difficulty) : 'medium',
    emojiReactions: body.emojiReactions !== false,
    roomChat: body.roomChat !== false,
    maxPlayers: DEFAULT_MAX_PLAYERS,
    minPlayers: DEFAULT_MIN_PLAYERS,
  }

  return settings
}

const normalizeBattleSettingsUpdate = (body = {}, currentSettings = {}) => ({
  roomName: safeString(body.roomName ?? currentSettings.roomName ?? 'Battle Room').slice(0, 120) || 'Battle Room',
  questionsCount: Math.min(Math.max(safeNumber(body.questionsCount, currentSettings.questionsCount ?? DEFAULT_QUESTIONS_COUNT), 1), 20),
  timeLimitSeconds: Math.min(Math.max(safeNumber(body.timeLimitSeconds, currentSettings.timeLimitSeconds ?? DEFAULT_QUESTION_TIME_SECONDS), 5), 120),
  difficulty: ['easy', 'medium', 'hard'].includes(safeLower(body.difficulty))
    ? safeLower(body.difficulty)
    : (currentSettings.difficulty || 'medium'),
  emojiReactions: typeof body.emojiReactions === 'boolean'
    ? body.emojiReactions
    : Boolean(currentSettings.emojiReactions),
  roomChat: typeof body.roomChat === 'boolean'
    ? body.roomChat
    : Boolean(currentSettings.roomChat),
})

const initBattleMode = ({ app, server, io: sharedIo, mongoose, models, authRequired, optionalAuth }) => {
  const BattleRoom = getBattleRoomModel(mongoose)
  const io = sharedIo || new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  })

  const verifyUserFromSocket = async (socket) => {
    const token = String(socket.handshake.auth?.token || socket.handshake.query?.token || '')
    if (!token) {
      throw new Error('Please sign in first.')
    }

    const jwt = require('jsonwebtoken')
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development_secret_change_me')
    const userId = payload?.userId || payload?.id || payload?._id || payload?.sub || payload

    if (!userId) {
      throw new Error('Please sign in first.')
    }

    const user = await models.User.findById(userId).populate('classId', 'name').lean()
    if (!user) {
      throw new Error('Please sign in first.')
    }

    return user
  }

  app.get('/api/battle-mode/config', optionalAuth, async (req, res) => {
    res.json({
      limits: {
        maxPlayers: DEFAULT_MAX_PLAYERS,
        minPlayers: DEFAULT_MIN_PLAYERS,
        codeLifetimeMinutes: 10,
      },
      rewards: BATTLE_REWARD_CONFIG,
      emojis: battleEmojis,
    })
  })

  app.get('/api/battle-mode/active', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({
        $or: [
          { createdBy: req.user._id },
          { 'players.userId': req.user._id },
        ],
        status: { $in: ['lobby', 'active'] },
      })
        .sort({ updatedAt: -1 })
        .lean()

      if (!room) {
        return res.json({ activeRoom: null })
      }

      const route = room.status === 'active' ? 'arena' : 'lobby'
      return res.json({
        activeRoom: {
          ...battleRoomView(room, String(req.user._id)),
          route,
        },
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not load your battle session.' })
    }
  })

  app.post('/api/battle-mode/rooms', authRequired, async (req, res) => {
    try {
      const settings = normalizeBattleSettings(req.body)
      if (!settings.chapterIds.length) {
        return res.status(400).json({ message: 'Pick at least one chapter.' })
      }

      if (!settings.objectiveTypes.length) {
        settings.objectiveTypes = [...allowedBattleObjectiveTypes]
      }

      const code = await createRoomCode(BattleRoom)
      const room = await BattleRoom.create({
        code,
        createdBy: req.user._id,
        creatorSnapshot: {
          userId: req.user._id,
          name: req.user.name,
          className: req.user.classId?.name || '',
          profileImageUrl: req.user.profileImage?.data
            ? `/api/auth/users/${req.user._id}/avatar?v=${req.user.profileImage.updatedAt?.getTime() || Date.now()}`
            : '',
        },
        status: 'lobby',
        settings,
        players: [
          {
            userId: req.user._id,
            name: req.user.name,
            className: req.user.classId?.name || '',
            profileImageUrl: req.user.profileImage?.data
              ? `/api/auth/users/${req.user._id}/avatar?v=${req.user.profileImage.updatedAt?.getTime() || Date.now()}`
              : '',
            ready: false,
            connected: true,
            seat: 1,
          },
        ],
        codeExpiresAt: new Date(Date.now() + DEFAULT_CODE_TTL_MS),
        lastActivityAt: new Date(),
      })

      io.to(room.code).emit('battle:room-update', {
        room: battleRoomView(room, String(req.user._id)),
        reason: 'created',
      })

      res.status(201).json({
        room: battleRoomView(room, String(req.user._id)),
      })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Could not create battle room.' })
    }
  })

  app.get('/api/battle-mode/rooms/:code', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) }).lean()
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      const player = (room.players || []).find((item) => String(item.userId) === String(req.user._id))
      const allowed = room.createdBy && String(room.createdBy) === String(req.user._id)
        || Boolean(player)
        || room.status === 'lobby'

      if (!allowed) {
        return res.status(403).json({ message: 'You do not have access to this room.' })
      }

      res.json({ room: battleRoomView(room, String(req.user._id)) })
    } catch (error) {
      res.status(500).json({ message: 'Could not load battle room.' })
    }
  })

  app.post('/api/battle-mode/rooms/:code/join', authRequired, async (req, res) => {
    try {
      const code = safeUpper(req.params.code)
      const room = await BattleRoom.findOne({ code })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      if (room.status === 'expired' || (room.status === 'lobby' && room.codeExpiresAt < new Date())) {
        markBattleCleanup(room, { expired: true })
        await room.save()
        return res.status(410).json({ message: 'This room code has expired.' })
      }

      if (room.status === 'finished') {
        return res.status(409).json({ message: 'This battle is already finished.' })
      }

      const player = ensureBattlePlayer(room, req.user)
      player.connected = true
      player.lastSeenAt = new Date()
      player.updatedAt = new Date()
      room.lastActivityAt = new Date()

      await room.save()

      io.to(room.code).emit('battle:room-update', {
        room: battleRoomView(room, String(req.user._id)),
        reason: 'join',
      })

      res.json({
        room: battleRoomView(room, String(req.user._id)),
      })
    } catch (error) {
      const status = error.message === 'This room is already full.' ? 409 : 500
      res.status(status).json({ message: error.message || 'Could not join battle room.' })
    }
  })

  app.post('/api/battle-mode/rooms/:code/ready', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      const player = (room.players || []).find((item) => String(item.userId) === String(req.user._id))
      if (!player) {
        return res.status(403).json({ message: 'Join the room first.' })
      }

      player.ready = typeof req.body.ready === 'boolean' ? req.body.ready : !player.ready
      player.updatedAt = new Date()
      room.lastActivityAt = new Date()
      await room.save()

      io.to(room.code).emit('battle:room-update', {
        room: battleRoomView(room, String(req.user._id)),
        reason: 'ready',
      })

      res.json({ room: battleRoomView(room, String(req.user._id)) })
    } catch (error) {
      res.status(500).json({ message: 'Could not update ready status.' })
    }
  })

  app.post('/api/battle-mode/rooms/:code/leave', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      if (room.status !== 'lobby') {
        return res.status(409).json({ message: 'You can only leave before the battle starts.' })
      }

      if (String(room.createdBy) === String(req.user._id)) {
        return res.status(403).json({ message: 'The room creator must delete the room instead of leaving.' })
      }

      const playerIndex = (room.players || []).findIndex((item) => String(item.userId) === String(req.user._id))
      if (playerIndex === -1) {
        return res.status(403).json({ message: 'Join the room first.' })
      }

      const [leftPlayer] = room.players.splice(playerIndex, 1)
      room.lastActivityAt = new Date()

      if (!room.players.length) {
        const message = 'The lobby was closed because everyone left.'
        io.to(room.code).emit('battle:room-deleted', {
          roomCode: room.code,
          message,
        })
        await BattleRoom.deleteOne({ _id: room._id })
        return res.json({ message, roomCode: room.code, leftPlayerId: String(leftPlayer?.userId || '') })
      }

      await room.save()

      io.to(room.code).emit('battle:room-update', {
        room: battleRoomView(room, String(req.user._id)),
        reason: 'leave',
      })

      res.json({
        message: 'You left the room.',
        room: battleRoomView(room, String(req.user._id)),
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not leave the room.' })
    }
  })

  app.patch('/api/battle-mode/rooms/:code/settings', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      if (String(room.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Only the room creator can edit the lobby settings.' })
      }

      if (room.status !== 'lobby') {
        return res.status(409).json({ message: 'Room settings can only be edited before the battle starts.' })
      }

      const nextSettings = normalizeBattleSettingsUpdate(req.body, room.settings || {})
      room.settings = {
        ...room.settings,
        ...nextSettings,
      }
      room.players.forEach((player) => {
        player.ready = false
        player.updatedAt = new Date()
      })
      room.lastActivityAt = new Date()

      await room.save()

      io.to(room.code).emit('battle:room-update', {
        room: battleRoomView(room, String(req.user._id)),
        reason: 'settings',
      })

      res.json({
        room: battleRoomView(room, String(req.user._id)),
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not update room settings.' })
    }
  })

  app.delete('/api/battle-mode/rooms/:code', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      if (String(room.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Only the room creator can delete the room.' })
      }

      if (room.status !== 'lobby') {
        return res.status(409).json({ message: 'The room can only be deleted before the battle starts.' })
      }

      const message = `${safeString(req.user.name) || 'The creator'} deleted the room.`
      io.to(room.code).emit('battle:room-deleted', {
        roomCode: room.code,
        message,
      })

      await BattleRoom.deleteOne({ _id: room._id })

      res.json({
        message: 'Room deleted successfully.',
        roomCode: room.code,
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not delete the room.' })
    }
  })

  app.post('/api/battle-mode/rooms/:code/start', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      if (String(room.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Only the room creator can start the battle.' })
      }

      if (room.status !== 'lobby') {
        return res.status(409).json({ message: 'This battle has already started.' })
      }

      if (room.players.length < safeNumber(room.settings.minPlayers, DEFAULT_MIN_PLAYERS)) {
        return res.status(400).json({ message: 'You need at least 2 players to start.' })
      }

      if (!room.players.every((player) => Boolean(player.ready))) {
        return res.status(400).json({ message: 'Every player must be ready before starting.' })
      }

      room.questions = await chooseQuestions({ room, models })
      room.status = 'active'
      room.startedAt = new Date()
      room.questionStartedAt = new Date()
      room.questionEndsAt = new Date(Date.now() + safeNumber(room.questions[0]?.questionTimeSeconds, DEFAULT_QUESTION_TIME_SECONDS) * 1000)
      room.currentQuestionIndex = 0
      room.lastActivityAt = new Date()
      room.players.forEach((player) => {
        player.ready = false
        player.connected = true
        player.answers = []
        player.score = 0
        player.correctCount = 0
        player.wrongCount = 0
        player.skippedCount = 0
        player.streak = 0
        player.highestStreak = 0
        player.fastestAnswerMs = null
      })
      await room.save()

      io.to(room.code).emit('battle:room-update', {
        room: battleRoomView(room, String(req.user._id)),
        reason: 'started',
      })
      io.to(room.code).emit('battle:question-update', {
        room: battleRoomView(room, String(req.user._id)),
        question: publicQuestion(room.questions[0], false),
      })

      res.json({ room: battleRoomView(room, String(req.user._id)) })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Could not start battle.' })
    }
  })

  app.get('/api/battle-mode/rooms/:code/results', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) }).lean()
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      if (!['finished', 'active', 'expired'].includes(room.status)) {
        return res.status(409).json({ message: 'Battle results are not ready yet.' })
      }

      const view = battleRoomView(room, String(req.user._id))
      res.json({
        room: view,
        rewards: room.battleSummary?.rewards || [],
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not load battle results.' })
    }
  })

  io.use(async (socket, next) => {
    try {
      const user = await verifyUserFromSocket(socket)
      socket.data.user = user
      next()
    } catch (error) {
      next(new Error(error.message || 'Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('battle:subscribe', async ({ roomCode }) => {
      try {
        const code = safeUpper(roomCode)
        const room = await BattleRoom.findOne({ code })
        if (!room) {
          throw new Error('Battle room not found.')
        }

        const player = (room.players || []).find((item) => String(item.userId) === String(socket.data.user._id))
        if (!player) {
          throw new Error('You are not part of this room.')
        }

        player.connected = true
        player.lastSeenAt = new Date()
        player.updatedAt = new Date()
        room.lastActivityAt = new Date()
        await room.save()

        socket.join(code)
        socket.data.roomCode = code
        socket.emit('battle:room-update', {
          room: battleRoomView(room, String(socket.data.user._id)),
          reason: 'sync',
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message || 'Could not join battle socket.' })
      }
    })

    socket.on('battle:ready', async ({ roomCode, ready }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
        const player = (room.players || []).find((item) => String(item.userId) === String(socket.data.user._id))
        if (!player) throw new Error('Join the room first.')
        player.ready = typeof ready === 'boolean' ? ready : !player.ready
        player.updatedAt = new Date()
        room.lastActivityAt = new Date()
        await room.save()
        io.to(room.code).emit('battle:room-update', {
          room: battleRoomView(room, String(socket.data.user._id)),
          reason: 'ready',
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('battle:ready-reminder', async ({ roomCode, targetUserId }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
        if (room.status !== 'lobby') throw new Error('Ready reminders are only available in the lobby.')

        const sender = (room.players || []).find((item) => String(item.userId) === String(socket.data.user._id))
        if (!sender) throw new Error('Join the room first.')

        const target = (room.players || []).find((item) => String(item.userId) === String(targetUserId))
        if (!target) throw new Error('That player is not in the room.')

        room.lastActivityAt = new Date()
        await room.save()

        io.to(room.code).emit('battle:ready-reminder', {
          roomCode: room.code,
          senderId: String(socket.data.user._id),
          senderName: socket.data.user.name,
          targetUserId: String(target.userId),
          targetName: target.name || 'Player',
          message: `${socket.data.user.name} wants you to click Ready.`,
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('battle:start', async ({ roomCode }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
        if (String(room.createdBy) !== String(socket.data.user._id)) {
          throw new Error('Only the room creator can start the battle.')
        }
        if (room.status !== 'lobby') {
          throw new Error('This battle has already started.')
        }
        if (room.players.length < safeNumber(room.settings.minPlayers, DEFAULT_MIN_PLAYERS)) {
          throw new Error('You need at least 2 players to start.')
        }
        if (!room.players.every((player) => Boolean(player.ready))) {
          throw new Error('Every player must be ready before starting.')
        }

        room.questions = await chooseQuestions({ room, models })
        room.status = 'active'
        room.startedAt = new Date()
        room.questionStartedAt = new Date()
        room.questionEndsAt = new Date(Date.now() + safeNumber(room.questions[0]?.questionTimeSeconds, DEFAULT_QUESTION_TIME_SECONDS) * 1000)
        room.currentQuestionIndex = 0
        room.lastActivityAt = new Date()
        room.players.forEach((player) => {
          player.ready = false
          player.answers = []
          player.score = 0
          player.correctCount = 0
          player.wrongCount = 0
          player.skippedCount = 0
          player.streak = 0
          player.highestStreak = 0
          player.fastestAnswerMs = null
        })
        await room.save()

        io.to(room.code).emit('battle:room-update', {
          room: battleRoomView(room, String(socket.data.user._id)),
          reason: 'started',
        })
        io.to(room.code).emit('battle:question-update', {
          room: battleRoomView(room, String(socket.data.user._id)),
          question: publicQuestion(room.questions[0], false),
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('battle:answer', async ({ roomCode, answerIndex }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
        await processBattleAnswer({ room, user: socket.data.user, answerIndex, io, models })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('battle:chat', async ({ roomCode, message }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
        if (!room.settings.roomChat) throw new Error('Room chat is disabled.')
        const text = safeString(message).slice(0, 200)
        if (!text) throw new Error('Message cannot be empty.')

        room.chatMessages.push({
          id: crypto.randomUUID(),
          userId: socket.data.user._id,
          name: socket.data.user.name,
          message: text,
          createdAt: new Date(),
        })
        room.chatMessages = room.chatMessages.slice(-battleChatLimit)
        room.lastActivityAt = new Date()
        await room.save()

        io.to(room.code).emit('battle:chat-message', {
          roomCode: room.code,
          message: {
            id: room.chatMessages[room.chatMessages.length - 1].id,
            userId: String(socket.data.user._id),
            name: socket.data.user.name,
            message: text,
            createdAt: new Date(),
          },
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('battle:reaction', async ({ roomCode, emoji }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
        if (!room.settings.emojiReactions) throw new Error('Emoji reactions are disabled.')
        const chosenEmoji = battleEmojis.includes(emoji) ? emoji : '🔥'

        room.reactions.push({
          id: crypto.randomUUID(),
          userId: socket.data.user._id,
          name: socket.data.user.name,
          emoji: chosenEmoji,
          createdAt: new Date(),
        })
        room.reactions = room.reactions.slice(-battleReactionLimit)
        room.lastActivityAt = new Date()
        await room.save()

        io.to(room.code).emit('battle:reaction', {
          roomCode: room.code,
          reaction: {
            id: room.reactions[room.reactions.length - 1].id,
            userId: String(socket.data.user._id),
            name: socket.data.user.name,
            emoji: chosenEmoji,
            createdAt: new Date(),
          },
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('disconnect', async () => {
      const roomCode = socket.data.roomCode
      if (!roomCode) {
        return
      }

      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) {
          return
        }

        const player = (room.players || []).find((item) => String(item.userId) === String(socket.data.user._id))
        if (!player) {
          return
        }

        player.connected = false
        player.lastSeenAt = new Date()
        player.updatedAt = new Date()
        room.lastActivityAt = new Date()
        await room.save()

        io.to(room.code).emit('battle:room-update', {
          room: battleRoomView(room, String(socket.data.user._id)),
          reason: 'disconnect',
        })
      } catch (error) {
        // ignore disconnect persistence failures
      }
    })
  })

  setInterval(() => {
    processRoomExpiry({ BattleRoom, io, models }).catch((error) => {
      console.error('Battle room maintenance failed:', error.message)
    })
  }, 1000)

  return {
    BattleRoom,
    io,
  }
}

module.exports = {
  initBattleMode,
  battleRoomView,
  battleEmojis,
  getBattleReward,
}
