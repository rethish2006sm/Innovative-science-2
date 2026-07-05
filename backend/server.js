const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const dotenv = require('dotenv')
const fs = require('fs')
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const compression = require('compression')

dotenv.config()

const app = express()
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
const PYQ_FIXED_TITLE = 'Class 10 Science 2'
const PYQ_FIXED_SUBJECT = 'Science 2'
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite'
const MAX_COMPLETION_TOKENS = Number(process.env.MAX_COMPLETION_TOKENS || 1800)
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true
  }

  if (allowedOrigins.includes(origin)) {
    return true
  }

  return /^https:\/\/[^/]+\.onrender\.com$/i.test(origin)
}

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
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
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

const User = mongoose.model('User', userSchema)

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
      unique: true,
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

topicSchema.index({ chapter: 1, number: 1 }, { unique: true })

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
        'true-or-false',
        'correlation',
        'match-the-following',
        'complete-the-tables',
        'diagram-based-question',
        'identify-symbol',
      ],
    },
  },
  { timestamps: true },
)

objectiveTypeSchema.index({ topic: 1, type: 1 }, { unique: true })

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
    rewardedQuestionIds: {
      type: [String],
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

practiceScoreSchema.index({ user: 1, objectiveType: 1 }, { unique: true })

const Chapter = mongoose.model('Chapter', chapterSchema)
const Topic = mongoose.model('Topic', topicSchema)
const ObjectiveType = mongoose.model('ObjectiveType', objectiveTypeSchema)
const ObjectiveQuestion = mongoose.model('ObjectiveQuestion', objectiveQuestionSchema)
const PracticeScore = mongoose.model('PracticeScore', practiceScoreSchema)

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

const ClassPost = mongoose.model('ClassPost', classPostSchema)

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

pyqSchema.index({ createdAt: -1 })

const Class = mongoose.model('Class', classSchema)
const PracticeAttempt = mongoose.model('PracticeAttempt', practiceAttemptSchema)
const Report = mongoose.model('Report', reportSchema)
const Message = mongoose.model('Message', messageSchema)
const Pyq = mongoose.model('Pyq', pyqSchema)
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
const SiteNotice = mongoose.model('SiteNotice', siteNoticeSchema)
const ContactMessage = mongoose.model(
  'ContactMessage',
  new mongoose.Schema(
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
  ),
)

ContactMessage.schema.index({ createdAt: -1 })

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

const Feedback = mongoose.model('Feedback', feedbackSchema)

const publicUser = (user, { includePassword = false } = {}) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber || '',
  ...(includePassword ? { password: user.password || user.passwordHash || '' } : {}),
  isAdmin: Boolean(user.isAdmin),
  classId: user.classId?._id?.toString?.() || user.classId?.toString?.() || '',
  className: user.classId?.name || '',
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

const publicTopic = (topic, isAdmin = false) => {
  const normalizedTopic = typeof topic.toObject === 'function' ? topic.toObject() : topic
  const { studyText, ...safeTopic } = normalizedTopic

  return isAdmin ? normalizedTopic : safeTopic
}

const publicQuestionImageUrl = (question) => (
  question.questionImage?.data
    ? `/api/objective-questions/${question._id}/image?v=${
        question.questionImage.updatedAt?.getTime() || Date.now()
      }`
    : ''
)

const publicAnswerImageUrl = (question) => (
  question.answerImage?.data
    ? `/api/objective-questions/${question._id}/answer-image?v=${
        question.answerImage.updatedAt?.getTime() || Date.now()
      }`
    : ''
)

const publicPyq = (pyq) => ({
  id: String(pyq._id),
  title: pyq.title,
  month: pyq.month || '',
  subject: pyq.subject || '',
  year: pyq.year || '',
  linkUrl: normalizeDocumentLink(pyq.linkUrl)
    || (pyq.pdf?.data ? `/api/pyqs/${pyq._id}/pdf?v=${pyq.pdf.updatedAt?.getTime() || Date.now()}` : ''),
  pdfUrl: pyq.pdf?.data
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
  const [totalStudents, totalClasses, totalReports, totalFeedback] = await Promise.all([
    User.countDocuments({ isAdmin: false }),
    Class.countDocuments({}),
    Report.countDocuments({}),
    Feedback.countDocuments({}),
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

const createToken = (user) => {
  return jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
    expiresIn: TOKEN_AGE,
  })
}

const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''

    if (!token) {
      return res.status(401).json({ message: 'Please sign in first.' })
    }

    const payload = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(payload.userId)

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

    if (token) {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = await User.findById(payload.userId)
    }
  } catch (error) {
    req.user = null
  }

  next()
}

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

const requiresFourOptions = (type) => type === 'correlation'
const isMatchType = (type) => type === 'match-the-following'
const isDoneOnlyType = (type) => type === 'complete-the-tables'

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

    const existingUser = await User.findOne({ email: normalizedEmail })

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhoneNumber,
      password: String(password),
      passwordHash: '',
    })
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

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    const isPasswordCorrect = await passwordMatches(password, user)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Password is wrong.' })
    }

    await user.populate('classId', 'name')

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

    const user = await User.findOne({ email: normalizedEmail })

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

app.patch('/api/auth/profile', authRequired, async (req, res) => {
  try {
    const { name } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Name is required.' })
    }

    req.user.name = name.trim()
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

app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find().select('number name marks marksWithoutOption').sort({ number: 1 }).lean()
    const payload = { chapters }
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

    const topics = await Topic.find({ chapter: chapter._id }).sort({ number: 1 })
    const topicIds = topics.map((topic) => topic._id)
    const objectiveTypes = await ObjectiveType.find({ topic: { $in: topicIds } }).select('_id topic').lean()
    const scoreMap = new Map()

    if (req.user) {
      const scores = await PracticeScore.find({
        user: req.user._id,
        objectiveType: { $in: objectiveTypes.map((objectiveType) => objectiveType._id) },
      }).lean()
      const objectiveTopicMap = new Map(objectiveTypes.map((objectiveType) => [
        String(objectiveType._id),
        String(objectiveType.topic),
      ]))

      scores.forEach((score) => {
        const topicId = objectiveTopicMap.get(String(score.objectiveType))

        if (!topicId || !score.totalQuestions) return

        const current = scoreMap.get(topicId) || {
          attemptedTypes: 0,
          totalBestScore: 0,
          totalQuestions: 0,
          totalPercent: 0,
        }
        const bestScore = Number(score.bestScore || 0)
        const totalQuestions = Number(score.totalQuestions || 0)

        current.attemptedTypes += 1
        current.totalBestScore += bestScore
        current.totalQuestions += totalQuestions
        current.totalPercent += totalQuestions ? (bestScore / totalQuestions) * 100 : 0
        scoreMap.set(topicId, current)
      })
    }

    res.json({
      chapter,
      topics: topics.map((topic) => {
        const progress = scoreMap.get(String(topic._id))
        const averagePercent = progress?.attemptedTypes
          ? Math.round(progress.totalPercent / progress.attemptedTypes)
          : 0

        return {
          ...publicTopic(topic, Boolean(req.user?.isAdmin)),
          practiceProgress: {
            averagePercent,
            attemptedTypes: progress?.attemptedTypes || 0,
            bestScore: progress?.totalBestScore || 0,
            totalQuestions: progress?.totalQuestions || 0,
            isDone: Boolean(progress?.attemptedTypes),
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

    res.json({ topic })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This topic number already exists in this chapter.' })
    }

    res.status(500).json({ message: 'Could not update topic.' })
  }
})

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
    const countMap = new Map(questionCounts.map((item) => [String(item._id), item.count]))
    const scoreMap = new Map()

    if (req.user) {
      const scores = await PracticeScore.find({
        user: req.user._id,
        objectiveType: { $in: objectiveTypeIds },
      }).lean()

      scores.forEach((score) => {
        scoreMap.set(String(score.objectiveType), score)
      })
    }

    const isAdmin = Boolean(req.user?.isAdmin)

    res.json({
      topic: publicTopic(topic, isAdmin),
      chapter: topic.chapter,
      objectiveTypes: objectiveTypes.map((objectiveType) => ({
        ...objectiveType,
        questionCount: countMap.get(String(objectiveType._id)) || 0,
        bestScore: scoreMap.get(String(objectiveType._id)) || null,
        isDone: Boolean(scoreMap.get(String(objectiveType._id))?.isDone),
      })),
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

    const { type } = req.body

    if (!type) {
      return res.status(400).json({ message: 'Objective type is required.' })
    }

    const objectiveType = await ObjectiveType.create({
      topic: topic._id,
      type,
    })

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

    const objectiveType = await ObjectiveType.findOne({
      topic: topic._id,
      type: req.params.type,
    })

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    const questions = await ObjectiveQuestion.find({ objectiveType: objectiveType._id }).sort({ createdAt: 1 })
    const isAdmin = Boolean(req.user?.isAdmin)
    const bestScore = req.user
      ? await PracticeScore.findOne({ user: req.user._id, objectiveType: objectiveType._id })
      : null

    res.json({
      topic: publicTopic(topic, isAdmin),
      chapter: topic.chapter,
      objectiveType,
      bestScore,
      questions: questions.map((question) => ({
        _id: question._id,
        question: question.question,
        options: question.options,
        pairs: question.pairs,
        imageUrl: publicQuestionImageUrl(question),
        answerImageUrl: publicAnswerImageUrl(question),
        chapterId: topic.chapter?._id,
        chapterNumber: topic.chapter?.number,
        chapterName: topic.chapter?.name,
        topicName: topic.name,
        objectiveTypeId: objectiveType._id,
        ...(isAdmin ? { correctOption: question.correctOption } : {}),
        ...(isAdmin ? { correctOptions: question.correctOptions } : {}),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load practice questions.' })
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

    const bestScore = await PracticeScore.findOneAndUpdate(
      { user: req.user._id, objectiveType: objectiveType._id },
      {
        $set: {
          isDone,
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
    const objectiveType = await ObjectiveType.findById(req.params.id)

    if (!objectiveType) {
      return res.status(404).json({ message: 'Objective type not found.' })
    }

    const { question, options, correctOption, pairs, correctOptions } = req.body
    const parsedOptions = typeof options === 'string' ? JSON.parse(options || '[]') : options
    const parsedPairs = typeof pairs === 'string' ? JSON.parse(pairs || '[]') : pairs
    const parsedCorrectOptions = typeof correctOptions === 'string' ? JSON.parse(correctOptions || '[]') : correctOptions
    const questionImageFile = req.files?.questionImage?.[0]
    const answerImageFile = req.files?.answerImage?.[0]
    const questionImage = questionImageFile
      ? {
          data: await createWebpImage(questionImageFile.buffer),
          contentType: 'image/webp',
          updatedAt: new Date(),
        }
      : undefined
    const answerImage = answerImageFile
      ? {
          data: await createWebpImage(answerImageFile.buffer),
          contentType: 'image/webp',
          updatedAt: new Date(),
        }
      : undefined

    if (isMatchType(objectiveType.type)) {
      const matchPayload = normalizeMatchQuestionPayload({
        question,
        pairs: parsedPairs,
        options: parsedOptions,
        correctOptions: parsedCorrectOptions,
      })
      const savedQuestion = await ObjectiveQuestion.create({
        objectiveType: objectiveType._id,
        ...matchPayload,
        ...(questionImage ? { questionImage } : {}),
        ...(answerImage ? { answerImage } : {}),
      })

      return res.status(201).json({ question: savedQuestion })
    }

    const isDoneOnlyQuestion = isDoneOnlyType(objectiveType.type)
    const isIdentifySymbolQuestion = objectiveType.type === 'identify-symbol'
    const cleanedOptions = isDoneOnlyQuestion
      ? ['Done', 'View answer']
      : objectiveType.type === 'true-or-false'
        ? ['True', 'False']
        : (parsedOptions || []).map((option) => String(option || '').trim()).filter(Boolean)
    const correctIndex = isDoneOnlyQuestion ? 0 : Number(correctOption)

    if ((requiresFourOptions(objectiveType.type) || isIdentifySymbolQuestion) && cleanedOptions.length !== 4) {
      return res.status(400).json({ message: 'Correlation questions must have exactly four options.' })
    }

    if (isIdentifySymbolQuestion && !questionImage) {
      return res.status(400).json({ message: 'Please upload a symbol image.' })
    }

    if ((!question?.trim() && !questionImage) || cleanedOptions.length < 2) {
      return res.status(400).json({ message: isDoneOnlyQuestion ? 'Question text or question photo is required.' : 'Question and at least two options are required.' })
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= cleanedOptions.length) {
      return res.status(400).json({ message: 'Please select the correct option.' })
    }

    const savedQuestion = await ObjectiveQuestion.create({
      objectiveType: objectiveType._id,
      question,
      options: cleanedOptions,
      correctOption: correctIndex,
      ...(questionImage ? { questionImage } : {}),
      ...(answerImage ? { answerImage } : {}),
    })

    res.status(201).json({ question: savedQuestion })
  } catch (error) {
    res.status(error.message?.startsWith('Match the following') || error.message?.startsWith('Please complete') ? 400 : 500).json({ message: error.message || 'Could not add question.' })
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
    const { question, options, correctOption, pairs, correctOptions } = req.body
    const parsedOptions = typeof options === 'string' ? JSON.parse(options || '[]') : options
    const parsedPairs = typeof pairs === 'string' ? JSON.parse(pairs || '[]') : pairs
    const parsedCorrectOptions = typeof correctOptions === 'string' ? JSON.parse(correctOptions || '[]') : correctOptions
    const existingQuestion = await ObjectiveQuestion.findById(req.params.id).populate('objectiveType')

    if (!existingQuestion) {
      return res.status(404).json({ message: 'Question not found.' })
    }

    const imageUpdate = {}

    const questionImageFile = req.files?.questionImage?.[0]
    const answerImageFile = req.files?.answerImage?.[0]
    const unsetFields = {}

    if (questionImageFile) {
      imageUpdate.questionImage = {
        data: await createWebpImage(questionImageFile.buffer),
        contentType: 'image/webp',
        updatedAt: new Date(),
      }
    } else if (String(req.body.removeImage || '') === 'true') {
      unsetFields.questionImage = 1
    }

    if (answerImageFile) {
      imageUpdate.answerImage = {
        data: await createWebpImage(answerImageFile.buffer),
        contentType: 'image/webp',
        updatedAt: new Date(),
      }
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
        imageUpdate.$unset ? { $set: matchPayload, $unset: imageUpdate.$unset } : { ...matchPayload, ...imageUpdate },
        { new: true, runValidators: true },
      )

      return res.json({ question: updatedQuestion })
    }

    const isDoneOnlyQuestion = isDoneOnlyType(existingQuestion.objectiveType?.type)
    const cleanedOptions = isDoneOnlyQuestion
      ? ['Done', 'View answer']
      : (parsedOptions || []).map((option) => String(option || '').trim()).filter(Boolean)
    const correctIndex = isDoneOnlyQuestion ? 0 : Number(correctOption)

    if (requiresFourOptions(existingQuestion.objectiveType?.type) && cleanedOptions.length !== 4) {
      return res.status(400).json({ message: 'Correlation questions must have exactly four options.' })
    }

    const willHaveQuestionImage = Boolean(imageUpdate.questionImage || (existingQuestion.questionImage?.data && !imageUpdate.$unset?.questionImage))

    if ((!question?.trim() && !willHaveQuestionImage) || cleanedOptions.length < 2) {
      return res.status(400).json({ message: isDoneOnlyQuestion ? 'Question text or question photo is required.' : 'Question and at least two options are required.' })
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= cleanedOptions.length) {
      return res.status(400).json({ message: 'Please select the correct option.' })
    }

    const updatedQuestion = await ObjectiveQuestion.findByIdAndUpdate(
      req.params.id,
      imageUpdate.$unset ? {
        $set: {
          question,
          options: cleanedOptions,
          correctOption: correctIndex,
        },
        $unset: imageUpdate.$unset,
      } : {
        question,
        options: cleanedOptions,
        correctOption: correctIndex,
        ...imageUpdate,
      },
      { new: true, runValidators: true },
    )

    res.json({ question: updatedQuestion })
  } catch (error) {
    res.status(error.message?.startsWith('Match the following') || error.message?.startsWith('Please complete') ? 400 : 500).json({ message: error.message || 'Could not update question.' })
  }
})

app.delete('/api/objective-questions/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const question = await ObjectiveQuestion.findByIdAndDelete(req.params.id)

    if (!question) {
      return res.status(404).json({ message: 'Question not found.' })
    }

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
            doneRewarded: true,
            isDone: true,
          },
        }
        : {
          $set: {
            totalQuestions,
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
        rewardedQuestionIds: [...rewardedQuestionIds],
        isDone: true,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
    const suggestion = await generateProgressSuggestion({
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
    const requestedClassId = String(req.query.classId || req.user?.classId || '').trim()
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 20)
    const classFilter = scope === 'class' && requestedClassId ? { classId: requestedClassId } : {}
    const users = await User.find({
      isAdmin: false,
      ...classFilter,
    })
      .select('name classId totalScore totalMarks totalCorrect totalBrainCells totalAttempts')
      .populate('classId', 'name')
      .sort({ totalScore: -1 })
      .limit(limit)
      .lean()

    const payload = {
      leaderboard: users.map((user) => formatLeaderboardUser(user)),
      scope,
      classId: requestedClassId,
      className: requestedClassId ? (await Class.findById(requestedClassId).select('name').lean())?.name || '' : '',
    }

    res.set('Cache-Control', 'no-store')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ message: 'Could not load leaderboard.' })
  }
})

app.get('/api/leaderboard/me', authRequired, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ isAdmin: false })

    if (req.user.isAdmin) {
      return res.json({
        rank: null,
        totalStudents,
        currentUser: null,
      })
    }

    const currentUser = await User.findById(req.user._id)
      .select('name classId totalScore totalMarks totalCorrect totalBrainCells totalAttempts isAdmin')
      .populate('classId', 'name')
      .lean()

    if (!currentUser) {
      return res.status(404).json({ message: 'Could not load your rank.' })
    }

    const betterScoreCount = await User.countDocuments({
      isAdmin: false,
      totalScore: { $gt: safeNumber(currentUser.totalScore) },
    })

    res.json({
      rank: betterScoreCount + 1,
      totalStudents,
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
    const classDoc = await Class.findByIdAndDelete(req.params.id)

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' })
    }

    await User.updateMany({ classId: classDoc._id }, { $set: { classId: null } })

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
      .limit(Math.min(Math.max(Number(req.query.limit) || 20, 1), 50))
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
    const userRating = currentUserId
      ? dedupedFeedback.find((item) => String(item.user || '') === currentUserId)?.rating || 0
      : clientKey
        ? dedupedFeedback.find((item) => String(item.clientKey || '') === clientKey)?.rating || 0
        : 0

    res.json({
      feedback: dedupedFeedback.map(publicFeedback),
      averageRating,
      ratingCount,
      userRating,
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

    res.status(201).json({ message: publicMessage(messageDoc), audienceCount: recipients.length })
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
    const title = PYQ_FIXED_TITLE
    const month = String(req.body.month || '').trim()
    const subject = PYQ_FIXED_SUBJECT
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

    const payload = {
      pyqs: pyqs.map(publicPyq),
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
    const objectiveTypes = await ObjectiveType.find({ topic: { $in: topicIds } }).lean()
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
          imageUrl: question.questionImage?.data ? `/api/objective-questions/${question._id}/image?v=${question.questionImage.updatedAt?.getTime() || Date.now()}` : '',
          answerImageUrl: question.answerImage?.data ? `/api/objective-questions/${question._id}/answer-image?v=${question.answerImage.updatedAt?.getTime() || Date.now()}` : '',
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

    const canAccessClass = req.user.isAdmin || String(req.user.classId || '') === String(classId)

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
      savedPosts.push(createdPost)
    }

    const selectedClassIdSet = new Set(selectedClassIds.map((value) => String(value)))
    const removedPosts = groupPosts.filter((item) => !selectedClassIdSet.has(String(item.classId)))

    if (removedPosts.length) {
      await ClassPost.deleteMany({ _id: { $in: removedPosts.map((item) => item._id) } })
    }

    const primaryPost = savedPosts[0] || post
    clearCachedResponses('class-feed:')
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

      clearCachedResponses('class-feed:')
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
        createdPosts.push(publicClassPost(post))
      }

      if (!createdPosts.length) {
        return res.status(400).json({ message: 'Please add a message for at least one selected class.' })
      }

      clearCachedResponses('class-feed:')
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

const startServer = async () => {
  console.log(`Starting backend on http://localhost:${PORT}...`)
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })

  if (!MONGODB_URI || MONGODB_URI === 'add_your_mongodb_url_here') {
    console.warn('MONGODB_URI is not set. Add your MongoDB URL in backend/.env.')
    return
  }

  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
    console.log('MongoDB connected')

    await ensureAdminUser()
    await syncLeaderboardTotalsFromAttempts()
    console.log(`Admin ready: ${ADMIN_EMAIL}`)
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
  }
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error.message)
  process.exit(1)
})
