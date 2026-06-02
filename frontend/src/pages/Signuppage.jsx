import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth, saveAuth } from '../authStorage'

// Updated field styles to match the clean, light aesthetic of your screenshot
const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50'

const initialForm = {
  name: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  otp: '',
}

const Signuppage = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState('details')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (getStoredAuth()) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!otpTimer) return undefined

    const timer = window.setInterval(() => {
      setOtpTimer((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [otpTimer])

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const requestOtp = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!form.phoneNumber.trim()) {
      setError('Phone number is required.')
      return
    }

    setLoading(true)

    try {
      const response = await apiRequest('/api/auth/signup/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phoneNumber: form.phoneNumber,
          password: form.password,
        }),
      })

      setStep('otp')
      setOtpTimer(600)
      setMessage(response?.message || 'OTP sent successfully. Please check your inbox and Spam folder.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const data = await apiRequest('/api/auth/signup/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          otp: form.otp,
        }),
      })

      saveAuth({ token: data.token, user: data.user })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await apiRequest('/api/auth/signup/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phoneNumber: form.phoneNumber,
          password: form.password,
        }),
      })

      setOtpTimer(600)
      setMessage(response?.message || 'A new OTP has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#ebfaf6] via-[#f4fbf9] to-[#e3f7f2] px-4 py-12 text-slate-800">
      
      {/* Decorative Science Watermarks Matching Your Image Background */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-[0.06] text-emerald-800">
        {/* DNA Strands Top Left */}
        <svg className="absolute left-8 top-16 w-32 h-32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.25 0h8.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0-15a3 3 0 013 3v9a3 3 0 01-3 3m0-15a3 3 0 00-3 3v9a3 3 0 003 3" />
        </svg>
        {/* Microscope Top Right */}
        <svg className="absolute right-12 top-24 w-36 h-36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L12 12m4.773-4.773L12 12m0 0l-4.773 4.773M12 12l4.773 4.773" />
        </svg>
        {/* Leaf Bottom Left */}
        <svg className="absolute left-16 bottom-12 w-40 h-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.22 5.22l13.56 13.56M18.78 5.22L5.22 13.56" />
        </svg>
      </div>

      {/* Main Centered Authentication Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[520px] rounded-[2.5rem] bg-white p-8 sm:p-11 shadow-[0_20px_60px_-15px_rgba(15,118,110,0.08)] border border-white"
      >
        {/* Glowing Dynamic Branding Icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00c49f] to-[#05dcb3] text-white shadow-lg shadow-emerald-400/20">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v12M6 12h12" />
          </svg>
        </div>

        {/* Dynamic Headers */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-black tracking-tight text-slate-900">
            {step === 'details' ? 'Welcome' : 'Verify Email'}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-400">
            {step === 'details' 
              ? 'Continue your journey with Innovative Science 2.' 
              : `Enter the 6-digit verification code sent to ${form.email}`}
          </p>
        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3.5 text-xs font-semibold text-emerald-700">
              {message}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-xs font-semibold text-red-600">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Controls */}
        {step === 'details' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold tracking-wide text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={fieldClass}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-bold tracking-wide text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={fieldClass}
                placeholder="student@science.edu"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-bold tracking-wide text-slate-700">Phone Number</label>
              <input
                type="tel"
                required
                value={form.phoneNumber}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className={fieldClass}
                placeholder="Enter phone number"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1.5 text-xs font-bold tracking-wide text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={fieldClass}
                    placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold tracking-wide text-slate-700">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className={fieldClass}
                    placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00c49f] hover:bg-[#00b08f] active:bg-[#009c7f] px-5 py-4 text-sm font-bold text-white transition-all shadow-md shadow-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign up to Dashboard'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-5">
            <div>
              <label className="block mb-1.5 text-xs font-bold tracking-wide text-slate-700">One-Time Password (OTP)</label>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={form.otp}
                onChange={(e) => updateField('otp', e.target.value)}
                className={`${fieldClass} text-center tracking-[0.2em] text-lg font-bold`}
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00c49f] hover:bg-[#00b08f] px-5 py-4 text-sm font-bold text-white transition-all shadow-md shadow-emerald-500/10 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify and create account
            </button>

            {/* OTP Meta controls */}
            <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={loading || otpTimer > 0}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-emerald-50/60 px-4 py-3 text-xs font-bold text-[#00c49f] transition-all hover:bg-emerald-100/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpTimer ? `Resend in ${Math.floor(otpTimer / 60)}:${String(otpTimer % 60).padStart(2, '0')}` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* Global Footer Navigation */}
        <div className="mt-8 text-center text-sm font-medium text-slate-400">
          Already have an account?{' '}
          <Link to="/signin" className="font-bold text-[#00c49f] hover:text-[#00b08f] transition-colors ml-1">
            Sign in
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

export default Signuppage