const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const dotenv = require('dotenv')
const multer = require('multer')
const sharp = require('sharp')
const crypto = require('crypto')
const nodemailer = require('nodemailer')

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

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI
const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_change_me'
const TOKEN_AGE = '7d'
const ADMIN_EMAIL = 'rethish.2006sm@gmail.com'
const ADMIN_PASSWORD = '1234567'
const PYQ_FIXED_TITLE = 'Class 10 Science 2'
const PYQ_FIXED_SUBJECT = 'Science 2'
const OTP_TTL_MS = 10 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite'
const MAX_COMPLETION_TOKENS = Number(process.env.MAX_COMPLETION_TOKENS || 1800)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

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
    passwordHash: {
      type: String,
      required: true,
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
  },
  { timestamps: true },
)

const User = mongoose.model('User', userSchema)

const signupOtpStore = new Map()
const forgotPasswordOtpStore = new Map()
const passwordResetTokenStore = new Map()

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const normalizeEmail = (email = '') => email.toLowerCase().trim()
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const createOtp = () => crypto.randomInt(100000, 1000000).toString()
const createResetToken = () => crypto.randomBytes(32).toString('hex')

const hasEmailConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)

const storeOtp = (store, email, payload = {}) => {
  store.set(email, {
    otp: createOtp(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    ...payload,
  })

  return store.get(email).otp
}

const verifyStoredOtp = (store, email, otp) => {
  const record = store.get(email)

  if (!record) {
    return { ok: false, status: 400, message: 'Please request a new OTP first.' }
  }

  if (Date.now() > record.expiresAt) {
    store.delete(email)
    return { ok: false, status: 400, message: 'OTP expired. Please request a new one.' }
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    store.delete(email)
    return { ok: false, status: 429, message: 'Too many wrong attempts. Please request a new OTP.' }
  }

  if (record.otp !== String(otp).trim()) {
    record.attempts += 1
    return { ok: false, status: 400, message: 'Invalid OTP.' }
  }

  return { ok: true, record }
}

const sendEmail = async ({ to, subject, text, html }) => {
  if (!hasEmailConfig()) {
    throw new Error('Email is not configured. Add EMAIL_USER and EMAIL_PASS in backend/.env.')
  }

  await mailTransporter.sendMail({
    from: `"Innovative Science 2" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  })
}

const sendOtpEmail = async ({ email, otp, purpose }) => {
  const isSignup = purpose === 'signup'
  const title = isSignup ? 'Verify your account' : 'Reset your password'
  const preheader = isSignup
    ? 'Use this secure OTP to complete your Innovative Science 2 signup.'
    : 'Use this secure OTP to reset your Innovative Science 2 password.'
  const action = isSignup ? 'complete your signup' : 'reset your password'
  const signature = 'Rethish Sir'
  const otpDigits = String(otp)
    .split('')
    .map((digit) => `
      <span style="display:inline-block;width:38px;height:46px;line-height:46px;margin:0 3px;border-radius:10px;background:#ffffff;color:#0f172a;font-size:24px;font-weight:800;text-align:center;box-shadow:0 10px 24px rgba(15,23,42,0.14);border:1px solid #dbeafe">${digit}</span>
    `)
    .join('')

  await sendEmail({
    to: email,
    subject: `Innovative Science 2 secure OTP: ${otp}`,
    text: `Dear student, your Innovative Science 2 OTP is ${otp}. Use it within 10 minutes to ${action}. This secure message is from ${signature}. If you cannot find this email, please check your Spam folder.`,
    html: `
      <div style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${preheader}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef2ff;padding:28px 0">
          <tr>
            <td align="center" style="padding:28px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,0.16)">
                <tr>
                  <td style="padding:0;background:#111827">
                    <div style="padding:30px 32px;background:linear-gradient(135deg,#111827 0%,#164e63 54%,#0f766e 100%)">
                      <div style="display:inline-block;padding:7px 11px;border:1px solid rgba(255,255,255,0.26);border-radius:999px;color:#d1fae5;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">Innovative Science 2</div>
                      <h1 style="margin:18px 0 8px;color:#ffffff;font-size:28px;line-height:1.18;font-weight:800;letter-spacing:0">${title}</h1>
                      <p style="margin:0;color:#dbeafe;font-size:15px;line-height:1.65">A secure verification code from ${signature} for your learning account.</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px">
                    <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7">Dear student, use this 6 digit OTP to ${action}.</p>
                    <div style="margin:24px 0;padding:26px 18px;border-radius:18px;background:linear-gradient(180deg,#f8fafc 0%,#ecfeff 100%);border:1px solid #dbeafe;text-align:center">
                      <div style="margin:0 0 14px;color:#64748b;font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase">Secure OTP</div>
                      <div style="white-space:nowrap">${otpDigits}</div>
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:24px 0">
                      <tr>
                        <td style="padding:14px 16px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:14px;line-height:1.6">
                          This OTP expires in <strong style="color:#0f172a">10 minutes</strong>. For your security, do not share it with anyone.
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0;color:#475569;font-size:14px;line-height:1.7">If you cannot find this email later, please check your Spam folder.</p>
                    <p style="margin:24px 0 0;color:#0f172a;font-size:15px;line-height:1.6">Regards,<br><strong>${signature}</strong><br><span style="color:#64748b">Innovative Science 2</span></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;text-align:center">
                    This message was sent because an OTP was requested for ${email}.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  })
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
  },
  { timestamps: true },
)

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
    pdf: {
      data: Buffer,
      contentType: String,
      originalName: String,
      updatedAt: Date,
    },
  },
  { timestamps: true },
)

const Class = mongoose.model('Class', classSchema)
const PracticeAttempt = mongoose.model('PracticeAttempt', practiceAttemptSchema)
const Report = mongoose.model('Report', reportSchema)
const Message = mongoose.model('Message', messageSchema)
const Pyq = mongoose.model('Pyq', pyqSchema)

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber || '',
  isAdmin: Boolean(user.isAdmin),
  classId: user.classId?._id?.toString?.() || user.classId?.toString?.() || '',
  className: user.classId?.name || '',
  profileImageUrl: user.profileImage?.data
    ? `/api/auth/users/${user._id}/avatar?v=${
        user.profileImage.updatedAt?.getTime() || Date.now()
      }`
    : '',
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
  pdfUrl: pyq.pdf?.data
    ? `/api/pyqs/${pyq._id}/pdf?v=${pyq.pdf.updatedAt?.getTime() || Date.now()}`
    : '',
  uploadedAt: pyq.createdAt,
})

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

const summarizeAttemptHistory = (attempts = []) => {
  const chapterTotals = new Map()
  let totalBrainCells = 0
  let totalScore = 0
  let totalQuestions = 0
  let attemptCount = attempts.length

  attempts.forEach((attempt) => {
    totalScore += safeNumber(attempt.totalScore)
    totalQuestions += safeNumber(attempt.totalQuestions)

    ;(attempt.chapterBreakdown || []).forEach((chapterEntry) => {
      const key = String(chapterEntry.chapterId)
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
        sourceName: attempt.sourceName,
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
      totalBrainCells += safeNumber(chapterEntry.brainCells)
    })
  })

  const chapterProgress = [...chapterTotals.values()].sort((left, right) => left.chapterNumber - right.chapterNumber)

  return {
    chapterProgress,
    totalBrainCells,
    totalScore,
    totalQuestions,
    attemptCount,
    averagePercent: totalQuestions ? Math.round((totalScore / totalQuestions) * 100) : 0,
  }
}

const buildUserProgress = async (userDoc) => {
  const user = userDoc?.toObject ? userDoc.toObject() : userDoc
  const classId = user.classId?._id || user.classId || null
  const [attempts, classDoc] = await Promise.all([
    PracticeAttempt.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
    classId ? Class.findById(classId).lean() : Promise.resolve(null),
  ])

  const summary = summarizeAttemptHistory(attempts)
  const chapterReports = summary.chapterProgress.map((chapterEntry) => ({
    ...chapterEntry,
    latestSuggestion: chapterEntry.conceptSummary?.summary || '',
    weakAreas: chapterEntry.conceptSummary?.focusAreas || [],
    solutionSteps: chapterEntry.conceptSummary?.solutionSteps || [],
  }))
  const overallBrainCells = summary.totalBrainCells

  return {
    userId: String(user._id),
    name: user.name,
    email: user.email,
    classId: classDoc?._id ? String(classDoc._id) : String(user.classId || ''),
    className: classDoc?.name || '',
    totalBrainCells: overallBrainCells,
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

const buildProgressRowsForUsers = async (users = []) => {
  const userIds = users.map((user) => user._id)
  const attempts = await PracticeAttempt.find({ user: { $in: userIds } }).sort({ createdAt: -1 }).lean()
  const attemptMap = new Map()

  attempts.forEach((attempt) => {
    const key = String(attempt.user)
    const current = attemptMap.get(key) || []
    current.push(attempt)
    attemptMap.set(key, current)
  })

  return Promise.all(users.map(async (user) => {
    const summary = summarizeAttemptHistory(attemptMap.get(String(user._id)) || [])
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
      classId: classDoc?._id ? String(classDoc._id) : String(user.classId || ''),
      className: classDoc?.name || '',
      isAdmin: Boolean(user.isAdmin),
      totalBrainCells: summary.totalBrainCells,
      averagePercent: summary.averagePercent,
      attemptCount: summary.attemptCount,
      totalScore: summary.totalScore,
      totalQuestions: summary.totalQuestions,
      chapterProgress: summary.chapterProgress,
    }
  }))
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

app.post('/api/auth/signup/send-otp', async (req, res) => {
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

    const passwordHash = await bcrypt.hash(password, 12)
    const otp = storeOtp(signupOtpStore, normalizedEmail, {
      name: name.trim(),
      phoneNumber: normalizedPhoneNumber,
      passwordHash,
    })

    await sendOtpEmail({ email: normalizedEmail, otp, purpose: 'signup' })

    res.json({
      message: 'OTP sent successfully. Please check your inbox and Spam folder.',
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not send signup OTP.' })
  }
})

app.post('/api/auth/signup/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' })
    }

    const verification = verifyStoredOtp(signupOtpStore, normalizedEmail, otp)

    if (!verification.ok) {
      return res.status(verification.status).json({ message: verification.message })
    }

    const existingUser = await User.findOne({ email: normalizedEmail })

    if (existingUser) {
      signupOtpStore.delete(normalizedEmail)
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const user = await User.create({
      name: verification.record.name,
      email: normalizedEmail,
      phoneNumber: verification.record.phoneNumber || '',
      passwordHash: verification.record.passwordHash,
    })
    await user.populate('classId')
    const token = createToken(user)
    signupOtpStore.delete(normalizedEmail)

    res.status(201).json({
      token,
      expiresInDays: 7,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not verify OTP and create account.' })
  }
})

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Password is wrong.' })
    }

    await user.populate('classId')

    res.json({
      token: createToken(user),
      expiresInDays: 7,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not sign in.' })
  }
})

app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' })
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    const otp = storeOtp(forgotPasswordOtpStore, normalizedEmail)
    await sendOtpEmail({ email: normalizedEmail, otp, purpose: 'forgot-password' })

    res.json({
      message: 'OTP sent successfully. Please check your inbox and Spam folder.',
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not send password reset OTP.' })
  }
})

app.post('/api/auth/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' })
    }

    const verification = verifyStoredOtp(forgotPasswordOtpStore, normalizedEmail, otp)

    if (!verification.ok) {
      return res.status(verification.status).json({ message: verification.message })
    }

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      forgotPasswordOtpStore.delete(normalizedEmail)
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    const resetToken = createResetToken()
    passwordResetTokenStore.set(resetToken, {
      email: normalizedEmail,
      expiresAt: Date.now() + OTP_TTL_MS,
    })
    forgotPasswordOtpStore.delete(normalizedEmail)

    res.json({
      resetToken,
      message: 'OTP verified. Please set a new password.',
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not verify OTP.' })
  }
})

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    }

    const resetRecord = passwordResetTokenStore.get(resetToken)

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid reset session. Please request a new OTP.' })
    }

    if (Date.now() > resetRecord.expiresAt) {
      passwordResetTokenStore.delete(resetToken)
      return res.status(400).json({ message: 'Reset session expired. Please request a new OTP.' })
    }

    const user = await User.findOne({ email: resetRecord.email })

    if (!user) {
      passwordResetTokenStore.delete(resetToken)
      return res.status(404).json({ message: 'No account found with this email.' })
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    await user.save()
    passwordResetTokenStore.delete(resetToken)

    res.json({ message: 'Password updated successfully. Please sign in with your new password.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not reset password.' })
  }
})

app.get('/api/auth/me', authRequired, async (req, res) => {
  await req.user.populate('classId')
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
    const refreshedUser = await User.findById(req.user._id).populate('classId')

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

    const isPasswordCorrect = await bcrypt.compare(currentPassword, req.user.passwordHash)

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
    const refreshedUser = await User.findById(req.user._id).populate('classId')

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

    const isPasswordCorrect = await bcrypt.compare(currentPassword, req.user.passwordHash)

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Current password is incorrect.' })
    }

    req.user.passwordHash = await bcrypt.hash(newPassword, 12)
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
    const refreshedUser = await User.findById(req.user._id).populate('classId')

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
    res.set('Cache-Control', 'public, max-age=604800')
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
    res.set('Cache-Control', 'public, max-age=604800')
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
    res.set('Cache-Control', 'public, max-age=604800')
    res.send(question.answerImage.data)
  } catch (error) {
    res.status(404).json({ message: 'Answer image not found.' })
  }
})

app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find().sort({ number: 1 })
    res.json({ chapters })
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

    res.json({ message: 'Chapter and its topics deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete chapter.' })
  }
})

app.get('/api/chapters/:chapterNumber/topics', optionalAuth, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ number: Number(req.params.chapterNumber) })

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
        new: true,
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
      { upsert: true, new: true, setDefaultsOnInsert: true },
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
      { upsert: true, new: true, setDefaultsOnInsert: true },
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
    const user = await User.findById(req.user._id).populate('classId')
    const progress = await buildUserProgress(user)
    res.json({ user: publicUser(user), progress })
  } catch (error) {
    res.status(500).json({ message: 'Could not load your progress.' })
  }
})

app.get('/api/progress/improvement', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('classId')
    const progress = await buildUserProgress(user)
    res.json({ user: publicUser(user), progress })
  } catch (error) {
    res.status(500).json({ message: 'Could not load improvement data.' })
  }
})

app.get('/api/leaderboard', optionalAuth, async (req, res) => {
  try {
    const scope = String(req.query.scope || 'all').toLowerCase()
    const requestedClassId = String(req.query.classId || req.user?.classId || '').trim()
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 100)
    const classFilter = scope === 'class' && requestedClassId ? { classId: requestedClassId } : {}
    const users = await User.find({
      isAdmin: false,
      ...classFilter,
    }).populate('classId')

    const rows = await buildProgressRowsForUsers(users)
    rows.sort((left, right) => {
      if (right.totalBrainCells !== left.totalBrainCells) {
        return right.totalBrainCells - left.totalBrainCells
      }

      if (right.averagePercent !== left.averagePercent) {
        return right.averagePercent - left.averagePercent
      }

      return right.attemptCount - left.attemptCount
    })

    res.json({
      leaderboard: rows.slice(0, limit),
      scope,
      classId: requestedClassId,
      className: requestedClassId ? (await Class.findById(requestedClassId).lean())?.name || '' : '',
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load leaderboard.' })
  }
})

app.get('/api/classes', async (req, res) => {
  try {
    const classes = await Class.find().sort({ name: 1 }).lean()
    const classIds = classes.map((item) => item._id)
    const studentCounts = await User.aggregate([
      { $match: { isAdmin: false, classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(studentCounts.map((item) => [String(item._id), item.count]))

    res.json({
      classes: classes.map((item) => ({
        ...item,
        studentCount: countMap.get(String(item._id)) || 0,
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load classes.' })
  }
})

app.get('/api/admin/students', authRequired, adminRequired, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase()
    const users = await User.find({ isAdmin: false }).populate('classId')
    const rows = await buildProgressRowsForUsers(users)

    const filtered = search
      ? rows.filter((student) => (
        student.name.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.className.toLowerCase().includes(search)
      ))
      : rows

    filtered.sort((left, right) => right.totalBrainCells - left.totalBrainCells)

    const classes = await Class.find().sort({ name: 1 }).lean()
    const classCounts = await User.aggregate([
      { $match: { isAdmin: false, classId: { $ne: null } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ])
    const classCountMap = new Map(classCounts.map((item) => [String(item._id), item.count]))

    res.json({
      totalStudents: rows.length,
      students: filtered,
      classes: classes.map((item) => ({
        ...item,
        studentCount: classCountMap.get(String(item._id)) || 0,
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load student list.' })
  }
})

app.get('/api/admin/students/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('classId')

    if (!user || user.isAdmin) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    const progress = await buildUserProgress(user)
    res.json({
      user: publicUser(user),
      progress,
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load student details.' })
  }
})

app.get('/api/admin/classes', authRequired, adminRequired, async (req, res) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 }).lean()
    const classIds = classes.map((item) => item._id)
    const studentCounts = await User.aggregate([
      { $match: { isAdmin: false, classId: { $in: classIds } } },
      { $group: { _id: '$classId', count: { $sum: 1 } } },
    ])
    const countMap = new Map(studentCounts.map((item) => [String(item._id), item.count]))

    res.json({
      classes: classes.map((item) => ({
        ...item,
        studentCount: countMap.get(String(item._id)) || 0,
      })),
    })
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

    const updatedStudents = await User.find({ _id: { $in: studentIds } }).populate('classId')

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
    const user = await User.findById(req.params.id)

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

    const refreshedUser = await User.findById(user._id).populate('classId')
    res.json({ user: publicUser(refreshedUser) })
  } catch (error) {
    res.status(500).json({ message: 'Could not update student class.' })
  }
})

app.get('/api/admin/reports', authRequired, adminRequired, async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500))
      .populate('user objectiveType chapterId questionId')
      .lean()

    res.json({ reports })
  } catch (error) {
    res.status(500).json({ message: 'Could not load reports.' })
  }
})

app.get('/api/messages/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('classId')
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
      messages,
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load messages.' })
  }
})

app.post('/api/admin/messages', authRequired, adminRequired, async (req, res) => {
  try {
    const { targetType, targetUserIds = [], targetClassId = '', subject = '', body = '' } = req.body

    if (!body?.trim()) {
      return res.status(400).json({ message: 'Message text is required.' })
    }

    let recipients = []
    let classDoc = null

    if (targetType === 'all') {
      recipients = await User.find({ isAdmin: false }).lean()
    } else if (targetType === 'class') {
      if (!targetClassId) {
        return res.status(400).json({ message: 'Please select a class.' })
      }

      classDoc = await Class.findById(targetClassId)
      if (!classDoc) {
        return res.status(404).json({ message: 'Class not found.' })
      }

      recipients = await User.find({ isAdmin: false, classId: classDoc._id }).lean()
    } else if (targetType === 'user') {
      if (!Array.isArray(targetUserIds) || !targetUserIds.length) {
        return res.status(400).json({ message: 'Please select at least one student.' })
      }

      recipients = await User.find({ _id: { $in: targetUserIds }, isAdmin: false }).lean()
    } else {
      return res.status(400).json({ message: 'Invalid message target.' })
    }

    const messageDoc = await Message.create({
      createdBy: req.user._id,
      targetType,
      targetUserIds: recipients.map((item) => item._id),
      targetClassId: classDoc?._id || null,
      subject,
      body: body.trim(),
      audienceCount: recipients.length,
      sentUserEmails: recipients.map((item) => item.email),
    })

    if (hasEmailConfig() && recipients.length) {
      await Promise.all(recipients.map(async (recipient) => {
        try {
          await sendEmail({
            to: recipient.email,
            subject: subject || 'Message from Rethish Sir',
            text: body.trim(),
            html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.7"><p>${body.trim().replace(/\n/g, '<br />')}</p></div>`,
          })
        } catch (error) {
          return null
        }
      }))
    }

    res.status(201).json({ message: messageDoc, audienceCount: recipients.length })
  } catch (error) {
    res.status(500).json({ message: 'Could not send message.' })
  }
})

app.post('/api/admin/pyqs', authRequired, adminRequired, pdfUpload.single('pdf'), async (req, res) => {
  try {
    const title = PYQ_FIXED_TITLE
    const month = String(req.body.month || '').trim()
    const subject = PYQ_FIXED_SUBJECT
    const year = String(req.body.year || '').trim()

    if (!month) {
      return res.status(400).json({ message: 'Month is required.' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file.' })
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are allowed.' })
    }

    const pyq = await Pyq.create({
      title,
      month,
      subject,
      year,
      uploadedBy: req.user._id,
      pdf: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        originalName: req.file.originalname,
        updatedAt: new Date(),
      },
    })

    res.status(201).json({
      message: 'PYQ uploaded successfully.',
      pyq: publicPyq(pyq),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not upload PYQ.' })
  }
})

app.delete('/api/admin/pyqs/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const pyq = await Pyq.findByIdAndDelete(req.params.id)

    if (!pyq) {
      return res.status(404).json({ message: 'PYQ not found.' })
    }

    res.json({ message: 'PYQ deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Could not delete PYQ.' })
  }
})

app.get('/api/pyqs', optionalAuth, async (req, res) => {
  try {
    const pyqs = await Pyq.find().sort({ createdAt: -1 }).lean()

    res.json({
      pyqs: pyqs.map(publicPyq),
    })
  } catch (error) {
    res.status(500).json({ message: 'Could not load PYQs.' })
  }
})

app.get('/api/pyqs/:id/pdf', async (req, res) => {
  try {
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

    if (hasEmailConfig()) {
      try {
        await Promise.all([
          sendEmail({
            to: ADMIN_EMAIL,
            subject: `Question report from ${studentName}`,
            text: reportText,
            html: reportHtml,
          }),
          studentEmail
            ? sendEmail({
              to: studentEmail,
              subject: 'Your report was received - Innovative Science 2',
              text: [
                'Thank you for reporting the question.',
                'This message is from Innovative Science 2 | Rethish Sir.',
                '',
                `Chosen error: ${chosenErrorLabel}`,
                `Chapter: ${chapterLabel}`,
                `Objective: ${objectiveTypeName}`,
                `Question: ${questionText}`,
                `Answer: ${correctAnswerText}`,
                'Options:',
                optionLines,
                '',
                `Student message: ${safeDetails || 'No extra message provided.'}`,
              ].join('\n'),
              html: `
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.7;background:#ffffff">
                  <div style="max-width:720px;margin:0 auto;padding:24px">
                    <div style="padding:18px 20px;border-radius:18px;background:#ecfeff;border:1px solid #a5f3fc">
                      <p style="margin:0 0 8px;color:#0e7490;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">Innovative Science 2 | Rethish Sir</p>
                      <h2 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;color:#0f172a">Thank you for your report</h2>
                    </div>
                    <div style="margin-top:18px;padding:18px 20px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc">
                      <p style="margin:0 0 10px;font-size:14px"><strong>Chosen error:</strong> ${escapeHtml(chosenErrorLabel)}</p>
                      <p style="margin:0 0 10px;font-size:14px"><strong>Student message:</strong> ${escapeHtml(safeDetails || 'No extra message provided.')}</p>
                      <p style="margin:0 0 10px;font-size:14px"><strong>Chapter:</strong> ${escapeHtml(chapterLabel)}</p>
                      <p style="margin:0 0 10px;font-size:14px"><strong>Objective:</strong> ${escapeHtml(objectiveTypeName)}</p>
                      <p style="margin:0 0 10px;font-size:14px"><strong>Question:</strong></p>
                      <p style="margin:0;font-size:14px;color:#334155">${escapeHtml(questionText)}</p>
                      <p style="margin:14px 0 0;font-size:14px"><strong>Answer:</strong> ${escapeHtml(correctAnswerText)}</p>
                    </div>
                    <div style="margin-top:18px;padding:18px 20px;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff">
                      <p style="margin:0 0 10px;font-size:14px"><strong>Options:</strong></p>
                      <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#334155">${escapeHtml(optionLines)}</pre>
                    </div>
                    <div style="margin-top:18px;padding:18px 20px;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff">
                      <p style="margin:0;font-size:14px"><strong>We will review this and help you soon.</strong></p>
                    </div>
                  </div>
                </div>
              `,
            })
            : Promise.resolve(),
        ])
      } catch (mailError) {
        // Keep the API successful even when email delivery fails.
      }
    }

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

    if (hasEmailConfig()) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: subject ? `Contact: ${subject}` : `Contact from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.7">
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject || 'General enquiry'}</p>
            <p>${message.replace(/\n/g, '<br />')}</p>
          </div>
        `,
      })
    }

    res.json({ message: 'Your message was sent successfully.' })
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
      return res.json({ chapters: [], objectiveTypes: [], totalQuestions: 0 })
    }

    const chapters = await Chapter.find({ number: { $in: chapterNumbers } }).sort({ number: 1 }).lean()
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
      chapters,
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

const ensureAdminUser = async () => {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      name: 'Rethish Sir',
      email: ADMIN_EMAIL,
      passwordHash,
      isAdmin: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })

  if (!MONGODB_URI || MONGODB_URI === 'add_your_mongodb_url_here') {
    console.warn('MONGODB_URI is not set. Add your MongoDB URL in backend/.env.')
  } else {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
      await ensureAdminUser()
      console.log('MongoDB connected')
      console.log(`Admin ready: ${ADMIN_EMAIL}`)
    } catch (error) {
      console.error('MongoDB connection failed:', error.message)
    }
  }
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error.message)
  process.exit(1)
})
