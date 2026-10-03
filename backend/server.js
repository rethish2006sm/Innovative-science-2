const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const dotenv = require('dotenv')
const fs = require('fs')
const http = require('http')
const { AsyncLocalStorage } = require('async_hooks')
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const compression = require('compression')
const { Server } = require('socket.io')
const webpush = require('web-push')
const { getApps, initializeApp, cert, applicationDefault } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { initBattleMode } = require('./battleMode')

dotenv.config()

// Science 1 and Science 2 share one MongoDB database. The selected science is
// request-scoped and academic schemas use it as a data partition flag.
const scienceContext = new AsyncLocalStorage()
const getActiveScience = () => scienceContext.getStore()?.science || 'science2'
const addScienceScope = (schema) => {
  schema.add({
    science: {
      type: String,
      enum: ['science1', 'science2'],
      default: 'science2',
      index: true,
    },
  })

  schema.pre('validate', function setScienceFlag() {
    if (this.isNew || !this.science) this.science = getActiveScience()
  })

  schema.pre([
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments',
    'distinct',
  ], function scopeScienceQuery() {
    this.where({ science: getActiveScience() })
  })

  schema.pre('aggregate', function scopeScienceAggregate() {
    this.pipeline().unshift({ $match: { science: getActiveScience() } })
  })
}

const app = express()
const server = http.createServer(app)

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing backend process or use a different PORT in backend/.env.`)
    process.exitCode = 1
    return
  }

  console.error('Backend server error:', error.message)
  process.exitCode = 1
})
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

const classShareUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 12,
  },
})

const CLASS_POST_CATEGORIES = [
  'assignment',
  'practice-paper',
  'important-question',
  'chapter-marking',
  'notes',
  'test-paper',
]
const CLASS_POST_CATEGORY_LABELS = {
  assignment: 'Assignment',
  'practice-paper': 'Practice Paper',
  'important-question': 'Important Question',
  'chapter-marking': 'Chapter Wise Marking',
  notes: 'Notes',
  'test-paper': 'Test Paper',
}
const CLASS_POST_PHOTO_FORMAT = String(process.env.CLASS_POST_PHOTO_FORMAT || 'webp').toLowerCase() === 'avif'
  ? 'avif'
  : 'webp'
const CLASS_POST_PHOTO_CONTENT_TYPE = CLASS_POST_PHOTO_FORMAT === 'avif' ? 'image/avif' : 'image/webp'
const clearCachedResponses = (prefix) => {
  return undefined
}

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI
const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_change_me'
const TOKEN_AGE = '7d'
const ADMIN_EMAIL = 'rethish.2006sm@gmail.com'
const ADMIN_PASSWORD = '1234567'
const getScienceLabel = () => getActiveScience() === 'science1' ? 'Science 1' : 'Science 2'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite'
const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim()
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim()
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || 'mailto:innovativesci2@gmail.com').trim()
const MAX_COMPLETION_TOKENS = Number(process.env.MAX_COMPLETION_TOKENS || 1800)
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} else {
  console.warn('Web Push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in backend/.env.')
}

let firebaseAdminAuth = null
try {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'innovativescience2-f988a'

  if (!getApps().length) {
    initializeApp(serviceAccount
      ? { credential: cert(serviceAccount), projectId: firebaseProjectId }
      : process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? { credential: applicationDefault(), projectId: firebaseProjectId }
        : { projectId: firebaseProjectId })
  }
  firebaseAdminAuth = getAuth()
} catch (error) {
  console.warn(`Firebase Admin could not initialize: ${error.message}`)
}

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true
  }

  if (allowedOrigins.includes(origin)) {
    return true
  }

  return /^https:\/\/[^/]+\.onrender\.com$/i.test(origin)
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})

const emitSocketEvent = (eventName, payload) => {
  io.emit(eventName, payload)
}

const emitStudentSnapshot = async (eventName, studentId) => {
  if (!studentId) {
    return
  }

  const student = await User.findById(studentId)
    .select('name email phoneNumber classId totalBrainCells totalMarks totalCorrect totalAttempts')
    .populate('classId', 'name')

  if (!student || student.isAdmin) {
    return
  }

  const studentRow = buildAdminStudentRow(student)
  emitSocketEvent(eventName, {
    studentId: studentRow.id,
    student: studentRow,
    classId: studentRow.classId,
    className: studentRow.className,
  })
}

const emitClassFeedUpdate = (classId, reason = 'updated') => {
  if (!classId) {
    return
  }

  emitSocketEvent('class-feed-updated', {
    classId: String(classId),
    reason,
  })
}

// Google Firebase sign-in opens a cross-origin popup and needs this opener policy
// so the popup can close itself after authentication.
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(compression())
app.use(express.json({ limit: '2mb' }))

const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist')
const frontendIndexPath = path.join(frontendDistPath, 'index.html')
const frontendIsBuilt = fs.existsSync(frontendIndexPath)

if (frontendIsBuilt) {
  app.use(express.static(frontendDistPath, { index: false }))
} else {
  console.warn(
    `Frontend build not found at ${frontendIndexPath}. Run the frontend build before starting the server.`,
  )
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    dateOfBirth: { type: String, trim: true, default: '' },
    gender: { type: String, trim: true, default: '' },
    bloodGroup: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: 'Bhandup' },
    schoolName: { type: String, trim: true, default: '' },
    finalExamPercentage: { type: Number, min: 0, max: 100, default: null },
    lastLoginAt: { type: Date, default: null },
    password: {
      type: String,
      default: '',
    },
    passwordHash: {
      type: String,
      default: '',
    },
    profileImage: {
      data: Buffer,
      contentType: String,
      updatedAt: Date,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBrainCells: {
      type: Number,
      default: 0,
      min: 0,
    },
    leaderboardQuestionIds: {
      type: [String],
      default: [],
    },
    totalAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
)

userSchema.index({ isAdmin: 1, classId: 1 })
userSchema.index({ isAdmin: 1, createdAt: -1 })
userSchema.index({ isAdmin: 1, totalScore: -1 })
userSchema.index({ isAdmin: 1, totalBrainCells: -1 })
userSchema.index({ isAdmin: 1, classId: 1, totalScore: -1 })
userSchema.index({ isAdmin: 1, classId: 1, totalBrainCells: -1 })
userSchema.index({ isAdmin: 1, name: 1 })
userSchema.index({ isAdmin: 1, email: 1 })
userSchema.index({ isAdmin: 1, phoneNumber: 1 })

const Science2User = mongoose.model('User', userSchema)

const normalizeEmail = (email = '') => email.toLowerCase().trim()
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const getStoredPassword = (user) => String(user?.password || user?.passwordHash || '')
const passwordMatches = async (plainPassword, user) => {
  const storedPassword = getStoredPassword(user)

  if (!storedPassword) {
    return false
  }

  if (storedPassword.startsWith('$2')) {
    return bcrypt.compare(String(plainPassword || ''), storedPassword)
  }

  return storedPassword === String(plainPassword || '')
}

const chapterSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    marksWithoutOption: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true },
)

const topicSchema = new mongoose.Schema(
  {
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    studyText: {
      type: String,
      trim: true,
      maxlength: 12000,
      default: '',
    },
  },
  { timestamps: true },
)

topicSchema.index({ science: 1, chapter: 1, number: 1 }, { unique: true })

const objectiveTypeSchema = new mongoose.Schema(
  {
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'mcqs',
        'odd-man-out',
        'true-or-false',
        'correlation',
        'match-the-following',
        'complete-the-tables',
        'diagram-based-question',
        'identify-symbol',
        'numericals',
      ],
    },
  },
  { timestamps: true },
)

objectiveTypeSchema.index({ science: 1, topic: 1, type: 1 }, { unique: true })

const objectiveQuestionSchema = new mongoose.Schema(
  {
    objectiveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ObjectiveType',
      required: true,
    },
    question: {
      type: String,
      trim: true,
      default: '',
      maxlength: 800,
    },
    solution: {
      type: String,
      trim: true,
      default: '',
      maxlength: 4000,
    },
    isBoardQuestion: {
      type: Boolean,
      default: false,
      index: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options) => Array.isArray(options) && options.length >= 2,
        message: 'At least two options are required.',
      },
    },
    correctOption: {
      type: Number,
      required: true,
      min: 0,
    },
    pairs: {
      type: [{
        left: {
          type: String,
          trim: true,
          maxlength: 240,
        },
        right: {
          type: String,
          trim: true,
          maxlength: 240,
        },
      }],
      default: undefined,
    },
    correctOptions: {
      type: [Number],
      default: undefined,
    },
    questionImage: {
      data: Buffer,
      contentType: String,
      updatedAt: Date,
    },
    answerImage: {
      data: Buffer,
      contentType: String,
      updatedAt: Date,
    },
  },
  { timestamps: true },
)

// These queries are used on almost every practice navigation screen.
// Indexing the foreign key avoids scanning all questions for each topic.
objectiveQuestionSchema.index({ objectiveType: 1 })
objectiveQuestionSchema.index({ objectiveType: 1, isBoardQuestion: 1 })

const practiceScoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    objectiveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ObjectiveType',
      required: true,
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    attemptedQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardedQuestionIds: {
      type: [String],
      default: [],
    },
    attemptedQuestionIds: {
      type: [String],
      default: [],
    },
    questionResults: {
      type: [{
        questionId: String,
        isCorrect: Boolean,
      }],
      default: [],
    },
    doneRewarded: {
      type: Boolean,
      default: false,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

practiceScoreSchema.index({ science: 1, user: 1, objectiveType: 1 }, { unique: true })

addScienceScope(chapterSchema)
chapterSchema.index({ science: 1, number: 1 }, { unique: true })
addScienceScope(topicSchema)
addScienceScope(objectiveTypeSchema)
addScienceScope(objectiveQuestionSchema)
addScienceScope(practiceScoreSchema)

const Science2Chapter = mongoose.model('Chapter', chapterSchema)
const Science2Topic = mongoose.model('Topic', topicSchema)
const Science2ObjectiveType = mongoose.model('ObjectiveType', objectiveTypeSchema)
const Science2ObjectiveQuestion = mongoose.model('ObjectiveQuestion', objectiveQuestionSchema)
const Science2PracticeScore = mongoose.model('PracticeScore', practiceScoreSchema)

// Immutable content history used by the fact-checked notification generator.
// Keep this separate from the content collections so deletes remain auditable.
const contentChangeSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, enum: ['chapter', 'topic', 'objective-type', 'question'] },
    entityId: { type: String, required: true },
    action: { type: String, required: true, enum: ['created', 'updated', 'deleted'] },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
    objectiveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ObjectiveType', default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
)
contentChangeSchema.index({ createdAt: -1 })
contentChangeSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
addScienceScope(contentChangeSchema)
const Science2ContentChange = mongoose.model('ContentChange', contentChangeSchema)

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    grade: {
      type: String,
      trim: true,
      maxlength: 60,
      default: '',
    },
  },
  { timestamps: true },
)

const practiceAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attemptType: {
      type: String,
      enum: ['practice', 'test', 'done'],
      default: 'practice',
    },
    sourceName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    chapterBreakdown: {
      type: [{
        chapterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Chapter',
          required: true,
        },
        chapterNumber: {
          type: Number,
          required: true,
        },
        chapterName: {
          type: String,
          trim: true,
          maxlength: 160,
          default: '',
        },
        score: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalQuestions: {
          type: Number,
          default: 0,
          min: 0,
        },
        percent: {
          type: Number,
          default: 0,
          min: 0,
        },
        brainCells: {
          type: Number,
          default: 0,
          min: 0,
        },
      }],
      default: [],
    },
    chapterIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
    }],
    objectiveTypeIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ObjectiveType',
    }],
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalQuestions: {
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
    brainCellsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    conceptSummary: {
      summary: {
        type: String,
        trim: true,
        maxlength: 1200,
        default: '',
      },
      focusAreas: {
        type: [String],
        default: [],
      },
      solutionSteps: {
        type: [String],
        default: [],
      },
    },
    questionBreakdown: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true },
)

practiceAttemptSchema.index({ user: 1, createdAt: -1 })
practiceAttemptSchema.index({ user: 1, attemptType: 1, createdAt: -1 })

const dailyChallengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, enum: ['science1', 'science2'], required: true },
    localDate: { type: String, required: true },
    timezone: { type: String, required: true, maxlength: 80 },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ObjectiveQuestion' }],
    eligibleChapterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
    answers: [{
      questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      selectedAnswer: { type: mongoose.Schema.Types.Mixed },
      isCorrect: { type: Boolean, required: true },
      answeredAt: { type: Date, default: Date.now },
    }],
    attemptedCount: { type: Number, default: 0, min: 0 },
    correctCount: { type: Number, default: 0, min: 0 },
    score: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['in_progress', 'completed', 'bank_insufficient'], default: 'in_progress' },
    generatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)
dailyChallengeSchema.index({ user: 1, subject: 1, localDate: 1 }, { unique: true })
dailyChallengeSchema.index({ user: 1, subject: 1, completedAt: -1 })

const studentStreakSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, enum: ['science1', 'science2'], required: true },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastCreditedDate: { type: String, default: null },
  },
  { timestamps: true },
)
studentStreakSchema.index({ user: 1, subject: 1 }, { unique: true })

const reportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    objectiveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ObjectiveType',
      default: null,
    },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      default: null,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ObjectiveQuestion',
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
  },
  { timestamps: true },
)

reportSchema.index({ createdAt: -1 })

const messageSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['all', 'class', 'user'],
      required: true,
    },
    targetUserIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    targetClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 180,
      default: '',
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    audienceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentUserEmails: {
      type: [String],
      default: [],
    },
    acknowledgements: {
      type: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        acknowledgedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      default: [],
    },
  },
  { timestamps: true },
)

messageSchema.index({ createdAt: -1 })

const classPostSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    shareGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassPost',
      index: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: CLASS_POST_CATEGORIES,
      default: 'assignment',
    },
    message: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    documentLink: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    photos: {
      type: [{
        data: Buffer,
        contentType: String,
        originalName: String,
        updatedAt: Date,
      }],
      default: [],
    },
    pdf: {
      data: Buffer,
      contentType: String,
      originalName: String,
      updatedAt: Date,
    },
  },
  { timestamps: true },
)

classPostSchema.index({ classId: 1, createdAt: -1 })

const Science2ClassPost = mongoose.model('ClassPost', classPostSchema)

const battleRewardSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    roomCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 6,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rank: {
      type: Number,
      required: true,
      min: 1,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    brainCells: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPlayers: {
      type: Number,
      default: 0,
      min: 0,
    },
    finishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, default: 'CONTENT_UPDATE' },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    link: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: 'ai-content-audit' },
    facts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    readAt: { type: Date, default: null },
    pushSentAt: { type: Date, default: null },
  },
  { timestamps: true },
)
notificationSchema.index({ recipient: 1, createdAt: -1 })
const Science2Notification = mongoose.model('Notification', notificationSchema)

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true, trim: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
)
pushSubscriptionSchema.index({ user: 1, updatedAt: -1 })
const Science2PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema)

battleRewardSchema.index({ roomId: 1, userId: 1 }, { unique: true })

const Science2BattleReward = mongoose.models.BattleReward || mongoose.model('BattleReward', battleRewardSchema)
let BattleRoomModel = null

const pyqSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    month: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    year: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    linkUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    pdf: {
      data: Buffer,
      contentType: String,
      originalName: String,
      updatedAt: Date,
    },
  },
  { timestamps: true },
)

// PYQs belong to the currently selected science, just like chapters and
// objective questions. Existing records without this field are migrated to
// Science 2 because that is where the current PYQ data belongs.
addScienceScope(pyqSchema)

pyqSchema.index({ createdAt: -1 })
addScienceScope(practiceAttemptSchema)
addScienceScope(dailyChallengeSchema)
addScienceScope(studentStreakSchema)

const Science2Class = mongoose.model('Class', classSchema)
const Science2PracticeAttempt = mongoose.model('PracticeAttempt', practiceAttemptSchema)
const Science2DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema)
const Science2StudentStreak = mongoose.model('StudentStreak', studentStreakSchema)
const Science2Report = mongoose.model('Report', reportSchema)
const Science2Message = mongoose.model('Message', messageSchema)
const Science2Pyq = mongoose.model('Pyq', pyqSchema)
const siteNoticeSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 20,
      default: 'amber',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)
const Science2SiteNotice = mongoose.model('SiteNotice', siteNoticeSchema)
const giftSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      unique: true,
    },
    image: {
      data: Buffer,
      contentType: String,
      originalName: String,
      updatedAt: Date,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)
const Science2Gift = mongoose.model('Gift', giftSchema)

const auditSnapshot = (value) => {
  if (!value) return null
  const plain = typeof value.toObject === 'function' ? value.toObject() : { ...value }
  delete plain.questionImage
  delete plain.answerImage
  delete plain.photos
  delete plain.pdf
  return JSON.parse(JSON.stringify(plain, (key, item) => (
    Buffer.isBuffer(item) ? undefined : item
  )))
}

const recordContentChange = async ({ entityType, entity, action, actor, context = {} }) => {
  try {
    const snapshot = auditSnapshot(entity)
    return await ContentChange.create({
      entityType,
      entityId: String(entity?._id || context.entityId || ''),
      action,
      actor: actor?._id || actor || null,
      chapterId: context.chapterId || entity?.chapter || null,
      topicId: context.topicId || entity?.topic || null,
      objectiveTypeId: context.objectiveTypeId || entity?.objectiveType || null,
      ...(action === 'deleted' ? { before: snapshot } : { after: { ...snapshot, ...(context.after || {}) } }),
      ...(action === 'updated' && context.before ? { before: auditSnapshot(context.before) } : {}),
    })
  } catch (error) {
    console.error(`Could not record ${entityType} ${action} audit: ${error.message}`)
    return null
  }
}

const buildNotificationFacts = async (days = 30) => {
  const since = new Date(Date.now() - Math.max(1, Math.min(Number(days) || 30, 90)) * 24 * 60 * 60 * 1000)
  const changes = await ContentChange.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()

  const [chapters, topics, objectiveTypes, questionCounts] = await Promise.all([
    Chapter.find().select('number name').sort({ number: 1 }).lean(),
    Topic.find().select('number name chapter').populate('chapter', 'number name').sort({ createdAt: -1 }).limit(200).lean(),
    ObjectiveType.find().select('type topic').populate({ path: 'topic', select: 'name chapter', populate: { path: 'chapter', select: 'number name' } }).lean(),
    ObjectiveQuestion.aggregate([
      { $group: { _id: '$objectiveType', count: { $sum: 1 } } },
    ]),
  ])
  const countMap = new Map(questionCounts.map((item) => [String(item._id), Number(item.count || 0)]))
  const validChapterNumbers = new Set(chapters.map((chapter) => String(chapter.number)))
  return {
    changes: changes.map((change) => ({
      action: change.action,
      entityType: change.entityType,
      entityId: change.entityId,
      after: change.after,
      before: change.before,
      createdAt: change.createdAt,
    })),
    currentContent: {
      chapters: chapters.map(({ number, name }) => ({ number, name })),
      topics: topics.map((topic) => ({ number: topic.number, name: topic.name, chapter: topic.chapter?.number || null })),
      questionSets: objectiveTypes.map((item) => ({
        type: item.type,
        topic: item.topic?.name || '',
        chapter: item.topic?.chapter?.number || null,
        questionCount: countMap.get(String(item._id)) || 0,
      })),
    },
    validChapterNumbers: [...validChapterNumbers],
  }
}

const fallbackFactBasedMessage = (name, facts) => {
  const latest = facts.changes?.[0]
  const current = facts.currentContent?.chapters || []
  if (latest?.entityType === 'question' && latest.after?.chapterNumber) {
    return `Hey ${name}, new questions are ready in Chapter ${latest.after.chapterNumber}. Give them a try!`
  }
  if (latest?.entityType === 'topic' && latest.after?.chapter) {
    return `Hey ${name}, a new topic is ready in Chapter ${latest.after.chapter}. Open it when you are ready to learn!`
  }
  if (latest?.entityType === 'chapter' && latest.after?.number) {
    return `Hey ${name}, Chapter ${latest.after.number} is now available. Your next science challenge is waiting!`
  }
  const firstChapter = current[0]
  return firstChapter
    ? `Hey ${name}, Chapter ${firstChapter.number} has practice content ready. Pick a topic and make a little progress today!`
    : `Hey ${name}, new science practice is ready. Choose a topic and make a little progress today!`
}

const createFactBasedMessage = async (name, facts) => {
  const fallback = fallbackFactBasedMessage(name, facts)
  if (!process.env.OPENROUTER_API_KEY) return fallback
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.1,
        max_tokens: 120,
        messages: [
          { role: 'system', content: 'Write one short friendly student notification. Return only the message text. Use only facts in the supplied JSON. Never invent chapter numbers, topics, questions, or deadlines.' },
          { role: 'user', content: `Student name: ${name}\nVerified facts: ${JSON.stringify(facts)}` },
        ],
      }),
    })
    const data = await response.json().catch(() => null)
    const message = String(data?.choices?.[0]?.message?.content || '').replace(/["`]/g, '').trim()
    if (!response.ok || !message || message.length > 240) return fallback
    const mentionedChapters = [...message.matchAll(/chapter\s*(\d+)/gi)].map((match) => match[1])
    if (mentionedChapters.some((number) => !facts.validChapterNumbers.includes(number))) return fallback
    return message
  } catch (error) {
    return fallback
  }
}

let scheduledPushRunning = false
let lastScheduledPushBucket = ''

const indiaNowParts = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

const getVerifiedStudyMessage = ({ name, facts, latestChange = null, slot = '' }) => {
  const latest = latestChange?.after || {}
  if (latestChange?.action === 'created' && latestChange.entityType === 'chapter' && latest.number) {
    return `Hey ${name}, naya Chapter ${latest.number} is live! Ab thoda science karo, warna chapter tumse bolega: “kal milte hain” 😄`
  }
  if (latestChange?.action === 'created' && latestChange.entityType === 'topic' && latest.chapter) {
    return `Hey ${name}, Chapter ${latest.chapter} mein naya topic add hua hai. Chalo, thoda padhai aur thoda “wah kya samjha!” moment 😄`
  }
  if (latestChange?.action === 'created' && latestChange.entityType === 'question' && latest.chapterNumber) {
    return `Hey ${name}, Chapter ${latest.chapterNumber} mein naye questions ready hain. Solve karo—Brain Cells ko bhi attendance chahiye 😄`
  }

  const questionSets = facts.currentContent?.questionSets || []
  const available = questionSets
    .filter((item) => Number(item.questionCount || 0) > 0 && item.chapter)
    .reduce((map, item) => map.set(String(item.chapter), (map.get(String(item.chapter)) || 0) + Number(item.questionCount || 0)), new Map())
  const firstChapter = [...available.entries()].sort((left, right) => Number(left[0]) - Number(right[0]))[0]
  if (!firstChapter) return ''
  const [chapterNumber, questionCount] = firstChapter
  if (slot === '00:00' || slot === '01:00') {
    return `Good night ${name} 🌙 Chapter ${chapterNumber} mein ${questionCount} questions ready hain—kal fresh mind se kar lena, tension nahi!`
  }
  if (slot === '14:00') {
    return `Hey ${name}, lunch ke baad 10-minute science break? Chapter ${chapterNumber} mein ${questionCount} questions hain—bas ek small win, phir full chill 😄`
  }
  return `Hey ${name}, Chapter ${chapterNumber} mein ${questionCount} real questions ready hain. Aaj thoda practice kar lo—padhai bhi, progress bhi, mast!`
}

const hashText = (value = '') => [...String(value)].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7)

const getScheduledReminderCandidates = (name, facts) => {
  const content = []
  for (const topic of facts.currentContent?.topics || []) {
    if (topic.chapter && topic.name) content.push(`Chapter ${topic.chapter} / ${topic.name}`)
  }
  for (const item of facts.currentContent?.questionSets || []) {
    if (item.chapter && item.type) content.push(`Chapter ${item.chapter}'s ${item.type.replace(/-/g, ' ')} practice`)
  }
  for (const chapter of facts.currentContent?.chapters || []) {
    if (chapter.number) content.push(`Chapter ${chapter.number}${chapter.name ? `: ${chapter.name}` : ''}`)
  }
  const uniqueContent = [...new Set(content)]
  const templates = [
    (item) => `Hey ${name}, visit the website and check out ${item}.`,
    (item) => `Hey ${name}, ${item} is waiting for you. Open Innovative Science 2 when you have a moment.`,
    (item) => `Quick science reminder, ${name}: explore ${item} today.`,
    (item) => `Hey ${name}, take a small study break and practise ${item}.`,
    (item) => `${name}, your next science win could be in ${item}. Visit the website and try it.`,
    (item) => `Ready for a little science, ${name}? Check out ${item} on the website.`,
    (item) => `Hey ${name}, keep your progress moving—visit the website for ${item}.`,
    (item) => `A fresh reminder for you, ${name}: ${item} is worth a quick look.`,
  ]
  const candidates = []
  for (const item of uniqueContent) {
    for (const template of templates) candidates.push(template(item))
  }
  return [...new Set(candidates)]
}

const sendVerifiedPushToUsers = async ({ recipients, title, source, link = '/#/', messageForUser }) => {
  const userIds = recipients.map((recipient) => recipient._id)
  if (!userIds.length) return { sent: 0, registered: 0, skipped: 0 }
  const existing = await Notification.find({ recipient: { $in: userIds }, source }).select('recipient').lean()
  const sentTo = new Set(existing.map((item) => String(item.recipient)))
  const pending = recipients
    .filter((recipient) => !sentTo.has(String(recipient._id)))
    .map((recipient) => ({ recipient, message: messageForUser(recipient) }))
    .filter((item) => item.message)
  const rows = pending.map(({ recipient, message }) => ({
    recipient: recipient._id,
    type: 'WEB_PUSH',
    title,
    message,
    link,
    source,
  }))
  if (rows.length) await Notification.insertMany(rows)
  let sent = 0
  let registered = 0
  for (const { recipient, message } of pending) {
    const result = await sendWebPushToUsers([recipient._id], { title, body: message, url: link, tag: source })
    sent += result.sent
    registered += result.registered
    if (result.sent) {
      await Notification.updateOne({ recipient: recipient._id, source }, { $set: { pushSentAt: new Date() } })
    }
  }
  return { sent, registered, skipped: existing.length }
}

const notifyNewContentChange = async (change) => {
  if (!change || change.action !== 'created') return
  const recipients = await User.find({ isAdmin: false }).select('_id name').lean()
  const facts = await buildNotificationFacts(1)
  const title = change.entityType === 'chapter' ? 'New chapter added' : 'New study content added'
  return sendVerifiedPushToUsers({
    recipients,
    title,
    source: `content-change-${change._id}`,
    messageForUser: (recipient) => getVerifiedStudyMessage({ name: recipient.name || 'Student', facts, latestChange: change }),
  })
}

const runScheduledPushSlot = async () => {
  if (scheduledPushRunning) return
  const parts = indiaNowParts()
  const dayKey = `${parts.year}-${parts.month}-${parts.day}`
  const slot = `${parts.hour}:00`
  const bucket = `${dayKey}-${slot}`
  if (bucket === lastScheduledPushBucket) return
  scheduledPushRunning = true
  try {
    const recipients = await User.find({ isAdmin: false }).select('_id name').lean()
    const facts = await buildNotificationFacts(1)
    const latestChange = facts.changes?.[0]
    const source = `scheduled-push-${dayKey}-${slot}`
    const previous = await Notification.find({
      recipient: { $in: recipients.map((recipient) => recipient._id) },
      source: /^scheduled-push-/,
    }).select('recipient message').sort({ createdAt: -1 }).lean()
    const previousByUser = new Map()
    for (const item of previous) {
      const key = String(item.recipient)
      if (!previousByUser.has(key)) previousByUser.set(key, new Set())
      previousByUser.get(key).add(item.message)
    }
    await sendVerifiedPushToUsers({
      recipients,
      title: 'Innovative Science 2',
      source,
      messageForUser: (recipient) => {
        const name = recipient.name || 'Student'
        const candidates = getScheduledReminderCandidates(name, facts)
        const fallback = getVerifiedStudyMessage({ name, facts, latestChange })
        if (!candidates.length) return fallback
        const used = previousByUser.get(String(recipient._id)) || new Set()
        const offset = hashText(`${recipient._id}:${source}`) % candidates.length
        return candidates.find((candidate, index) => !used.has(candidate) && index >= offset)
          || candidates.find((candidate) => !used.has(candidate))
          || candidates[offset]
      },
    })
    lastScheduledPushBucket = bucket
  } finally {
    scheduledPushRunning = false
  }
}

const scheduleNextPushSlot = () => {
  const indiaOffsetMilliseconds = (5 * 60 + 30) * 60 * 1000
  const indiaNow = Date.now() + indiaOffsetMilliseconds
  const oneHour = 60 * 60 * 1000
  const nextBoundary = Math.ceil(indiaNow / oneHour) * oneHour
  const delay = Math.max(1000, nextBoundary - indiaNow)
  setTimeout(() => {
    runScheduledPushSlot()
      .catch((error) => console.error(`Scheduled Web Push failed: ${error.message}`))
      .finally(scheduleNextPushSlot)
  }, delay)
}

const notifyNewClassPost = async (post) => {
  if (!post?.classId) return
  const classDoc = await Class.findById(post.classId).select('name').lean()
  const recipients = await User.find({ isAdmin: false, classId: post.classId }).select('_id name').lean()
  if (!recipients.length) return
  const label = CLASS_POST_CATEGORY_LABELS[post.category] || 'Class update'
  return sendVerifiedPushToUsers({
    recipients,
    title: `${label} added`,
    source: `class-post-${post._id}`,
    link: `/#/class/${post.classId}`,
    messageForUser: (recipient) => `Hey ${recipient.name || 'Student'}, ${label.toLowerCase()} ${classDoc?.name ? `for ${classDoc.name}` : ''} is ready. Dekho, phir smart study karo 😄`,
  })
}

const sendWebPushToUsers = async (userIds, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !userIds.length) {
    return { sent: 0, failed: 0, removed: 0, configured: Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) }
  }

  const subscriptions = await PushSubscription.find({ user: { $in: userIds } }).lean()
  const results = await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, expirationTime: subscription.expirationTime, keys: subscription.keys },
        JSON.stringify(payload),
      )
      return 'sent'
    } catch (error) {
      if ([400, 401, 403, 404, 410].includes(Number(error.statusCode))) {
        await PushSubscription.deleteOne({ _id: subscription._id })
        return { status: 'removed', code: Number(error.statusCode), reason: String(error.body || error.message || '').slice(0, 180) }
      }
      console.warn(`Web Push delivery failed: ${error.message}`)
      return { status: 'failed', code: Number(error.statusCode) || 0, reason: String(error.body || error.message || '').slice(0, 180) }
    }
  }))
  return {
    sent: results.filter((result) => result === 'sent').length,
    failed: results.filter((result) => result.status === 'failed').length,
    removed: results.filter((result) => result.status === 'removed').length,
    registered: subscriptions.length,
    failures: results.filter((result) => result.status === 'failed').map((result) => ({ code: result.code, reason: result.reason })),
    configured: true,
  }
}
const contactMessageSchema = new mongoose.Schema(
  {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
      },
      subject: {
        type: String,
        trim: true,
        maxlength: 180,
        default: '',
      },
      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },
      status: {
        type: String,
        enum: ['open', 'seen', 'resolved'],
        default: 'open',
      },
    },
  { timestamps: true },
)

const Science2ContactMessage = mongoose.model('ContactMessage', contactMessageSchema)

Science2ContactMessage.schema.index({ createdAt: -1 })

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      maxlength: 180,
      default: '',
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    clientKey: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    className: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: '',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    sourceType: {
      type: String,
      enum: ['general', 'objective', 'test', 'topic'],
      default: 'general',
    },
    sourceKey: {
      type: String,
      trim: true,
      maxlength: 180,
      default: '',
    },
    sourceLabel: {
      type: String,
      trim: true,
      maxlength: 180,
      default: '',
    },
    status: {
      type: String,
      enum: ['new', 'reviewed'],
      default: 'new',
    },
  },
  { timestamps: true },
)

feedbackSchema.index({ createdAt: -1 })

const Science2Feedback = mongoose.model('Feedback', feedbackSchema)

const accountDeletionRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
})

const AccountDeletionRequest = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema)

// Account records remain shared. Academic content is separated by the
// request-scoped science flag while staying in this same MongoDB database.
const AccountUser = Science2User

const scienceConnectionPromises = new Map()

const science2Models = {
  User: Science2User,
  Chapter: Science2Chapter,
  Topic: Science2Topic,
  ObjectiveType: Science2ObjectiveType,
  ObjectiveQuestion: Science2ObjectiveQuestion,
  PracticeScore: Science2PracticeScore,
  ContentChange: Science2ContentChange,
  ClassPost: Science2ClassPost,
  Notification: Science2Notification,
  PushSubscription: Science2PushSubscription,
  BattleReward: Science2BattleReward,
  Class: Science2Class,
  PracticeAttempt: Science2PracticeAttempt,
  DailyChallenge: Science2DailyChallenge,
  StudentStreak: Science2StudentStreak,
  Report: Science2Report,
  Message: Science2Message,
  Pyq: Science2Pyq,
  SiteNotice: Science2SiteNotice,
  Gift: Science2Gift,
  ContactMessage: Science2ContactMessage,
  Feedback: Science2Feedback,
}

// Class membership is operational/shared data. Explicitly point cross-science
// population at the shared Science 2 model instead of looking for a separate
// Class collection inside Science 1.
userSchema.path('classId').options.ref = Science2Class
classPostSchema.path('classId').options.ref = Science2Class
messageSchema.path('targetClassId').options.ref = Science2Class
feedbackSchema.path('classId').options.ref = Science2Class

const getScienceConnection = (science = getActiveScience()) => {
  if (!['science1', 'science2'].includes(science)) throw new Error('Unsupported science selection.')
  return mongoose.connection
}

const ensureScienceConnection = async (science = getActiveScience()) => {
  const connection = getScienceConnection(science)
  if (connection.readyState === 1) return connection
  if (!scienceConnectionPromises.has(science)) {
    scienceConnectionPromises.set(science, connection.asPromise().finally(() => scienceConnectionPromises.delete(science)))
  }
  await scienceConnectionPromises.get(science)
  return connection
}

const modelForScience = (name) => {
  if (name === 'Class') return Science2Class
  return science2Models[name]
}

const scienceModel = (name) => new Proxy(science2Models[name], {
  get(target, property) {
    const model = modelForScience(name)
    const value = model[property]
    return typeof value === 'function' ? value.bind(model) : value
  },
  construct(target, args) {
    return Reflect.construct(modelForScience(name), args)
  },
})

const User = scienceModel('User')
const Chapter = scienceModel('Chapter')
const Topic = scienceModel('Topic')
const ObjectiveType = scienceModel('ObjectiveType')
const ObjectiveQuestion = scienceModel('ObjectiveQuestion')
const PracticeScore = scienceModel('PracticeScore')
const ContentChange = scienceModel('ContentChange')
const ClassPost = scienceModel('ClassPost')
const Notification = scienceModel('Notification')
const PushSubscription = scienceModel('PushSubscription')
const BattleReward = scienceModel('BattleReward')
const Class = scienceModel('Class')
const PracticeAttempt = scienceModel('PracticeAttempt')
const DailyChallenge = scienceModel('DailyChallenge')
const StudentStreak = scienceModel('StudentStreak')
const Report = scienceModel('Report')
const Message = scienceModel('Message')
const Pyq = scienceModel('Pyq')
const SiteNotice = scienceModel('SiteNotice')
const Gift = scienceModel('Gift')
const ContactMessage = scienceModel('ContactMessage')
const Feedback = scienceModel('Feedback')

const sharedScienceRoutePrefixes = [
  '/api/auth',
  '/api/admin/dashboard',
  '/api/admin/students',
  '/api/admin/classes',
  '/api/admin/messages',
  '/api/admin/contacts',
  '/api/admin/notifications',
  '/api/admin/push',
  '/api/admin/announcement',
  '/api/classes',
  '/api/messages',
  '/api/notifications',
  '/api/push',
  '/api/announcement',
  // Leaderboard totals and rank are account-level progress shared by both sciences.
  '/api/leaderboard',
  '/api/admin/account-deletion-requests',
]

const isSharedScienceRoute = (path) => sharedScienceRoutePrefixes.some((prefix) => (
  path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
))

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) return next()

  const requestedScience = String(req.headers['x-science'] || req.query.science || 'science2').toLowerCase()
  if (!['science1', 'science2'].includes(requestedScience)) {
    return res.status(400).json({ message: 'Invalid science selection.' })
  }

  try {
    const effectiveScience = isSharedScienceRoute(req.path) ? 'science2' : requestedScience
    await ensureScienceConnection(effectiveScience)
    res.set('X-Science', requestedScience)
    return scienceContext.run({ science: effectiveScience, requestedScience }, next)
  } catch (error) {
    console.error(`Could not connect to ${requestedScience}:`, error.message)
    return res.status(503).json({ message: `${requestedScience === 'science1' ? 'Science 1' : 'Science 2'} database is unavailable.` })
  }
})

const findAccountUser = async (filter) => {
  return AccountUser.findOne(filter)
}

const publicUser = (user, { includePassword = false } = {}) => ({
  id: user._id.toString(),
  firebaseUid: user.firebaseUid || '',
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber || '',
  dateOfBirth: user.dateOfBirth || '',
  gender: user.gender || '',
  bloodGroup: user.bloodGroup || '',
  state: user.state || '',
  city: user.city || '',
  area: user.area || 'Bhandup',
  schoolName: user.schoolName || '',
  finalExamPercentage: Number.isFinite(user.finalExamPercentage) ? user.finalExamPercentage : null,
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt || null,
  ...(includePassword ? { password: user.password || user.passwordHash || '' } : {}),
  isAdmin: Boolean(user.isAdmin),
  classId: user.classId?._id?.toString?.() || user.classId?.toString?.() || '',
  className: user.classId?.name || '',
  totalBrainCells: safeNumber(user.totalBrainCells),
  profileImageUrl: user.profileImage?.data
    ? `/api/auth/users/${user._id}/avatar?v=${
        user.profileImage.updatedAt?.getTime() || Date.now()
      }`
    : '',
})

const formatLeaderboardUser = (user) => ({
  id: String(user._id || user.id || ''),
  name: String(user.name || 'Student').trim() || 'Student',
  className: String(user.classId?.name || user.className || '').trim(),
  totalScore: safeNumber(user.totalScore),
  totalBrainCells: safeNumber(user.totalBrainCells),
  totalMarks: safeNumber(user.totalMarks),
  totalCorrect: safeNumber(user.totalCorrect),
  totalAttempts: safeNumber(user.totalAttempts),
})

const leaderboardSort = {
  totalBrainCells: -1,
  totalScore: -1,
  totalCorrect: -1,
  name: 1,
  _id: 1,
}

const publicTopic = (topic, isAdmin = false) => {
  const normalizedTopic = typeof topic.toObject === 'function' ? topic.toObject() : topic
  const { studyText, ...safeTopic } = normalizedTopic

  return isAdmin ? normalizedTopic : safeTopic
}

const publicQuestionImageUrl = (question) => (
  question.questionImage?.data
    ? `/api/objective-questions/${question._id}/image?v=${
        question.questionImage.updatedAt?.getTime() || Date.now()
      }&science=${getActiveScience()}`
    : ''
)

const publicAnswerImageUrl = (question) => (
  question.answerImage?.data
    ? `/api/objective-questions/${question._id}/answer-image?v=${
        question.answerImage.updatedAt?.getTime() || Date.now()
      }&science=${getActiveScience()}`
    : ''
)

const publicPyq = (pyq, { exposeLinks = true } = {}) => ({
  id: String(pyq._id),
  title: pyq.title,
  month: pyq.month || '',
  subject: pyq.subject || '',
  year: pyq.year || '',
  linkUrl: exposeLinks
    ? normalizeDocumentLink(pyq.linkUrl)
      || (pyq.pdf?.data ? `/api/pyqs/${pyq._id}/pdf?v=${pyq.pdf.updatedAt?.getTime() || Date.now()}` : '')
    : '',
  pdfUrl: exposeLinks && pyq.pdf?.data
    ? `/api/pyqs/${pyq._id}/pdf?v=${pyq.pdf.updatedAt?.getTime() || Date.now()}`
    : '',
  uploadedAt: pyq.createdAt,
})

const publicSiteNotice = (notice) => {
  if (!notice) {
    return null
  }

  return {
    id: String(notice._id),
    message: String(notice.message || ''),
    color: String(notice.color || 'amber'),
    updatedAt: notice.updatedAt,
  }
}

const publicGift = (gift) => {
  if (!gift?.image?.data) return null
  const imageData = Buffer.isBuffer(gift.image.data)
    ? gift.image.data
    : gift.image.data.buffer
      ? Buffer.from(gift.image.data.buffer)
      : typeof gift.image.data.value === 'function'
        ? Buffer.from(gift.image.data.value(true))
        : Buffer.from(gift.image.data)
  const contentType = String(gift.image.contentType || 'image/webp')

  return {
    id: String(gift._id),
    classId: String(gift.classId?._id || gift.classId || ''),
    className: String(gift.classId?.name || ''),
    originalName: String(gift.image.originalName || 'gift-image'),
    contentType,
    imageData: `data:${contentType};base64,${imageData.toString('base64')}`,
    updatedAt: gift.updatedAt,
  }
}

const publicMessage = (message) => {
  if (!message) {
    return null
  }

  return {
    id: String(message._id),
    createdBy: {
      id: String(message.createdBy?._id || message.createdBy || ''),
      name: String(message.createdBy?.name || 'Admin'),
    },
    targetType: String(message.targetType || 'all'),
    targetUserIds: Array.isArray(message.targetUserIds)
      ? message.targetUserIds.map((item) => String(item?._id || item || '')).filter(Boolean)
      : [],
    targetClassId: String(message.targetClassId?._id || message.targetClassId || ''),
    targetClassName: String(message.targetClassId?.name || ''),
    subject: String(message.subject || ''),
    body: String(message.body || ''),
    audienceCount: Number(message.audienceCount || 0),
    sentUserEmails: Array.isArray(message.sentUserEmails) ? message.sentUserEmails.map((item) => String(item || '')) : [],
    acknowledgedCount: Array.isArray(message.acknowledgements) ? message.acknowledgements.length : 0,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  }
}

const bufferToDataUrl = (file = {}) => {
  if (!file?.data || !file?.contentType) {
    return ''
  }

  return `data:${file.contentType};base64,${Buffer.from(file.data).toString('base64')}`
}

const convertClassPhoto = async (file) => {
  const image = sharp(file.buffer).rotate()
  const data = CLASS_POST_PHOTO_FORMAT === 'avif'
    ? await image.avif({ quality: 55 }).toBuffer()
    : await image.webp({ quality: 82 }).toBuffer()
  const baseName = path.parse(file.originalname || 'photo').name

  return {
    data,
    contentType: CLASS_POST_PHOTO_CONTENT_TYPE,
    originalName: `${baseName}.${CLASS_POST_PHOTO_FORMAT}`,
    updatedAt: new Date(),
  }
}

const publicClassPost = (post) => {
  const normalizedPost = typeof post.toObject === 'function' ? post.toObject() : post
  const classIdValue = String(normalizedPost.classId?._id || normalizedPost.classId || '')
  const postIdValue = String(normalizedPost._id)

  return {
    id: postIdValue,
    classId: classIdValue,
    groupId: String(normalizedPost.shareGroupId?._id || normalizedPost.shareGroupId || ''),
    category: normalizedPost.category || 'assignment',
    categoryLabel: CLASS_POST_CATEGORY_LABELS[normalizedPost.category || 'assignment'] || 'Assignment',
    message: normalizedPost.message || '',
    documentLink: normalizedPost.documentLink || '',
    createdAt: normalizedPost.createdAt,
    createdBy: normalizedPost.createdBy
      ? {
          id: String(normalizedPost.createdBy._id || normalizedPost.createdBy),
          name: normalizedPost.createdBy.name || '',
        }
      : null,
    photos: (normalizedPost.photos || []).map((photo) => ({
      id: String(photo._id),
      name: photo.originalName || 'photo',
      contentType: photo.contentType || '',
      photoUrl: `/api/classes/${classIdValue}/posts/${postIdValue}/photos/${String(photo._id)}?v=${photo.updatedAt?.getTime() || Date.now()}`,
      thumbUrl: `/api/classes/${classIdValue}/posts/${postIdValue}/photos/${String(photo._id)}?thumb=1&v=${photo.updatedAt?.getTime() || Date.now()}`,
    })),
    pdf: normalizedPost.pdf
      ? {
        name: normalizedPost.pdf.originalName || 'attachment.pdf',
        contentType: normalizedPost.pdf.contentType || 'application/pdf',
        pdfUrl: `/api/classes/${classIdValue}/posts/${postIdValue}/pdf?v=${normalizedPost.pdf.updatedAt?.getTime() || Date.now()}`,
      }
      : null,
  }
}

const parseJsonValue = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value === 'object') {
    return value
  }

  try {
    return JSON.parse(String(value))
  } catch (error) {
    return fallback
  }
}

const cloneClassAttachments = (photos = [], pdfFile = null) => ({
  photos: photos.map((photo) => ({ ...photo })),
  pdf: pdfFile
    ? {
        data: pdfFile.buffer,
        contentType: pdfFile.mimetype,
        originalName: pdfFile.originalname,
        updatedAt: new Date(),
      }
    : undefined,
})

const normalizeDocumentLink = (value) => {
  const trimmed = String(value || '').trim()

  if (!trimmed) {
    return ''
  }

  try {
    const resolvedUrl = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)

    if (!['http:', 'https:'].includes(resolvedUrl.protocol)) {
      return ''
    }

    return resolvedUrl.toString()
  } catch (error) {
    return ''
  }
}

const getAuthenticatedUserFromRequest = async (req) => {
  const headerToken = String(req.headers.authorization || '').startsWith('Bearer ')
    ? String(req.headers.authorization).slice(7)
    : ''
  const queryToken = String(req.query.token || '')
  const token = headerToken || queryToken

  if (!token) {
    return null
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const userId = payload?.userId || payload?.id || payload?._id || payload?.sub || payload

    if (!userId) {
      return null
    }

    const user = await User.findById(userId).populate('classId', 'name')
    return user || null
  } catch (error) {
    return null
  }
}

const chapterBrainCellsFromPercent = (percent = 0) => {
  const normalized = Math.max(0, Math.min(Number(percent) || 0, 100))
  return Math.round((normalized / 100) * 1000)
}

const getPracticeQuestionBrainCells = (totalQuestions = 0) => {
  const count = Math.max(0, Number(totalQuestions) || 0)
  if (!count) {
    return 0
  }

  return Math.max(1, Math.round(1000 / count))
}

const allocateBrainCellsByWeight = (entries = [], totalBrainCells = 0, getWeight = (entry) => entry?.totalQuestions || 0) => {
  const reward = Math.max(0, Number(totalBrainCells) || 0)

  if (!entries.length) {
    return []
  }

  if (!reward) {
    return entries.map((entry) => ({ ...entry, brainCells: 0 }))
  }

  const weights = entries.map((entry) => Math.max(0, Number(getWeight(entry)) || 0))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  if (!totalWeight) {
    return entries.map((entry, index) => ({ ...entry, brainCells: index === 0 ? reward : 0 }))
  }

  const rawShares = weights.map((weight) => (reward * weight) / totalWeight)
  const wholeShares = rawShares.map((share) => Math.floor(share))
  let remaining = reward - wholeShares.reduce((sum, value) => sum + value, 0)
  const allocationOrder = rawShares
    .map((share, index) => ({
      index,
      fraction: share - wholeShares[index],
    }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index)

  const nextShares = [...wholeShares]

  for (let index = 0; index < remaining; index += 1) {
    const allocationIndex = allocationOrder[index % allocationOrder.length]?.index
    if (allocationIndex === undefined) {
      break
    }

    nextShares[allocationIndex] += 1
  }

  return entries.map((entry, index) => ({
    ...entry,
    brainCells: nextShares[index] || 0,
  }))
}

const safeNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const summarizeStoredUserProgress = (user = {}) => {
  const totalScore = safeNumber(user.totalCorrect ?? user.totalScore)
  const totalQuestions = safeNumber(user.totalMarks)
  const totalBrainCells = safeNumber(user.totalBrainCells)
  const attemptCount = safeNumber(user.totalAttempts)

  return {
    totalBrainCells,
    totalScore,
    totalQuestions,
    attemptCount,
    averagePercent: totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0,
  }
}

const calculateLeaderboardCellsFromAttempt = (attempt = {}, rewardedQuestionIds = new Set()) => {
  const nextRewardedQuestionIds = new Set(rewardedQuestionIds)
  const questionBreakdown = Array.isArray(attempt.questionBreakdown) ? attempt.questionBreakdown : []

  if (questionBreakdown.length) {
    let leaderboardCells = 0

    questionBreakdown.forEach((item) => {
      if (item.status !== 'correct') {
        return
      }

      const questionId = normalizeQuestionId(item.questionId)
      if (!questionId || nextRewardedQuestionIds.has(questionId)) {
        return
      }

      nextRewardedQuestionIds.add(questionId)
      leaderboardCells += 1
    })

    return {
      leaderboardCells,
      nextRewardedQuestionIds,
    }
  }

  const chapterBreakdown = Array.isArray(attempt.chapterBreakdown) ? attempt.chapterBreakdown : []
  return {
    leaderboardCells: chapterBreakdown.reduce((sum, chapterEntry) => sum + safeNumber(chapterEntry.brainCells), 0),
    nextRewardedQuestionIds,
  }
}

const buildChapterBreakdownEntry = ({ chapter, score, totalQuestions, objectiveLabel = '', brainCells = null }) => {
  const percent = totalQuestions ? Math.round((safeNumber(score) / Math.max(totalQuestions, 1)) * 100) : 0

  return {
    chapterId: chapter?._id,
    chapterNumber: safeNumber(chapter?.number),
    chapterName: chapter?.name || '',
    objectiveLabel,
    score: safeNumber(score),
    totalQuestions: safeNumber(totalQuestions),
    percent,
    brainCells: Number.isFinite(brainCells) ? brainCells : chapterBrainCellsFromPercent(percent),
  }
}

const normalizeQuestionId = (value = '') => String(value || '').trim()

const summarizeAttemptHistory = (attempts = [], { includeChapterProgress = true } = {}) => {
  const chapterTotals = includeChapterProgress ? new Map() : null
  const rewardedQuestionIds = new Set()
  let totalBrainCells = 0
  let totalScore = 0
  let totalQuestions = 0
  const orderedAttempts = [...attempts].sort(
    (left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0),
  )

  orderedAttempts.forEach((attempt) => {
    totalScore += safeNumber(attempt.totalScore)
    totalQuestions += safeNumber(attempt.totalQuestions)

    if (!includeChapterProgress) {
      const questionBreakdown = Array.isArray(attempt.questionBreakdown) ? attempt.questionBreakdown : []

      if (questionBreakdown.length) {
        questionBreakdown.forEach((item) => {
          if (item.status !== 'correct') {
            return
          }

          const questionId = normalizeQuestionId(item.questionId)
          if (!questionId || rewardedQuestionIds.has(questionId)) {
            return
          }

          rewardedQuestionIds.add(questionId)
          totalBrainCells += 1
        })
      } else {
        const fallbackBrainCells = safeNumber(attempt.brainCellsEarned)

        if (fallbackBrainCells) {
          totalBrainCells += fallbackBrainCells
        } else {
          totalBrainCells += (Array.isArray(attempt.chapterBreakdown) ? attempt.chapterBreakdown : [])
            .reduce((sum, chapterEntry) => sum + safeNumber(chapterEntry.brainCells), 0)
        }
      }

      return
    }

    const chapterAttemptMap = new Map()
    const questionBreakdown = Array.isArray(attempt.questionBreakdown) ? attempt.questionBreakdown : []

    if (questionBreakdown.length) {
      questionBreakdown.forEach((item) => {
        const chapterId = normalizeQuestionId(item.chapterId)
        if (!chapterId) return

        const current = chapterAttemptMap.get(chapterId) || {
          chapterId: item.chapterId,
          chapterNumber: safeNumber(item.chapterNumber),
          chapterName: item.chapterName || '',
          score: 0,
          totalQuestions: 0,
          percent: 0,
          brainCells: 0,
          conceptSummary: attempt.conceptSummary || null,
          sourceName: attempt.sourceName || '',
        }

        current.totalQuestions += 1

        if (item.status === 'correct') {
          current.score += 1

          const questionId = normalizeQuestionId(item.questionId)
          if (questionId && !rewardedQuestionIds.has(questionId)) {
            rewardedQuestionIds.add(questionId)
            current.brainCells += 1
            totalBrainCells += 1
          }
        }

        current.percent = current.totalQuestions
          ? Math.round((current.score / current.totalQuestions) * 100)
          : 0
        chapterAttemptMap.set(chapterId, current)
      })
    } else {
      ;(attempt.chapterBreakdown || []).forEach((chapterEntry) => {
        const chapterId = normalizeQuestionId(chapterEntry.chapterId)
        if (!chapterId) return

        const current = chapterAttemptMap.get(chapterId) || {
          chapterId: chapterEntry.chapterId,
          chapterNumber: safeNumber(chapterEntry.chapterNumber),
          chapterName: chapterEntry.chapterName || '',
          score: 0,
          totalQuestions: 0,
          percent: 0,
          brainCells: 0,
          conceptSummary: attempt.conceptSummary || null,
          sourceName: attempt.sourceName || '',
        }

        current.score += safeNumber(chapterEntry.score)
        current.totalQuestions += safeNumber(chapterEntry.totalQuestions)
        current.percent = current.totalQuestions
          ? Math.round((current.score / current.totalQuestions) * 100)
          : 0
        chapterAttemptMap.set(chapterId, current)
      })
    }

    chapterAttemptMap.forEach((chapterEntry) => {
      const key = normalizeQuestionId(chapterEntry.chapterId)
      if (!key) return

      const current = chapterTotals.get(key) || {
        chapterId: chapterEntry.chapterId,
        chapterNumber: chapterEntry.chapterNumber,
        chapterName: chapterEntry.chapterName,
        latestScore: 0,
        latestTotalQuestions: 0,
        latestPercent: 0,
        latestBrainCells: 0,
        bestPercent: 0,
        totalScore: 0,
        totalQuestions: 0,
        attemptCount: 0,
        latestAttemptAt: null,
        conceptSummary: chapterEntry.conceptSummary || null,
        sourceName: chapterEntry.sourceName || attempt.sourceName,
      }

      current.totalScore += safeNumber(chapterEntry.score)
      current.totalQuestions += safeNumber(chapterEntry.totalQuestions)
      current.attemptCount += 1

      if (!current.latestAttemptAt || new Date(attempt.createdAt) > new Date(current.latestAttemptAt)) {
        current.latestScore = safeNumber(chapterEntry.score)
        current.latestTotalQuestions = safeNumber(chapterEntry.totalQuestions)
        current.latestPercent = safeNumber(chapterEntry.percent)
        current.latestBrainCells = safeNumber(chapterEntry.brainCells)
        current.latestAttemptAt = attempt.createdAt
        current.conceptSummary = attempt.conceptSummary || current.conceptSummary
        current.sourceName = attempt.sourceName || current.sourceName
      }

      current.bestPercent = Math.max(current.bestPercent, safeNumber(chapterEntry.percent))
      chapterTotals.set(key, current)
    })
  })

  const chapterProgress = includeChapterProgress
    ? [...chapterTotals.values()].sort((left, right) => left.chapterNumber - right.chapterNumber)
    : []

  return {
    chapterProgress,
    totalBrainCells,
    totalScore,
    totalQuestions,
    attemptCount: orderedAttempts.length,
    averagePercent: totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0,
  }
}

const buildUserProgress = async (userDoc) => {
  const user = userDoc?.toObject ? userDoc.toObject() : userDoc
  const classId = user.classId?._id || user.classId || null
  const [attempts, classDoc] = await Promise.all([
    PracticeAttempt.find({ user: user._id })
      .sort({ createdAt: -1 })
      .select('attemptType sourceName totalScore totalQuestions brainCellsEarned createdAt chapterBreakdown conceptSummary questionBreakdown')
      .lean(),
    classId ? Class.findById(classId).select('name').lean() : Promise.resolve(null),
  ])

  const summary = summarizeStoredUserProgress(user)
  const chapterSummary = summarizeAttemptHistory(attempts, { includeChapterProgress: true })
  const chapterReports = chapterSummary.chapterProgress.map((chapterEntry) => ({
    ...chapterEntry,
    latestSuggestion: chapterEntry.conceptSummary?.summary || '',
    weakAreas: chapterEntry.conceptSummary?.focusAreas || [],
    solutionSteps: chapterEntry.conceptSummary?.solutionSteps || [],
  }))

  return {
    userId: String(user._id),
    name: user.name,
    email: user.email,
    classId: classDoc?._id ? String(classDoc._id) : String(user.classId || ''),
    className: classDoc?.name || '',
    totalBrainCells: summary.totalBrainCells,
    averagePercent: summary.averagePercent,
    attemptCount: summary.attemptCount,
    totalScore: summary.totalScore,
    totalQuestions: summary.totalQuestions,
    chapterReports,
    latestAttempts: attempts.slice(0, 10).map((attempt) => ({
      id: String(attempt._id),
      attemptType: attempt.attemptType,
      sourceName: attempt.sourceName,
      totalScore: attempt.totalScore,
      totalQuestions: attempt.totalQuestions,
      brainCellsEarned: attempt.brainCellsEarned,
      createdAt: attempt.createdAt,
      chapterBreakdown: attempt.chapterBreakdown || [],
      conceptSummary: attempt.conceptSummary || null,
    })),
  }
}

const buildProgressRowsForUsers = async (users = [], { includeChapterProgress = false } = {}) => {
  const userIds = users.map((user) => user._id)
  const attemptMap = includeChapterProgress ? new Map() : null

  if (includeChapterProgress) {
    const attempts = await PracticeAttempt.find({ user: { $in: userIds } })
      .sort({ createdAt: -1 })
      .select('user attemptType sourceName totalScore totalQuestions brainCellsEarned createdAt chapterBreakdown conceptSummary questionBreakdown')
      .lean()

    attempts.forEach((attempt) => {
      const key = String(attempt.user)
      const current = attemptMap.get(key) || []
      current.push(attempt)
      attemptMap.set(key, current)
    })
  }

  return Promise.all(users.map(async (user) => {
    const summary = includeChapterProgress
      ? summarizeAttemptHistory(attemptMap.get(String(user._id)) || [], {
          includeChapterProgress,
        })
      : summarizeStoredUserProgress(user)
    const classId = user.classId?._id || user.classId || null
    const classDoc = classId && typeof classId === 'object' && classId.name
      ? classId
      : classId
        ? await Class.findById(classId).lean()
        : null

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      password: user.password || user.passwordHash || '',
      phoneNumber: user.phoneNumber || '',
      classId: classDoc?._id ? String(classDoc._id) : String(user.classId || ''),
      className: classDoc?.name || '',
      isAdmin: Boolean(user.isAdmin),
      totalBrainCells: summary.totalBrainCells,
      averagePercent: summary.averagePercent,
      attemptCount: summary.attemptCount,
      totalScore: summary.totalScore,
      totalQuestions: summary.totalQuestions,
      chapterProgress: summary.chapterProgress || [],
    }
  }))
}

const buildAdminStudentRow = (user) => {
  const classDoc = user.classId && typeof user.classId === 'object'
    ? user.classId
    : null
  const summary = summarizeStoredUserProgress(user)

  return {
    id: String(user._id),
    name: String(user.name || 'Student').trim() || 'Student',
    email: String(user.email || '').trim(),
    phoneNumber: String(user.phoneNumber || '').trim(),
    classId: classDoc?._id ? String(classDoc._id) : String(user.classId || ''),
    className: classDoc?.name || '',
    totalBrainCells: summary.totalBrainCells,
    averagePercent: summary.averagePercent,
    attemptCount: summary.attemptCount,
    totalScore: summary.totalScore,
    totalQuestions: summary.totalQuestions,
  }
}

const buildAdminStudentQuery = async ({ search = '', classId = '' } = {}) => {
  const query = { isAdmin: false }
  const trimmedClassId = String(classId || '').trim()

  if (trimmedClassId === '__no_class__') {
    query.classId = null
  } else if (trimmedClassId) {
    query.classId = trimmedClassId
  }

  const trimmedSearch = String(search || '').trim()
  if (!trimmedSearch) {
    return query
  }

  const escapedSearch = escapeRegex(trimmedSearch)
  const classMatches = await Class.find({
    name: { $regex: escapedSearch, $options: 'i' },
  })
    .select('_id')
    .lean()

  const orClauses = [
    { name: { $regex: escapedSearch, $options: 'i' } },
    { email: { $regex: escapedSearch, $options: 'i' } },
    { phoneNumber: { $regex: escapedSearch, $options: 'i' } },
  ]

  if (classMatches.length) {
    orClauses.push({
      classId: {
        $in: classMatches.map((item) => item._id),
      },
    })
  }

  query.$or = orClauses
  return query
}

const buildAdminDashboardCounts = async () => {
  // These dashboard totals are operational account metrics and intentionally
  // Stay identical because account and class records are shared.
  const [totalStudents, totalClasses, totalReports, totalFeedback] = await Promise.all([
    Science2User.countDocuments({ isAdmin: false }),
    Science2Class.countDocuments({}),
    Science2Report.countDocuments({}),
    Science2Feedback.countDocuments({}),
  ])

  return {
    totalStudents,
    totalClasses,
    totalReports,
    totalFeedback,
  }
}

const updateLeaderboardTotals = async (userId, attemptData = {}) => {
  if (!userId) {
    return
  }

  try {
    const user = await User.findById(userId).select('leaderboardQuestionIds').lean()
    if (!user) {
      return
    }

    const rewardedQuestionIds = new Set((user.leaderboardQuestionIds || []).map((item) => String(item)))
    const { leaderboardCells, nextRewardedQuestionIds } = calculateLeaderboardCellsFromAttempt(attemptData, rewardedQuestionIds)
    const score = safeNumber(attemptData.score ?? attemptData.totalScore ?? 0)
    const totalQuestions = safeNumber(attemptData.totalQuestions)

    await User.updateOne(
      { _id: userId, isAdmin: false },
      {
        $inc: {
          totalScore: leaderboardCells,
          totalMarks: safeNumber(totalQuestions),
          totalCorrect: safeNumber(score),
          totalBrainCells: leaderboardCells,
          totalAttempts: 1,
        },
        $set: {
          leaderboardQuestionIds: [...nextRewardedQuestionIds],
        },
      },
    )

    await emitStudentSnapshot('student-progress-updated', userId)
  } catch (error) {
    console.error(`Could not update leaderboard totals for user ${userId}:`, error.message)
  }
}

const syncLeaderboardTotalsFromAttempts = async () => {
  const users = await User.find({ isAdmin: false }).select('_id').lean()
  const userIdSet = new Set(users.map((user) => String(user._id)))
  const attempts = await PracticeAttempt.find({ user: { $in: [...userIdSet] } })
    .sort({ createdAt: 1 })
    .lean()
  const battleRewards = await BattleReward.find({ userId: { $in: [...userIdSet] } })
    .sort({ createdAt: 1 })
    .lean()
  const battleRewardRoomIds = new Set(battleRewards.map((reward) => String(reward.roomId || '')))
  const battleRooms = BattleRoomModel
    ? await BattleRoomModel.find({
        status: 'finished',
        battleSummary: { $exists: true, $ne: null },
        _id: { $nin: [...battleRewardRoomIds] },
      })
        .select('questions battleSummary')
        .sort({ finishedAt: 1, createdAt: 1 })
        .lean()
    : []

  const totals = new Map([...userIdSet].map((userId) => ([
    userId,
    {
      totalScore: 0,
      totalMarks: 0,
      totalCorrect: 0,
      totalBrainCells: 0,
      totalAttempts: 0,
      leaderboardQuestionIds: [],
    },
  ])))

  const rewardedQuestionIdsMap = new Map([...userIdSet].map((userId) => [userId, new Set()]))

  attempts.forEach((attempt) => {
    const userId = String(attempt.user || '')
    const currentTotals = totals.get(userId)
    if (!currentTotals) {
      return
    }

    const rewardedQuestionIds = rewardedQuestionIdsMap.get(userId) || new Set()
    const { leaderboardCells, nextRewardedQuestionIds } = calculateLeaderboardCellsFromAttempt(attempt, rewardedQuestionIds)
    rewardedQuestionIdsMap.set(userId, nextRewardedQuestionIds)

    currentTotals.totalScore += leaderboardCells
    currentTotals.totalMarks += safeNumber(attempt.totalQuestions)
    currentTotals.totalCorrect += safeNumber(attempt.totalScore)
    currentTotals.totalBrainCells += leaderboardCells
    currentTotals.totalAttempts += 1
    currentTotals.leaderboardQuestionIds = [...nextRewardedQuestionIds]
  })

  battleRewards.forEach((reward) => {
    const userId = String(reward.userId || '')
    const currentTotals = totals.get(userId)
    if (!currentTotals) {
      return
    }

    currentTotals.totalScore += safeNumber(reward.score)
    currentTotals.totalMarks += safeNumber(reward.totalQuestions)
    currentTotals.totalBrainCells += safeNumber(reward.brainCells)
    currentTotals.totalAttempts += 1
  })

  battleRooms.forEach((room) => {
    const rewards = Array.isArray(room.battleSummary?.rewards) ? room.battleSummary.rewards : []
    const totalQuestions = safeNumber(room.battleSummary?.totalQuestions || room.questions?.length || 0)

    rewards.forEach((reward) => {
      const userId = String(reward.userId || '')
      const currentTotals = totals.get(userId)
      if (!currentTotals) {
        return
      }

      currentTotals.totalScore += safeNumber(reward.score)
      currentTotals.totalMarks += totalQuestions
      currentTotals.totalBrainCells += safeNumber(reward.brainCells)
      currentTotals.totalAttempts += 1
    })
  })

  await User.updateMany(
    { isAdmin: false },
    {
      $set: {
        totalScore: 0,
        totalMarks: 0,
        totalCorrect: 0,
        totalBrainCells: 0,
        leaderboardQuestionIds: [],
        totalAttempts: 0,
      },
    },
  )

  if (!totals.size) {
    return
  }

  await User.bulkWrite(
    [...totals.entries()].map(([userId, entry]) => ({
      updateOne: {
        filter: { _id: userId, isAdmin: false },
        update: {
          $set: {
            totalScore: safeNumber(entry.totalScore),
            totalMarks: safeNumber(entry.totalMarks),
            totalCorrect: safeNumber(entry.totalCorrect),
            totalBrainCells: safeNumber(entry.totalBrainCells),
            leaderboardQuestionIds: entry.leaderboardQuestionIds || [],
            totalAttempts: safeNumber(entry.totalAttempts),
          },
        },
      },
    })),
    { ordered: false },
  )
}

const dedupeByKey = (items, getKey) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = getKey(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const createWebpImage = async (buffer, { width = 1200, height = 1200, fit = 'inside', quality = 78 } = {}) => {
  return sharp(buffer)
    .rotate()
    .resize(width, height, { fit, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}

const convertQuestionImage = async (file, label) => {
  if (!file?.buffer) return undefined

  try {
    return {
      data: await createWebpImage(file.buffer),
      contentType: 'image/webp',
      updatedAt: new Date(),
    }
  } catch (error) {
    const conversionError = new Error(`${label} could not be converted to WebP. Please choose a JPG, PNG, GIF, or WebP image.`)
    conversionError.statusCode = 400
    conversionError.cause = error
    throw conversionError
  }
}

const createToken = (user) => {
  return jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
    expiresIn: TOKEN_AGE,
  })
}

const verifyFirebaseIdToken = async (token, publicApiKey = '') => {
  if (!token) return null

  if (firebaseAdminAuth) {
    try {
      return await firebaseAdminAuth.verifyIdToken(token)
    } catch (error) {
      console.warn(`Firebase Admin token verification failed; using public fallback: ${error.message}`)
    }
  }

  // Local development can run without a Firebase service-account JSON file.
  // Firebase's Identity Toolkit endpoint still validates the ID token itself.
  const apiKey = String(publicApiKey || process.env.FIREBASE_WEB_API_KEY || '').trim()
  if (!apiKey) return null

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    })
    const data = await response.json()
    const firebaseUser = data?.users?.[0]

    if (!response.ok || !firebaseUser?.localId) return null

    return {
      uid: firebaseUser.localId,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || '',
    }
  } catch (error) {
    console.warn(`Firebase public token verification failed: ${error.message}`)
    return null
  }
}

const getUserFromAuthToken = async (token) => {
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await AccountUser.findById(payload.userId)
    return user ? user.populate('classId', 'name') : null
  } catch (error) {
    const firebaseUser = await verifyFirebaseIdToken(token)
    if (!firebaseUser?.uid) return null
    const user = await AccountUser.findOne({ firebaseUid: firebaseUser.uid })
    return user ? user.populate('classId', 'name') : null
  }
}

const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'Please sign in first.' })
    }

    const user = await getUserFromAuthToken(token)

    if (!user) {
      return res.status(401).json({ message: 'User not found.' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' })
  }
}

const publicFeedback = (feedback) => {
  const normalizedFeedback = typeof feedback.toObject === 'function' ? feedback.toObject() : feedback

  return {
    id: String(normalizedFeedback._id),
    name: normalizedFeedback.name || 'Guest',
    email: normalizedFeedback.email || '',
    phoneNumber: normalizedFeedback.phoneNumber || '',
    classId: String(normalizedFeedback.classId?._id || normalizedFeedback.classId || ''),
    className: normalizedFeedback.className || normalizedFeedback.classId?.name || '',
    rating: Number(normalizedFeedback.rating || 0),
    message: normalizedFeedback.message || '',
    featured: Boolean(normalizedFeedback.featured),
    sourceType: normalizedFeedback.sourceType || 'general',
    sourceKey: normalizedFeedback.sourceKey || '',
    sourceLabel: normalizedFeedback.sourceLabel || '',
    status: normalizedFeedback.status || 'new',
    createdAt: normalizedFeedback.createdAt,
    updatedAt: normalizedFeedback.updatedAt,
  }
}

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (token) req.user = await getUserFromAuthToken(token)
  } catch (error) {
    req.user = null
  }

  next()
}

BattleRoomModel = initBattleMode({
  app,
  server,
  io,
  mongoose,
  models: {
    User,
    Chapter,
    Topic,
    ObjectiveType,
    ObjectiveQuestion,
    BattleReward,
  },
  getScienceConnection,
  authRequired,
  optionalAuth,
}).BattleRoom

const extractJsonFromText = (text = '') => {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed)
  } catch (error) {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim())
    }

    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')

    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }

    throw error
  }
}

const requiresFourOptions = (type) => ['correlation', 'odd-man-out'].includes(type)
const isMatchType = (type) => type === 'match-the-following'
const isDoneOnlyType = (type) => type === 'complete-the-tables'
const normalizeObjectiveType = (type) => {
  const normalized = String(type || '').trim().toLowerCase()
  return ['numerical', 'numerical-questions', 'numericals'].includes(normalized) ? 'numericals' : normalized
}

const normalizeNumericalQuestion = ({ question, solution, options, correctOption }) => {
  const sourceOptions = Array.isArray(options) ? options : []
  const cleanedOptions = sourceOptions
    .map((option) => String(option || '').trim())
    .filter(Boolean)
  const sourceIndex = Number(correctOption)
  const selectedOption = Number.isInteger(sourceIndex) ? String(sourceOptions[sourceIndex] || '').trim() : ''
  const normalizedCorrectOption = selectedOption
    ? cleanedOptions.indexOf(selectedOption)
    : sourceIndex

  return {
    question: String(question || '').trim(),
    solution: String(solution || '').trim(),
    options: cleanedOptions,
    correctOption: normalizedCorrectOption,
  }
}

const normalizeMatchQuestionPayload = ({ question, pairs, options, correctOptions }) => {
  const cleanedPairs = Array.isArray(pairs)
    ? pairs
      .map((pair) => ({
        left: String(pair?.left || '').trim(),
        right: String(pair?.right || '').trim(),
      }))
      .filter((pair) => pair.left && pair.right)
      .slice(0, 8)
    : []

  const cleanedOptions = cleanedPairs.length
    ? cleanedPairs.map((pair) => pair.right)
    : (options || []).map((option) => String(option || '').trim()).filter(Boolean)

  const sequence = Array.isArray(correctOptions)
    ? correctOptions.map(Number)
    : cleanedOptions.map((_, index) => index)

  if (cleanedPairs.length < 2) {
    throw new Error('Match the following needs at least two filled pairs.')
  }

  if (
    sequence.length !== cleanedPairs.length ||
    sequence.some((index) => !Number.isInteger(index) || index < 0 || index >= cleanedOptions.length)
  ) {
    throw new Error('Please complete the correct matching sequence.')
  }

  return {
    question: String(question || '').trim(),
    pairs: cleanedPairs,
    options: cleanedOptions,
    correctOptions: sequence,
    correctOption: sequence[0] || 0,
  }
}

const normalizeAiQuestions = (value, type = '') => {
  const rawQuestions = Array.isArray(value) ? value : value?.questions

  if (!Array.isArray(rawQuestions)) {
    return []
  }

  return rawQuestions
    .map((item) => {
      if (isMatchType(type)) {
        const rawPairs = Array.isArray(item.pairs)
          ? item.pairs
          : Array.isArray(item.matches)
            ? item.matches
            : []
        const pairs = rawPairs
          .map((pair) => ({
            left: String(pair.left || pair.term || pair.question || '').trim(),
            right: String(pair.right || pair.answer || pair.match || '').trim(),
          }))
          .filter((pair) => pair.left && pair.right)
          .slice(0, 8)

        if (!pairs.length && Array.isArray(item.leftItems) && Array.isArray(item.rightItems)) {
          item.leftItems.forEach((left, index) => {
            const rightIndex = Array.isArray(item.correctOptions) ? Number(item.correctOptions[index]) : index
            const right = item.rightItems[rightIndex]

            if (left && right) {
              pairs.push({ left: String(left).trim(), right: String(right).trim() })
            }
          })
        }

        if (!pairs.length) return null

        try {
          return normalizeMatchQuestionPayload({
            question: item.question || 'Match the following',
            pairs,
          })
        } catch (error) {
          return null
        }
      }

      const question = String(item.question || '').trim()
      const options = (item.options || [])
        .map((option) => String(option || '').trim())
        .filter(Boolean)
        .slice(0, 4)
      let correctOption = Number(item.correctOption)

      if (!Number.isInteger(correctOption) && item.correctAnswer) {
        const correctText = String(item.correctAnswer).trim().toLowerCase()
        correctOption = options.findIndex((option) => option.toLowerCase() === correctText)
      }

      if (requiresFourOptions(type) && options.length !== 4) {
        return null
      }

      if (!question || options.length < 2 || !Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) {
        return null
      }

      while (options.length < 4) {
        options.push('')
      }

      return { question, options, correctOption }
    })
    .filter(Boolean)
}

const scoreObjectiveQuestion = ({ objectiveType, question, selectedOption }) => {
  const isMatchingQuestion = objectiveType === 'match-the-following' && Array.isArray(question.correctOptions) && question.correctOptions.length
  const isDoneOnlyQuestion = objectiveType === 'complete-the-tables'

  if (isMatchingQuestion) {
    const normalizedSelection = Array.isArray(selectedOption)
      ? selectedOption.map(Number)
      : []
    const isCorrect = normalizedSelection.length === question.correctOptions.length &&
      normalizedSelection.every((optionIndex, pairIndex) => optionIndex === question.correctOptions[pairIndex])

    return {
      isSkipped: !normalizedSelection.length,
      isCorrect,
      selectedAnswer: normalizedSelection
        .map((optionIndex, pairIndex) => `${question.pairs?.[pairIndex]?.left || `Item ${pairIndex + 1}`} - ${question.options[optionIndex] || 'Unknown option'}`)
        .join('; '),
      correctAnswer: question.correctOptions
        .map((optionIndex, pairIndex) => `${question.pairs?.[pairIndex]?.left || `Item ${pairIndex + 1}`} - ${question.options[optionIndex] || 'Unknown option'}`)
        .join('; '),
    }
  }

  if (isDoneOnlyQuestion) {
    const isDone = String(selectedOption) === '1' || selectedOption === 1 || selectedOption === true

    return {
      isSkipped: !isDone,
      isCorrect: isDone,
      selectedAnswer: isDone ? 'Done' : 'Skipped',
      correctAnswer: 'Done',
    }
  }

  const normalizedSelection = Number(selectedOption)
  const isSkipped = Number.isNaN(normalizedSelection)
  const isCorrect = !isSkipped && normalizedSelection === question.correctOption

  return {
    isSkipped,
    isCorrect,
    selectedAnswer: question.options[normalizedSelection] || 'Unknown option',
    correctAnswer: question.options[question.correctOption] || 'Unknown option',
  }
}

const scoreQuestionsWithBreakdown = (questions, answers, objectiveType) => {
  const answerMap = new Map((answers || []).map((answer) => {
    const selectedOption = Array.isArray(answer.selectedOption)
      ? answer.selectedOption.map(Number)
      : Number(answer.selectedOption)

    return [String(answer.questionId), selectedOption]
  }))

  const breakdown = questions.map((question, index) => {
    const selectedOption = answerMap.get(String(question._id))
    const scored = scoreObjectiveQuestion({ objectiveType, question, selectedOption })

    return {
      number: index + 1,
      question: question.question,
      selectedAnswer: scored.isSkipped ? 'Skipped' : scored.selectedAnswer,
      correctAnswer: scored.correctAnswer,
      status: scored.isSkipped ? 'skipped' : scored.isCorrect ? 'correct' : 'wrong',
      chapterId: question.chapterId,
      chapterNumber: question.chapterNumber,
      chapterName: question.chapterName,
      objectiveTypeId: question.objectiveTypeId,
      topicName: question.topicName,
      questionId: question._id,
    }
  })

  const score = breakdown.filter((item) => item.status === 'correct').length
  const wrongCount = breakdown.filter((item) => item.status === 'wrong').length
  const skippedCount = breakdown.filter((item) => item.status === 'skipped').length

  return {
    score,
    wrongCount,
    skippedCount,
    questionBreakdown: breakdown,
  }
}

const buildChapterSummariesFromBreakdown = (questionBreakdown = []) => {
  const chapterMap = new Map()

  questionBreakdown.forEach((item) => {
    const chapterId = String(item.chapterId || '')
    if (!chapterId) return

    const current = chapterMap.get(chapterId) || {
      chapterId: item.chapterId,
      chapterNumber: safeNumber(item.chapterNumber),
      chapterName: item.chapterName || '',
      score: 0,
      totalQuestions: 0,
    }

    current.score += item.status === 'correct' ? 1 : 0
    current.totalQuestions += 1
    chapterMap.set(chapterId, current)
  })

  return [...chapterMap.values()].map((entry) => ({
    ...entry,
    percent: entry.totalQuestions ? Math.round((entry.score / entry.totalQuestions) * 100) : 0,
    brainCells: chapterBrainCellsFromPercent(entry.totalQuestions ? (entry.score / entry.totalQuestions) * 100 : 0),
  }))
}

const adminRequired = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required.' })
  }

  next()
}

const createProgressFallback = ({ previousScore, currentScore, totalQuestions, wrongCount = 0, skippedCount = 0 }) => {
  const total = Math.max(Number(totalQuestions) || 0, 1)
  const previous = Number(previousScore) || 0
  const current = Number(currentScore) || 0
  const change = current - previous
  const percent = Math.round((current / total) * 100)
  const needs = []

  if (wrongCount > 0) needs.push('recheck the questions you answered incorrectly')
  if (skippedCount > 0) needs.push('attempt the skipped questions after revising the related paragraph')

  if (change > 0) {
    return `Good progress. You improved by ${change} mark${change === 1 ? '' : 's'} from your previous best. ${needs.length ? needs.join(' and ') : 'Revise the questions you missed'}, then try one timed round to push beyond ${percent}%.`
  }

  if (change < 0) {
    return `This attempt is below your previous best by ${Math.abs(change)} mark${Math.abs(change) === 1 ? '' : 's'}. ${needs.length ? needs.join(' and ') : 'Review wrong and skipped questions first'}, then retry after a short focused revision.`
  }

  if (current === total) {
    return 'Excellent. You kept a perfect score. Move to a mixed practice set next so the concepts stay strong in a new order.'
  }

  return `Your score matched your previous best. Focus on the remaining ${total - current} question${total - current === 1 ? '' : 's'} and retry once after reviewing the explanation or textbook section.`
}

const createFallbackProgressReport = ({ previousScore, currentScore, totalQuestions, correctCount, wrongCount, skippedCount }) => ({
  summary: createProgressFallback({ previousScore, currentScore, totalQuestions, wrongCount, skippedCount }),
  focusAreas: wrongCount || skippedCount
    ? ['Review the concepts linked to wrong and skipped questions.', 'Compare your answer with the correct option before retrying.']
    : ['Maintain accuracy with one mixed revision round.', 'Practice a few application-based questions next.'],
  solutionSteps: [
    'Read the saved topic paragraph once without answering.',
    'Rewrite the facts behind every wrong or skipped question.',
    'Attempt the same practice again after a short break.',
  ],
  correctCount,
  wrongCount,
  skippedCount,
})

const generateProgressSuggestion = async ({
  objectiveType,
  topicName,
  studyText,
  previousScore,
  currentScore,
  totalQuestions,
  correctCount,
  wrongCount,
  skippedCount,
  questionBreakdown,
}) => {
  const fallback = createFallbackProgressReport({
    previousScore,
    currentScore,
    totalQuestions,
    correctCount,
    wrongCount,
    skippedCount,
  })

  if (!process.env.OPENROUTER_API_KEY) {
    return fallback
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'Innovative Science 2',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.3,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: 'You are a friendly science practice coach. Return only valid JSON. Do not include markdown.',
          },
          {
            role: 'user',
            content: `Objective: ${objectiveType}
Topic: ${topicName || 'Science topic'}
Previous best: ${previousScore}/${totalQuestions}
Current score: ${currentScore}/${totalQuestions}
Correct: ${correctCount}
Wrong: ${wrongCount}
Skipped: ${skippedCount}

Admin topic paragraph:
${studyText || 'No paragraph was uploaded by the admin.'}

User question result breakdown:
${JSON.stringify(questionBreakdown).slice(0, 6000)}

Return JSON only:
{"summary":"2-3 sentence progress report based on right, wrong, skipped and previous score","focusAreas":["specific area from the paragraph/results","specific area"],"solutionSteps":["clear action step","clear action step","clear action step"]}`,
          },
        ],
      }),
    })

    const data = await response.json().catch(() => null)
    const content = data?.choices?.[0]?.message?.content?.trim()

    if (!response.ok || !content) {
      return fallback
    }

    const parsed = extractJsonFromText(content)
    const summary = String(parsed.summary || '').trim()
    const focusAreas = Array.isArray(parsed.focusAreas)
      ? parsed.focusAreas.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
      : []
    const solutionSteps = Array.isArray(parsed.solutionSteps)
      ? parsed.solutionSteps.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : []

    return {
      ...fallback,
      summary: summary || fallback.summary,
      focusAreas: focusAreas.length ? focusAreas : fallback.focusAreas,
      solutionSteps: solutionSteps.length ? solutionSteps : fallback.solutionSteps,
    }
  } catch (error) {
    return fallback
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const dailyTimezone = (req) => {
  const requested = String(req.headers['x-timezone'] || req.body?.timezone || 'Asia/Calcutta').trim()
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: requested }).format()
    return requested
  } catch (error) {
    return 'Asia/Calcutta'
  }
}

const localDateForTimezone = (timezone) => new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const previousLocalDate = (localDate) => {
  const [year, month, day] = String(localDate).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10)
}

const nextLocalMonth = (localDate) => {
  const [year, month] = String(localDate).split('-').map(Number)
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`
}

const shuffle = (items) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

const dailyQuestionView = (question, challenge) => {
  const objectiveType = question.objectiveType || {}
  const topic = objectiveType.topic || {}
  const chapter = topic.chapter || {}
  const answer = (challenge.answers || []).find((item) => String(item.questionId) === String(question._id))
  return {
    _id: question._id,
    question: question.question || '',
    options: Array.isArray(question.options) ? question.options : [],
    pairs: Array.isArray(question.pairs) ? question.pairs : [],
    imageUrl: publicQuestionImageUrl(question),
    answerImageUrl: '',
    solution: answer ? (question.solution || '') : '',
    type: objectiveType.type || '',
    isBoardQuestion: Boolean(question.isBoardQuestion),
    topicName: topic.name || '',
    chapterId: chapter._id,
    chapterNumber: chapter.number,
    chapterName: chapter.name || '',
    objectiveTypeId: objectiveType._id,
    submitted: Boolean(answer),
    selectedAnswer: answer?.selectedAnswer,
    isCorrect: answer?.isCorrect,
  }
}

const streakExcludedObjectiveTypes = new Set(['complete-the-tables', 'diagram-based-question'])

const countStreakEligibleCorrectAnswers = (challenge, questions) => {
  const typeByQuestionId = new Map(
    questions.map((question) => [String(question._id), question.objectiveType?.type || ''])
  )

  return (challenge.answers || []).filter((answer) => (
    answer.isCorrect && !streakExcludedObjectiveTypes.has(typeByQuestionId.get(String(answer.questionId)))
  )).length
}

const dailyChallengePayload = (challenge, questions, streak) => {
  const streakEligibleCorrectCount = countStreakEligibleCorrectAnswers(challenge, questions)

  return {
    challenge: {
      id: challenge._id,
      localDate: challenge.localDate,
      timezone: challenge.timezone,
      questionCount: challenge.questionIds.length,
      questions: questions.map((question) => dailyQuestionView(question, challenge)),
      attemptedCount: challenge.attemptedCount,
      correctCount: challenge.correctCount,
      score: challenge.score,
      accuracy: challenge.attemptedCount ? Math.round((challenge.correctCount / challenge.attemptedCount) * 100) : 0,
      status: challenge.status,
      completedAt: challenge.completedAt,
      eligibleChapterIds: challenge.eligibleChapterIds,
      streakEligibleCorrectCount,
      streakQualified: streakEligibleCorrectCount >= 10,
    },
    streak: streak || { currentStreak: 0, longestStreak: 0, lastCreditedDate: null },
  }
}

const getEligibleDailyChapterIds = async (userId) => {
  const attempts = await PracticeAttempt.find({ user: userId, attemptType: 'practice' })
    .select('createdAt questionBreakdown')
    .sort({ createdAt: -1 })
    .lean()
  const latestAttemptByChapter = new Map()

  attempts.forEach((attempt) => {
    ;(attempt.questionBreakdown || []).forEach((item) => {
      // Only answered regular-practice questions unlock a chapter. A skipped
      // question must never make its chapter eligible for the daily challenge.
      if (!item.questionId || !['correct', 'wrong'].includes(item.status) || !item.chapterId) return
      const chapterId = String(item.chapterId)
      if (!latestAttemptByChapter.has(chapterId)) latestAttemptByChapter.set(chapterId, attempt.createdAt)
    })
  })

  // Newer practised chapters are considered first by the daily selector.
  return [...latestAttemptByChapter.entries()]
    .sort(([, firstDate], [, secondDate]) => new Date(secondDate) - new Date(firstDate))
    .map(([chapterId]) => chapterId)
}

const selectDailyQuestions = async (userId, eligibleChapterIds, localDate) => {
  const monthStart = `${String(localDate).slice(0, 7)}-01`
  const previousChallenges = await DailyChallenge.find({
    user: userId,
    subject: getActiveScience(),
    localDate: { $gte: monthStart, $lt: nextLocalMonth(localDate) },
  }).select('questionIds').lean()
  const usedQuestionIds = new Set()
  previousChallenges.forEach((challenge) => {
    ;(challenge.questionIds || []).forEach((questionId) => {
      usedQuestionIds.add(String(questionId))
    })
  })

  const candidates = eligibleChapterIds.length
    ? await ObjectiveQuestion.find({}).populate({
      path: 'objectiveType',
      populate: { path: 'topic', populate: { path: 'chapter', select: '_id number name' } },
    }).lean()
    : []
  const chapterRank = new Map(eligibleChapterIds.map((chapterId, index) => [chapterId, index]))
  const filtered = candidates
    .filter((question) => eligibleChapterIds.includes(String(question.objectiveType?.topic?.chapter?._id)))
    // Do not repeat a question within the same calendar month. Questions
    // become eligible again automatically when the next month starts.
    .filter((question) => !usedQuestionIds.has(String(question._id)))
  const byType = new Map()
  const byChapter = new Map()
  const rankQuestion = (question) => {
    const chapter = String(question.objectiveType?.topic?.chapter?._id || '')
    return {
      question,
      chapterRank: chapterRank.get(chapter) ?? eligibleChapterIds.length,
    }
  }
  const ranked = shuffle(filtered).map(rankQuestion).sort((first, second) => (
    first.chapterRank - second.chapterRank
  ))
  ranked.forEach(({ question }) => {
    const type = question.objectiveType?.type || 'other'
    const chapter = String(question.objectiveType?.topic?.chapter?._id || '')
    if (!byType.has(type)) byType.set(type, [])
    if (!byChapter.has(chapter)) byChapter.set(chapter, [])
    byType.get(type).push(question)
    byChapter.get(chapter).push(question)
  })
  const selected = []
  const used = new Set()
  const counts = new Map()
  const take = (question) => {
    if (!question || used.has(String(question._id))) return false
    const type = question.objectiveType?.type || 'other'
    const count = counts.get(type) || 0
    if (type === 'diagram-based-question' && count >= 2) return false
    if (type === 'complete-the-tables' && count >= 2) return false
    used.add(String(question._id)); selected.push(question); counts.set(type, count + 1)
    return true
  }
  const takeMixed = (pool, limit) => {
    const queues = [...pool.reduce((groups, question) => {
      const type = question.objectiveType?.type || 'other'
      if (!groups.has(type)) groups.set(type, [])
      groups.get(type).push(question)
      return groups
    }, new Map()).values()]
    let cursor = 0
    while (selected.length < limit && queues.some((queue) => queue.length)) {
      const queue = queues[cursor % queues.length]
      cursor += 1
      if (queue?.length) take(queue.shift())
    }
  }

  const boardQuestions = ranked.filter(({ question }) => question.isBoardQuestion).map(({ question }) => question)
  const regularQuestions = ranked.filter(({ question }) => !question.isBoardQuestion).map(({ question }) => question)
  // Prefer board questions, but retain a mixed set and use regular questions
  // to complete the challenge when the board bank is smaller.
  takeMixed(boardQuestions, Math.min(14, boardQuestions.length))
  takeMixed(regularQuestions, 20)
  takeMixed(boardQuestions, 20)

  /* Keep chapter coverage broad when the preferred pools contain enough data. */
  const chapterQueues = [...byChapter.values()].map((queue) => shuffle(queue))
  let cursor = 0
  while (selected.length < 20 && chapterQueues.some((queue) => queue.length)) {
    const queue = chapterQueues[cursor % chapterQueues.length]
    cursor += 1
    if (queue?.length) take(queue.shift())
  }
  if (selected.length < 20) shuffle(filtered).forEach((question) => { if (selected.length < 20) take(question) })
  return selected
}

const generateDailyChallenge = async ({ userId, localDate, timezone }) => {
  const eligibleChapterIds = await getEligibleDailyChapterIds(userId)
  const selected = await selectDailyQuestions(userId, eligibleChapterIds, localDate)
  const challenge = await DailyChallenge.create({
    user: userId,
    subject: getActiveScience(),
    localDate,
    timezone,
    questionIds: selected.map((question) => question._id),
    eligibleChapterIds,
    status: selected.length < 20 ? 'bank_insufficient' : 'in_progress',
  })
  return { challenge, questions: selected }
}

const getDailyChallenge = async (userId, localDate, timezone) => {
  let challenge = await DailyChallenge.findOne({ user: userId, subject: getActiveScience(), localDate })
  if (!challenge) {
    try {
      ({ challenge } = await generateDailyChallenge({ userId, localDate, timezone }))
    } catch (error) {
      if (error?.code !== 11000) throw error
      challenge = await DailyChallenge.findOne({ user: userId, subject: getActiveScience(), localDate })
    }
  }

  // A student may practise after first opening the daily-streak page. Refresh
  // an untouched challenge so the newly unlocked chapter is usable today.
  if (challenge && challenge.status !== 'completed' && !challenge.answers?.length) {
    const eligibleChapterIds = await getEligibleDailyChapterIds(userId)
    const storedChapterIds = (challenge.eligibleChapterIds || []).map((id) => String(id)).sort()
    const currentChapterIds = [...eligibleChapterIds].sort()
    if (JSON.stringify(storedChapterIds) !== JSON.stringify(currentChapterIds)) {
      const selected = await selectDailyQuestions(userId, eligibleChapterIds, localDate)
      challenge.questionIds = selected.map((question) => question._id)
      challenge.eligibleChapterIds = eligibleChapterIds
      challenge.status = selected.length < 20 ? 'bank_insufficient' : 'in_progress'
      await challenge.save()
    }
  }

  const questions = challenge?.questionIds?.length
    ? await ObjectiveQuestion.find({ _id: { $in: challenge.questionIds } }).populate({ path: 'objectiveType', populate: { path: 'topic', populate: { path: 'chapter', select: '_id number name' } } }).lean()
    : []
  const questionMap = new Map(questions.map((question) => [String(question._id), question]))
  const ordered = challenge.questionIds.map((id) => questionMap.get(String(id))).filter(Boolean)
  const streak = await StudentStreak.findOne({ user: userId, subject: getActiveScience() }).lean()
  return dailyChallengePayload(challenge, ordered, streak)
}

app.get('/api/daily-challenge', authRequired, async (req, res) => {
  try {
    const timezone = dailyTimezone(req)
    res.json(await getDailyChallenge(req.user._id, localDateForTimezone(timezone), timezone))
  } catch (error) {
    console.error('Daily challenge load failed:', error.message)
    res.status(500).json({ message: 'Could not load today\'s daily challenge.' })
  }
})

app.get('/api/daily-challenge/history', authRequired, async (req, res) => {
  try {
    const challenges = await DailyChallenge.find({ user: req.user._id, subject: getActiveScience() }).select('localDate status completedAt attemptedCount correctCount score').sort({ localDate: -1 }).limit(90).lean()
    const streak = await StudentStreak.findOne({ user: req.user._id, subject: getActiveScience() }).lean()
    res.json({ challenges, streak: streak || { currentStreak: 0, longestStreak: 0, lastCreditedDate: null } })
  } catch (error) {
    res.status(500).json({ message: 'Could not load streak history.' })
  }
})

app.post('/api/daily-challenge/:id/answer', authRequired, async (req, res) => {
  try {
    const challenge = await DailyChallenge.findOne({ _id: req.params.id, user: req.user._id, subject: getActiveScience() })
    if (!challenge) return res.status(404).json({ message: 'Daily challenge not found.' })
    if (challenge.status === 'completed') return res.status(409).json({ message: 'This challenge is already complete.' })
    const questionId = String(req.body.questionId || '')
    if (!challenge.questionIds.some((id) => String(id) === questionId)) return res.status(400).json({ message: 'Question does not belong to this challenge.' })
    const existing = challenge.answers.find((answer) => String(answer.questionId) === questionId)
    if (existing) return res.json({ questionId, isCorrect: existing.isCorrect, attemptedCount: challenge.attemptedCount, correctCount: challenge.correctCount })
    const question = await ObjectiveQuestion.findOne({ _id: questionId }).populate({ path: 'objectiveType', select: 'type' })
    if (!question) return res.status(404).json({ message: 'Question no longer exists.' })
    const selectedAnswer = req.body.selectedAnswer
    const type = question.objectiveType?.type || ''
    const isCorrect = type === 'match-the-following'
      ? JSON.stringify(selectedAnswer) === JSON.stringify(question.correctOptions || [])
      : Number(selectedAnswer) === Number(question.correctOption)
    challenge.answers.push({ questionId, selectedAnswer, isCorrect })
    challenge.attemptedCount += 1
    if (isCorrect) challenge.correctCount += 1
    challenge.score = challenge.correctCount
    await challenge.save()
    res.json({ questionId, isCorrect, solution: question.solution || '', attemptedCount: challenge.attemptedCount, correctCount: challenge.correctCount })
  } catch (error) {
    res.status(500).json({ message: 'Could not save this answer.' })
  }
})

app.post('/api/daily-challenge/:id/complete', authRequired, async (req, res) => {
  try {
    const challenge = await DailyChallenge.findOne({ _id: req.params.id, user: req.user._id, subject: getActiveScience() })
    if (!challenge) return res.status(404).json({ message: 'Daily challenge not found.' })
    if (challenge.status === 'completed') return res.json(await getDailyChallenge(req.user._id, challenge.localDate, challenge.timezone))
    if (challenge.attemptedCount < challenge.questionIds.length) return res.status(400).json({ message: 'Attempt every question before completing the challenge.' })
    const challengeQuestions = await ObjectiveQuestion.find({ _id: { $in: challenge.questionIds } })
      .populate({ path: 'objectiveType', select: 'type' })
      .select('_id objectiveType')
      .lean()
    const streakEligibleCorrectCount = countStreakEligibleCorrectAnswers(challenge, challengeQuestions)
    challenge.status = 'completed'; challenge.completedAt = new Date(); await challenge.save()
    let streak = await StudentStreak.findOne({ user: req.user._id, subject: getActiveScience() })
    const qualifiesForStreak = streakEligibleCorrectCount >= 10
    if (!streak) streak = await StudentStreak.create({ user: req.user._id, subject: getActiveScience() })
    if (qualifiesForStreak && streak.lastCreditedDate !== challenge.localDate) {
      streak.currentStreak = streak.lastCreditedDate === previousLocalDate(challenge.localDate) ? streak.currentStreak + 1 : 1
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
      streak.lastCreditedDate = challenge.localDate
      await streak.save()
    } else if (!qualifiesForStreak && streak.currentStreak !== 0) {
      streak.currentStreak = 0
      await streak.save()
    }
    res.json(await getDailyChallenge(req.user._id, challenge.localDate, challenge.timezone))
  } catch (error) {
    res.status(500).json({ message: 'Could not complete the daily challenge.' })
  }
})

// Firebase owns credentials. MongoDB stores only the Firebase UID and app profile data.
app.post('/api/auth/firebase', async (req, res) => {
  try {
    const {
      idToken,
      firebaseApiKey = '',
      name = '',
      email = '',
      phoneNumber = '',
      dateOfBirth,
      gender,
      bloodGroup,
      state,
      city,
      area,
      schoolName,
      finalExamPercentage,
    } = req.body || {}
    const firebaseUser = await verifyFirebaseIdToken(String(idToken || ''), firebaseApiKey)

    if (!firebaseUser?.uid) {
      return res.status(401).json({ message: 'Invalid Firebase session.' })
    }

    const normalizedEmail = normalizeEmail(firebaseUser.email || email)
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'A verified email address is required.' })
    }

    let user = await AccountUser.findOne({ $or: [{ firebaseUid: firebaseUser.uid }, { email: normalizedEmail }] })
    let createdNewUser = false
    if (!user) {
      user = await AccountUser.create({
        firebaseUid: firebaseUser.uid,
        name: String(firebaseUser.name || name || normalizedEmail.split('@')[0]).trim() || 'Student',
        email: normalizedEmail,
        phoneNumber: String(phoneNumber || '').trim(),
        dateOfBirth: String(dateOfBirth || '').trim(),
        gender: String(gender || '').trim(),
        bloodGroup: String(bloodGroup || '').trim(),
        state: String(state || '').trim(),
        city: String(city || '').trim(),
        area: String(area || '').trim() || 'Bhandup',
        schoolName: String(schoolName || '').trim(),
        finalExamPercentage: finalExamPercentage === '' || finalExamPercentage === undefined || finalExamPercentage === null
          ? null
          : Number(finalExamPercentage),
      })
      createdNewUser = true
    } else {
      let changed = false
      const requestedName = String(name || firebaseUser.name || '').trim()
      const requestedPhoneNumber = String(phoneNumber || '').trim()

      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUser.uid
        changed = true
      }
      if (requestedName && user.name !== requestedName) {
        user.name = requestedName
        changed = true
      }
      if (requestedPhoneNumber && user.phoneNumber !== requestedPhoneNumber) {
        user.phoneNumber = requestedPhoneNumber
        changed = true
      }
      const profileFields = { dateOfBirth, gender, bloodGroup, state, city, area, schoolName, finalExamPercentage }
      Object.entries(profileFields).forEach(([key, value]) => {
        if (value !== undefined && user[key] !== (key === 'finalExamPercentage' && value !== '' ? Number(value) : String(value || '').trim())) {
          user[key] = key === 'finalExamPercentage'
            ? (value === '' || value === null ? null : Number(value))
            : String(value || '').trim()
          changed = true
        }
      })
      if (user.email !== normalizedEmail) {
        const emailOwner = await AccountUser.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        })
        if (emailOwner) {
          return res.status(409).json({ message: 'This email is already used by another account.' })
        }
        user.email = normalizedEmail
        changed = true
      }
      if (changed) {
        await user.save()
      }
    }

    await user.populate('classId', 'name')
    if (createdNewUser) {
      sendVerifiedPushToUsers({
        recipients: [user],
        title: 'Welcome to Innovative Science 2 🎉',
        source: `welcome-user-${user._id}`,
        messageForUser: (recipient) => `Welcome ${recipient.name || 'Student'}! Tumhari science journey start ho gayi—chalo Brain Cells collect karte hain 😄`,
      }).catch((error) => console.warn(`Welcome push failed: ${error.message}`))
    }
    user.lastLoginAt = new Date()
    await user.save()
    return res.json({ token: createToken(user), user: publicUser(user) })
  } catch (error) {
    console.error('Could not connect Firebase account:', error)
    return res.status(500).json({ message: 'Could not connect the Firebase account.' })
  }
})

// One-time bridge for accounts created before Firebase Authentication was added.
// The password is only checked here and is never written to MongoDB by this flow.
app.post('/api/auth/firebase/migrate-legacy', async (req, res) => {
  try {
    if (!firebaseAdminAuth) {
      return res.status(503).json({ message: 'Firebase Admin is not configured on the server.' })
    }

    const normalizedEmail = normalizeEmail(req.body?.email)
    const password = String(req.body?.password || '')
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await findAccountUser({ email: normalizedEmail })
    if (!user || !(await passwordMatches(password, user))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }

    let firebaseRecord
    try {
      firebaseRecord = await firebaseAdminAuth.getUserByEmail(normalizedEmail)
      firebaseRecord = await firebaseAdminAuth.updateUser(firebaseRecord.uid, {
        password,
        displayName: user.name || normalizedEmail.split('@')[0],
        disabled: false,
      })
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error
      firebaseRecord = await firebaseAdminAuth.createUser({
        email: normalizedEmail,
        password,
        displayName: user.name || normalizedEmail.split('@')[0],
      })
    }

    user.firebaseUid = firebaseRecord.uid
    await user.save()
    return res.json({ customToken: await firebaseAdminAuth.createCustomToken(firebaseRecord.uid) })
  } catch (error) {
    return res.status(500).json({ message: 'Could not migrate this account to Firebase.' })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phoneNumber = '', password } = req.body
    const normalizedEmail = normalizeEmail(email)
    const normalizedPhoneNumber = String(phoneNumber || '').trim()

    if (!name?.trim() || !normalizedEmail || !normalizedPhoneNumber || !password) {
      return res.status(400).json({ message: 'Name, email, phone number, and password are required.' })
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const existingUser = await findAccountUser({ email: normalizedEmail })

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const user = await AccountUser.create({
      name: name.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      password: String(password),
      passwordHash: '',
    })
    user.lastLoginAt = new Date()
    await user.save()
    sendVerifiedPushToUsers({
      recipients: [user],
      title: 'Welcome to Innovative Science 2 🎉',
      source: `welcome-user-${user._id}`,
      messageForUser: (recipient) => `Welcome ${recipient.name || 'Student'}! Tumhari science journey start ho gayi—chalo Brain Cells collect karte hain 😄`,
    }).catch((error) => console.warn(`Welcome push failed: ${error.message}`))
    await user.populate('classId', 'name')
    const token = createToken(user)

    res.status(201).json({
      token,
      expiresInDays: 7,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not create account.' })
  }
})

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await findAccountUser({ email: normalizedEmail })

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    const isPasswordCorrect = await passwordMatches(password, user)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Password is wrong.' })
    }

    await user.populate('classId', 'name')
    user.lastLoginAt = new Date()
    await user.save()

    res.json({
      token: createToken(user),
      expiresInDays: 7,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not sign in.' })
  }
})

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  try {
    const { email, newPassword } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    }

    const user = await findAccountUser({ email: normalizedEmail })

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    user.password = String(newPassword)
    user.passwordHash = ''
    await user.save()

    res.json({ message: 'Password updated successfully. Please sign in with your new password.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not reset password.' })
  }
})

app.get('/api/auth/me', authRequired, async (req, res) => {
  await req.user.populate('classId', 'name')
  res.json({ user: publicUser(req.user) })
})

const permanentlyDeleteAccount = async (user) => {
    const userId = user._id
    const userIdString = String(userId)

    await Promise.all([
      PracticeScore.deleteMany({ user: userId }),
      PracticeAttempt.deleteMany({ user: userId }),
      Report.deleteMany({ user: userId }),
      Feedback.deleteMany({ user: userId }),
      BattleReward.deleteMany({ userId }),
      ClassPost.deleteMany({ createdBy: userId }),
      Pyq.deleteMany({ uploadedBy: userId }),
      Message.deleteMany({ createdBy: userId }),
      Message.updateMany(
        { $or: [{ targetUserIds: userId }, { 'acknowledgements.user': userId }] },
        { $pull: { targetUserIds: userId, acknowledgements: { user: userId } } },
      ),
      SiteNotice.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } }),
      ...(BattleRoomModel
        ? [
            BattleRoomModel.deleteMany({ createdBy: userId }),
            BattleRoomModel.updateMany({ 'players.userId': userId }, { $pull: { players: { userId } } }),
          ]
        : []),
    ])

    await User.deleteOne({ _id: userId })

    if (firebaseAdminAuth && user.firebaseUid) {
      try {
        await firebaseAdminAuth.deleteUser(user.firebaseUid)
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          console.warn(`Firebase account cleanup failed for ${user.firebaseUid}: ${error.message}`)
        }
      }
    }

    clearCachedResponses(`user:${userIdString}`)
}

app.get('/api/auth/account-deletion-request', authRequired, async (req, res) => {
  try {
    const request = await AccountDeletionRequest.findOne({ user: req.user._id }).select('status requestedAt reviewedAt').lean()
    res.json({ request: request || null })
  } catch (error) {
    res.status(500).json({ message: 'Could not load account deletion status.' })
  }
})

app.post('/api/auth/account-deletion-request', authRequired, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin accounts cannot request deletion here.' })
    }

    const existingRequest = await AccountDeletionRequest.findOne({ user: req.user._id })
    if (existingRequest?.status === 'pending') {
      return res.status(409).json({ message: 'Your account deletion request is already waiting for admin approval.', request: existingRequest })
    }

    const request = existingRequest
      ? await AccountDeletionRequest.findOneAndUpdate(
          { user: req.user._id },
          { status: 'pending', requestedAt: new Date(), reviewedAt: null, reviewedBy: null },
          { new: true },
        )
      : await AccountDeletionRequest.create({ user: req.user._id })

    res.status(201).json({ message: 'Account deletion request sent to admin for approval.', request })
  } catch (error) {
    res.status(500).json({ message: 'Could not send account deletion request.' })
  }
})

// Keep the old endpoint safe for older clients: it now creates a request rather than deleting immediately.
app.delete('/api/auth/account', authRequired, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin accounts cannot request deletion here.' })
    }
    const existingRequest = await AccountDeletionRequest.findOne({ user: req.user._id })
    if (existingRequest?.status === 'pending') {
      return res.status(409).json({ message: 'Your account deletion request is already waiting for admin approval.', request: existingRequest })
    }
    const request = existingRequest
      ? await AccountDeletionRequest.findOneAndUpdate(
          { user: req.user._id },
          { status: 'pending', requestedAt: new Date(), reviewedAt: null, reviewedBy: null },
          { new: true },
        )
      : await AccountDeletionRequest.create({ user: req.user._id })
    return res.status(201).json({ message: 'Account deletion request sent to admin for approval.', request })
  } catch (error) {
    return res.status(500).json({ message: 'Could not send account deletion request.' })
  }
})

app.get('/api/admin/account-deletion-requests', authRequired, adminRequired, async (req, res) => {
  try {
    const requests = await AccountDeletionRequest.find({ status: 'pending' })
      .populate('user', 'name email phoneNumber classId createdAt')
      .sort({ requestedAt: 1 })
      .lean()
    res.json({ requests })
  } catch (error) {
    res.status(500).json({ message: 'Could not load account deletion requests.' })
  }
})

app.patch('/api/admin/account-deletion-requests/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const nextStatus = String(req.body?.status || '').toLowerCase()
    if (!['approved', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ message: 'Choose approve or reject.' })
    }

    const request = await AccountDeletionRequest.findById(req.params.id)
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Pending deletion request not found.' })
    }

    if (nextStatus === 'approved') {
      const user = await User.findById(request.user)
      if (user) await permanentlyDeleteAccount(user)
      await AccountDeletionRequest.deleteOne({ _id: request._id })
      return res.json({ message: 'Account deletion approved and completed.' })
    }

    request.status = 'rejected'
    request.reviewedAt = new Date()
    request.reviewedBy = req.user._id
    await request.save()
    return res.json({ message: 'Account deletion request rejected.' })
  } catch (error) {
    return res.status(500).json({ message: 'Could not review account deletion request.' })
  }
})

app.patch('/api/auth/profile', authRequired, async (req, res) => {
  try {
    const {
      name,
      phoneNumber = '',
      dateOfBirth = '',
      gender = '',
      bloodGroup = '',
      state = '',
      city = '',
      area = 'Bhandup',
      schoolName = '',
      finalExamPercentage = null,
    } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required.' })
    }

    const normalizedPhoneNumber = String(phoneNumber || '').trim()
    if (normalizedPhoneNumber && !/^\d{10}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Mobile number must contain exactly 10 digits.' })
    }

    req.user.name = name.trim()
    req.user.phoneNumber = normalizedPhoneNumber
    req.user.dateOfBirth = String(dateOfBirth || '').trim()
    req.user.gender = String(gender || '').trim()
    req.user.bloodGroup = String(bloodGroup || '').trim()
    const normalizedState = String(state || 'Maharashtra').trim()
    if (normalizedState !== 'Maharashtra') {
      return res.status(400).json({ message: 'Only Maharashtra is currently supported.' })
    }
    req.user.state = 'Maharashtra'
    req.user.city = String(city || '').trim()
    req.user.area = String(area || '').trim() || 'Bhandup'
    req.user.schoolName = String(schoolName || '').trim()

    if (finalExamPercentage === '' || finalExamPercentage === null || finalExamPercentage === undefined) {
      req.user.finalExamPercentage = null
    } else if (!Number.isFinite(Number(finalExamPercentage)) || Number(finalExamPercentage) < 0 || Number(finalExamPercentage) > 100) {
      return res.status(400).json({ message: 'Std 9 percentage must be between 0 and 100.' })
    } else {
      req.user.finalExamPercentage = Number(finalExamPercentage)
    }
    await req.user.save()
    const refreshedUser = await User.findById(req.user._id).populate('classId', 'name')

    res.json({ user: publicUser(refreshedUser) })
  } catch (error) {
    res.status(500).json({ message: 'Could not update profile.' })
  }
})

app.patch('/api/auth/update-email', authRequired, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ message: 'New email and current password are required.' })
    }

    const isPasswordCorrect = await passwordMatches(currentPassword, req.user)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Current password is incorrect.' })
    }

    const normalizedEmail = newEmail.toLowerCase().trim()
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    })

    if (existingUser) {
      return res.status(409).json({ message: 'This email is already used by another account.' })
    }

    req.user.email = normalizedEmail
    await req.user.save()
    const refreshedUser = await User.findById(req.user._id).populate('classId', 'name')

    res.json({ user: publicUser(refreshedUser) })
  } catch (error) {
    res.status(500).json({ message: 'Could not update email address.' })
  }
})

app.patch('/api/auth/update-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    }

    const isPasswordCorrect = await passwordMatches(currentPassword, req.user)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Current password is incorrect.' })
    }

    req.user.password = String(newPassword)
    req.user.passwordHash = ''
    await req.user.save()
    res.json({ message: 'Password updated successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not update password.' })
  }
})

app.post('/api/auth/profile-image', authRequired, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image.' })
    }

    const webpBuffer = await createWebpImage(req.file.buffer, {
      width: 512,
      height: 512,
      fit: 'cover',
      quality: 82,
    })

    req.user.profileImage = {
      data: webpBuffer,
      contentType: 'image/webp',
      updatedAt: new Date(),
    }
    await req.user.save()
    const refreshedUser = await User.findById(req.user._id).populate('classId', 'name')

    res.json({ user: publicUser(refreshedUser) })
  } catch (error) {
    res.status(500).json({ message: 'Could not save profile image.' })
  }
})

app.delete('/api/auth/profile-image', authRequired, async (req, res) => {
  try {
    req.user.profileImage = undefined
    await req.user.save()
    const refreshedUser = await User.findById(req.user._id).populate('classId', 'name')
    res.json({ user: publicUser(refreshedUser) })
  } catch (error) {
    res.status(500).json({ message: 'Could not remove profile image.' })
  }
})

app.get('/api/auth/users/:id/avatar', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('profileImage')

    if (!user?.profileImage?.data) {
      return res.status(404).json({ message: 'Profile image not found.' })
    }

    res.set('Content-Type', user.profileImage.contentType || 'image/webp')
    res.set('Cache-Control', 'no-store')
    res.send(user.profileImage.data)
  } catch (error) {
    res.status(404).json({ message: 'Profile image not found.' })
  }
})

app.get('/api/objective-questions/:id/image', async (req, res) => {
  try {
    const question = await ObjectiveQuestion.findById(req.params.id).select('questionImage')

    if (!question?.questionImage?.data) {
      return res.status(404).json({ message: 'Question image not found.' })
    }

    res.set('Content-Type', question.questionImage.contentType || 'image/webp')
    res.set('Cache-Control', 'no-store')
    res.send(question.questionImage.data)
  } catch (error) {
    res.status(404).json({ message: 'Question image not found.' })
  }
})

app.get('/api/objective-questions/:id/answer-image', async (req, res) => {
  try {
    const question = await ObjectiveQuestion.findById(req.params.id).select('answerImage')

    if (!question?.answerImage?.data) {
      return res.status(404).json({ message: 'Answer image not found.' })
    }

    res.set('Content-Type', question.answerImage.contentType || 'image/webp')
    res.set('Cache-Control', 'no-store')
    res.send(question.answerImage.data)
  } catch (error) {
    res.status(404).json({ message: 'Answer image not found.' })
  }
})

app.get('/api/chapters', optionalAuth, async (req, res) => {
  try {
    const chapters = await Chapter.find().select('number name marks marksWithoutOption').sort({ number: 1 }).lean()
    const chapterIds = chapters.map((chapter) => chapter._id)
    const topics = await Topic.find({ chapter: { $in: chapterIds } }).select('_id chapter').lean()
    const topicIds = topics.map((topic) => topic._id)
    const objectiveTypes = await ObjectiveType.find({ topic: { $in: topicIds } }).select('_id topic').lean()
    const objectiveTypeIds = objectiveTypes.map((objectiveType) => objectiveType._id)
    const [questionCounts, scores] = await Promise.all([
      ObjectiveQuestion.aggregate([
        { $match: { objectiveType: { $in: objectiveTypeIds } } },
        { $group: { _id: '$objectiveType', count: { $sum: 1 }, questionIds: { $push: '$_id' } } },
      ]),
      req.user && objectiveTypeIds.length > 0
        ? PracticeScore.find({ user: req.user._id, objectiveType: { $in: objectiveTypeIds } })
          .select('objectiveType bestScore questionResults').lean()
        : Promise.resolve([]),
    ])
    const questionCountMap = new Map(questionCounts.map((item) => [String(item._id), Number(item.count || 0)]))
    const questionIdMap = new Map(questionCounts.map((item) => [String(item._id), (item.questionIds || []).map(String)]))
    const scoreMap = new Map()

    scores.forEach((score) => {
      scoreMap.set(String(score.objectiveType), score)
    })

    const topicChapterMap = new Map(topics.map((topic) => [String(topic._id), String(topic.chapter)]))
    const chapterProgressMap = new Map(chapters.map((chapter) => [String(chapter._id), { correctQuestions: 0, totalQuestions: 0 }]))

    objectiveTypes.forEach((objectiveType) => {
      const chapterId = topicChapterMap.get(String(objectiveType.topic))
      const progress = chapterProgressMap.get(chapterId)
      if (!progress) return

      const questionTotal = questionCountMap.get(String(objectiveType._id)) || 0
      const score = scoreMap.get(String(objectiveType._id))
      const currentQuestionIds = new Set(questionIdMap.get(String(objectiveType._id)) || [])
      const currentResults = (score?.questionResults || []).filter((result) => currentQuestionIds.has(String(result.questionId)))
      const correctQuestions = currentResults.length > 0
        ? currentResults.filter((result) => result.isCorrect).length
        : Math.min(Number(score?.bestScore || 0), questionTotal)

      progress.totalQuestions += questionTotal
      progress.correctQuestions += Math.min(correctQuestions, questionTotal)
    })

    const chaptersWithProgress = chapters.map((chapter) => {
      const progress = chapterProgressMap.get(String(chapter._id)) || { correctQuestions: 0, totalQuestions: 0 }
      const percentage = progress.totalQuestions
        ? Math.round((progress.correctQuestions / progress.totalQuestions) * 100)
        : 0

      return {
        ...chapter,
        progress: {
          ...progress,
          percentage,
          isDone: progress.totalQuestions > 0 && progress.correctQuestions >= progress.totalQuestions,
        },
      }
    })

    const payload = { chapters: chaptersWithProgress }
    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: 'Could not load chapters.' })
  }
})

app.post('/api/chapters', authRequired, adminRequired, async (req, res) => {
  try {
    const { number, name, marks, marksWithoutOption } = req.body

    if (!number || !name || marks === undefined || marksWithoutOption === undefined) {
      return res.status(400).json({ message: 'Chapter number, name, marks with option, and marks without option are required.' })
    }

    const chapter = await Chapter.create({
      number: Number(number),
      name,
      marks: Number(marks),
      marksWithoutOption: Number(marksWithoutOption),
    })

    const change = await recordContentChange({ entityType: 'chapter', entity: chapter, action: 'created', actor: req.user })
    await notifyNewContentChange(change)

    clearCachedResponses('chapters:')
    res.status(201).json({ chapter })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This chapter number already exists.' })
    }

    res.status(500).json({ message: 'Could not add chapter.' })
  }
})

app.patch('/api/chapters/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { number, name, marks, marksWithoutOption } = req.body
    const previousChapter = await Chapter.findById(req.params.id).lean()
    const chapter = await Chapter.findByIdAndUpdate(
      req.params.id,
      {
        number: Number(number),
        name,
        marks: Number(marks),
        marksWithoutOption: Number(marksWithoutOption),
      },
      { new: true, runValidators: true },
    )

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' })
    }

    await recordContentChange({ entityType: 'chapter', entity: chapter, action: 'updated', actor: req.user, context: { before: previousChapter } })

    clearCachedResponses('chapters:')
    res.json({ chapter })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This chapter number already exists.' })
    }

    res.status(500).json({ message: 'Could not update chapter.' })
  }
})

app.delete('/api/chapters/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndDelete(req.params.id)

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' })
    }

    await recordContentChange({ entityType: 'chapter', entity: chapter, action: 'deleted', actor: req.user })

    const topicIds = await Topic.find({ chapter: chapter._id }).distinct('_id')
    const objectiveTypeIds = await ObjectiveType.find({ topic: { $in: topicIds } }).distinct('_id')
    await ObjectiveQuestion.deleteMany({ objectiveType: { $in: objectiveTypeIds } })
    await PracticeScore.deleteMany({ objectiveType: { $in: objectiveTypeIds } })
    await ObjectiveType.deleteMany({ topic: { $in: topicIds } })
    await Topic.deleteMany({ chapter: chapter._id })

    clearCachedResponses('chapters:')
    res.json({ message: 'Chapter and its topics deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete chapter.' })
  }
})

app.get('/api/chapters/:chapterNumber/topics', optionalAuth, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ number: Number(req.params.chapterNumber) })
      .select('number name marks marksWithoutOption')
      .lean()

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' })
    }

    const topics = await Topic.find({ chapter: chapter._id }).sort({ number: 1 }).lean()
    const topicIds = topics.map((topic) => topic._id)
    const objectiveTypes = await ObjectiveType.find({ topic: { $in: topicIds } }).select('_id topic').lean()
    const objectiveTypeIds = objectiveTypes.map((objectiveType) => objectiveType._id)
    const questionGroups = await ObjectiveQuestion.aggregate([
      { $match: { objectiveType: { $in: objectiveTypeIds } } },
      { $group: {
        _id: '$objectiveType',
        questionIds: { $push: '$_id' },
        boardQuestionIds: { $push: { $cond: ['$isBoardQuestion', '$_id', null] } },
        boardQuestionCount: { $sum: { $cond: ['$isBoardQuestion', 1, 0] } },
      } },
    ])
    const questionIdMap = new Map(questionGroups.map((item) => [String(item._id), (item.questionIds || []).map(String)]))
    const boardQuestionIdMap = new Map(questionGroups.map((item) => [String(item._id), (item.boardQuestionIds || []).filter(Boolean).map(String)]))
    const boardCountMap = new Map(questionGroups.map((item) => [String(item._id), Number(item.boardQuestionCount || 0)]))
    const scoreMap = new Map()

    if (req.user && objectiveTypeIds.length > 0) {
      const scores = await PracticeScore.find({
        user: req.user._id,
        objectiveType: { $in: objectiveTypeIds },
      }).select('objectiveType bestScore questionResults').lean()

      scores.forEach((score) => {
        scoreMap.set(String(score.objectiveType), score)
      })
    }

    const topicProgressMap = new Map(topics.map((topic) => [String(topic._id), { correctQuestions: 0, totalQuestions: 0, boardQuestionCount: 0, boardCorrectQuestions: 0 }]))
    objectiveTypes.forEach((objectiveType) => {
      const topicProgress = topicProgressMap.get(String(objectiveType.topic))
      if (!topicProgress) return

      const questionIds = questionIdMap.get(String(objectiveType._id)) || []
      const questionIdSet = new Set(questionIds)
      const score = scoreMap.get(String(objectiveType._id))
      const currentResults = (score?.questionResults || []).filter((result) => questionIdSet.has(String(result.questionId)))
      const correctQuestions = currentResults.length > 0
        ? currentResults.filter((result) => result.isCorrect).length
        : Math.min(Number(score?.bestScore || 0), questionIds.length)

      topicProgress.totalQuestions += questionIds.length
      topicProgress.correctQuestions += Math.min(correctQuestions, questionIds.length)
      topicProgress.boardQuestionCount += boardCountMap.get(String(objectiveType._id)) || 0
      const boardQuestionIds = boardQuestionIdMap.get(String(objectiveType._id)) || []
      const boardQuestionIdSet = new Set(boardQuestionIds)
      const boardResults = currentResults.filter((result) => boardQuestionIdSet.has(String(result.questionId)))
      topicProgress.boardCorrectQuestions += boardResults.length > 0
        ? boardResults.filter((result) => result.isCorrect).length
        : 0
    })

    res.set('Cache-Control', 'no-store')
    res.json({
      chapter,
      topics: topics.map((topic) => {
        const progress = topicProgressMap.get(String(topic._id)) || { correctQuestions: 0, totalQuestions: 0, boardQuestionCount: 0, boardCorrectQuestions: 0 }
        const percentage = progress.totalQuestions
          ? Math.round((progress.correctQuestions / progress.totalQuestions) * 100)
          : 0

        return {
          ...publicTopic(topic, Boolean(req.user?.isAdmin)),
          boardQuestionCount: progress.boardQuestionCount,
          boardCorrectQuestions: progress.boardCorrectQuestions,
          practiceProgress: {
            percentage,
            correctQuestions: progress.correctQuestions,
            totalQuestions: progress.totalQuestions,
            isDone: progress.totalQuestions > 0 && progress.correctQuestions >= progress.totalQuestions,
          },
        }
      }),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load topics.' })
  }
})

app.post('/api/chapters/:chapterNumber/topics', authRequired, adminRequired, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ number: Number(req.params.chapterNumber) })
      .select('number name')
      .lean()

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' })
    }

    const { name, description, studyText } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Topic name is required.' })
    }

    if (String(studyText || '').length > 12000) {
      return res.status(400).json({ message: 'Topic paragraph must be 12000 characters or less.' })
    }

    const lastTopic = await Topic.findOne({ chapter: chapter._id }).sort({ number: -1 })
    const nextTopicNumber = (lastTopic?.number || 0) + 1

    const topic = await Topic.create({
      chapter: chapter._id,
      number: nextTopicNumber,
      name,
      description: description || '',
      studyText: studyText || '',
    })

    const change = await recordContentChange({ entityType: 'topic', entity: topic, action: 'created', actor: req.user, context: { chapterId: chapter._id, after: { chapter: chapter.number, chapterName: chapter.name } } })
    await notifyNewContentChange(change)

    res.status(201).json({ topic })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This topic number already exists in this chapter.' })
    }

    res.status(500).json({ message: 'Could not add topic.' })
  }
})

app.patch('/api/topics/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { number, name, description, studyText } = req.body
    const previousTopic = await Topic.findById(req.params.id).lean()

    if (String(studyText || '').length > 12000) {
      return res.status(400).json({ message: 'Topic paragraph must be 12000 characters or less.' })
    }

    const update = {
      name,
      description: description || '',
      studyText: studyText || '',
    }

    if (number !== undefined && number !== '') {
      update.number = Number(number)
    }

    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    )

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' })
    }

    await recordContentChange({ entityType: 'topic', entity: topic, action: 'updated', actor: req.user, context: { before: previousTopic, chapterId: topic.chapter } })

    res.json({ topic })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This topic number already exists in this chapter.' })
    }

    res.status(500).json({ message: 'Could not update topic.' })
  }
})

const reconcilePracticeScore = (score, currentQuestionIds = []) => {
  if (!score) return null

  const savedQuestionIds = Array.isArray(score.questionIds) ? score.questionIds.map(String) : []
  if (!savedQuestionIds.length) return score

  const currentIds = currentQuestionIds.map(String)
  const changed = savedQuestionIds.length !== currentIds.length
    || savedQuestionIds.some((questionId) => !currentIds.includes(questionId))

  if (!changed) return score

  const currentIdSet = new Set(currentIds)
  const scoreData = typeof score.toObject === 'function' ? score.toObject() : { ...score }
  const attemptedQuestionIds = (scoreData.attemptedQuestionIds || []).map(String).filter((questionId) => currentIdSet.has(questionId))
  const questionResults = (scoreData.questionResults || []).filter((item) => currentIdSet.has(String(item.questionId)))

  return {
    ...scoreData,
    questionIds: currentIds,
    attemptedQuestionIds,
    attemptedQuestions: attemptedQuestionIds.length,
    questionResults,
    totalQuestions: currentIds.length,
    isDone: false,
  }
}

app.get('/api/topics/:id/objective-types', optionalAuth, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id).populate('chapter')

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' })
    }

    const objectiveTypes = await ObjectiveType.find({ topic: topic._id }).sort({ createdAt: 1 }).lean()
    const objectiveTypeIds = objectiveTypes.map((objectiveType) => objectiveType._id)
    const questionCounts = await ObjectiveQuestion.aggregate([
      { $match: { objectiveType: { $in: objectiveTypeIds } } },
      { $group: { _id: '$objectiveType', count: { $sum: 1 } } },
    ])
    const boardQuestionCounts = await ObjectiveQuestion.aggregate([
      { $match: { objectiveType: { $in: objectiveTypeIds }, isBoardQuestion: true } },
      { $group: { _id: '$objectiveType', count: { $sum: 1 } } },
    ])
    const objectiveQuestions = await ObjectiveQuestion.find({ objectiveType: { $in: objectiveTypeIds } }).select('_id objectiveType isBoardQuestion').lean()
    const questionIdsMap = new Map()
    objectiveQuestions.forEach((question) => {
      const key = String(question.objectiveType)
      questionIdsMap.set(key, [...(questionIdsMap.get(key) || []), String(question._id)])
    })
    const boardQuestionIdsMap = new Map()
    objectiveQuestions.forEach((question) => {
      if (!question.isBoardQuestion) return
      const key = String(question.objectiveType)
      boardQuestionIdsMap.set(key, [...(boardQuestionIdsMap.get(key) || []), String(question._id)])
    })
    const countMap = new Map(questionCounts.map((item) => [String(item._id), item.count]))
    const boardCountMap = new Map(boardQuestionCounts.map((item) => [String(item._id), item.count]))
    const scoreMap = new Map()
    const historyMap = new Map()

    if (req.user) {
      const scores = await PracticeScore.find({
        user: req.user._id,
        objectiveType: { $in: objectiveTypeIds },
      }).lean()

      scores.forEach((score) => {
        scoreMap.set(String(score.objectiveType), score)
      })

      const attempts = await PracticeAttempt.find({
        user: req.user._id,
        objectiveTypeIds: { $in: objectiveTypeIds },
        attemptType: 'practice',
      }).select('objectiveTypeIds questionBreakdown').lean()

      attempts.forEach((attempt) => {
        ;(attempt.objectiveTypeIds || []).forEach((objectiveTypeId) => {
          const key = String(objectiveTypeId)
          const history = historyMap.get(key) || { questionIds: new Set(), results: new Map() }
          ;(attempt.questionBreakdown || []).forEach((item) => {
            if (!item.questionId) return
            history.questionIds.add(String(item.questionId))
            if (item.status !== 'skipped') {
              history.results.set(String(item.questionId), item.status === 'correct')
            }
          })
          historyMap.set(key, history)
        })
      })
    }

    const isAdmin = Boolean(req.user?.isAdmin)

    res.json({
      topic: publicTopic(topic, isAdmin),
      chapter: topic.chapter,
      objectiveTypes: objectiveTypes.map((objectiveType) => {
        const currentQuestionIds = questionIdsMap.get(String(objectiveType._id)) || []
        let bestScore = scoreMap.get(String(objectiveType._id)) || null
        const history = historyMap.get(String(objectiveType._id))

        if (bestScore && (!bestScore.questionIds || bestScore.questionIds.length === 0) && history?.questionIds.size) {
          bestScore = {
            ...bestScore,
            questionIds: [...history.questionIds],
            attemptedQuestionIds: [...history.results.keys()],
            attemptedQuestions: history.results.size,
            questionResults: [...history.results.entries()].map(([questionId, isCorrect]) => ({ questionId, isCorrect })),
          }
        }

        bestScore = reconcilePracticeScore(bestScore, currentQuestionIds)
        const boardQuestionIds = boardQuestionIdsMap.get(String(objectiveType._id)) || []
        const boardQuestionIdSet = new Set(boardQuestionIds)
        const boardResults = (bestScore?.questionResults || []).filter((result) => boardQuestionIdSet.has(String(result.questionId)))
        const boardCorrectQuestions = boardResults.length > 0
          ? boardResults.filter((result) => result.isCorrect).length
          : 0

        return {
          ...objectiveType,
          questionCount: countMap.get(String(objectiveType._id)) || 0,
          boardQuestionCount: boardCountMap.get(String(objectiveType._id)) || 0,
          boardCorrectQuestions,
          bestScore,
          isDone: Boolean(bestScore?.isDone),
        }
      }),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load objective types.' })
  }
})

app.post('/api/topics/:id/objective-types', authRequired, adminRequired, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id)

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' })
    }

    const type = normalizeObjectiveType(req.body.type)

    if (!type) {
      return res.status(400).json({ message: 'Objective type is required.' })
    }

    const objectiveType = await ObjectiveType.create({
      topic: topic._id,
      type,
    })

    await recordContentChange({ entityType: 'objective-type', entity: objectiveType, action: 'created', actor: req.user, context: { topicId: topic._id } })

    res.status(201).json({ objectiveType })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This objective type already exists for this topic.' })
    }

    res.status(500).json({ message: 'Could not add objective type.' })
  }
})

app.delete('/api/objective-types/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const objectiveType = await ObjectiveType.findByIdAndDelete(req.params.id)

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    await recordContentChange({ entityType: 'objective-type', entity: objectiveType, action: 'deleted', actor: req.user })

    await ObjectiveQuestion.deleteMany({ objectiveType: objectiveType._id })
    await PracticeScore.deleteMany({ objectiveType: objectiveType._id })

    res.json({ message: 'Objective type deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete objective type.' })
  }
})

app.get('/api/topics/:topicId/objective-types/:type/practice', optionalAuth, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.topicId).populate('chapter')

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' })
    }

    const requestedObjectiveType = normalizeObjectiveType(req.params.type)
    const objectiveTypeAliases = requestedObjectiveType === 'numericals'
      ? ['numericals', 'numerical', 'numerical-questions']
      : [requestedObjectiveType]
    let objectiveType = await ObjectiveType.findOne({
      topic: topic._id,
      type: { $in: objectiveTypeAliases },
    })

    // Keep older records usable if Numericals was previously saved with a
    // different capitalization or singular label.
    if (!objectiveType && requestedObjectiveType === 'numericals') {
      const topicObjectiveTypes = await ObjectiveType.find({ topic: topic._id }).lean()
      const matchingType = topicObjectiveTypes.find((item) => normalizeObjectiveType(item.type) === 'numericals')
      if (matchingType) {
        objectiveType = matchingType
      }
    }

    // Numericals may have been created in the other science database before
    // science-specific content was separated. When an admin opens the page,
    // repair that missing record in the currently selected database so all
    // subsequent question uploads use a local objective id.
    if (!objectiveType && requestedObjectiveType === 'numericals' && req.user?.isAdmin) {
      objectiveType = await ObjectiveType.create({
        topic: topic._id,
        type: 'numericals',
      })
    }

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    const practiceQuestionQuery = {
      objectiveType: objectiveType._id,
      ...(String(req.query.boardOnly || '').toLowerCase() === 'true' ? { isBoardQuestion: true } : {}),
    }
    const questions = await ObjectiveQuestion.find(practiceQuestionQuery).sort({ createdAt: 1 })
    const isAdmin = Boolean(req.user?.isAdmin)
    let bestScore = req.user
      ? await PracticeScore.findOne({ user: req.user._id, objectiveType: objectiveType._id })
      : null

    if (req.user && bestScore && (!bestScore.questionResults || bestScore.questionResults.length === 0)) {
      const previousAttempts = await PracticeAttempt.find({
        user: req.user._id,
        objectiveTypeIds: objectiveType._id,
        attemptType: 'practice',
      }).sort({ createdAt: 1 }).lean()
      const previousQuestionIds = new Set()
      const previousResults = new Map()

      previousAttempts.forEach((attempt) => {
        ;(attempt.questionBreakdown || []).forEach((item) => {
          if (!item.questionId) return
          previousQuestionIds.add(String(item.questionId))
          if (item.status !== 'skipped') previousResults.set(String(item.questionId), item.status === 'correct')
        })
      })

      if (previousResults.size > 0) {
        const scoreData = bestScore.toObject()
        scoreData.questionIds = [...previousQuestionIds]
        scoreData.questionResults = [...previousResults.entries()].map(([questionId, isCorrect]) => ({ questionId, isCorrect }))
        scoreData.attemptedQuestionIds = [...previousResults.keys()]
        scoreData.attemptedQuestions = previousResults.size
        bestScore = scoreData
      }
    }

    bestScore = reconcilePracticeScore(bestScore, questions.map((question) => String(question._id)))

    res.json({
      topic: publicTopic(topic, isAdmin),
      chapter: topic.chapter,
      objectiveType,
      bestScore,
      questions: questions.map((question) => ({
        _id: question._id,
        question: question.question,
        options: Array.isArray(question.options) ? question.options : [],
        pairs: Array.isArray(question.pairs) ? question.pairs : [],
        imageUrl: publicQuestionImageUrl(question),
        answerImageUrl: isAdmin || objectiveType.type !== 'numericals' ? publicAnswerImageUrl(question) : '',
        chapterId: topic.chapter?._id,
        chapterNumber: topic.chapter?.number,
        chapterName: topic.chapter?.name,
        topicName: topic.name,
        objectiveTypeId: objectiveType._id,
        isBoardQuestion: Boolean(question.isBoardQuestion),
        ...(isAdmin ? { correctOption: question.correctOption } : {}),
        ...(isAdmin ? { correctOptions: question.correctOptions } : {}),
        ...(isAdmin ? { solution: question.solution || '' } : {}),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load practice questions.' })
  }
})

app.get('/api/chapters/:chapterNumber/board-questions', optionalAuth, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ number: Number(req.params.chapterNumber) }).select('number name')

    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' })
    }

    const topics = await Topic.find({ chapter: chapter._id }).select('_id number name').sort({ number: 1 }).lean()
    const topicIds = topics.map((topic) => topic._id)
    const objectiveTypes = await ObjectiveType.find({ topic: { $in: topicIds } }).select('_id topic type').lean()
    const objectiveTypeIds = objectiveTypes.map((item) => item._id)
    const questions = await ObjectiveQuestion.find({ objectiveType: { $in: objectiveTypeIds }, isBoardQuestion: true })
      .select('_id objectiveType question solution options pairs questionImage answerImage createdAt')
      .sort({ createdAt: 1 })
      .lean()

    const topicMap = new Map(topics.map((topic) => [String(topic._id), topic]))
    const typeMap = new Map(objectiveTypes.map((item) => [String(item._id), item]))
    const result = questions.map((question) => {
      const objectiveType = typeMap.get(String(question.objectiveType))
      const topic = topicMap.get(String(objectiveType?.topic))
      return {
        _id: question._id,
        question: question.question,
        solution: question.solution || '',
        options: question.options,
        pairs: question.pairs,
        imageUrl: publicQuestionImageUrl(question),
        answerImageUrl: publicAnswerImageUrl(question),
        objectiveTypeId: objectiveType?._id,
        objectiveType: objectiveType?.type || '',
        topicId: topic?._id,
        topicName: topic?.name || '',
        topicNumber: topic?.number || null,
      }
    })

    res.json({ chapter, questions: result })
  } catch (error) {
    res.status(500).json({ message: 'Could not load board questions.' })
  }
})

app.post('/api/objective-types/:id/done', authRequired, async (req, res) => {
  try {
    const objectiveType = await ObjectiveType.findById(req.params.id)

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    if (!['complete-the-tables', 'diagram-based-question'].includes(objectiveType.type)) {
      return res.status(400).json({ message: 'This objective type does not support done status.' })
    }

    const { isDone } = req.body

    if (typeof isDone !== 'boolean') {
      return res.status(400).json({ message: 'Done status must be true or false.' })
    }

    const questionIds = (await ObjectiveQuestion.find({ objectiveType: objectiveType._id }).select('_id').lean()).map((question) => String(question._id))

    const bestScore = await PracticeScore.findOneAndUpdate(
      { user: req.user._id, objectiveType: objectiveType._id },
      {
        $set: {
          isDone,
          totalQuestions: questionIds.length,
          questionIds,
          attemptedQuestionIds: isDone ? questionIds : [],
          attemptedQuestions: isDone ? questionIds.length : 0,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      },
    )

    res.json({ bestScore })
  } catch (error) {
    res.status(500).json({ message: 'Could not update done status.' })
  }
})

app.post('/api/objective-types/:id/questions', authRequired, adminRequired, upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'answerImage', maxCount: 1 },
]), async (req, res) => {
  try {
    let objectiveType = await ObjectiveType.findById(req.params.id)

    // The objective id can be stale after switching Science 1/Science 2.
    // Resolve it from the current science's topic and type instead of trying
    // to write a Science 1 question under a Science 2 objective id.
    const requestedObjectiveType = normalizeObjectiveType(req.body.objectiveType)
    const objectiveTypeAliases = requestedObjectiveType === 'numericals'
      ? ['numericals', 'numerical', 'numerical-questions']
      : [requestedObjectiveType]

    if (!objectiveType && req.body.topicId && requestedObjectiveType) {
      objectiveType = await ObjectiveType.findOne({
        topic: req.body.topicId,
        type: { $in: objectiveTypeAliases },
      })

      if (!objectiveType) {
        const topic = await Topic.findById(req.body.topicId).select('_id')
        if (topic) {
          objectiveType = await ObjectiveType.create({
            topic: topic._id,
            type: requestedObjectiveType,
          })
        }
      }
    }

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    const { question, solution, options, correctOption, pairs, correctOptions } = req.body
    const isBoardQuestion = ['true', '1', 'on'].includes(String(req.body.isBoardQuestion || '').toLowerCase())
    const parsedOptions = typeof options === 'string' ? JSON.parse(options || '[]') : options
    const parsedPairs = typeof pairs === 'string' ? JSON.parse(pairs || '[]') : pairs
    const parsedCorrectOptions = typeof correctOptions === 'string' ? JSON.parse(correctOptions || '[]') : correctOptions
    const questionImageFile = req.files?.questionImage?.[0]
    const answerImageFile = req.files?.answerImage?.[0]
    const questionImage = await convertQuestionImage(questionImageFile, 'Question photo')
    const answerImage = await convertQuestionImage(answerImageFile, 'Solution photo')
    const normalizedSolution = String(solution || '').trim()
    const isNumericalQuestion = normalizeObjectiveType(objectiveType.type) === 'numericals'
    const numericalPayload = isNumericalQuestion
      ? normalizeNumericalQuestion({ question, solution, options: parsedOptions, correctOption })
      : null

    if (isMatchType(objectiveType.type)) {
      const matchPayload = normalizeMatchQuestionPayload({
        question,
        pairs: parsedPairs,
        options: parsedOptions,
        correctOptions: parsedCorrectOptions,
      })
      const savedQuestion = await ObjectiveQuestion.create({
        objectiveType: objectiveType._id,
        isBoardQuestion,
        ...matchPayload,
        ...(questionImage ? { questionImage } : {}),
        ...(answerImage ? { answerImage } : {}),
      })

      const questionContext = await ObjectiveType.findById(objectiveType._id).populate({ path: 'topic', populate: { path: 'chapter', select: 'number name' } })
      const change = await recordContentChange({
        entityType: 'question',
        entity: savedQuestion,
        action: 'created',
        actor: req.user,
        context: { objectiveTypeId: objectiveType._id, topicId: questionContext?.topic?._id, chapterId: questionContext?.topic?.chapter?._id, after: { chapterNumber: questionContext?.topic?.chapter?.number, chapterName: questionContext?.topic?.chapter?.name, topicName: questionContext?.topic?.name } },
      })
      await notifyNewContentChange(change)

      return res.status(201).json({ question: savedQuestion })
    }

    const isDoneOnlyQuestion = isDoneOnlyType(objectiveType.type)
    const isIdentifySymbolQuestion = objectiveType.type === 'identify-symbol'
    const cleanedOptions = isNumericalQuestion
      ? numericalPayload.options
      : isDoneOnlyQuestion
      ? ['Done', 'View answer']
      : objectiveType.type === 'true-or-false'
        ? ['True', 'False']
        : (parsedOptions || []).map((option) => String(option || '').trim()).filter(Boolean)
    const correctIndex = isNumericalQuestion ? numericalPayload.correctOption : isDoneOnlyQuestion ? 0 : Number(correctOption)

    if ((requiresFourOptions(objectiveType.type) || isIdentifySymbolQuestion) && cleanedOptions.length !== 4) {
      return res.status(400).json({ message: `${objectiveType.type === 'odd-man-out' ? 'Odd Man Out' : objectiveType.type === 'correlation' ? 'Correlation' : 'Identify Symbol'} questions must have exactly four options.` })
    }

    if (isIdentifySymbolQuestion && !questionImage) {
      return res.status(400).json({ message: 'Please upload a symbol image.' })
    }

    if (isNumericalQuestion && !normalizedSolution && !answerImage) {
      return res.status(400).json({ message: 'Please add solution text or upload a solution photo.' })
    }

    if ((!question?.trim() && !questionImage) || cleanedOptions.length < 2) {
      return res.status(400).json({ message: isDoneOnlyQuestion ? 'Question text or question photo is required.' : 'Question and at least two options are required.' })
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= cleanedOptions.length) {
      return res.status(400).json({ message: 'Please select the correct option.' })
    }

    const savedQuestion = await ObjectiveQuestion.create({
      objectiveType: objectiveType._id,
      isBoardQuestion,
      question: isNumericalQuestion ? numericalPayload.question : question,
      solution: isNumericalQuestion ? numericalPayload.solution : normalizedSolution,
      options: cleanedOptions,
      correctOption: correctIndex,
      ...(questionImage ? { questionImage } : {}),
      ...(answerImage ? { answerImage } : {}),
    })

    const questionContext = await ObjectiveType.findById(objectiveType._id).populate({ path: 'topic', populate: { path: 'chapter', select: 'number name' } })
    const change = await recordContentChange({
      entityType: 'question',
      entity: savedQuestion,
      action: 'created',
      actor: req.user,
      context: { objectiveTypeId: objectiveType._id, topicId: questionContext?.topic?._id, chapterId: questionContext?.topic?.chapter?._id, after: { chapterNumber: questionContext?.topic?.chapter?.number, chapterName: questionContext?.topic?.chapter?.name, topicName: questionContext?.topic?.name } },
    })
    await notifyNewContentChange(change)

    res.status(201).json({ question: savedQuestion })
  } catch (error) {
    const statusCode = error.statusCode || (error.message?.startsWith('Match the following') || error.message?.startsWith('Please complete') ? 400 : 500)
    res.status(statusCode).json({ message: error.message || 'Could not add question.' })
  }
})

app.post('/api/objective-types/:id/questions/ai-draft', authRequired, adminRequired, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ message: 'Missing OPENROUTER_API_KEY in backend/.env.' })
    }

    const objectiveType = await ObjectiveType.findById(req.params.id).populate({
      path: 'topic',
      populate: { path: 'chapter' },
    })

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    const { sourceText, questionCount = 5 } = req.body
    const cleanedText = String(sourceText || '').trim()
    const count = Math.min(Math.max(Number(questionCount) || 5, 1), 20)

    if (cleanedText.length < 80) {
      return res.status(400).json({ message: 'Please paste more text before generating questions.' })
    }

    const questionRules = objectiveType.type === 'true-or-false'
      ? '- Return JSON object only: {"questions":[{"question":"...","options":["True","False"],"correctOption":0}]}\n- Write each question as a clear true-or-false statement.\n- Use only the options ["True","False"].\n- correctOption must be 0 for True or 1 for False.'
      : objectiveType.type === 'odd-man-out'
        ? '- Return JSON object only: {"questions":[{"question":"...","options":["...","...","...","..."],"correctOption":0}]}\n- Create odd-man-out questions where exactly one option does not belong with the other three.\n- Every question must have exactly 4 concise options.\n- Only one option must be correct.\n- correctOption must be the zero-based index of the odd option.'
        : objectiveType.type === 'correlation'
        ? '- Return JSON object only: {"questions":[{"question":"...","options":["...","...","...","..."],"correctOption":0}]}\n- Create SSC-style analogy or word-correlation objective questions.\n- The question must ask the learner to complete or identify the same relationship between paired terms.\n- Every question must have exactly 4 concise options.\n- Only one option must be correct.\n- correctOption must be the zero-based index of the correct option.'
        : objectiveType.type === 'match-the-following'
          ? '- Return JSON object only: {"questions":[{"question":"Match the following","pairs":[{"left":"...","right":"..."},{"left":"...","right":"..."}]}]}\n- Create exactly one match-the-following question unless a different count is requested.\n- Include 3 to 5 directly related pairs.\n- Each pair must have a short left item and its exact matching right item.'
          : '- Return JSON object only: {"questions":[{"question":"...","options":["...","...","...","..."],"correctOption":0}]}\n- Every question must have 2 to 4 concise options.\n- correctOption must be the zero-based index of the correct option.'

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'Innovative Science 2',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.2,
        max_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          {
            role: 'system',
            content: 'You create exam-focused objective questions for school science. Return only valid JSON. Do not include markdown.',
          },
          {
            role: 'user',
            content: `Create ${count} ${objectiveType.type} practice questions from the study text.

Topic: ${objectiveType.topic?.name || 'Science topic'}
Chapter: ${objectiveType.topic?.chapter?.name || 'Science chapter'}

Rules:
${questionRules}
- Make questions test-focused and directly answerable from the text.
- Avoid repeated questions.

Study text:
${cleanedText}`,
          },
        ],
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.error?.message || data?.message || 'Could not generate AI question drafts.',
      })
    }

    const content = data?.choices?.[0]?.message?.content || ''
    const questions = normalizeAiQuestions(extractJsonFromText(content), objectiveType.type)

    if (!questions.length) {
      return res.status(422).json({ message: 'AI did not return usable question JSON. Please try again.' })
    }

    res.json({ questions })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not generate AI question drafts.' })
  }
})

app.patch('/api/objective-questions/:id', authRequired, adminRequired, upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'answerImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const { question, solution, options, correctOption, pairs, correctOptions } = req.body
    const isBoardQuestion = ['true', '1', 'on'].includes(String(req.body.isBoardQuestion || '').toLowerCase())
    const parsedOptions = typeof options === 'string' ? JSON.parse(options || '[]') : options
    const parsedPairs = typeof pairs === 'string' ? JSON.parse(pairs || '[]') : pairs
    const parsedCorrectOptions = typeof correctOptions === 'string' ? JSON.parse(correctOptions || '[]') : correctOptions
    const hasSolutionField = Object.prototype.hasOwnProperty.call(req.body || {}, 'solution')
    const existingQuestion = await ObjectiveQuestion.findById(req.params.id).populate({
      path: 'objectiveType',
      populate: { path: 'topic', populate: { path: 'chapter', select: 'number name' } },
    })

    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found.' })
    }

    // Allow admins to promote or remove a question from the board-question
    // set without having to resend the full question payload.
    const hasOnlyBoardStatus = Object.prototype.hasOwnProperty.call(req.body || {}, 'isBoardQuestion')
      && !Object.prototype.hasOwnProperty.call(req.body || {}, 'question')
      && !Object.prototype.hasOwnProperty.call(req.body || {}, 'options')
      && !Object.prototype.hasOwnProperty.call(req.body || {}, 'pairs')

    if (hasOnlyBoardStatus) {
      const updatedQuestion = await ObjectiveQuestion.findByIdAndUpdate(
        req.params.id,
        { $set: { isBoardQuestion } },
        { new: true, runValidators: true },
      )

      await recordContentChange({
        entityType: 'question',
        entity: updatedQuestion,
        action: 'updated',
        actor: req.user,
        context: {
          before: existingQuestion,
          objectiveTypeId: existingQuestion.objectiveType?._id,
          topicId: existingQuestion.objectiveType?.topic?._id,
          chapterId: existingQuestion.objectiveType?.topic?.chapter?._id,
          after: {
            chapterNumber: existingQuestion.objectiveType?.topic?.chapter?.number,
            chapterName: existingQuestion.objectiveType?.topic?.chapter?.name,
            topicName: existingQuestion.objectiveType?.topic?.name,
          },
        },
      })

      return res.json({ question: updatedQuestion })
    }

    const imageUpdate = {}

    const questionImageFile = req.files?.questionImage?.[0]
    const answerImageFile = req.files?.answerImage?.[0]
    const unsetFields = {}

    if (questionImageFile) {
      imageUpdate.questionImage = await convertQuestionImage(questionImageFile, 'Question photo')
    } else if (String(req.body.removeImage || '') === 'true') {
      unsetFields.questionImage = 1
    }

    if (answerImageFile) {
      imageUpdate.answerImage = await convertQuestionImage(answerImageFile, 'Solution photo')
    } else if (String(req.body.removeAnswerImage || '') === 'true') {
      unsetFields.answerImage = 1
    }

    if (Object.keys(unsetFields).length) {
      imageUpdate.$unset = unsetFields
    }

    if (isMatchType(existingQuestion.objectiveType?.type)) {
      const matchPayload = normalizeMatchQuestionPayload({
        question,
        pairs: parsedPairs,
        options: parsedOptions,
        correctOptions: parsedCorrectOptions,
      })
      const updatedQuestion = await ObjectiveQuestion.findByIdAndUpdate(
        req.params.id,
        imageUpdate.$unset ? { $set: { ...matchPayload, isBoardQuestion }, $unset: imageUpdate.$unset } : { ...matchPayload, isBoardQuestion, ...imageUpdate },
        { new: true, runValidators: true },
      )

      await recordContentChange({ entityType: 'question', entity: updatedQuestion, action: 'updated', actor: req.user, context: { before: existingQuestion, objectiveTypeId: existingQuestion.objectiveType?._id, topicId: existingQuestion.objectiveType?.topic?._id, chapterId: existingQuestion.objectiveType?.topic?.chapter?._id, after: { chapterNumber: existingQuestion.objectiveType?.topic?.chapter?.number, chapterName: existingQuestion.objectiveType?.topic?.chapter?.name, topicName: existingQuestion.objectiveType?.topic?.name } } })

      return res.json({ question: updatedQuestion })
    }

    const isDoneOnlyQuestion = isDoneOnlyType(existingQuestion.objectiveType?.type)
    const isNumericalQuestion = normalizeObjectiveType(existingQuestion.objectiveType?.type) === 'numericals'
    const numericalPayload = isNumericalQuestion
      ? normalizeNumericalQuestion({
          question,
          solution: hasSolutionField ? solution : existingQuestion.solution,
          options: parsedOptions,
          correctOption,
        })
      : null
    const cleanedOptions = isNumericalQuestion
      ? numericalPayload.options
      : isDoneOnlyQuestion
      ? ['Done', 'View answer']
      : (parsedOptions || []).map((option) => String(option || '').trim()).filter(Boolean)
    const correctIndex = isNumericalQuestion ? numericalPayload.correctOption : isDoneOnlyQuestion ? 0 : Number(correctOption)

    if (requiresFourOptions(existingQuestion.objectiveType?.type) && cleanedOptions.length !== 4) {
      return res.status(400).json({ message: `${existingQuestion.objectiveType?.type === 'odd-man-out' ? 'Odd Man Out' : 'Correlation'} questions must have exactly four options.` })
    }

    const willHaveQuestionImage = Boolean(imageUpdate.questionImage || (existingQuestion.questionImage?.data && !imageUpdate.$unset?.questionImage))
    const willHaveAnswerImage = Boolean(imageUpdate.answerImage || (existingQuestion.answerImage?.data && !imageUpdate.$unset?.answerImage))
    const normalizedSolution = hasSolutionField
      ? String(solution || '').trim()
      : String(existingQuestion.solution || '').trim()

    if ((!question?.trim() && !willHaveQuestionImage) || cleanedOptions.length < 2) {
      return res.status(400).json({ message: isDoneOnlyQuestion ? 'Question text or question photo is required.' : 'Question and at least two options are required.' })
    }

    if (existingQuestion.objectiveType?.type === 'numericals' && !normalizedSolution && !willHaveAnswerImage) {
      return res.status(400).json({ message: 'Please add solution text or upload a solution photo.' })
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= cleanedOptions.length) {
      return res.status(400).json({ message: 'Please select the correct option.' })
    }

    const updatedQuestion = await ObjectiveQuestion.findByIdAndUpdate(
      req.params.id,
      imageUpdate.$unset ? {
        $set: {
          question: isNumericalQuestion ? numericalPayload.question : question,
          solution: isNumericalQuestion ? numericalPayload.solution : normalizedSolution,
          isBoardQuestion,
          options: cleanedOptions,
          correctOption: correctIndex,
        },
        $unset: imageUpdate.$unset,
      } : {
        question: isNumericalQuestion ? numericalPayload.question : question,
        solution: isNumericalQuestion ? numericalPayload.solution : normalizedSolution,
        isBoardQuestion,
        options: cleanedOptions,
        correctOption: correctIndex,
        ...imageUpdate,
      },
      { new: true, runValidators: true },
    )

    await recordContentChange({ entityType: 'question', entity: updatedQuestion, action: 'updated', actor: req.user, context: { before: existingQuestion, objectiveTypeId: existingQuestion.objectiveType?._id, topicId: existingQuestion.objectiveType?.topic?._id, chapterId: existingQuestion.objectiveType?.topic?.chapter?._id, after: { chapterNumber: existingQuestion.objectiveType?.topic?.chapter?.number, chapterName: existingQuestion.objectiveType?.topic?.chapter?.name, topicName: existingQuestion.objectiveType?.topic?.name } } })

    res.json({ question: updatedQuestion })
  } catch (error) {
    const statusCode = error.statusCode || (error.message?.startsWith('Match the following') || error.message?.startsWith('Please complete') ? 400 : 500)
    res.status(statusCode).json({ message: error.message || 'Could not update question.' })
  }
})

app.delete('/api/objective-questions/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const question = await ObjectiveQuestion.findByIdAndDelete(req.params.id)

    if (!question) {
      return res.status(404).json({ message: 'Question not found.' })
    }

    await recordContentChange({ entityType: 'question', entity: question, action: 'deleted', actor: req.user, context: { objectiveTypeId: question.objectiveType } })

    res.json({ message: 'Question deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete question.' })
  }
})

app.post('/api/objective-types/:id/done', authRequired, async (req, res) => {
  try {
    const objectiveType = await ObjectiveType.findById(req.params.id).populate({
      path: 'topic',
      populate: { path: 'chapter' },
    })

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    if (!isDoneOnlyType(objectiveType.type)) {
      return res.status(400).json({ message: 'This objective type must be submitted for scoring.' })
    }

    const totalQuestions = await ObjectiveQuestion.countDocuments({ objectiveType: objectiveType._id })
    const shouldMarkDone = req.body?.isDone !== false
    const existingScore = await PracticeScore.findOne({
      user: req.user._id,
      objectiveType: objectiveType._id,
    })
    const shouldAwardBrainCells = shouldMarkDone && !existingScore?.doneRewarded
    const savedScore = await PracticeScore.findOneAndUpdate(
      { user: req.user._id, objectiveType: objectiveType._id },
      shouldMarkDone
        ? {
          $set: {
            bestScore: totalQuestions,
            lowScore: totalQuestions,
            attemptCount: (existingScore?.attemptCount || 0) + 1,
            totalQuestions,
            attemptedQuestions: shouldMarkDone ? totalQuestions : 0,
            doneRewarded: true,
            isDone: true,
          },
        }
        : {
          $set: {
            totalQuestions,
            attemptedQuestions: 0,
            doneRewarded: Boolean(existingScore?.doneRewarded),
            isDone: false,
          },
        },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )

    if (!shouldMarkDone) {
      return res.json({ bestScore: savedScore, isDone: false })
    }

    const totalBrainCells = shouldAwardBrainCells ? chapterBrainCellsFromPercent(100) : 0
    await PracticeAttempt.create({
      user: req.user._id,
      attemptType: 'done',
      sourceName: `${objectiveType.topic?.chapter?.name || 'Chapter'} / ${objectiveType.topic?.name || 'Topic'} / ${objectiveType.type}`,
      chapterIds: objectiveType.topic?.chapter?._id ? [objectiveType.topic.chapter._id] : [],
      objectiveTypeIds: [objectiveType._id],
      totalScore: totalQuestions,
      totalQuestions,
      wrongCount: 0,
      skippedCount: 0,
      brainCellsEarned: totalBrainCells,
      chapterBreakdown: [
        buildChapterBreakdownEntry({
          chapter: objectiveType.topic?.chapter,
          score: totalQuestions,
          totalQuestions,
          objectiveLabel: objectiveType.type,
          brainCells: totalBrainCells,
        }),
      ],
      conceptSummary: {
        summary: `You completed the full ${objectiveType.topic?.chapter?.name || 'chapter'} table practice.`,
        focusAreas: ['Keep revising the chapter table before the next attempt.'],
        solutionSteps: ['Review the completed table carefully.', 'Repeat the chapter once more to keep the pattern fresh.'],
      },
      questionBreakdown: [],
    })
    await updateLeaderboardTotals(req.user._id, {
      score: totalQuestions,
      totalQuestions,
      brainCellsEarned: totalBrainCells,
      chapterBreakdown: [
        buildChapterBreakdownEntry({
          chapter: objectiveType.topic?.chapter,
          score: totalQuestions,
          totalQuestions,
          objectiveLabel: objectiveType.type,
          brainCells: totalBrainCells,
        }),
      ],
    })

    clearCachedResponses('leaderboard:')
    clearCachedResponses('admin:students:')
    res.json({ bestScore: savedScore, isDone: true })
  } catch (error) {
    res.status(500).json({ message: 'Could not mark practice as done.' })
  }
})

app.post('/api/objective-types/:id/submit', authRequired, async (req, res) => {
  try {
    const objectiveType = await ObjectiveType.findById(req.params.id).populate({
      path: 'topic',
      populate: { path: 'chapter' },
    })

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : []
    const questions = await ObjectiveQuestion.find({ objectiveType: objectiveType._id })
    const scored = scoreQuestionsWithBreakdown(questions.map((question) => ({
      ...question.toObject(),
      chapterId: objectiveType.topic?.chapter?._id,
      chapterNumber: objectiveType.topic?.chapter?.number,
      chapterName: objectiveType.topic?.chapter?.name,
      topicName: objectiveType.topic?.name,
      objectiveTypeId: objectiveType._id,
    })), answers, objectiveType.type)
    const questionBreakdown = scored.questionBreakdown
    const score = scored.score
    const wrongCount = scored.wrongCount
    const skippedCount = scored.skippedCount
    const existingScore = await PracticeScore.findOne({
      user: req.user._id,
      objectiveType: objectiveType._id,
    })
    const attemptedQuestionIds = new Set((existingScore?.attemptedQuestionIds || []).map((item) => String(item)))
    questionBreakdown.forEach((item) => {
      if (item.status !== 'skipped' && item.questionId) {
        attemptedQuestionIds.add(String(item.questionId))
      }
    })
    const attemptedQuestions = attemptedQuestionIds.size
    const questionResults = new Map(
      (existingScore?.questionResults || []).map((item) => [String(item.questionId), Boolean(item.isCorrect)]),
    )
    questionBreakdown.forEach((item) => {
      if (item.status !== 'skipped' && item.questionId) {
        questionResults.set(String(item.questionId), item.status === 'correct')
      }
    })
    const previousBestScore = existingScore?.bestScore || 0
    const bestScore = Math.max(previousBestScore, score)
    const previousAttemptCount = existingScore?.attemptCount || 0
    const attemptCount = previousAttemptCount + 1
    const lowScore = previousAttemptCount > 0
      ? Math.min(existingScore?.lowScore ?? score, score)
      : score
    const questionReward = getPracticeQuestionBrainCells(questions.length)
    const rewardedQuestionIds = new Set((existingScore?.rewardedQuestionIds || []).map((item) => String(item)))
    const newlyRewardedQuestionIds = []
    const rewardedBrainCellsByChapterId = new Map()

    questionBreakdown.forEach((item) => {
      const questionId = String(item.questionId || '')
      const chapterId = String(item.chapterId || '')

      if (item.status !== 'correct' || !questionId || rewardedQuestionIds.has(questionId)) {
        return
      }

      rewardedQuestionIds.add(questionId)
      newlyRewardedQuestionIds.push(questionId)

      if (chapterId) {
        rewardedBrainCellsByChapterId.set(
          chapterId,
          (rewardedBrainCellsByChapterId.get(chapterId) || 0) + questionReward,
        )
      }
    })

    const chapterBreakdown = buildChapterSummariesFromBreakdown(questionBreakdown).map((entry) => ({
      ...entry,
      brainCells: rewardedBrainCellsByChapterId.get(String(entry.chapterId)) || 0,
    }))
    const brainCellsEarned = chapterBreakdown.reduce((sum, item) => sum + safeNumber(item.brainCells), 0)
    const savedScore = await PracticeScore.findOneAndUpdate(
      { user: req.user._id, objectiveType: objectiveType._id },
      {
        bestScore,
        lowScore,
        attemptCount,
        totalQuestions: questions.length,
        questionIds: questions.map((question) => String(question._id)),
        attemptedQuestions,
        attemptedQuestionIds: [...attemptedQuestionIds],
        questionResults: [...questionResults.entries()].map(([questionId, isCorrect]) => ({ questionId, isCorrect })),
        rewardedQuestionIds: [...rewardedQuestionIds],
        isDone: attemptedQuestions >= questions.length,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
    // Single-question submits need an immediate correctness response. The AI
    // progress report is useful for a completed attempt, but waiting for the
    // external provider on every answer makes practice feel unnecessarily slow.
    const suggestion = answers.length === 1
      ? createFallbackProgressReport({
          previousScore: previousBestScore,
          currentScore: score,
          totalQuestions: questions.length,
          correctCount: score,
          wrongCount,
          skippedCount,
        })
      : await generateProgressSuggestion({
          objectiveType: objectiveType.type,
          topicName: objectiveType.topic?.name,
          studyText: objectiveType.topic?.studyText,
          previousScore: previousBestScore,
          currentScore: score,
          totalQuestions: questions.length,
          correctCount: score,
          wrongCount,
          skippedCount,
          questionBreakdown,
        })
    await PracticeAttempt.create({
      user: req.user._id,
      attemptType: 'practice',
      sourceName: `${objectiveType.topic?.chapter?.name || 'Chapter'} / ${objectiveType.topic?.name || 'Topic'} / ${objectiveType.type}`,
      chapterIds: chapterBreakdown.map((item) => item.chapterId),
      objectiveTypeIds: [objectiveType._id],
      totalScore: score,
      totalQuestions: questions.length,
      wrongCount,
      skippedCount,
      brainCellsEarned,
      chapterBreakdown,
      conceptSummary: {
        summary: suggestion.summary,
        focusAreas: suggestion.focusAreas,
        solutionSteps: suggestion.solutionSteps,
      },
      questionBreakdown,
    })
    await updateLeaderboardTotals(req.user._id, {
      score,
      totalQuestions: questions.length,
      brainCellsEarned,
      questionBreakdown,
      chapterBreakdown,
    })

    clearCachedResponses('leaderboard:')
    clearCachedResponses('admin:students:')
    res.json({
      score,
      totalQuestions: questions.length,
      bestScore: savedScore,
      brainCellsEarned,
      progressReport: {
        previousScore: previousBestScore,
        currentScore: score,
        totalQuestions: questions.length,
        correctCount: score,
        wrongCount,
        skippedCount,
        improvement: score - previousBestScore,
        suggestion: suggestion.summary,
        focusAreas: suggestion.focusAreas,
        solutionSteps: suggestion.solutionSteps,
      },
      correctAnswers: questions.map((question) => ({
        questionId: question._id,
        correctOption: question.correctOption,
        correctOptions: question.correctOptions,
        ...(objectiveType.type === 'numericals' ? {
          solution: question.solution || '',
          answerImageUrl: publicAnswerImageUrl(question),
        } : {}),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not submit practice.' })
  }
})

app.delete('/api/topics/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id)

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' })
    }

    await recordContentChange({ entityType: 'topic', entity: topic, action: 'deleted', actor: req.user, context: { chapterId: topic.chapter } })

    const objectiveTypeIds = await ObjectiveType.find({ topic: topic._id }).distinct('_id')
    await ObjectiveQuestion.deleteMany({ objectiveType: { $in: objectiveTypeIds } })
    await PracticeScore.deleteMany({ objectiveType: { $in: objectiveTypeIds } })
    await ObjectiveType.deleteMany({ topic: topic._id })

    res.json({ message: 'Topic deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete topic.' })
  }
})

app.get('/api/progress/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('classId', 'name')
    const progress = await buildUserProgress(user)
    res.json({ user: publicUser(user), progress })
  } catch (error) {
    res.status(500).json({ message: 'Could not load your progress.' })
  }
})

app.get('/api/progress/performance', authRequired, async (req, res) => {
  try {
    const [chapters, topics, objectiveTypes, questionCounts, attempts] = await Promise.all([
      Chapter.find().select('_id number name').sort({ number: 1 }).lean(),
      Topic.find().select('_id chapter number name').sort({ number: 1 }).lean(),
      ObjectiveType.find().select('_id topic').lean(),
      ObjectiveQuestion.aggregate([
        { $group: { _id: '$objectiveType', count: { $sum: 1 } } },
      ]),
      PracticeAttempt.find({ user: req.user._id })
        .sort({ createdAt: 1 })
        .select('createdAt questionBreakdown')
        .lean(),
    ])

    const topicById = new Map(topics.map((topic) => [String(topic._id), topic]))
    const chapterById = new Map(chapters.map((chapter) => [String(chapter._id), chapter]))
    const questionCountByObjective = new Map(questionCounts.map((item) => [String(item._id), Number(item.count || 0)]))
    const availableByChapter = new Map(chapters.map((chapter) => [String(chapter._id), 0]))
    const availableByTopic = new Map(topics.map((topic) => [String(topic._id), 0]))

    objectiveTypes.forEach((objectiveType) => {
      const count = questionCountByObjective.get(String(objectiveType._id)) || 0
      const topic = topicById.get(String(objectiveType.topic))
      if (!topic) return
      availableByTopic.set(String(topic._id), (availableByTopic.get(String(topic._id)) || 0) + count)
      availableByChapter.set(String(topic.chapter), (availableByChapter.get(String(topic.chapter)) || 0) + count)
    })

    res.set('Cache-Control', 'no-store')
    res.json({
      chapters: chapters.map((chapter) => ({
        id: String(chapter._id),
        number: chapter.number,
        name: chapter.name,
        availableQuestions: availableByChapter.get(String(chapter._id)) || 0,
      })),
      topics: topics.map((topic) => ({
        id: String(topic._id),
        number: topic.number,
        name: topic.name,
        chapterId: String(topic.chapter),
        chapterNumber: chapterById.get(String(topic.chapter))?.number || 0,
        chapterName: chapterById.get(String(topic.chapter))?.name || '',
        availableQuestions: availableByTopic.get(String(topic._id)) || 0,
      })),
      attempts: attempts.map((attempt) => ({
        createdAt: attempt.createdAt,
        questions: (attempt.questionBreakdown || []).map((question) => ({
          questionId: question.questionId ? String(question.questionId) : '',
          chapterId: question.chapterId ? String(question.chapterId) : '',
          chapterNumber: question.chapterNumber,
          chapterName: question.chapterName || '',
          topicName: question.topicName || '',
          status: question.status,
        })),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load academic performance.' })
  }
})

app.get('/api/progress/improvement', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('classId', 'name')
    const progress = await buildUserProgress(user)
    res.json({ user: publicUser(user), progress })
  } catch (error) {
    res.status(500).json({ message: 'Could not load improvement data.' })
  }
})

app.get('/api/admin/dashboard', authRequired, adminRequired, async (req, res) => {
  try {
    const counts = await buildAdminDashboardCounts()

    res.set('Cache-Control', 'no-store')
    res.json({ counts })
  } catch (error) {
    res.status(500).json({ message: 'Could not load dashboard counts.' })
  }
})

app.get('/api/leaderboard', optionalAuth, async (req, res) => {
  try {
    const scope = String(req.query.scope || 'all').toLowerCase()
    const isClassScope = scope === 'class'
    const authenticatedClassId = req.user?.classId?._id || req.user?.classId || ''
    const requestedClassId = String(
      isClassScope ? (req.query.classId || authenticatedClassId) : '',
    ).trim()
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 20)

    if (getScienceConnection().readyState !== 1) {
      return res.status(503).json({ message: 'Leaderboard is temporarily unavailable. Please try again shortly.' })
    }

    if (isClassScope && requestedClassId && !mongoose.isValidObjectId(requestedClassId)) {
      return res.status(400).json({ message: 'The selected class is invalid.' })
    }

    const classFilter = isClassScope && requestedClassId ? { classId: requestedClassId } : {}
    const classNamePromise = isClassScope && requestedClassId
      ? Class.findById(requestedClassId).select('name').lean()
      : Promise.resolve(null)
    const [users, selectedClass] = await Promise.all([
      User.find({
        isAdmin: false,
        ...classFilter,
      })
        .select('name classId totalScore totalMarks totalCorrect totalBrainCells totalAttempts')
        .populate('classId', 'name')
        .sort(leaderboardSort)
        .limit(limit)
        .lean(),
      classNamePromise,
    ])

    const payload = {
      leaderboard: users.map((user) => formatLeaderboardUser(user)),
      scope,
      classId: requestedClassId,
      className: selectedClass?.name || '',
    }

    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    console.error('Could not load leaderboard:', error)
    res.status(500).json({ message: 'Could not load leaderboard.' })
  }
})

app.get('/api/leaderboard/me', authRequired, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      return res.json({
        rank: null,
        totalStudents: await User.countDocuments({ isAdmin: false }),
        currentUser: null,
      })
    }

    const students = await User.find({ isAdmin: false })
      .select('name classId totalScore totalMarks totalCorrect totalBrainCells totalAttempts isAdmin')
      .populate('classId', 'name')
      .sort(leaderboardSort)
      .lean()

    if (!students.length) {
      return res.status(404).json({ message: 'Could not load your rank.' })
    }

    const currentUser = students.find((student) => String(student._id) === String(req.user._id))
    if (!currentUser) {
      return res.status(404).json({ message: 'Could not load your rank.' })
    }

    res.json({
      rank: students.findIndex((student) => String(student._id) === String(req.user._id)) + 1,
      totalStudents: students.length,
      currentUser: formatLeaderboardUser(currentUser),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load your rank.' })
  }
})

app.get('/api/classes', async (req, res) => {
  try {
    const classes = await Class.find().select('name description grade').sort({ name: 1 }).lean()
    const classIds = classes.map((item) => item._id)
    const studentCounts = await User.aggregate([
      { $match: { isAdmin: false, classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(studentCounts.map((item) => [String(item._id), item.count]))

    const payload = {
      classes: classes.map((item) => ({
        ...item,
        studentCount: countMap.get(String(item._id)) || 0,
      })),
    }

    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: 'Could not load classes.' })
  }
})

app.get('/api/admin/students', authRequired, adminRequired, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim()
    const classId = String(req.query.classId || '').trim()
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const page = Math.max(Number(req.query.page) || 1, 1)
    const query = await buildAdminStudentQuery({ search, classId })
    const totalStudents = await User.countDocuments(query)
    const totalPages = totalStudents ? Math.max(Math.ceil(totalStudents / limit), 1) : 0
    const safePage = totalPages ? Math.min(page, totalPages) : 1
    const users = await User.find(query)
      .select('name email phoneNumber classId totalBrainCells totalMarks totalCorrect totalAttempts')
      .populate('classId', 'name')
      .sort({ totalBrainCells: -1, name: 1, _id: 1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean()
    res.set('Cache-Control', 'no-store')
    res.json({
      students: users.map(buildAdminStudentRow),
      totalStudents,
      totalPages,
      page: safePage,
      limit,
      search,
      classId,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load student list.' })
  }
})

app.get('/api/admin/analysis', authRequired, adminRequired, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim()
    const classId = String(req.query.classId || '').trim()
    const query = await buildAdminStudentQuery({ search, classId })
    const users = await User.find(query)
      .select('name email classId totalBrainCells totalMarks totalCorrect totalAttempts lastLoginAt createdAt')
      .populate('classId', 'name grade')
      .sort({ name: 1, _id: 1 })
      .limit(5000)
      .lean()

    const userIds = users.map((user) => user._id)
    const [streaks, dailyStats] = await Promise.all([
      StudentStreak.find({ user: { $in: userIds }, subject: getActiveScience() })
        .select('user currentStreak longestStreak lastCreditedDate')
        .lean(),
      DailyChallenge.aggregate([
        { $match: { user: { $in: userIds }, subject: getActiveScience() } },
        {
          $group: {
            _id: '$user',
            completedDays: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            dailyAttempts: { $sum: '$attemptedCount' },
            dailyCorrect: { $sum: '$correctCount' },
            lastDailyDate: { $max: '$localDate' },
          },
        },
      ]),
    ])

    const streakMap = new Map(streaks.map((streak) => [String(streak.user), streak]))
    const dailyMap = new Map(dailyStats.map((item) => [String(item._id), item]))
    const onlineCutoff = Date.now() - (15 * 60 * 1000)
    const students = users.map((user) => {
      const row = buildAdminStudentRow(user)
      const streak = streakMap.get(String(user._id)) || {}
      const daily = dailyMap.get(String(user._id)) || {}
      const lastLoginAt = user.lastLoginAt || null

      return {
        ...row,
        email: String(user.email || '').trim(),
        lastLoginAt,
        createdAt: user.createdAt || null,
        online: Boolean(lastLoginAt && new Date(lastLoginAt).getTime() >= onlineCutoff),
        currentStreak: Number(streak.currentStreak || 0),
        longestStreak: Number(streak.longestStreak || 0),
        lastCreditedDate: streak.lastCreditedDate || null,
        completedDailyChallenges: Number(daily.completedDays || 0),
        dailyAttempts: Number(daily.dailyAttempts || 0),
        dailyCorrect: Number(daily.dailyCorrect || 0),
        lastDailyDate: daily.lastDailyDate || null,
      }
    })

    const totalBrainCells = students.reduce((sum, student) => sum + Number(student.totalBrainCells || 0), 0)
    const totalAttempts = students.reduce((sum, student) => sum + Number(student.attemptCount || 0), 0)
    const averagePercent = students.length
      ? Math.round(students.reduce((sum, student) => sum + Number(student.averagePercent || 0), 0) / students.length)
      : 0

    res.set('Cache-Control', 'no-store')
    res.json({
      students,
      summary: {
        totalStudents: students.length,
        onlineStudents: students.filter((student) => student.online).length,
        totalBrainCells,
        totalAttempts,
        averagePercent,
      },
      search,
      classId,
      onlineWindowMinutes: 15,
    })
  } catch (error) {
    console.error('Could not load admin analysis:', error)
    res.status(500).json({ message: 'Could not load admin analysis.' })
  }
})

app.get('/api/questions', optionalAuth, async (req, res) => {
  try {
    const isAdmin = Boolean(req.user?.isAdmin)
    const search = String(req.query.search || '').trim()
    const chapterId = String(req.query.chapterId || '').trim()
    const objectiveTypeFilter = String(req.query.objectiveType || '').trim()
    const boardQuestionFilter = String(req.query.boardQuestion || '').trim().toLowerCase()
    const rawLimit = String(req.query.limit || '').trim().toLowerCase()
    const loadAll = rawLimit === 'all' || req.query.all === '1'
    const limit = loadAll ? null : Math.min(Math.max(Number(req.query.limit) || 30, 1), 100)
    const page = Math.max(Number(req.query.page) || 1, 1)
    const objectiveTypes = await ObjectiveType.find(objectiveTypeFilter ? { type: objectiveTypeFilter } : {})
      .populate({ path: 'topic', select: 'name number chapter', populate: { path: 'chapter', select: 'name number' } })
      .sort({ 'topic.chapter.number': 1, 'topic.number': 1, type: 1 })
      .lean()

    const matchingTypes = objectiveTypes.filter((item) => !chapterId || String(item.topic?.chapter?._id || '') === chapterId)
    const objectiveTypeIds = matchingTypes.map((item) => item._id)
    const questionQuery = {
      objectiveType: { $in: objectiveTypeIds },
      ...(search ? { question: { $regex: escapeRegex(search), $options: 'i' } } : {}),
      ...(boardQuestionFilter === 'yes' ? { isBoardQuestion: true } : {}),
      ...(boardQuestionFilter === 'no' ? { isBoardQuestion: { $ne: true } } : {}),
    }
    const totalQuestions = await ObjectiveQuestion.countDocuments(questionQuery)
    const totalPages = loadAll
      ? (totalQuestions ? 1 : 0)
      : (totalQuestions ? Math.ceil(totalQuestions / limit) : 0)
    const safePage = totalPages ? Math.min(page, totalPages) : 1
    let questionQueryBuilder = ObjectiveQuestion.find(questionQuery)
      .select('_id objectiveType question solution options pairs correctOption correctOptions isBoardQuestion questionImage answerImage createdAt')
      .populate({ path: 'objectiveType', select: 'type topic', populate: { path: 'topic', select: 'name number chapter', populate: { path: 'chapter', select: 'name number' } } })
      .sort({ createdAt: 1, _id: 1 })

    if (!loadAll) {
      questionQueryBuilder = questionQueryBuilder
        .skip((safePage - 1) * limit)
        .limit(limit)
    }

    const questions = await questionQueryBuilder.lean()

    const formatQuestion = (question) => ({
      _id: question._id,
      question: question.question || '',
      ...(isAdmin ? { solution: question.solution || '' } : {}),
      options: Array.isArray(question.options) ? question.options : [],
      pairs: Array.isArray(question.pairs) ? question.pairs : [],
      ...(isAdmin ? { correctOption: question.correctOption } : {}),
      ...(isAdmin ? { correctOptions: Array.isArray(question.correctOptions) ? question.correctOptions : [] } : {}),
      isBoardQuestion: Boolean(question.isBoardQuestion),
      imageUrl: publicQuestionImageUrl(question),
      answerImageUrl: isAdmin ? publicAnswerImageUrl(question) : '',
      objectiveType: question.objectiveType?.type || '',
      objectiveTypeId: question.objectiveType?._id || null,
      topicName: question.objectiveType?.topic?.name || '',
      topicNumber: question.objectiveType?.topic?.number || null,
      chapterId: question.objectiveType?.topic?.chapter?._id || null,
      chapterName: question.objectiveType?.topic?.chapter?.name || '',
      chapterNumber: question.objectiveType?.topic?.chapter?.number || null,
    })

    const chapters = [...new Map(objectiveTypes
      .filter((item) => item.topic?.chapter)
      .map((item) => [String(item.topic.chapter._id), {
        _id: item.topic.chapter._id,
        name: item.topic.chapter.name || '',
        number: item.topic.chapter.number || null,
      }])).values()]
    const objectiveTypesList = [...new Set(objectiveTypes.map((item) => item.type))]
    res.set('Cache-Control', 'no-store')
    res.json({
      questions: questions.map(formatQuestion),
      chapters,
      objectiveTypes: objectiveTypesList,
      totalQuestions,
      totalPages,
      page: safePage,
      limit: loadAll ? 'all' : limit,
      search,
      chapterId,
      objectiveType: objectiveTypeFilter,
      boardQuestion: boardQuestionFilter,
    })
  } catch (error) {
    console.error('Could not load admin question list:', error)
    res.status(500).json({ message: 'Could not load question list.' })
  }
})

app.get('/api/admin/students/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email phoneNumber classId isAdmin password passwordHash profileImage totalBrainCells totalMarks totalCorrect totalAttempts')
      .populate('classId', 'name')

    if (!user || user.isAdmin) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    const progress = await buildUserProgress(user)
    res.json({
      user: publicUser(user, { includePassword: true }),
      progress,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load student details.' })
  }
})

app.get('/api/admin/classes', authRequired, adminRequired, async (req, res) => {
  try {
    const classes = await Class.find()
      .select('name description grade createdAt')
      .sort({ createdAt: -1 })
      .lean()
    const classIds = classes.map((item) => item._id)
    const studentCounts = await User.aggregate([
      { $match: { isAdmin: false, classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(studentCounts.map((item) => [String(item._id), item.count]))

    const payload = {
      classes: classes.map((item) => ({
        ...item,
        studentCount: countMap.get(String(item._id)) || 0,
      })),
    }

    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: 'Could not load classes.' })
  }
})

app.post('/api/admin/classes', authRequired, adminRequired, async (req, res) => {
  try {
    const { name, description = '', grade = '' } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Class name is required.' })
    }

    const classDoc = await Class.create({
      name: name.trim(),
      description,
      grade,
    })

    res.status(201).json({ class: classDoc })
    clearCachedResponses('classes:')
    clearCachedResponses('admin:classes')
    clearCachedResponses('admin:students:')
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This class already exists.' })
    }

    res.status(500).json({ message: 'Could not create class.' })
  }
})

app.patch('/api/admin/classes/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { name, description = '', grade = '' } = req.body
    const classDoc = await Class.findByIdAndUpdate(
      req.params.id,
      {
        name: name?.trim(),
        description,
        grade,
      },
      { new: true, runValidators: true },
    )

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    res.json({ class: classDoc })
    clearCachedResponses('classes:')
    clearCachedResponses('admin:classes')
    clearCachedResponses('admin:students:')
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This class already exists.' })
    }

    res.status(500).json({ message: 'Could not update class.' })
  }
})

app.delete('/api/admin/classes/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id)

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const affectedStudents = await User.find({ classId: classDoc._id, isAdmin: false })
      .select('_id')
      .lean()

    await Class.findByIdAndDelete(req.params.id)
    await User.updateMany({ classId: classDoc._id }, { $set: { classId: null } })

    await Promise.all(
      affectedStudents.map((student) => emitSocketEvent('student-class-updated', {
        studentId: String(student._id),
        classId: '',
        className: '',
      })),
    )
    emitClassFeedUpdate(classDoc._id, 'deleted')

    clearCachedResponses('classes:')
    clearCachedResponses('admin:classes')
    clearCachedResponses('admin:students:')
    res.json({ message: 'Class deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete class.' })
  }
})

app.post('/api/admin/classes/:id/students', authRequired, adminRequired, async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id)
    const studentIds = dedupeByKey(
      [
        ...(Array.isArray(req.body.studentIds) ? req.body.studentIds : []),
        req.body.studentId,
      ].filter(Boolean),
      (item) => String(item),
    )

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    if (!studentIds.length) {
      return res.status(400).json({ message: 'Please choose at least one student.' })
    }

    await User.updateMany(
      { _id: { $in: studentIds }, isAdmin: false },
      { $set: { classId: classDoc._id } },
    )

    const updatedStudents = await User.find({ _id: { $in: studentIds } }).populate('classId', 'name')

    await Promise.all(
      updatedStudents.map((student) => emitSocketEvent('student-class-updated', {
        studentId: String(student._id),
        classId: String(student.classId?._id || student.classId || ''),
        className: String(student.classId?.name || ''),
        student: publicUser(student),
      })),
    )

    clearCachedResponses('admin:classes')
    clearCachedResponses('admin:students:')
    res.json({
      class: classDoc,
      students: updatedStudents.map((student) => publicUser(student)),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not assign students to class.' })
  }
})

app.patch('/api/admin/students/:id/class', authRequired, adminRequired, async (req, res) => {
  try {
    const { classId } = req.body
    const user = await User.findById(req.params.id).select('classId isAdmin name email phoneNumber totalBrainCells totalMarks totalCorrect totalAttempts')

    if (!user || user.isAdmin) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    if (!classId) {
      user.classId = null
      await user.save()
    } else {
      const classDoc = await Class.findById(classId)

      if (!classDoc) {
        return res.status(404).json({ message: 'Class not found.' })
      }

      user.classId = classDoc._id
      await user.save()
    }

    const refreshedUser = await User.findById(user._id)
      .select('name email phoneNumber classId isAdmin password passwordHash profileImage totalBrainCells totalMarks totalCorrect totalAttempts')
      .populate('classId', 'name')
    clearCachedResponses('admin:classes')
    clearCachedResponses('admin:students:')
    await emitStudentSnapshot('student-class-updated', refreshedUser._id)
    res.json({ user: publicUser(refreshedUser) })
  } catch (error) {
    res.status(500).json({ message: 'Could not update student class.' })
  }
})

app.get('/api/admin/reports', authRequired, adminRequired, async (req, res) => {
  try {
    const reports = await Report.find()
      .select('user objectiveType chapterId questionId reason details status createdAt')
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500))
      .populate([
        { path: 'user', select: 'name email phoneNumber classId' },
        {
          path: 'objectiveType',
          select: 'type topic',
          populate: {
            path: 'topic',
            select: 'name chapter',
            populate: { path: 'chapter', select: 'number name' },
          },
        },
        { path: 'chapterId', select: 'number name' },
        {
          path: 'questionId',
          select: 'question options objectiveType',
          populate: {
            path: 'objectiveType',
            select: 'type topic',
            populate: {
              path: 'topic',
              select: 'name chapter',
              populate: { path: 'chapter', select: 'number name' },
            },
          },
        },
      ])
      .lean()

    res.json({ reports })
  } catch (error) {
    res.status(500).json({ message: 'Could not load reports.' })
  }
})

app.patch('/api/admin/reports/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { status } = req.body
    const update = {}

    if (status && ['open', 'resolved'].includes(status)) {
      update.status = status
    } else {
      return res.status(400).json({ message: 'Please choose a valid report status.' })
    }

    const report = await Report.findByIdAndUpdate(req.params.id, update, { new: true })

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' })
    }

    res.json({ report })
  } catch (error) {
    res.status(500).json({ message: 'Could not update report.' })
  }
})

app.delete('/api/admin/reports/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id)

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' })
    }

    res.json({ message: 'Report deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete report.' })
  }
})

app.get('/api/admin/contacts', authRequired, adminRequired, async (req, res) => {
  try {
    const contacts = await ContactMessage.find()
      .select('name email subject message createdAt')
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500))
      .lean()

    res.json({ contacts })
  } catch (error) {
    res.status(500).json({ message: 'Could not load contact messages.' })
  }
})

app.post('/api/feedback', optionalAuth, async (req, res) => {
  try {
    const {
      rating,
      message = '',
      name = '',
      email = '',
      phoneNumber = '',
      sourceType = 'general',
      sourceKey = '',
      sourceLabel = '',
      clientKey = '',
    } = req.body
    const parsedRating = Number(rating)

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Please choose a rating between 1 and 5.' })
    }

    const normalizedSourceType = ['general', 'objective', 'test', 'topic'].includes(String(sourceType || 'general'))
      ? String(sourceType || 'general')
      : 'general'
    const normalizedSourceKey = String(sourceKey || '').trim()
    const normalizedClientKey = String(clientKey || '').trim()

    if (normalizedSourceType === 'topic' && !req.user) {
      return res.status(401).json({ message: 'Please sign in to rate this chapter.' })
    }

    const user = req.user || null
    const userClassId = user?.classId?._id || user?.classId || null
    const classDoc = userClassId ? await Class.findById(userClassId).lean() : null

    const lookup = user?._id
      ? { user: user._id, sourceType: normalizedSourceType, sourceKey: normalizedSourceKey }
      : normalizedClientKey
        ? { clientKey: normalizedClientKey, sourceType: normalizedSourceType, sourceKey: normalizedSourceKey }
        : null

    const updateData = {
      user: user?._id || null,
      clientKey: normalizedClientKey,
      name: String(name || user?.name || 'Guest').trim() || 'Guest',
      email: String(email || user?.email || '').trim(),
      phoneNumber: String(phoneNumber || user?.phoneNumber || '').trim(),
      classId: classDoc?._id || userClassId || null,
      className: classDoc?.name || user?.className || '',
      rating: parsedRating,
      message: String(message || '').trim(),
      sourceType: normalizedSourceType,
      sourceKey: normalizedSourceKey,
      sourceLabel: String(sourceLabel || '').trim(),
    }

    let feedback = null

    if (lookup) {
      feedback = await Feedback.findOne(lookup)
    }

    if (feedback) {
      feedback.set(updateData)
      await feedback.save()
    } else {
      feedback = await Feedback.create(updateData)
    }

    res.status(201).json({
      feedback: publicFeedback(feedback),
      message: 'Thank you for your feedback.',
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not send feedback.' })
  }
})

app.get('/api/feedback/context', optionalAuth, async (req, res) => {
  try {
    const sourceType = String(req.query.sourceType || 'general').toLowerCase()
    const sourceKey = String(req.query.sourceKey || '').trim()
    const clientKey = String(req.query.clientKey || '').trim()
    const normalizedSourceType = ['general', 'objective', 'test', 'topic'].includes(sourceType)
      ? sourceType
      : 'general'

    const query = {
      sourceType: normalizedSourceType,
    }

    if (sourceKey) {
      query.sourceKey = sourceKey
    }

    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .lean()

    const dedupedFeedback = []
    const seenFeedbackKeys = new Set()

    feedback.forEach((item) => {
      const userKey = item.user ? `user:${String(item.user)}` : ''
      const browserKey = item.clientKey ? `client:${String(item.clientKey)}` : ''
      const dedupeKey = userKey || browserKey || `entry:${String(item._id)}`

      if (seenFeedbackKeys.has(dedupeKey)) {
        return
      }

      seenFeedbackKeys.add(dedupeKey)
      dedupedFeedback.push(item)
    })

    const ratingCount = dedupedFeedback.length
    const averageRating = ratingCount
      ? Math.round((dedupedFeedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) / ratingCount) * 10) / 10
      : 0
    const currentUserId = req.user?._id ? String(req.user._id) : ''
    const currentUserFeedback = currentUserId
      ? dedupedFeedback.find((item) => String(item.user || '') === currentUserId)
      : clientKey
        ? dedupedFeedback.find((item) => String(item.clientKey || '') === clientKey)
        : null
    const userRating = currentUserFeedback?.rating || 0

    res.json({
      feedback: dedupedFeedback.map(publicFeedback),
      averageRating,
      ratingCount,
      userRating,
      userFeedback: currentUserFeedback
        ? { rating: Number(currentUserFeedback.rating || 0), message: currentUserFeedback.message || '' }
        : null,
      sourceType: normalizedSourceType,
      sourceKey,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load feedback.' })
  }
})

app.get('/api/feedback/me', authRequired, async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean()

    res.json({
      feedback: feedback.map(publicFeedback),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load your feedback.' })
  }
})

app.get('/api/feedback/featured', async (req, res) => {
  try {
    const feedback = await Feedback.find({ featured: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(Math.min(Math.max(Number(req.query.limit) || 6, 1), 20))
      .lean()

    res.json({
      feedback: feedback.map(publicFeedback),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load featured feedback.' })
  }
})

app.get('/api/admin/feedback', authRequired, adminRequired, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .select('user classId clientKey name className rating message featured status sourceType sourceKey sourceLabel createdAt')
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500))
      .populate([
        { path: 'user', select: 'name email classId' },
        { path: 'classId', select: 'name grade' },
      ])
      .lean()

    res.json({
      feedback: feedback.map(publicFeedback),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load feedback.' })
  }
})

app.patch('/api/admin/feedback/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { featured, status } = req.body
    const update = {}

    if (typeof featured === 'boolean') {
      update.featured = featured
    }

    if (status && ['new', 'reviewed'].includes(status)) {
      update.status = status
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'Nothing to update.' })
    }

    const feedback = await Feedback.findByIdAndUpdate(req.params.id, update, { new: true })

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' })
    }

    res.json({ feedback: publicFeedback(feedback) })
  } catch (error) {
    res.status(500).json({ message: 'Could not update feedback.' })
  }
})

app.delete('/api/admin/feedback/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id)

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' })
    }

    res.json({ message: 'Feedback deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete feedback.' })
  }
})

app.delete('/api/feedback/:id', authRequired, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found.' })
    }

    if (!req.user.isAdmin && String(feedback.user || '') !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own feedback.' })
    }

    await Feedback.findByIdAndDelete(req.params.id)

    res.json({ message: 'Feedback deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete feedback.' })
  }
})

const doesMessageTargetUser = (message, user) => {
  if (!message || !user) {
    return false
  }

  const userId = String(user._id || user.id || '')
  const classId = String(user.classId?._id || user.classId || '')
  const targetUserIds = Array.isArray(message.targetUserIds)
    ? message.targetUserIds.map((item) => String(item?._id || item || '')).filter(Boolean)
    : []
  const targetClassId = String(message.targetClassId?._id || message.targetClassId || '')

  if (String(message.targetType || 'all') === 'all') {
    return true
  }

  if (String(message.targetType || '') === 'user') {
    return targetUserIds.includes(userId)
  }

  if (String(message.targetType || '') === 'class') {
    return Boolean(classId && targetClassId && classId === targetClassId)
  }

  return false
}

app.get('/api/messages/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('classId', 'name')
    if (user?.isAdmin) {
      return res.json({
        messages: [],
        user: publicUser(user),
      })
    }
    const classId = user.classId?._id || user.classId
    const messages = await Message.find({
      $or: [
        { targetType: 'all' },
        { targetType: 'user', targetUserIds: user._id },
        ...(classId ? [{ targetType: 'class', targetClassId: classId }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .populate('createdBy targetClassId')
      .lean()

    res.json({
      messages: messages
        .map((message) => ({
          ...publicMessage(message),
          acknowledgedByMe: Array.isArray(message.acknowledgements)
            ? message.acknowledgements.some((entry) => String(entry?.user?._id || entry?.user || '') === String(user._id))
            : false,
        }))
        .filter((message) => message.acknowledgedByMe || doesMessageTargetUser(message, user)),
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load messages.' })
  }
})

app.get('/api/notifications/me', authRequired, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100).lean()
    res.json({ notifications })
  } catch (error) {
    res.status(500).json({ message: 'Could not load notifications.' })
  }
})

app.get('/api/push/public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(503).json({ message: 'Web Push is not configured.' })
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

app.post('/api/push/subscribe', authRequired, async (req, res) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return res.status(503).json({ message: 'Web Push is not configured.' })
    const subscription = req.body?.subscription
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'A valid browser push subscription is required.' })
    }
    const saved = await PushSubscription.findOneAndUpdate(
      { endpoint: String(subscription.endpoint) },
      {
        user: req.user._id,
        endpoint: String(subscription.endpoint),
        expirationTime: subscription.expirationTime || null,
        keys: { p256dh: String(subscription.keys.p256dh), auth: String(subscription.keys.auth) },
        userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
    const welcome = await Notification.findOne({
      recipient: req.user._id,
      type: 'WEB_PUSH',
      source: { $regex: /^welcome-user-/ },
      pushSentAt: null,
    }).sort({ createdAt: -1 }).lean()
    if (welcome) {
      const welcomePush = await sendWebPushToUsers([req.user._id], {
        title: welcome.title,
        body: welcome.message,
        url: welcome.link || '/#/',
        tag: welcome.source,
      })
      if (welcomePush.sent) await Notification.updateOne({ _id: welcome._id }, { $set: { pushSentAt: new Date() } })
    }
    res.status(201).json({ subscriptionId: saved._id })
  } catch (error) {
    res.status(500).json({ message: 'Could not save push subscription.' })
  }
})

app.post('/api/push/device-message', authRequired, async (req, res) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(503).json({ message: 'Web Push is not configured on the server.' })
    }

    const endpoint = String(req.body?.endpoint || '').trim()
    const title = String(req.body?.title || '').trim().slice(0, 180)
    const body = String(req.body?.body || '').trim().slice(0, 2000)
    const url = String(req.body?.url || '/#/').trim().slice(0, 500)
    if (!endpoint || !title || !body) {
      return res.status(400).json({ message: 'A device endpoint, title, and message are required.' })
    }

    const subscription = await PushSubscription.findOne({ user: req.user._id, endpoint }).lean()
    if (!subscription) return res.status(404).json({ message: 'This device is not subscribed to Web Push.' })

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, expirationTime: subscription.expirationTime, keys: subscription.keys },
        JSON.stringify({ title, body, url, tag: `device-message-${Date.now()}` }),
      )
    } catch (error) {
      if ([400, 401, 403, 404, 410].includes(Number(error.statusCode))) {
        await PushSubscription.deleteOne({ _id: subscription._id })
      }
      throw error
    }

    res.json({ sent: true })
  } catch (error) {
    if ([400, 401, 403, 404, 410].includes(Number(error.statusCode))) {
      return res.status(410).json({ message: 'This device push subscription is no longer active.' })
    }
    res.status(500).json({ message: 'Could not send the device notification.' })
  }
})

app.get('/api/push/status', authRequired, async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({ user: req.user._id }).select('_id endpoint updatedAt').lean()
    res.json({ registered: subscriptions.length > 0, deviceCount: subscriptions.length })
  } catch (error) {
    res.status(500).json({ message: 'Could not check push notification status.' })
  }
})

app.delete('/api/push/subscribe', authRequired, async (req, res) => {
  try {
    const endpoint = String(req.body?.endpoint || '').trim()
    if (endpoint) await PushSubscription.deleteOne({ user: req.user._id, endpoint })
    res.json({ message: 'Push subscription removed.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not remove push subscription.' })
  }
})

app.patch('/api/notifications/:id/read', authRequired, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true },
    )
    if (!notification) return res.status(404).json({ message: 'Notification not found.' })
    res.json({ notification })
  } catch (error) {
    res.status(500).json({ message: 'Could not mark notification as read.' })
  }
})

app.get('/api/admin/notifications/content-history', authRequired, adminRequired, async (req, res) => {
  try {
    const changes = await ContentChange.find().sort({ createdAt: -1 }).limit(200).populate('actor', 'name email').lean()
    res.json({ changes })
  } catch (error) {
    res.status(500).json({ message: 'Could not load content history.' })
  }
})

app.post('/api/admin/notifications/ai-preview', authRequired, adminRequired, async (req, res) => {
  try {
    const facts = await buildNotificationFacts(req.body?.days)
    if (!facts.changes.length) return res.status(404).json({ message: 'There are no recent content changes to announce.' })
    const message = await createFactBasedMessage('Student', facts)
    res.json({ title: 'Science update', message, facts: { changes: facts.changes, currentContent: facts.currentContent } })
  } catch (error) {
    res.status(500).json({ message: 'Could not analyze content changes.' })
  }
})

app.post('/api/admin/notifications/ai-send', authRequired, adminRequired, async (req, res) => {
  try {
    const facts = await buildNotificationFacts(req.body?.days)
    if (!facts.changes.length) return res.status(404).json({ message: 'There are no recent content changes to announce.' })
    const targetType = String(req.body?.targetType || 'all')
    let recipients = []
    if (targetType === 'all') {
      recipients = await User.find({ isAdmin: false }).select('name email classId').lean()
    } else if (targetType === 'class' && req.body?.targetClassId) {
      recipients = await User.find({ isAdmin: false, classId: req.body.targetClassId }).select('name email classId').lean()
    } else if (targetType === 'user' && Array.isArray(req.body?.targetUserIds)) {
      recipients = await User.find({ isAdmin: false, _id: { $in: req.body.targetUserIds } }).select('name email classId').lean()
    } else {
      return res.status(400).json({ message: 'Choose a valid notification audience.' })
    }
    if (!recipients.length) return res.status(404).json({ message: 'No students matched the selected audience.' })

    const template = await createFactBasedMessage('Student', facts)
    const title = String(req.body?.title || 'Science update').trim().slice(0, 180)
    const notificationRows = recipients.map((recipient) => ({
      recipient: recipient._id,
      type: 'CONTENT_UPDATE',
      title,
      message: template.replace(/\bStudent\b/g, recipient.name || 'there'),
      source: 'ai-content-audit',
      facts: facts.changes.slice(0, 20),
    }))
    await Notification.insertMany(notificationRows)
    const pushResult = await sendWebPushToUsers(recipients.map((recipient) => recipient._id), {
      title,
      body: template.replace(/\bStudent\b/g, 'there'),
      url: '/#/notifications',
      tag: 'content-update',
    })
    const popup = await Message.create({
      createdBy: req.user._id,
      targetType: targetType === 'class' ? 'class' : targetType === 'user' ? 'user' : 'all',
      targetUserIds: recipients.map((recipient) => recipient._id),
      targetClassId: targetType === 'class' ? req.body.targetClassId : null,
      subject: title,
      body: template.replace(/\bStudent\b/g, 'there'),
      audienceCount: recipients.length,
      sentUserEmails: recipients.map((recipient) => recipient.email),
    })
    res.status(201).json({ message: popup, audienceCount: recipients.length, generatedMessage: template, facts: facts.changes, push: pushResult })
  } catch (error) {
    res.status(500).json({ message: 'Could not send the fact-checked notification.' })
  }
})

app.post('/api/admin/push/send', authRequired, adminRequired, async (req, res) => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(503).json({ message: 'Web Push is not configured on the server.' })
    }

    const targetType = String(req.body?.targetType || 'all')
    const title = String(req.body?.title || '').trim().slice(0, 180)
    const body = String(req.body?.body || '').trim().slice(0, 2000)
    const link = String(req.body?.link || '/#/').trim().slice(0, 500)
    let recipients = []

    if (!title || !body) {
      return res.status(400).json({ message: 'Push title and message are required.' })
    }

    if (targetType === 'all') {
      recipients = await User.find({ isAdmin: false }).select('_id name email').lean()
    } else if (targetType === 'class' && req.body?.targetClassId) {
      recipients = await User.find({ isAdmin: false, classId: req.body.targetClassId }).select('_id name email').lean()
    } else if (targetType === 'user' && Array.isArray(req.body?.targetUserIds)) {
      recipients = await User.find({ isAdmin: false, _id: { $in: req.body.targetUserIds } }).select('_id name email').lean()
    } else {
      return res.status(400).json({ message: 'Choose a valid push audience.' })
    }

    if (!recipients.length) {
      return res.status(404).json({ message: 'No students matched the selected audience.' })
    }

    await Notification.insertMany(recipients.map((recipient) => ({
      recipient: recipient._id,
      type: 'ADMIN_WEB_PUSH',
      title,
      message: body,
      link,
      source: 'admin-web-push',
    })))

    const push = await sendWebPushToUsers(recipients.map((recipient) => recipient._id), {
      title,
      body,
      url: link,
      tag: `admin-web-push-${Date.now()}`,
    })

    res.status(201).json({
      message: 'Web Push notification sent.',
      audienceCount: recipients.length,
      subscribedDevices: push.registered,
      push,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not send Web Push notification.' })
  }
})

app.post('/api/messages/:id/acknowledge', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('classId', 'name')
    const message = await Message.findById(req.params.id).populate('targetClassId')

    if (!user || user.isAdmin) {
      return res.status(403).json({ message: 'Student access required.' })
    }

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' })
    }

    if (!doesMessageTargetUser(message, user)) {
      return res.status(403).json({ message: 'You cannot acknowledge this message.' })
    }

    const userId = String(user._id)
    const existingAcknowledgement = Array.isArray(message.acknowledgements)
      ? message.acknowledgements.find((entry) => String(entry.user?._id || entry.user || '') === userId)
      : null

    if (existingAcknowledgement) {
      existingAcknowledgement.acknowledgedAt = new Date()
    } else {
      message.acknowledgements = Array.isArray(message.acknowledgements) ? message.acknowledgements : []
      message.acknowledgements.push({
        user: user._id,
        acknowledgedAt: new Date(),
      })
    }

    await message.save()

    const refreshedMessage = await Message.findById(message._id).populate('createdBy targetClassId acknowledgements.user', 'name email')

    res.json({
      message: 'Message acknowledged successfully.',
      messageItem: {
        ...publicMessage(refreshedMessage),
        acknowledgedByMe: true,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not acknowledge message.' })
  }
})

app.get('/api/admin/messages', authRequired, adminRequired, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy targetClassId acknowledgements.user', 'name email')
      .lean()

    res.json({
      messages: messages.map(publicMessage),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load admin messages.' })
  }
})

app.delete('/api/admin/messages/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id)

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' })
    }

    res.json({ message: 'Message deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete message.' })
  }
})

app.get('/api/announcement', async (req, res) => {
  try {
    const notice = await SiteNotice.findOne().sort({ updatedAt: -1 }).lean()

    res.set('Cache-Control', 'no-store')
    res.json({ announcement: publicSiteNotice(notice) })
  } catch (error) {
    res.status(500).json({ message: 'Could not load announcement.' })
  }
})

app.get('/api/gift', authRequired, async (req, res) => {
  try {
    if (req.user.isAdmin || !req.user.classId) return res.json({ gift: null })
    const gift = await Gift.findOne({ classId: req.user.classId }).populate('classId', 'name').lean()
    res.set('Cache-Control', 'no-store')
    res.json({ gift: publicGift(gift) })
  } catch (error) {
    res.status(500).json({ message: 'Could not load gift.' })
  }
})

app.get('/api/admin/gifts', authRequired, adminRequired, async (req, res) => {
  try {
    const gifts = await Gift.find().populate('classId', 'name grade').select('classId image.originalName image.contentType updatedAt').sort({ updatedAt: -1 }).lean()
    res.json({ gifts: gifts.map((gift) => ({
      id: String(gift._id),
      classId: String(gift.classId?._id || ''),
      className: String(gift.classId?.name || ''),
      originalName: String(gift.image?.originalName || 'gift-image'),
      updatedAt: gift.updatedAt,
    })) })
  } catch (error) {
    res.status(500).json({ message: 'Could not load gifts.' })
  }
})

app.post('/api/admin/gifts', authRequired, adminRequired, upload.single('image'), async (req, res) => {
  try {
    const classId = String(req.body.classId || '').trim()
    const classDoc = await Class.findById(classId).select('name')
    if (!classDoc) return res.status(404).json({ message: 'Class not found.' })
    if (!req.file?.buffer || !String(req.file.mimetype || '').startsWith('image/')) {
      return res.status(400).json({ message: 'Please select an image.' })
    }

    const image = await sharp(req.file.buffer).rotate().webp({ quality: 86 }).toBuffer()
    const gift = await Gift.findOneAndUpdate(
      { classId: classDoc._id },
      {
        classId: classDoc._id,
        image: { data: image, contentType: 'image/webp', originalName: req.file.originalname || 'gift-image.webp', updatedAt: new Date() },
        updatedBy: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    res.status(201).json({ gift: publicGift(await gift.populate('classId', 'name')), message: 'Gift saved successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not save gift.' })
  }
})

app.delete('/api/admin/gifts/:classId', authRequired, adminRequired, async (req, res) => {
  try {
    await Gift.deleteOne({ classId: req.params.classId })
    res.json({ message: 'Gift removed successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not remove gift.' })
  }
})

app.post('/api/admin/messages', authRequired, adminRequired, async (req, res) => {
  try {
    const {
      targetType,
      targetUserIds = [],
      targetClassId = '',
      subject = '',
      body = '',
    } = req.body
    const normalizedTargetType = String(targetType || 'all')
    const normalizedSubject = String(subject || '').trim()
    const normalizedBody = String(body || '').trim()

    if (!normalizedBody) {
      return res.status(400).json({ message: 'Message text is required.' })
    }

    let recipients = []
    let classDoc = null

    if (normalizedTargetType === 'all') {
      recipients = await User.find({ isAdmin: false }).lean()
    } else if (normalizedTargetType === 'class') {
      if (!targetClassId) {
        return res.status(400).json({ message: 'Please select a class.' })
      }

      classDoc = await Class.findById(targetClassId)
      if (!classDoc) {
        return res.status(404).json({ message: 'Class not found.' })
      }

      recipients = await User.find({ isAdmin: false, classId: classDoc._id }).lean()
    } else if (normalizedTargetType === 'user') {
      const selectedTargetUserIds = [...new Set(
        (Array.isArray(targetUserIds) ? targetUserIds : [])
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      )]

      if (!selectedTargetUserIds.length) {
        return res.status(400).json({ message: 'Please select at least one student.' })
      }

      recipients = await User.find({ _id: { $in: selectedTargetUserIds }, isAdmin: false }).lean()
    } else {
      return res.status(400).json({ message: 'Invalid message target.' })
    }

    if (!recipients.length) {
      return res.status(404).json({ message: 'No students matched the selected audience.' })
    }

    const messageDoc = await Message.create({
      createdBy: req.user._id,
      targetType: normalizedTargetType,
      targetUserIds: recipients.map((item) => item._id),
      targetClassId: classDoc?._id || null,
      subject: normalizedSubject,
      body: normalizedBody,
      audienceCount: recipients.length,
      sentUserEmails: recipients.map((item) => item.email),
    })

    const push = await sendWebPushToUsers(recipients.map((item) => item._id), {
      title: normalizedSubject || 'New message from Innovative Science 2',
      body: normalizedBody,
      url: '/#/',
      tag: `admin-message-${messageDoc._id}`,
    })

    res.status(201).json({ message: publicMessage(messageDoc), audienceCount: recipients.length, push })
  } catch (error) {
    res.status(500).json({ message: 'Could not send message.' })
  }
})

app.get('/api/admin/announcement', authRequired, adminRequired, async (req, res) => {
  try {
    const notice = await SiteNotice.findOne().sort({ updatedAt: -1 }).lean()
    res.json({ announcement: publicSiteNotice(notice) })
  } catch (error) {
    res.status(500).json({ message: 'Could not load announcement.' })
  }
})

app.post('/api/admin/announcement', authRequired, adminRequired, async (req, res) => {
  try {
    const message = String(req.body.message || '').trim()
    const color = ['amber', 'teal', 'rose', 'sky', 'emerald', 'violet', 'orange', 'lime'].includes(String(req.body.color || '').trim())
      ? String(req.body.color || '').trim()
      : 'amber'

    if (!message) {
      return res.status(400).json({ message: 'Please add a notice message.' })
    }

    const announcement = await SiteNotice.findOneAndUpdate(
      {},
      {
        message,
        color,
        updatedBy: req.user._id,
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      },
    )

    res.json({
      announcement: publicSiteNotice(announcement),
      message: 'Notice saved successfully.',
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not save notice.' })
  }
})

app.delete('/api/admin/announcement', authRequired, adminRequired, async (req, res) => {
  try {
    await SiteNotice.deleteMany({})
    res.json({ message: 'Notice removed successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not remove notice.' })
  }
})

app.post('/api/admin/pyqs', authRequired, adminRequired, async (req, res) => {
  try {
    const scienceLabel = getScienceLabel()
    const title = `Class 10 ${scienceLabel}`
    const month = String(req.body.month || '').trim()
    const subject = scienceLabel
    const year = String(req.body.year || '').trim()
    const linkUrl = normalizeDocumentLink(req.body.link || req.body.linkUrl || req.body.pdfUrl)

    if (!month) {
      return res.status(400).json({ message: 'Month is required.' })
    }

    if (!linkUrl) {
      return res.status(400).json({ message: 'Please add a valid PDF link.' })
    }

    const pyq = await Pyq.create({
      title,
      month,
      subject,
      year,
      uploadedBy: req.user._id,
      linkUrl,
    })

    clearCachedResponses('pyqs:')
    res.status(201).json({
      message: 'PYQ link saved successfully.',
      pyq: publicPyq(pyq),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not save PYQ link.' })
  }
})

app.delete('/api/admin/pyqs/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const pyq = await Pyq.findByIdAndDelete(req.params.id)

    if (!pyq) {
      return res.status(404).json({ message: 'PYQ not found.' })
    }

    clearCachedResponses('pyqs:')
    res.json({ message: 'PYQ deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete PYQ.' })
  }
})

app.get('/api/pyqs', optionalAuth, async (req, res) => {
  try {
    const pyqs = await Pyq.find().sort({ createdAt: -1 }).lean()
    const exposeLinks = Boolean(req.user)

    const payload = {
      pyqs: pyqs.map((pyq) => publicPyq(pyq, { exposeLinks })),
    }

    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: 'Could not load PYQs.' })
  }
})

const getPyqAccessToken = (req) => {
  const authHeader = String(req.headers.authorization || '')
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  return String(req.query.token || '').trim()
}

const verifyPyqAccess = async (req, res) => {
  const accessToken = getPyqAccessToken(req)

  if (!accessToken) {
    res.status(401).json({ message: 'Please sign in to view PYQ PDFs.' })
    return null
  }

  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET)
    const userId = decoded?.userId || decoded?.id || decoded?._id || decoded?.sub

    if (!userId) {
      throw new Error('Missing user id')
    }

    const user = await User.findById(userId).select('_id').lean()

    if (!user) {
      throw new Error('User not found')
    }

    return user
  } catch (error) {
    res.status(401).json({ message: 'Please sign in to view PYQ PDFs.' })
    return null
  }
}

app.get('/api/pyqs/:id/pdf', async (req, res) => {
  try {
    const user = await verifyPyqAccess(req, res)
    if (!user) {
      return
    }

    const pyq = await Pyq.findById(req.params.id).select('title pdf').exec()

    if (!pyq?.pdf?.data) {
      return res.status(404).json({ message: 'PYQ file not found.' })
    }

    const safeName = String(pyq.title || 'pyq')
      .replace(/[^\w.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    res.setHeader('Content-Type', pyq.pdf.contentType || 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${safeName || 'pyq'}.pdf"`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(pyq.pdf.data))
  } catch (error) {
    res.status(500).json({ message: 'Could not open PYQ file.' })
  }
})

app.post('/api/reports', authRequired, async (req, res) => {
  try {
    const { objectiveTypeId = null, chapterId = null, questionId = null, reason, details = '' } = req.body

    if (!reason?.trim()) {
      return res.status(400).json({ message: 'Please choose a reason.' })
    }

    const escapeHtml = (value = '') => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    const safeDetails = String(details || '').trim()
    const reasonLabelMap = {
      incorrect_question: 'Question is wrong',
      incorrect_options: 'Options are incorrect',
      incorrect_answer: 'Answer is incorrect',
      other: 'Other',
    }
    const chosenErrorLabel = reasonLabelMap[reason] || reason
    const studentName = req.user?.name || 'Student'
    const studentEmail = req.user?.email || ''

    let questionDoc = null
    let objectiveDoc = null
    let topicDoc = null
    let chapterDoc = null

    if (questionId) {
      questionDoc = await ObjectiveQuestion.findById(questionId)
        .populate({
          path: 'objectiveType',
          populate: { path: 'topic', populate: { path: 'chapter' } },
        })
        .lean()
    }

    if (questionDoc?.objectiveType) {
      objectiveDoc = questionDoc.objectiveType
      topicDoc = objectiveDoc?.topic || null
      chapterDoc = topicDoc?.chapter || null
    }

    if (!objectiveDoc && objectiveTypeId) {
      objectiveDoc = await ObjectiveType.findById(objectiveTypeId).lean()
    }

    if (!chapterDoc && chapterId) {
      chapterDoc = await Chapter.findById(chapterId).lean()
    }

    const chapterLabel = chapterDoc?.number
      ? `Chapter ${chapterDoc.number}: ${chapterDoc.name || ''}`.trim()
      : chapterDoc?.name || topicDoc?.chapter?.name || 'N/A'
    const topicName = topicDoc?.name || questionDoc?.objectiveType?.topic?.name || 'N/A'
    const objectiveTypeName = objectiveDoc?.type || questionDoc?.objectiveType?.type || 'N/A'
    const questionText = String(questionDoc?.question || '').trim() || 'N/A'
    const options = Array.isArray(questionDoc?.options) ? questionDoc.options : []
    const optionLines = options.length
      ? options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')
      : 'N/A'
    const correctAnswerText = (() => {
      if (Array.isArray(questionDoc?.correctOptions) && questionDoc.correctOptions.length) {
        const matchingAnswers = questionDoc.correctOptions
          .map((index) => options[index])
          .filter(Boolean)

        return matchingAnswers.length ? matchingAnswers.join(', ') : 'N/A'
      }

      if (Number.isInteger(questionDoc?.correctOption)) {
        return options[questionDoc.correctOption] || 'N/A'
      }

      if (questionDoc?.answerImage?.data) {
        return 'See attached answer image'
      }

      return 'N/A'
    })()

    const reportLines = [
      `Student: ${studentName} (${studentEmail || 'No email'})`,
      `Chosen error: ${chosenErrorLabel}`,
      `Student message: ${safeDetails || 'No extra message provided.'}`,
      `Chapter: ${chapterLabel}`,
      `Topic: ${topicName}`,
      `Objective: ${objectiveTypeName}`,
      `Question: ${questionText}`,
      `Answer: ${correctAnswerText}`,
      'Options:',
      optionLines,
    ]

    const reportText = reportLines.join('\n')
    const reportHtml = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.7;background:#ffffff">
        <div style="max-width:720px;margin:0 auto;padding:24px">
          <div style="padding:18px 20px;border-radius:18px;background:linear-gradient(135deg,#fff1f2 0%,#eff6ff 100%);border:1px solid #e2e8f0">
            <p style="margin:0 0 8px;color:#be123c;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">Question report</p>
            <h2 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a">A student reported a question</h2>
          </div>

          <div style="margin-top:18px;padding:18px 20px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc">
            <p style="margin:0 0 10px;font-size:14px"><strong>Student:</strong> ${escapeHtml(studentName)} (${escapeHtml(studentEmail || 'No email')})</p>
            <p style="margin:0 0 10px;font-size:14px"><strong>Chosen error:</strong> ${escapeHtml(chosenErrorLabel)}</p>
            <p style="margin:0;font-size:14px"><strong>Student message:</strong> ${escapeHtml(safeDetails || 'No extra message provided.')}</p>
          </div>

          <div style="margin-top:18px;padding:18px 20px;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff">
            <p style="margin:0 0 10px;font-size:14px"><strong>Chapter:</strong> ${escapeHtml(chapterLabel)}</p>
            <p style="margin:0 0 10px;font-size:14px"><strong>Topic:</strong> ${escapeHtml(topicName)}</p>
            <p style="margin:0 0 10px;font-size:14px"><strong>Objective:</strong> ${escapeHtml(objectiveTypeName)}</p>
            <p style="margin:0 0 10px;font-size:14px"><strong>Question:</strong></p>
            <p style="margin:0;font-size:14px;color:#334155">${escapeHtml(questionText)}</p>
            <p style="margin:14px 0 0;font-size:14px"><strong>Answer:</strong> ${escapeHtml(correctAnswerText)}</p>
          </div>

          <div style="margin-top:18px;padding:18px 20px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc">
            <p style="margin:0 0 10px;font-size:14px"><strong>Options:</strong></p>
            <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#334155">${escapeHtml(optionLines)}</pre>
          </div>
        </div>
      </div>
    `

    const reportDoc = await Report.create({
      user: req.user._id,
      objectiveType: objectiveTypeId || null,
      chapterId: chapterId || null,
      questionId: questionId || null,
      reason: reason.trim(),
      details: details.trim(),
    })

    res.status(201).json({
      report: reportDoc,
      message: 'Thank you for the report. We will review it soon.',
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not send report.' })
  }
})

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject = '', message = '' } = req.body

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Name, email, and message are required.' })
    }

    const contact = await ContactMessage.create({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    })

    res.status(201).json({
      message: 'Your message was sent successfully.',
      contact,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not send contact message.' })
  }
})

const sanitizeTutorReply = (value = '') => String(value)
  .replace(/```[\s\S]*?```/g, '')
  .replace(/\r/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

app.post('/api/ai/tutor', authRequired, async (req, res) => {
  try {
    const {
      question = '',
      answer = '',
      topicName = '',
      chapterName = '',
      objectiveType = '',
      contextText = '',
      paragraphText = '',
      studyText = '',
      questionText = '',
      optionsText = '',
      profileContext = '',
      appHelpContext = '',
      conversation = [],
    } = req.body
    const prompt = String(question || '').trim()

    if (!prompt) {
      return res.status(400).json({ message: 'Please ask a question first.' })
    }

    const fallback = {
      reply: `Let’s break it down: ${prompt}.\n\nTopic: ${topicName || 'Science'}\nChapter: ${chapterName || 'Science'}\n\nFocus on the idea behind the answer, then compare the options carefully.`,
      followUp: 'If you want, send me the next question and I will help step by step.',
    }

    const contextParts = [contextText, paragraphText, studyText, questionText, optionsText, appHelpContext]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    const contextBlock = contextParts.join('\n\n')
    const safeProfileContext = String(profileContext || '').trim()
    const asksForProfile = /\b(name|profile|info|email|class|my details|who am i)\b/i.test(prompt)
    const profileReply = safeProfileContext
      ? `Easy answer:\n${safeProfileContext}\n\nIf you want, I can also explain how to use the app or answer a science doubt.`
      : `Easy answer:\nI can only show your own profile info after sign in.\n\nIf you are signed in, I can help with your name, class, and other account details.`
    const tutorFallback = {
      reply: asksForProfile
        ? profileReply
        : contextBlock
        ? `Easy answer:\n${prompt}\n\nBased on ${topicName || chapterName || 'the given topic'}, focus on the main idea in the paragraph and compare the options one by one.\n\nRemember:\nRead the question, look at the paragraph, then pick the option that matches best.`
        : `Easy answer:\n${prompt}\n\nI can help with science doubts, chapter questions, your own profile info, and how to use this website.\n\nSend me the topic or question, and I will explain it in simple words.`,
      followUp: 'Ask me another doubt if you want a shorter answer or a memory trick.',
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.json(tutorFallback)
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'Innovative Science 2',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          {
            role: 'system',
            content: [
              'You are AI Teacher for Innovative Science 2.',
              'Write in very simple English.',
              'Keep the answer short, clear, and easy to read.',
              'Use 3 to 6 short lines maximum.',
              'If paragraph, topic, question, or options are provided, use that context first before answering.',
              'If the user asks about the website or how to use it, answer that directly and helpfully.',
              'If the user asks for their name, profile, class, email, or other own account details, only use the signed-in student profile context that is provided.',
              'Never reveal another person\'s contact details or profile data.',
              'Do not mention policies, model details, or say "as an AI".',
              'Do not use long introductions, code blocks, or complicated words.',
              'A good format is:',
              'Easy answer:',
              'Why:',
              'Remember:',
            ].join('\n'),
          },
          ...(contextBlock
            ? [{
              role: 'system',
              content: `Use this paragraph/topic context first:\n${contextBlock}`,
            }]
            : []),
          ...(safeProfileContext
            ? [{
              role: 'system',
              content: `Signed-in student profile context:\n${safeProfileContext}`,
            }]
            : []),
          ...(Array.isArray(conversation)
            ? conversation.slice(-8).map((item) => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: String(item.content || ''),
          }))
          : []),
          {
            role: 'user',
            content: [
              `Question: ${prompt}`,
              `Answer: ${answer || 'Not provided'}`,
              `Topic: ${topicName || 'General science'}`,
              `Chapter: ${chapterName || 'General'}`,
              `Objective type: ${objectiveType || 'general'}`,
              '',
              'Give a short, simple explanation in readable form.',
            ].join('\n'),
          },
        ],
      }),
    })

    const data = await response.json().catch(() => null)
    const reply = sanitizeTutorReply(data?.choices?.[0]?.message?.content?.trim())

    if (!response.ok || !reply) {
      return res.json(tutorFallback)
    }

    res.json({
      reply,
      followUp: 'Ask me another doubt if you want a shorter explanation or a memory trick.',
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load AI tutor help.' })
  }
})

app.get('/api/test-builder/options', optionalAuth, async (req, res) => {
  try {
    const chapterNumbers = String(req.query.chapters || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value))

    if (!chapterNumbers.length) {
      return res.json({ objectiveTypes: [], totalQuestions: 0 })
    }

    const chapters = await Chapter.find({ number: { $in: chapterNumbers } }).select('number name').sort({ number: 1 }).lean()
    const topics = await Topic.find({ chapter: { $in: chapters.map((chapter) => chapter._id) } }).lean()
    const topicIds = topics.map((topic) => topic._id)
    const objectiveTypes = await ObjectiveType.find({
      topic: { $in: topicIds },
    }).lean()
    const objectiveTypeIds = objectiveTypes.map((item) => item._id)
    const questionCounts = await ObjectiveQuestion.aggregate([
      { $match: { objectiveType: { $in: objectiveTypeIds } } },
      { $group: { _id: '$objectiveType', count: { $sum: 1 } } },
    ])
    const countMap = new Map(questionCounts.map((item) => [String(item._id), item.count]))
    const topicsById = new Map(topics.map((item) => [String(item._id), item]))
    const chapterById = new Map(chapters.map((item) => [String(item._id), item]))
    const availableTypes = new Map()

    objectiveTypes.forEach((objectiveType) => {
      const topic = topicsById.get(String(objectiveType.topic))
      const chapter = topic ? chapterById.get(String(topic.chapter)) : null
      const key = objectiveType.type
      const current = availableTypes.get(key) || {
        type: objectiveType.type,
        count: 0,
        chapters: new Set(),
      }

      current.count += countMap.get(String(objectiveType._id)) || 0
      if (chapter) {
        current.chapters.add(chapter.number)
      }

      availableTypes.set(key, current)
    })

    res.json({
      objectiveTypes: [...availableTypes.values()].map((item) => ({
        type: item.type,
        count: item.count,
        chapters: [...item.chapters].sort((left, right) => left - right),
      })),
      totalQuestions: [...availableTypes.values()].reduce((sum, item) => sum + item.count, 0),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load test builder options.' })
  }
})

app.post('/api/tests/generate', authRequired, async (req, res) => {
  try {
    const chapterNumbers = Array.isArray(req.body.chapterNumbers)
      ? req.body.chapterNumbers.map(Number).filter((value) => Number.isFinite(value))
      : []
    const selectedTypes = Array.isArray(req.body.objectiveTypes) ? req.body.objectiveTypes.filter(Boolean) : []
    const questionCount = Math.min(Math.max(Number(req.body.questionCount) || 10, 1), 100)

    if (!chapterNumbers.length) {
      return res.status(400).json({ message: 'Please select at least one chapter.' })
    }

    const chapters = await Chapter.find({ number: { $in: chapterNumbers } }).sort({ number: 1 }).lean()
    const chapterIds = chapters.map((chapter) => chapter._id)
    const topics = await Topic.find({ chapter: { $in: chapterIds } }).lean()
    const topicIds = topics.map((topic) => topic._id)
    const objectiveQuery = {
      topic: { $in: topicIds },
    }

    if (selectedTypes.length) {
      objectiveQuery.type = { $in: selectedTypes }
    }

    const objectiveTypes = await ObjectiveType.find(objectiveQuery).lean()
    const objectiveTypeMap = new Map(objectiveTypes.map((item) => [String(item._id), item]))
    const topicMap = new Map(topics.map((item) => [String(item._id), item]))
    const chapterMap = new Map(chapters.map((item) => [String(item._id), item]))
    const objectiveTypeIds = objectiveTypes.map((item) => item._id)
    const questions = await ObjectiveQuestion.find({ objectiveType: { $in: objectiveTypeIds } }).lean()

    const selectedQuestions = questions
      .map((question) => {
        const objectiveType = objectiveTypeMap.get(String(question.objectiveType))
        const topic = objectiveType ? topicMap.get(String(objectiveType.topic)) : null
        const chapter = topic ? chapterMap.get(String(topic.chapter)) : null

        return {
          id: String(question._id),
          questionId: String(question._id),
          objectiveTypeId: String(question.objectiveType),
          objectiveType: objectiveType?.type || '',
          chapterId: chapter?._id ? String(chapter._id) : '',
          chapterNumber: chapter?.number || 0,
          chapterName: chapter?.name || '',
          topicName: topic?.name || '',
          question: question.question,
          options: question.options,
          pairs: question.pairs,
          imageUrl: question.questionImage?.data ? `/api/objective-questions/${question._id}/image?v=${question.questionImage.updatedAt?.getTime() || Date.now()}&science=${getActiveScience()}` : '',
          answerImageUrl: question.answerImage?.data ? `/api/objective-questions/${question._id}/answer-image?v=${question.answerImage.updatedAt?.getTime() || Date.now()}&science=${getActiveScience()}` : '',
          hasAnswerImage: Boolean(question.answerImage?.data),
        }
      })
      .filter((item) => item.questionId)

    const buckets = new Map()
    const typeOrder = selectedTypes.length
      ? [...selectedTypes]
      : [...new Set(selectedQuestions.map((item) => item.objectiveType).filter(Boolean))]

    selectedQuestions.forEach((question) => {
      const key = question.objectiveType || 'unknown'
      const current = buckets.get(key) || []
      current.push(question)
      buckets.set(key, current)
    })

    buckets.forEach((bucket, key) => {
      bucket.sort(() => Math.random() - 0.5)
      buckets.set(key, bucket)
    })

    const balancedSelection = []
    const targetCount = Math.min(questionCount, selectedQuestions.length)
    const typeCursor = new Map(typeOrder.map((type) => [type, 0]))

    while (balancedSelection.length < targetCount) {
      let addedThisRound = false

      for (const type of typeOrder) {
        const bucket = buckets.get(type) || []
        const cursor = typeCursor.get(type) || 0
        if (cursor >= bucket.length) {
          continue
        }

        balancedSelection.push(bucket[cursor])
        typeCursor.set(type, cursor + 1)
        addedThisRound = true

        if (balancedSelection.length >= targetCount) {
          break
        }
      }

      if (!addedThisRound) {
        break
      }
    }

    const randomized = balancedSelection.map((item) => ({ ...item, marks: 1 }))

    res.json({
      chapters,
      questionCount: randomized.length,
      selectedTypes,
      questions: randomized,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not generate test.' })
  }
})

app.post('/api/tests/submit', authRequired, async (req, res) => {
  try {
    const answers = Array.isArray(req.body.answers) ? req.body.answers : []
    const questionIds = answers.map((answer) => answer.questionId).filter(Boolean)

    if (!questionIds.length) {
      return res.status(400).json({ message: 'Please answer at least one question.' })
    }

    const questions = await ObjectiveQuestion.find({ _id: { $in: questionIds } })
      .populate({
        path: 'objectiveType',
        populate: { path: 'topic', populate: { path: 'chapter' } },
      })

    const answerMap = new Map(answers.map((answer) => [String(answer.questionId), answer.selectedOption]))
    const questionBreakdown = questions.map((question, index) => {
      const objectiveType = question.objectiveType?.type || ''
      const selectedOption = answerMap.get(String(question._id))
      const scored = scoreObjectiveQuestion({ objectiveType, question, selectedOption })
      const chapter = question.objectiveType?.topic?.chapter

      return {
        number: index + 1,
        question: question.question,
        selectedAnswer: scored.isSkipped ? 'Skipped' : scored.selectedAnswer,
        correctAnswer: scored.correctAnswer,
        status: scored.isSkipped ? 'skipped' : scored.isCorrect ? 'correct' : 'wrong',
        chapterId: chapter?._id,
        chapterNumber: chapter?.number,
        chapterName: chapter?.name || '',
        objectiveTypeId: question.objectiveType?._id,
        topicName: question.objectiveType?.topic?.name || '',
        questionId: question._id,
      }
    })

    const score = questionBreakdown.filter((item) => item.status === 'correct').length
    const wrongCount = questionBreakdown.filter((item) => item.status === 'wrong').length
    const skippedCount = questionBreakdown.filter((item) => item.status === 'skipped').length
    const brainCellsEarned = score
    const chapterBreakdown = allocateBrainCellsByWeight(
      buildChapterSummariesFromBreakdown(questionBreakdown),
      brainCellsEarned,
    )
    const conceptSummary = await generateProgressSuggestion({
      objectiveType: 'mixed-test',
      topicName: 'Generated test',
      studyText: '',
      previousScore: 0,
      currentScore: score,
      totalQuestions: questionBreakdown.length,
      correctCount: score,
      wrongCount,
      skippedCount,
      questionBreakdown,
    })

    await PracticeAttempt.create({
      user: req.user._id,
      attemptType: 'test',
      sourceName: 'Generated chapter test',
      chapterIds: chapterBreakdown.map((item) => item.chapterId),
      objectiveTypeIds: dedupeByKey(questions.map((question) => question.objectiveType?._id).filter(Boolean), (item) => String(item)),
      totalScore: score,
      totalQuestions: questionBreakdown.length,
      wrongCount,
      skippedCount,
      brainCellsEarned,
      chapterBreakdown,
      conceptSummary,
      questionBreakdown,
    })
    await updateLeaderboardTotals(req.user._id, {
      score,
      totalQuestions: questionBreakdown.length,
      brainCellsEarned,
      questionBreakdown,
      chapterBreakdown,
    })

    clearCachedResponses('leaderboard:')
    clearCachedResponses('admin:students:')
    res.json({
      score,
      totalQuestions: questionBreakdown.length,
      brainCellsEarned,
      questionBreakdown,
      chapterBreakdown,
      progressReport: {
        previousScore: 0,
        currentScore: score,
        totalQuestions: questionBreakdown.length,
        correctCount: score,
        wrongCount,
        skippedCount,
        improvement: score,
        suggestion: conceptSummary.summary,
        focusAreas: conceptSummary.focusAreas,
        solutionSteps: conceptSummary.solutionSteps,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not submit test.' })
  }
})

app.get('/api/classes/:classId/feed', authRequired, async (req, res) => {
  try {
    const { classId } = req.params
    const rawLimit = String(req.query.limit || '').trim().toLowerCase()
    const loadAll = rawLimit === 'all' || req.query.all === '1'
    const limit = loadAll ? null : Math.min(Math.max(Number(req.query.limit) || 20, 1), 50)
    const queryLimit = loadAll ? null : Math.min((limit || 20) + 1, 51)
    const category = String(req.query.category || '').trim()
    const normalizedCategory = category && category !== 'all' && CLASS_POST_CATEGORIES.includes(category) ? category : ''

    const classDoc = await Class.findById(classId).select('name description grade').lean()

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    const canAccessClass = req.user.isAdmin || String(req.user.classId?._id || req.user.classId || '') === String(classId)

    if (!canAccessClass) {
      return res.status(403).json({ message: 'You do not have access to this class.' })
    }

    const postQuery = {
      classId: classDoc._id,
    }

    if (normalizedCategory) {
      postQuery.category = normalizedCategory
    }

    let postFinder = ClassPost.find(postQuery)
      .populate('createdBy', 'name isAdmin')
      .sort({ createdAt: -1 })
      .select('classId shareGroupId createdBy category message documentLink createdAt photos pdf')
      .select('-photos.data -pdf.data')
      .lean()

    if (!loadAll && queryLimit) {
      postFinder = postFinder.limit(queryLimit)
    }

    const posts = await postFinder
    const visiblePosts = loadAll ? posts : posts.slice(0, limit)
    const categoryCountsRaw = await ClassPost.aggregate([
      { $match: { classId: classDoc._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ])
    const categoryCounts = CLASS_POST_CATEGORIES.reduce((accumulator, item) => {
      accumulator[item] = 0
      return accumulator
    }, {})
    categoryCountsRaw.forEach((entry) => {
      if (CLASS_POST_CATEGORIES.includes(entry._id)) {
        categoryCounts[entry._id] = Number(entry.count || 0)
      }
    })

    const payload = {
      classItem: {
        id: String(classDoc._id),
        name: classDoc.name,
        description: classDoc.description || '',
        grade: classDoc.grade || '',
      },
      posts: visiblePosts.map(publicClassPost),
      hasMore: loadAll ? false : posts.length > limit,
      categoryCounts,
      canPost: Boolean(req.user.isAdmin),
    }

    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: 'Could not load class feed.' })
  }
})

app.patch('/api/classes/:classId/posts/:postId', authRequired, classShareUpload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'pdf', maxCount: 1 },
]), async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admin can edit class posts.' })
    }

    const { classId, postId } = req.params
    const post = await ClassPost.findById(postId)

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' })
    }

    const parsedClassIds = parseJsonValue(req.body.classIds, null)
    const desiredClassIds = Array.isArray(parsedClassIds)
      ? parsedClassIds
      : [req.body.classId || classId || post.classId || '']
    const selectedClassIds = [...new Set(desiredClassIds.map((value) => String(value || '').trim()).filter(Boolean))]

    if (!selectedClassIds.length) {
      return res.status(400).json({ message: 'Please select at least one visible class.' })
    }

    const matchingClasses = await Class.find({ _id: { $in: selectedClassIds } }).lean()
    if (matchingClasses.length !== selectedClassIds.length) {
      return res.status(404).json({ message: 'One or more target classes were not found.' })
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : post.message
    const hasDocumentLinkField = Object.prototype.hasOwnProperty.call(req.body, 'documentLink')
    const documentLink = hasDocumentLinkField ? normalizeDocumentLink(req.body.documentLink) : String(post.documentLink || '')
    const classMessages = parseJsonValue(req.body.classMessages, {})
    const category = typeof req.body.category === 'string' && CLASS_POST_CATEGORIES.includes(req.body.category)
      ? req.body.category
      : post.category || 'assignment'
    const photos = Array.isArray(req.files?.photos) ? req.files.photos : null
    const pdfFile = Array.isArray(req.files?.pdf) ? req.files.pdf[0] : null

    if (!message && (!photos || !photos.length) && !pdfFile && !post.pdf?.data && !(post.photos || []).length && !documentLink && !post.documentLink) {
      return res.status(400).json({ message: 'Post cannot be empty.' })
    }

    if (photos && photos.some((file) => !file.mimetype?.startsWith('image/'))) {
      return res.status(400).json({ message: 'Photos must be image files.' })
    }

    if (pdfFile && pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'PDF attachment must be a PDF file.' })
    }

    if (photos && photos.some((file) => Number(file.size) > 5 * 1024 * 1024)) {
      return res.status(400).json({ message: 'Each photo must be 5 MB or smaller.' })
    }

    if (pdfFile && Number(pdfFile.size) > 25 * 1024 * 1024) {
      return res.status(400).json({ message: 'PDF must be 25 MB or smaller.' })
    }

    const groupId = post.shareGroupId || post._id
    const groupPosts = await ClassPost.find({
      $or: [{ _id: groupId }, { shareGroupId: groupId }],
    })

    const postsByClassId = new Map(groupPosts.map((item) => [String(item.classId), item]))
    const existingAttachments = {
      photos: post.photos || [],
      pdf: post.pdf || null,
    }
    const nextAttachments = {
      photos: photos ? await Promise.all(photos.map(convertClassPhoto)) : existingAttachments.photos,
      pdf: pdfFile
        ? {
            data: pdfFile.buffer,
            contentType: pdfFile.mimetype,
            originalName: pdfFile.originalname,
            updatedAt: new Date(),
          }
        : existingAttachments.pdf,
    }

    const savedPosts = []

    for (const classItem of matchingClasses) {
      const existingPost = postsByClassId.get(String(classItem._id))
      const classMessage = String(classMessages?.[String(classItem._id)] || '').trim()
      const resolvedMessage = classMessage || existingPost?.message || message || ''

      if (existingPost) {
        existingPost.classId = classItem._id
        existingPost.shareGroupId = groupId
        existingPost.message = resolvedMessage
        if (hasDocumentLinkField) {
          existingPost.documentLink = documentLink
        }
        existingPost.category = category
        existingPost.photos = nextAttachments.photos.map((photo) => ({ ...photo }))
        existingPost.pdf = nextAttachments.pdf
          ? { ...nextAttachments.pdf }
          : undefined
        await existingPost.save()
        await existingPost.populate('createdBy', 'name isAdmin')
        savedPosts.push(existingPost)
        continue
      }

      const createdPost = await ClassPost.create({
        classId: classItem._id,
        shareGroupId: groupId,
        createdBy: req.user._id,
        category,
        message: resolvedMessage,
        documentLink,
        photos: nextAttachments.photos.map((photo) => ({ ...photo })),
        pdf: nextAttachments.pdf
          ? { ...nextAttachments.pdf }
          : undefined,
      })

      await createdPost.populate('createdBy', 'name isAdmin')
      await notifyNewClassPost(createdPost)
      savedPosts.push(createdPost)
    }

    const selectedClassIdSet = new Set(selectedClassIds.map((value) => String(value)))
    const removedPosts = groupPosts.filter((item) => !selectedClassIdSet.has(String(item.classId)))

    if (removedPosts.length) {
      await ClassPost.deleteMany({ _id: { $in: removedPosts.map((item) => item._id) } })
    }

    const primaryPost = savedPosts[0] || post
    clearCachedResponses('class-feed:')
    const affectedClassIds = new Set([
      ...selectedClassIds,
      ...removedPosts.map((item) => String(item.classId)),
    ])
    affectedClassIds.forEach((affectedClassId) => emitClassFeedUpdate(affectedClassId, 'updated'))
    res.json({
      post: publicClassPost(primaryPost),
      posts: savedPosts.map(publicClassPost),
      message: 'Updated successfully.',
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not edit class post.' })
  }
})

app.delete('/api/classes/:classId/posts/:postId', authRequired, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Only admin can delete class posts.' })
    }

    const { classId, postId } = req.params
    const post = await ClassPost.findOneAndDelete({ _id: postId, classId })

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' })
    }

    clearCachedResponses('class-feed:')
    emitClassFeedUpdate(classId, 'deleted')
    res.json({ message: 'Deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete class post.' })
  }
})

app.get('/api/classes/:classId/posts/:postId/pdf', async (req, res) => {
  try {
    const { classId, postId } = req.params
    const currentUser = await getAuthenticatedUserFromRequest(req)

    if (!currentUser) {
      return res.status(401).json({ message: 'Please sign in first.' })
    }

    const canAccessClass = currentUser.isAdmin || String(currentUser.classId?._id || currentUser.classId || '') === String(classId)

    if (!canAccessClass) {
      return res.status(403).json({ message: 'You do not have access to this class.' })
    }

    const post = await ClassPost.findOne({ _id: postId, classId })

    if (!post || !post.pdf?.data) {
      return res.status(404).json({ message: 'PDF not found.' })
    }

    res.setHeader('Content-Type', post.pdf.contentType || 'application/pdf')
    const isDownload = String(req.query.download || '') === '1'
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${post.pdf.originalName || 'attachment.pdf'}"`,
    )
    res.send(post.pdf.data)
  } catch (error) {
    res.status(500).json({ message: 'Could not open PDF.' })
  }
})

app.get('/api/classes/:classId/posts/:postId/photos/:photoId', async (req, res) => {
  try {
    const { classId, postId, photoId } = req.params
    const currentUser = await getAuthenticatedUserFromRequest(req)

    if (!currentUser) {
      return res.status(401).json({ message: 'Please sign in first.' })
    }

    const canAccessClass = currentUser.isAdmin || String(currentUser.classId?._id || currentUser.classId || '') === String(classId)

    if (!canAccessClass) {
      return res.status(403).json({ message: 'You do not have access to this class.' })
    }

    const post = await ClassPost.findOne({ _id: postId, classId })

    if (!post) {
      return res.status(404).json({ message: 'Photo not found.' })
    }

    const photo = (post.photos || []).find((item) => String(item._id) === String(photoId))

    if (!photo?.data) {
      return res.status(404).json({ message: 'Photo not found.' })
    }

    const isDownload = String(req.query.download || '') === '1'
    const isThumb = ['1', 'true', 'yes'].includes(String(req.query.thumb || '').toLowerCase())

    if (isThumb) {
      const thumbBuffer = await sharp(photo.data)
        .rotate()
        .resize({ width: 420, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer()

      res.setHeader('Content-Type', 'image/webp')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${photo.originalName || 'photo'}"`,
      )
      res.send(thumbBuffer)
      return
    }

    res.setHeader('Content-Type', photo.contentType || 'image/jpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${photo.originalName || 'photo'}"`,
    )
    res.send(photo.data)
  } catch (error) {
    res.status(500).json({ message: 'Could not open photo.' })
  }
})

app.post(
  '/api/classes/:classId/posts',
  authRequired,
  classShareUpload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Only admin can share in this class.' })
      }

      const { classId } = req.params
      const classDoc = await Class.findById(classId)

      if (!classDoc) {
        return res.status(404).json({ message: 'Class not found.' })
      }

      const message = String(req.body.message || '').trim()
      const documentLink = normalizeDocumentLink(req.body.documentLink)
      const category = CLASS_POST_CATEGORIES.includes(String(req.body.category || 'assignment'))
        ? String(req.body.category || 'assignment')
        : 'assignment'
      const photos = Array.isArray(req.files?.photos) ? req.files.photos : []
      const pdfFile = Array.isArray(req.files?.pdf) ? req.files.pdf[0] : null

      if (!message && !photos.length && !pdfFile && !documentLink) {
        return res.status(400).json({ message: 'Add a message, a photo, a PDF, or a link before sharing.' })
      }

      if (photos.some((file) => !file.mimetype?.startsWith('image/'))) {
        return res.status(400).json({ message: 'Photos must be image files.' })
      }

      if (pdfFile && pdfFile.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'PDF attachment must be a PDF file.' })
      }

      const photoLimitBytes = 5 * 1024 * 1024
      const pdfLimitBytes = 25 * 1024 * 1024

      if (photos.some((file) => Number(file.size) > photoLimitBytes)) {
        return res.status(400).json({ message: 'Each photo must be 5 MB or smaller.' })
      }

      if (pdfFile && Number(pdfFile.size) > pdfLimitBytes) {
        return res.status(400).json({ message: 'PDF must be 25 MB or smaller.' })
      }

      const post = await ClassPost.create({
        classId: classDoc._id,
        shareGroupId: new mongoose.Types.ObjectId(),
        createdBy: req.user._id,
        category,
        message,
        documentLink,
        photos: await Promise.all(photos.map(convertClassPhoto)),
        pdf: pdfFile
          ? {
              data: pdfFile.buffer,
              contentType: pdfFile.mimetype,
              originalName: pdfFile.originalname,
              updatedAt: new Date(),
            }
          : undefined,
      })

      await post.populate('createdBy', 'name isAdmin')
      await notifyNewClassPost(post)

      clearCachedResponses('class-feed:')
      emitClassFeedUpdate(classDoc._id, 'created')
      res.status(201).json({
        post: publicClassPost(post),
        message: 'Shared successfully.',
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not share in this class.' })
    }
  },
)

app.post(
  '/api/admin/class-board/posts',
  authRequired,
  classShareUpload.fields([
    { name: 'photos', maxCount: 10 },
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Only admin can share class board updates.' })
      }

      const classIds = Array.isArray(parseJsonValue(req.body.classIds, []))
        ? parseJsonValue(req.body.classIds, [])
        : []
      const classMessages = parseJsonValue(req.body.classMessages, {})
      const defaultMessage = String(req.body.message || '').trim()
      const documentLink = normalizeDocumentLink(req.body.documentLink)
      const category = CLASS_POST_CATEGORIES.includes(String(req.body.category || 'assignment'))
        ? String(req.body.category || 'assignment')
        : 'assignment'
      const photos = Array.isArray(req.files?.photos) ? req.files.photos : []
      const pdfFile = Array.isArray(req.files?.pdf) ? req.files.pdf[0] : null
      const selectedClassIds = [...new Set(classIds.map((value) => String(value || '').trim()).filter(Boolean))]

      if (!selectedClassIds.length) {
        return res.status(400).json({ message: 'Please select at least one class.' })
      }

      if (photos.some((file) => !file.mimetype?.startsWith('image/'))) {
        return res.status(400).json({ message: 'Photos must be image files.' })
      }

      if (pdfFile && pdfFile.mimetype !== 'application/pdf') {
        return res.status(400).json({ message: 'PDF attachment must be a PDF file.' })
      }

      const photoLimitBytes = 5 * 1024 * 1024
      const pdfLimitBytes = 25 * 1024 * 1024

      if (photos.some((file) => Number(file.size) > photoLimitBytes)) {
        return res.status(400).json({ message: 'Each photo must be 5 MB or smaller.' })
      }

      if (pdfFile && Number(pdfFile.size) > pdfLimitBytes) {
        return res.status(400).json({ message: 'PDF must be 25 MB or smaller.' })
      }

      const matchingClasses = await Class.find({ _id: { $in: selectedClassIds } }).lean()

      if (!matchingClasses.length) {
        return res.status(404).json({ message: 'No matching classes were found.' })
      }

      const hasAnyMessage =
        defaultMessage ||
        selectedClassIds.some((classId) => String(classMessages?.[classId] || '').trim())

      if (!hasAnyMessage && !photos.length && !pdfFile && !documentLink) {
        return res.status(400).json({ message: 'Add a message, a photo, a PDF, or a link before sharing.' })
      }

      const classMap = new Map(matchingClasses.map((classItem) => [String(classItem._id), classItem]))
      const convertedPhotos = photos.length ? await Promise.all(photos.map(convertClassPhoto)) : []
      const createdPosts = []
      const shareGroupId = new mongoose.Types.ObjectId()

      for (const classId of selectedClassIds) {
        const classDoc = classMap.get(String(classId))
        if (!classDoc) {
          continue
        }

        const classMessage = String(classMessages?.[classId] || defaultMessage || '').trim()

        if (!classMessage && !convertedPhotos.length && !pdfFile && !documentLink) {
          continue
        }

        const attachmentBundle = cloneClassAttachments(convertedPhotos, pdfFile)
        const post = await ClassPost.create({
          classId: classDoc._id,
          shareGroupId,
          createdBy: req.user._id,
          category,
          message: classMessage,
          documentLink,
          photos: attachmentBundle.photos,
          pdf: attachmentBundle.pdf,
        })

        await post.populate('createdBy', 'name isAdmin')
        await notifyNewClassPost(post)
        createdPosts.push(publicClassPost(post))
      }

      if (!createdPosts.length) {
        return res.status(400).json({ message: 'Please add a message for at least one selected class.' })
      }

      clearCachedResponses('class-feed:')
      selectedClassIds.forEach((selectedClassId) => emitClassFeedUpdate(selectedClassId, 'created'))
      res.status(201).json({
        posts: createdPosts,
        message: 'Shared successfully.',
      })
    } catch (error) {
      res.status(500).json({ message: 'Could not share class board updates.' })
    }
  },
)

if (frontendIsBuilt) {
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(frontendIndexPath)
  })
}

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'One of the uploaded files is too large.' })
    }

    return res.status(400).json({ message: 'Could not process uploaded files.' })
  }

  return next(error)
})

const ensureAdminUser = async () => {
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      name: 'Rethish Sir',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      passwordHash: '',
      isAdmin: true,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
}

const ensureAcademicScienceFlags = async () => {
  const academicCollections = [
    'chapters',
    'topics',
    'objectivetypes',
    'objectivequestions',
    'practicescores',
    'contentchanges',
    'practiceattempts',
    'pyqs',
  ]

  await Promise.all(academicCollections.map((collectionName) => (
    mongoose.connection.db.collection(collectionName).updateMany(
      { science: { $exists: false } },
      { $set: { science: 'science2' } },
    )
  )))

  await Promise.all([
    Science2Chapter,
    Science2Topic,
    Science2ObjectiveType,
    Science2ObjectiveQuestion,
    Science2PracticeScore,
    Science2ContentChange,
    Science2PracticeAttempt,
    Science2Pyq,
  ].map((model) => model.syncIndexes()))
}

const startServer = async () => {
  console.log(`Starting backend on http://localhost:${PORT}...`)
  server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })

  if (!MONGODB_URI || MONGODB_URI === 'add_your_mongodb_url_here') {
    console.warn('MONGODB_URI is not set. Add your MongoDB URL in backend/.env.')
    return
  }

  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 15),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 2),
    })
    console.log('MongoDB connected')

    await ensureAcademicScienceFlags()
    await ensureAdminUser()
    await syncLeaderboardTotalsFromAttempts()
    scheduleNextPushSlot()
    console.log(`Admin ready: ${ADMIN_EMAIL}`)
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
  }
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error.message)
  process.exit(1)
})
