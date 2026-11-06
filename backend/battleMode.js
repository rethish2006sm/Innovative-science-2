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
const battleRoomOperationQueues = new Map()
const battleOnlineUsers = new Map()

const withBattleRoomLock = async (roomKey, operation) => {
  const key = String(roomKey)
  const previousOperation = battleRoomOperationQueues.get(key) || Promise.resolve()
  let releaseOperation
  const currentOperation = new Promise((resolve) => {
    releaseOperation = resolve
  })
  battleRoomOperationQueues.set(key, currentOperation)

  await previousOperation
  try {
    return await operation()
  } finally {
    releaseOperation()
    if (battleRoomOperationQueues.get(key) === currentOperation) {
      battleRoomOperationQueues.delete(key)
    }
  }
}

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
  gameId: {
    type: String,
    trim: true,
    maxlength: 40,
    default: '',
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
  returnedToLobby: {
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

const getBattleRoomModel = (mongoose, connection = mongoose.connection) => (
  connection.models.BattleRoom || connection.model('BattleRoom', battleRoomSchema)
)

const safeLower = (value) => String(value || '').trim().toLowerCase()
const safeUpper = (value) => String(value || '').trim().toUpperCase()
const safeString = (value) => String(value || '').trim()
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const battleProfileImageUrl = (user) => user?.battleProfileImage?.data
  ? `/api/auth/users/${user._id}/battle-profile-image?v=${user.battleProfileImage.updatedAt?.getTime() || Date.now()}`
  : ''

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
    lastActivityAt: room.lastActivityAt || null,
    codeExpiresAt: room.codeExpiresAt || null,
    startedAt: room.startedAt || null,
    finishedAt: room.finishedAt || null,
    cleanupAt: room.cleanupAt || null,
    chatMessages: (room.chatMessages || []).slice(-battleChatLimit),
    reactions: Boolean(room.settings?.emojiReactions)
      ? (room.reactions || []).slice(-battleReactionLimit)
      : [],
    battleSummary: room.battleSummary || null,
    viewerUserId: String(viewerUserId || ''),
  }
}

const battleRoomViewForUser = (room, viewerUserId = '') => {
  const view = battleRoomView(room, viewerUserId)
  const player = (room.players || []).find((entry) => String(entry.userId) === String(viewerUserId))
  if (room.status === 'finished' && player?.returnedToLobby) {
    view.status = 'lobby'
    view.startedAt = null
    view.finishedAt = null
    view.cleanupAt = null
    view.battleSummary = null
  }
  return view
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
    player.gameId = user.gameId || player.gameId || ''
    player.className = user.classId?.name || player.className || ''
    player.profileImageUrl = battleProfileImageUrl(user)
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
    gameId: user.gameId || '',
    className: user.classId?.name || '',
    profileImageUrl: battleProfileImageUrl(user),
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
  const { User, BattleReward } = models
  if (room.status === 'finished') {
    return room
  }

  const orderedPlayers = [...room.players].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    if (right.correctCount !== left.correctCount) return right.correctCount - left.correctCount
    if (left.wrongCount !== right.wrongCount) return left.wrongCount - right.wrongCount
    return safeString(left.name).localeCompare(safeString(right.name))
  })

  const attemptedQuestionCount = (player) => new Set(
    (player.answers || [])
      .map((answer) => safeNumber(answer.questionIndex, -1))
      .filter((questionIndex) => questionIndex >= 0),
  ).size
  const validBattle = orderedPlayers.length > 0 && orderedPlayers.every((player) => attemptedQuestionCount(player) > 0)

  const rewards = validBattle ? orderedPlayers.map((player, index) => {
    const rank = index + 1
    const attemptedCount = attemptedQuestionCount(player)
    const hasRealBattleProgress = attemptedCount > 0 && safeNumber(player.score, 0) > 0

    return {
      userId: player.userId,
      rank,
      score: safeNumber(player.score, 0),
      correctCount: safeNumber(player.correctCount, 0),
      wrongCount: safeNumber(player.wrongCount, 0),
      skippedCount: safeNumber(player.skippedCount, 0),
      attemptedCount,
      streak: safeNumber(player.streak, 0),
      brainCells: hasRealBattleProgress ? getBattleReward(rank) : 0,
    }
  }) : []

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

  if (BattleReward) {
    const rewardWrites = rewards.map((reward) => ({
      updateOne: {
        filter: {
          roomId: room._id,
          userId: reward.userId,
        },
        update: {
          $set: {
            roomCode: room.code,
            roomName: room.settings?.roomName || 'Battle Match',
            chapterIds: room.settings?.chapterIds || [],
            objectiveTypes: room.settings?.objectiveTypes || [],
            userId: reward.userId,
            rank: reward.rank,
            score: reward.score,
            correctCount: reward.correctCount,
            wrongCount: reward.wrongCount,
            skippedCount: reward.skippedCount,
            attemptedCount: reward.attemptedCount,
            streak: reward.streak,
            brainCells: reward.brainCells,
            totalQuestions: room.questions.length,
            totalPlayers: room.players.length,
            finishedAt: new Date(),
          },
        },
        upsert: true,
      },
    }))

    if (rewardWrites.length) {
      await BattleReward.bulkWrite(rewardWrites, { ordered: false })
    }
  }

  room.battleSummary = {
    totalQuestions: room.questions.length,
    totalPlayers: room.players.length,
    validBattle,
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
  const roomView = battleRoomView(room, String(user._id))
  const selfRank = roomView.leaderboard.find((entry) => entry.isSelf)?.rank ?? null

  io.to(room.code).emit('battle:room-update', {
    room: roomView,
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
    rank: selfRank,
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

  // Inspect all active rooms instead of relying on the Date query alone. This
  // also recovers rooms whose deadline was written while the database was busy.
  const activeRooms = await BattleRoom.find({ status: 'active' }).select('code')
  for (const room of activeRooms) {
    await withBattleRoomLock(room.code, async () => {
      const latestRoom = await BattleRoom.findOne({ code: room.code })
      const deadlineMs = latestRoom?.questionEndsAt ? new Date(latestRoom.questionEndsAt).getTime() : 0
      if (latestRoom?.status === 'active' && deadlineMs > 0 && deadlineMs <= Date.now()) {
        await finalizeQuestion({ room: latestRoom, io, models, reason: 'timer' })
      }
    })
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
  chapterIds: Array.isArray(body.chapterIds) ? body.chapterIds.map((item) => String(item)).filter(Boolean) : (currentSettings.chapterIds || []),
  objectiveTypes: Array.isArray(body.objectiveTypes)
    ? body.objectiveTypes.map((item) => safeLower(item)).filter((item) => allowedBattleObjectiveTypes.includes(item))
    : (currentSettings.objectiveTypes || []),
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

const initBattleMode = ({ app, server, io: sharedIo, mongoose, models, authRequired, optionalAuth, getScienceConnection }) => {
  const baseBattleRoom = getBattleRoomModel(mongoose)
  const BattleRoom = getScienceConnection
    ? new Proxy(baseBattleRoom, {
      get(target, property) {
        const model = getBattleRoomModel(mongoose, getScienceConnection())
        const value = model[property]
        return typeof value === 'function' ? value.bind(model) : value
      },
      construct(target, args) {
        return Reflect.construct(getBattleRoomModel(mongoose, getScienceConnection()), args)
      },
    })
    : baseBattleRoom
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

  app.get('/api/battle-mode/rankings', authRequired, async (req, res) => {
    try {
      const { BattleReward, User } = models
      if (!BattleReward || !User) return res.json({ rankings: [], me: null })
      const rows = await BattleReward.aggregate([
        { $group: { _id: '$userId', battlePoints: { $sum: '$score' }, matches: { $sum: 1 } } },
        { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $match: { 'user.isAdmin': { $ne: true } } },
        { $sort: { battlePoints: -1, matches: -1, _id: 1 } },
      ])
      const allRankings = rows.map((row, index) => ({
        rank: index + 1,
        userId: String(row._id),
        name: row.user.name || 'Battle player',
        gameId: row.user.gameId || '',
        profileImageUrl: row.user.battleProfileImage?.data
          ? `/api/auth/users/${row.user._id}/battle-profile-image?v=${row.user.battleProfileImage.updatedAt?.getTime() || Date.now()}`
          : '',
        battlePoints: safeNumber(row.battlePoints),
        matches: safeNumber(row.matches),
      }))
      res.json({ rankings: allRankings.slice(0, 5), me: allRankings.find((entry) => entry.userId === String(req.user._id)) || null })
    } catch (error) {
      res.status(500).json({ message: 'Could not load Battle Mode rankings.' })
    }
  })

  app.get('/api/battle-mode/history', authRequired, async (req, res) => {
    try {
      const { BattleReward } = models
      if (!BattleReward) return res.json({ matches: [] })
      const matches = await BattleReward.find({ userId: req.user._id })
        .sort({ finishedAt: -1 })
        .lean()
      const chapterIds = [...new Set(matches.flatMap((match) => (match.chapterIds || []).map((id) => String(id))))]
      const chapters = models.Chapter && chapterIds.length
        ? await models.Chapter.find({ _id: { $in: chapterIds } }).select('name').lean()
        : []
      const chapterNames = new Map(chapters.map((chapter) => [String(chapter._id), chapter.name]))
      const roomIds = matches.map((match) => match.roomId).filter(Boolean)
      const allRewards = await BattleReward.find({ roomId: { $in: roomIds } }).sort({ rank: 1 }).lean()
      const userIds = [...new Set(allRewards.map((reward) => String(reward.userId)))]
      const users = await models.User.find({ _id: { $in: userIds } }).select('name gameId battleProfileImage').lean()
      const usersById = new Map(users.map((user) => [String(user._id), user]))
      const playersByRoom = new Map()
      allRewards.forEach((reward) => {
        const player = usersById.get(String(reward.userId))
        const players = playersByRoom.get(String(reward.roomId)) || []
        players.push({
          userId: String(reward.userId),
          name: player?.name || 'Battle player',
          gameId: player?.gameId || '',
          profileImageUrl: player?.battleProfileImage?.data
            ? `/api/auth/users/${player._id}/battle-profile-image?v=${player.battleProfileImage.updatedAt?.getTime() || Date.now()}`
            : '',
          rank: safeNumber(reward.rank),
          score: safeNumber(reward.score),
          correctCount: safeNumber(reward.correctCount),
          wrongCount: safeNumber(reward.wrongCount),
          skippedCount: safeNumber(reward.skippedCount),
          attemptedCount: safeNumber(reward.attemptedCount, safeNumber(reward.correctCount) + safeNumber(reward.wrongCount) + safeNumber(reward.skippedCount)),
          streak: safeNumber(reward.streak),
          brainCells: safeNumber(reward.brainCells),
        })
        playersByRoom.set(String(reward.roomId), players)
      })
      res.json({ matches: matches.map((match) => ({
        id: String(match._id),
        roomId: String(match.roomId),
        roomName: match.roomName || 'Battle Match',
        roomCode: match.roomCode || '------',
        rank: safeNumber(match.rank),
        score: safeNumber(match.score),
        brainCells: safeNumber(match.brainCells),
        totalQuestions: safeNumber(match.totalQuestions),
        totalPlayers: safeNumber(match.totalPlayers),
        finishedAt: match.finishedAt || match.createdAt || null,
        settings: {
          chapters: (match.chapterIds || []).map((id) => chapterNames.get(String(id))).filter(Boolean),
          objectives: (match.objectiveTypes || []).map((type) => type === 'mcqs' ? 'MCQs' : type === 'true-or-false' ? 'True or False' : type === 'correlation' ? 'Correlations' : type),
        },
        players: playersByRoom.get(String(match.roomId)) || [],
      })) })
    } catch (error) {
      res.status(500).json({ message: 'Could not load Battle Mode history.' })
    }
  })

  app.get('/api/battle-mode/game-id-availability/:gameId', authRequired, async (req, res) => {
    const gameId = safeString(req.params.gameId)
    if (!/(?=.*\d)^[A-Za-z0-9_]{6,14}$/.test(gameId)) return res.json({ available: false, valid: false })
    const owner = await models.User.findOne({ gameId, _id: { $ne: req.user._id } }).select('_id').lean()
    res.json({ available: !owner, valid: true })
  })

  app.get('/api/battle-mode/friends', authRequired, async (req, res) => {
    try {
      const user = await models.User.findById(req.user._id).select('friendIds').lean()
      const friendIds = user?.friendIds || []
      const friends = await models.User.find({ _id: { $in: friendIds }, isAdmin: false })
        .select('name gameId battleProfileImage classId totalBrainCells')
        .populate('classId', 'name')
        .lean()
      const requestedRoomCode = safeUpper(req.query?.roomCode)
      const occupiedRooms = await BattleRoom.find({
        'players.userId': { $in: friendIds },
        status: { $in: ['lobby', 'active'] },
      }).select('code status players.userId codeExpiresAt').lean()
      const now = Date.now()
      const roomByPlayer = new Map()
      occupiedRooms.forEach((room) => {
        if (room.status === 'lobby' && room.codeExpiresAt && new Date(room.codeExpiresAt).getTime() <= now) return
        const roomStatus = room.status === 'active'
          ? 'active'
          : String(room.code) === requestedRoomCode
            ? 'current-lobby'
            : 'lobby'
        const statusPriority = { lobby: 1, 'current-lobby': 2, active: 3 }
        ;(room.players || []).forEach((player) => {
          const playerId = String(player.userId)
          const previousRoom = roomByPlayer.get(playerId)
          if (
            friendIds.some((id) => String(id) === playerId)
            && (!previousRoom || statusPriority[roomStatus] > statusPriority[previousRoom.battleStatus])
          ) {
            roomByPlayer.set(playerId, { ...room, battleStatus: roomStatus })
          }
        })
      })
      res.json({
        friends: friends.map((friend) => ({
          battleStatus: roomByPlayer.get(String(friend._id))?.battleStatus || 'available',
          id: String(friend._id),
          name: friend.name,
          gameId: friend.gameId || '',
          className: friend.classId?.name || '',
          totalBrainCells: safeNumber(friend.totalBrainCells),
          profileImageUrl: friend.battleProfileImage?.data
            ? `/api/auth/users/${friend._id}/battle-profile-image?v=${friend.battleProfileImage.updatedAt?.getTime() || Date.now()}`
            : '',
          online: (battleOnlineUsers.get(String(friend._id)) || 0) > 0,
        })),
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not load your friends.' })
    }
  })

  app.get('/api/battle-mode/friend-requests', authRequired, async (req, res) => {
    try {
      const [user, outgoing] = await Promise.all([
        models.User.findById(req.user._id)
          .select('friendRequests')
          .populate('friendRequests.senderId', 'name gameId battleProfileImage classId')
          .lean(),
        models.User.find({ 'friendRequests.senderId': req.user._id, isAdmin: false })
          .select('name gameId')
          .lean(),
      ])
      res.json({
        incoming: (user?.friendRequests || []).filter((request) => request.senderId).map((request) => ({
          id: String(request._id),
          createdAt: request.createdAt,
          sender: {
            id: String(request.senderId._id),
            name: request.senderId.name,
            gameId: request.senderId.gameId || '',
            profileImageUrl: request.senderId.battleProfileImage?.data
              ? `/api/auth/users/${request.senderId._id}/battle-profile-image?v=${request.senderId.battleProfileImage.updatedAt?.getTime() || Date.now()}`
              : '',
            online: (battleOnlineUsers.get(String(request.senderId._id)) || 0) > 0,
          },
        })),
        outgoing: outgoing.map((request) => ({ id: String(request._id), name: request.name, gameId: request.gameId || '' })),
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not load friend requests.' })
    }
  })

  app.get('/api/battle-mode/friend-search', authRequired, async (req, res) => {
    try {
      const query = safeString(req.query?.q).trim()
      if (query.length < 2) return res.json({ students: [] })
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const userIdQuery = /^[a-f\d]{24}$/i.test(query) ? query : null
      const currentUser = await models.User.findById(req.user._id).select('friendIds friendRequests').lean()
      const [students, outgoing] = await Promise.all([
        models.User.find({
          _id: { $ne: req.user._id },
          isAdmin: false,
          $or: [
            { gameId: { $regex: escapedQuery, $options: 'i' } },
            ...(userIdQuery ? [{ _id: userIdQuery }] : []),
          ],
        }).select('name gameId battleProfileImage').limit(10).lean(),
        models.User.find({ 'friendRequests.senderId': req.user._id }).select('_id').lean(),
      ])
      const outgoingIds = new Set(outgoing.map((student) => String(student._id)))
      const friendIds = new Set((currentUser?.friendIds || []).map((id) => String(id)))
      const incomingIds = new Set((currentUser?.friendRequests || []).map((request) => String(request.senderId)))
      res.json({
        students: students.map((student) => ({
          id: String(student._id),
          name: student.name,
          gameId: student.gameId || '',
          profileImageUrl: student.battleProfileImage?.data
            ? `/api/auth/users/${student._id}/battle-profile-image?v=${student.battleProfileImage.updatedAt?.getTime() || Date.now()}`
            : '',
          online: (battleOnlineUsers.get(String(student._id)) || 0) > 0,
          relationship: friendIds.has(String(student._id))
            ? 'friends'
            : outgoingIds.has(String(student._id))
              ? 'pending'
              : incomingIds.has(String(student._id))
                ? 'incoming'
                : 'available',
        })),
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not search students.' })
    }
  })

  app.post('/api/battle-mode/friend-requests', authRequired, async (req, res) => {
    try {
      const gameId = safeString(req.body?.gameId)
      const userId = safeString(req.body?.userId)
      if ((!gameId || !/^[A-Za-z0-9_]+$/.test(gameId)) && !userId) {
        return res.status(400).json({ message: 'Choose a valid student to add.' })
      }
      const target = userId
        ? await models.User.findOne({ _id: userId, isAdmin: false }).select('name gameId').lean()
        : await models.User.findOne({ gameId, isAdmin: false }).select('name gameId').lean()
      if (!target) return res.status(404).json({ message: 'No student was found.' })
      if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot add yourself.' })

      const [sender, targetWithRequests] = await Promise.all([
        models.User.findById(req.user._id).select('name friendIds').lean(),
        models.User.findById(target._id).select('friendIds friendRequests').lean(),
      ])
      if ((sender?.friendIds || []).some((id) => String(id) === String(target._id))) {
        return res.status(409).json({ message: 'You are already friends.' })
      }
      if ((targetWithRequests?.friendRequests || []).some((request) => String(request.senderId) === String(req.user._id))) {
        return res.status(409).json({ message: 'Friend request already sent.' })
      }
      if ((sender?.friendRequests || []).some((request) => String(request.senderId) === String(target._id))) {
        return res.status(409).json({ message: 'This student already sent you a request. Check your requests.' })
      }

      const updatedTarget = await models.User.findByIdAndUpdate(
        target._id,
        { $push: { friendRequests: { senderId: req.user._id } } },
        { new: true, select: 'friendRequests' },
      )
      const request = updatedTarget.friendRequests[updatedTarget.friendRequests.length - 1]
      io.to(`battle-user:${String(target._id)}`).emit('battle:friend-request', {
        id: String(request._id),
        sender: { id: String(req.user._id), name: sender?.name || req.user.name || 'Student', gameId: req.user.gameId || '' },
      })
      res.status(201).json({ message: `Friend request sent to ${target.name}.` })
    } catch (error) {
      res.status(500).json({ message: 'Could not send friend request.' })
    }
  })

  app.patch('/api/battle-mode/friend-requests/:requestId', authRequired, async (req, res) => {
    try {
      const action = safeLower(req.body?.action)
      if (!['accepted', 'rejected'].includes(action)) return res.status(400).json({ message: 'Choose accept or reject.' })
      const user = await models.User.findById(req.user._id).select('friendRequests name').lean()
      const request = (user?.friendRequests || []).find((item) => String(item._id) === String(req.params.requestId))
      if (!request) return res.status(404).json({ message: 'Friend request not found.' })

      await models.User.updateOne({ _id: req.user._id }, { $pull: { friendRequests: { _id: request._id } } })
      const sender = await models.User.findById(request.senderId).select('name gameId').lean()
      if (action === 'accepted') {
        await Promise.all([
          models.User.updateOne({ _id: req.user._id }, { $addToSet: { friendIds: request.senderId } }),
          models.User.updateOne({ _id: request.senderId }, { $addToSet: { friendIds: req.user._id } }),
        ])
      }
      io.to(`battle-user:${String(request.senderId)}`).emit('battle:friend-request-status', {
        action,
        userId: String(req.user._id),
        name: user?.name || req.user.name || 'Student',
      })
      res.json({ message: action === 'accepted' ? `${sender?.name || 'Student'} is now your friend.` : 'Friend request declined.', action })
    } catch (error) {
      res.status(500).json({ message: 'Could not update friend request.' })
    }
  })

  app.post('/api/battle-mode/friends', authRequired, async (req, res) => {
    try {
      const gameId = safeString(req.body?.gameId)
      const userId = safeString(req.body?.userId)
      if ((!gameId || !/^[A-Za-z0-9_]+$/.test(gameId)) && !userId) {
        return res.status(400).json({ message: 'Enter a valid GameID using only letters, numbers, and underscores.' })
      }
      const friend = userId
        ? await models.User.findOne({ _id: userId, isAdmin: false })
        : await models.User.findOne({ gameId, isAdmin: false })
      if (!friend) return res.status(404).json({ message: 'No student was found with that GameID.' })
      if (String(friend._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot add yourself.' })
      await Promise.all([
        models.User.updateOne({ _id: req.user._id }, { $addToSet: { friendIds: friend._id } }),
        models.User.updateOne({ _id: friend._id }, { $addToSet: { friendIds: req.user._id } }),
      ])
      res.json({ message: `${friend.name} is now your friend.` })
    } catch (error) {
      res.status(500).json({ message: 'Could not add this friend.' })
    }
  })

  app.delete('/api/battle-mode/friends/:userId', authRequired, async (req, res) => {
    try {
      const friendId = safeString(req.params.userId)
      if (!friendId || friendId === String(req.user._id)) {
        return res.status(400).json({ message: 'Choose a valid friend.' })
      }
      const friend = await models.User.findOne({ _id: friendId, isAdmin: false }).select('name').lean()
      if (!friend) return res.status(404).json({ message: 'Friend not found.' })
      await Promise.all([
        models.User.updateOne({ _id: req.user._id }, { $pull: { friendIds: friendId } }),
        models.User.updateOne({ _id: friendId }, { $pull: { friendIds: req.user._id } }),
      ])
      res.json({ message: `${friend.name} was removed from your friends.` })
    } catch (error) {
      res.status(500).json({ message: 'Could not remove this friend.' })
    }
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
        return res.status(400).json({ message: 'Pick at least one objective type.' })
      }

      const availableQuestions = await chooseQuestions({ room: { settings }, models })
      settings.questionsCount = Math.min(settings.questionsCount, availableQuestions.length)

      const code = await createRoomCode(BattleRoom)
      const room = await BattleRoom.create({
        code,
        createdBy: req.user._id,
        creatorSnapshot: {
          userId: req.user._id,
          name: req.user.name,
          className: req.user.classId?.name || '',
          profileImageUrl: battleProfileImageUrl(req.user),
        },
        status: 'lobby',
        settings,
        players: [
          {
            userId: req.user._id,
            name: req.user.name,
            gameId: req.user.gameId || '',
            className: req.user.classId?.name || '',
            profileImageUrl: battleProfileImageUrl(req.user),
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

      res.json({ room: battleRoomViewForUser(room, String(req.user._id)) })
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

      if (!['lobby', 'finished'].includes(room.status)) {
        return res.status(409).json({ message: 'You can only leave before or after the battle.' })
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

      if (String(room.createdBy) === String(req.user._id)) {
        const nextHost = room.players[0]
        room.createdBy = nextHost.userId
        room.creatorSnapshot = {
          userId: nextHost.userId,
          name: nextHost.name || 'Player',
          className: nextHost.className || '',
          profileImageUrl: nextHost.profileImageUrl || '',
        }
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

      const creator = (room.players || []).find((entry) => String(entry.userId) === String(req.user._id))
      if (room.status !== 'lobby' && !(room.status === 'finished' && creator?.returnedToLobby)) {
        return res.status(409).json({ message: 'Room settings can only be edited before the battle starts.' })
      }

      const nextSettings = normalizeBattleSettingsUpdate(req.body, room.settings || {})
      if (!nextSettings.chapterIds.length) {
        return res.status(400).json({ message: 'At least one chapter is required.' })
      }
      if (!nextSettings.objectiveTypes.length) {
        return res.status(400).json({ message: 'At least one objective type is required.' })
      }
      const availableQuestions = await chooseQuestions({ room: { settings: nextSettings }, models })
      nextSettings.questionsCount = Math.min(nextSettings.questionsCount, availableQuestions.length)
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

      if (room.status === 'lobby') {
        io.to(room.code).emit('battle:room-update', {
          room: battleRoomView(room, String(req.user._id)),
          reason: 'settings',
        })
      }

      res.json({
        room: battleRoomViewForUser(room, String(req.user._id)),
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

  app.post('/api/battle-mode/rooms/:code/replay', authRequired, async (req, res) => {
    try {
      const room = await BattleRoom.findOne({ code: safeUpper(req.params.code) })
      if (!room) {
        return res.status(404).json({ message: 'Battle room not found.' })
      }

      const player = (room.players || []).find((item) => String(item.userId) === String(req.user._id))
      if (!player) {
        return res.status(403).json({ message: 'You are not part of this room.' })
      }

      if (!['finished', 'lobby'].includes(room.status)) {
        return res.status(409).json({ message: 'The battle must be finished before returning to the lobby.' })
      }

      if (room.status === 'finished') {
        player.returnedToLobby = true
        player.ready = false
        player.connected = true
        if (room.players.every((entry) => entry.returnedToLobby)) {
          room.status = 'lobby'
          room.questions = []
          room.currentQuestionIndex = 0
          room.questionStartedAt = null
          room.questionEndsAt = null
          room.startedAt = null
          room.finishedAt = null
          room.cleanupAt = null
          room.battleSummary = undefined
          room.codeExpiresAt = new Date(Date.now() + DEFAULT_CODE_TTL_MS)
          room.players.forEach((entry) => {
            entry.returnedToLobby = false
            entry.ready = false
            entry.connected = true
            entry.answers = []
            entry.score = 0
            entry.correctCount = 0
            entry.wrongCount = 0
            entry.skippedCount = 0
            entry.streak = 0
            entry.highestStreak = 0
            entry.fastestAnswerMs = null
            entry.updatedAt = new Date()
          })
        }
        room.lastActivityAt = new Date()
        await room.save()
      }

      const roomView = battleRoomViewForUser(room, String(req.user._id))

      res.json({ room: roomView })
    } catch (error) {
      res.status(500).json({ message: error.message || 'Could not reopen the battle lobby.' })
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
    const connectedUserId = String(socket.data.user._id)
    socket.join(`battle-user:${connectedUserId}`)
    battleOnlineUsers.set(connectedUserId, (battleOnlineUsers.get(connectedUserId) || 0) + 1)
    io.emit('battle:presence-update', { userId: connectedUserId, online: true })

    socket.on('battle:presence-sync', () => {
      socket.emit('battle:presence-snapshot', { userIds: [...battleOnlineUsers.keys()] })
    })

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
          room: battleRoomViewForUser(room, String(socket.data.user._id)),
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

    socket.on('battle:room-invite', async ({ roomCode, targetUserId }) => {
      try {
        const code = safeUpper(roomCode)
        const room = await BattleRoom.findOne({ code })
        if (!room) throw new Error('Battle room not found.')
        if (room.status !== 'lobby') throw new Error('Invites are only available in the lobby.')

        const senderId = String(socket.data.user._id)
        const sender = await models.User.findById(senderId).select('name friendIds').lean()
        const targetId = String(targetUserId || '')
        if (!sender?.friendIds?.some((id) => String(id) === targetId)) {
          throw new Error('You can invite friends only.')
        }
        if ((room.players || []).some((player) => String(player.userId) === targetId)) {
          throw new Error('That player is already in the room.')
        }
        const occupiedRooms = await BattleRoom.find({
          'players.userId': targetId,
          status: { $in: ['lobby', 'active'] },
        }).select('code status codeExpiresAt').lean()
        const occupiedRoom = occupiedRooms.find((candidate) => candidate.status === 'active')
          || occupiedRooms.find((candidate) => !(candidate.status === 'lobby' && candidate.codeExpiresAt && new Date(candidate.codeExpiresAt).getTime() <= Date.now()))
        if (occupiedRoom && !(occupiedRoom.status === 'lobby' && occupiedRoom.codeExpiresAt && new Date(occupiedRoom.codeExpiresAt).getTime() <= Date.now())) {
          throw new Error(occupiedRoom.status === 'active' ? 'That friend is already playing a battle.' : 'That friend is already in another lobby.')
        }

        const inviteId = `${code}-${senderId}-${targetId}-${Date.now()}`
        const payload = {
          inviteId,
          roomCode: code,
          roomName: room.settings?.roomName || 'Battle Room',
          senderId,
          senderName: sender?.name || socket.data.user.name || 'Player',
          targetUserId: targetId,
          expiresAt: Date.now() + 10000,
        }
        const delivered = (battleOnlineUsers.get(targetId) || 0) > 0
        io.to(`battle-user:${targetId}`).emit('battle:room-invite', payload)
        socket.emit('battle:room-invite-status', {
          ...payload,
          status: delivered ? 'sent' : 'offline',
        })
      } catch (error) {
        socket.emit('battle:room-invite-status', { status: 'error', message: error.message || 'Could not send the invite.' })
      }
    })

    socket.on('battle:room-invite-response', ({ inviteId, roomCode, senderId, status }) => {
      if (!['accepted', 'rejected', 'expired'].includes(status)) return
      for (const targetSocket of io.sockets.sockets.values()) {
        if (String(targetSocket.data?.user?._id || '') === String(senderId || '')) {
          targetSocket.emit('battle:room-invite-status', {
            inviteId,
            roomCode: safeUpper(roomCode),
            status,
            responderId: String(socket.data.user._id),
            responderName: socket.data.user.name || 'Player',
          })
        }
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
        const code = safeUpper(roomCode)
        await withBattleRoomLock(code, async () => {
          const room = await BattleRoom.findOne({ code })
          if (!room) throw new Error('Battle room not found.')
          await processBattleAnswer({ room, user: socket.data.user, answerIndex, io, models })
        })
      } catch (error) {
        socket.emit('battle:error', { message: error.message })
      }
    })

    socket.on('battle:chat', async ({ roomCode, message }) => {
      try {
        const room = await BattleRoom.findOne({ code: safeUpper(roomCode) })
        if (!room) throw new Error('Battle room not found.')
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

    socket.on('battle:voice-join', async ({ roomCode }) => {
      try {
        const code = safeUpper(roomCode)
        if (!socket.rooms.has(code)) throw new Error('Join the battle room before enabling voice.')
        socket.data.voiceRooms = socket.data.voiceRooms || new Set()
        socket.data.voiceRooms.add(code)
        const peers = (await io.in(code).fetchSockets())
          .filter((peer) => peer.id !== socket.id && peer.data.voiceRooms?.has(code))
          .map((peer) => String(peer.data.user?._id || ''))
          .filter(Boolean)
        socket.emit('battle:voice-peers', { userIds: peers })
        socket.to(code).emit('battle:voice-peer-joined', { userId: String(socket.data.user._id) })
      } catch (error) {
        socket.emit('battle:error', { message: error.message || 'Could not join room voice.' })
      }
    })

    const relayVoiceSignal = async (eventName, { roomCode, targetUserId, ...payload } = {}) => {
      const code = safeUpper(roomCode)
      if (!socket.rooms.has(code)) return
      const targets = await io.in(code).fetchSockets()
      targets
        .filter((peer) => String(peer.data.user?._id || '') === String(targetUserId || ''))
        .forEach((peer) => peer.emit(eventName, { ...payload, fromUserId: String(socket.data.user._id) }))
    }

    socket.on('battle:voice-offer', (payload) => relayVoiceSignal('battle:voice-offer', payload).catch(() => {}))
    socket.on('battle:voice-answer', (payload) => relayVoiceSignal('battle:voice-answer', payload).catch(() => {}))
    socket.on('battle:voice-ice', (payload) => relayVoiceSignal('battle:voice-ice', payload).catch(() => {}))
    socket.on('battle:voice-leave', ({ roomCode }) => {
      const code = safeUpper(roomCode)
      socket.data.voiceRooms?.delete(code)
      if (socket.rooms.has(code)) socket.to(code).emit('battle:voice-peer-left', { userId: String(socket.data.user._id) })
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
      const nextCount = (battleOnlineUsers.get(connectedUserId) || 1) - 1
      if (nextCount > 0) battleOnlineUsers.set(connectedUserId, nextCount)
      else {
        battleOnlineUsers.delete(connectedUserId)
        io.emit('battle:presence-update', { userId: connectedUserId, online: false })
      }
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
