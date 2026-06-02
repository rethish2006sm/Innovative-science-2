import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Dna, Eye, EyeOff, Leaf, Microscope, KeyRound, X } from 'lucide-react'
import { apiRequest } from '../api'
import { getStoredAuth, saveAuth } from '../authStorage'

const Signinpage = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [forgotForm, setForgotForm] = useState({ email: '', newPassword: '', confirmPassword: '' })
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [isForgotLoading, setIsForgotLoading] = useState(false)

  useEffect(() => {
    if (getStoredAuth()) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const openForgotPassword = () => {
    setForgotForm({ email: form.email, newPassword: '', confirmPassword: '' })
    setForgotMessage('')
    setForgotError('')
    setIsForgotOpen(true)
  }

  const closeForgotPassword = () => {
    setIsForgotOpen(false)
    setForgotForm({ email: '', newPassword: '', confirmPassword: '' })
    setForgotMessage('')
    setForgotError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const data = await apiRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(form),
      })

      saveAuth(data)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.status === 404) {
        navigate('/signup', { state: { email: form.email } })
        return
      }

      setError(err.status === 401 ? 'Password is wrong.' : err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    setForgotError('')
    setForgotMessage('')
    setIsForgotLoading(true)

    try {
      if (forgotForm.newPassword !== forgotForm.confirmPassword) {
        setForgotError('New passwords do not match.')
        return
      }

      const data = await apiRequest('/api/auth/forgot-password/reset', {
        method: 'POST',
        body: JSON.stringify({ email: forgotForm.email, newPassword: forgotForm.newPassword }),
      })

      setForgotMessage(data.message)
      setForm({ email: forgotForm.email, password: '' })
    } catch (err) {
      setForgotError(err.message)
    } finally {
      setIsForgotLoading(false)
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
          disabled={isLoading}
          className="group mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoading ? (
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
          <motion.form
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onSubmit={handleForgotSubmit}
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl shadow-slate-950/20 sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <KeyRound size={22} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Forgot password</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Enter your email and choose a new password. No OTP is needed.
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

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Email Address
                <input
                  type="email"
                  value={forgotForm.email}
                  onChange={(event) =>
                    setForgotForm({
                      ...forgotForm,
                      email: event.target.value,
                    })
                  }
                  required
                  placeholder="email@gmail.com"
                  className="h-13 rounded-2xl border-2 border-slate-100 bg-white px-4 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                New password
                <input
                  type="password"
                  minLength={6}
                  value={forgotForm.newPassword}
                  onChange={(event) => setForgotForm({ ...forgotForm, newPassword: event.target.value })}
                  required
                  placeholder="New password"
                  className="h-13 rounded-2xl border-2 border-slate-100 bg-white px-4 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Confirm new password
                <input
                  type="password"
                  minLength={6}
                  value={forgotForm.confirmPassword}
                  onChange={(event) => setForgotForm({ ...forgotForm, confirmPassword: event.target.value })}
                  required
                  placeholder="Confirm new password"
                  className="h-13 rounded-2xl border-2 border-slate-100 bg-white px-4 text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                />
              </label>
            </div>

            {forgotMessage && <p className="mt-4 text-sm font-bold text-emerald-600">{forgotMessage}</p>}
            {forgotError && <p className="mt-4 text-sm font-bold text-rose-500">{forgotError}</p>}

            <button
              type="submit"
              disabled={isForgotLoading}
              className="mt-6 flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isForgotLoading ? 'Updating password...' : 'Set New Password'}
            </button>
          </motion.form>
        </div>
      )}
    </section>
  )
}

export default Signinpage
