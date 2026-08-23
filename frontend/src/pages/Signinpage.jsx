import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Dna, Eye, EyeOff, Leaf, Microscope, MessageCircleMore, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const WHATSAPP_NUMBER = '917304930375'
const WHATSAPP_FALLBACK_MESSAGE = 'Hello Sir, I need help with my account password.'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_FALLBACK_MESSAGE)}`

const Signinpage = () => {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, authLoading, error: authError } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const openForgotPassword = () => {
    setIsForgotOpen(true)
  }

  const closeForgotPassword = () => {
    setIsForgotOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(authError || err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      navigate('/complete-profile', { replace: true })
      return
    } catch (err) {
      setError(authError || err.message)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <section className="relative flex min-h-[calc(100vh-6rem)] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-100 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -30, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-10 top-20 text-emerald-200/50"
        >
          <Dna size={180} strokeWidth={1} />
        </motion.div>

        <motion.div
          animate={{ y: [0, 40, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute right-10 top-40 text-teal-200/40"
        >
          <Microscope size={140} strokeWidth={1} />
        </motion.div>

        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-10 left-1/4 text-green-200/50"
        >
          <Leaf size={160} strokeWidth={1} />
        </motion.div>
      </div>

      <motion.form
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-[2.5rem] border border-white/60 bg-white/70 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur-2xl sm:p-10"
      >
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-400 text-white shadow-lg shadow-emerald-500/30">
            <Dna size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Welcome Back</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Continue your journey with Innovative Science 2.
          </p>
        </motion.div>

        <motion.button
          variants={itemVariants}
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || authLoading || isGoogleLoading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGoogleLoading ? <span>Opening Google…</span> : <><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.9-4.2 2.9-7.22Z" /><path fill="#34A853" d="M12 21.7c2.65 0 4.87-.88 6.45-2.39l-3.15-2.45c-.87.58-1.98.93-3.3.93-2.54 0-4.69-1.72-5.46-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.7Z" /><path fill="#FBBC05" d="M6.54 13.76A5.86 5.86 0 0 1 6.23 12c0-.61.1-1.2.31-1.76V7.71H3.28A9.73 9.73 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.29l3.26-2.53Z" /><path fill="#EA4335" d="M12 6.21c1.45 0 2.75.5 3.77 1.48l2.83-2.83C16.87 3.29 14.65 2.3 12 2.3a9.74 9.74 0 0 0-8.72 5.41l3.26 2.53C7.31 7.93 9.46 6.21 12 6.21Z" /></svg> Continue with Google</>}
        </motion.button>

        <div className="my-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          <span className="h-px flex-1 bg-slate-100" />
          Or sign in with email
          <span className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="grid gap-5">
          <motion.label variants={itemVariants} className="grid gap-2 text-sm font-bold text-slate-700">
            Email Address
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              placeholder="student@science.edu"
              className="h-14 rounded-2xl border-2 border-slate-100 bg-white/80 px-4 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-400/10"
            />
          </motion.label>

          <motion.label variants={itemVariants} className="grid gap-2 text-sm font-bold text-slate-700">
            Password
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                placeholder="Password"
                className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-white/80 px-4 pr-12 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-400/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={openForgotPassword}
              className="justify-self-end text-xs font-bold text-emerald-600 transition-colors hover:text-teal-500"
            >
              Forgot password?
            </button>
          </motion.label>
        </div>

        {error && (
          <motion.p variants={itemVariants} className="mt-4 text-center text-sm font-bold text-rose-500">
            {error}
          </motion.p>
        )}

        <motion.button
          variants={itemVariants}
          type="submit"
          disabled={isLoading || authLoading || isGoogleLoading}
          className="group mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoading || authLoading ? (
            'Authenticating...'
          ) : (
            <>
              Sign in to Dashboard
              <LogIn size={18} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </motion.button>

        <motion.p variants={itemVariants} className="mt-8 text-center text-sm font-medium text-slate-500">
          New to the class?{' '}
          <Link to="/signup" className="font-bold text-emerald-600 transition-colors hover:text-teal-500">
            Create an account
          </Link>
        </motion.p>
      </motion.form>

      {isForgotOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <MessageCircleMore size={22} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Forgot password</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Please contact sir directly on WhatsApp to get the password for this account.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close forgot password"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              Tap the WhatsApp button and send your registered email or class details. Sir can check the account faster that way.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white transition hover:scale-[1.01]"
                onClick={closeForgotPassword}
              >
                Contact Sir on WhatsApp
              </a>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="inline-flex h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  )
}

export default Signinpage
