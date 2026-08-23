import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const GoogleIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.9-4.2 2.9-7.22Z" />
    <path fill="#34A853" d="M12 21.7c2.65 0 4.87-.88 6.45-2.39l-3.15-2.45c-.87.58-1.98.93-3.3.93-2.54 0-4.69-1.72-5.46-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.7Z" />
    <path fill="#FBBC05" d="M6.54 13.76A5.86 5.86 0 0 1 6.23 12c0-.61.1-1.2.31-1.76V7.71H3.28A9.73 9.73 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.29l3.26-2.53Z" />
    <path fill="#EA4335" d="M12 6.21c1.45 0 2.75.5 3.77 1.48l2.83-2.83C16.87 3.29 14.65 2.3 12 2.3a9.74 9.74 0 0 0-8.72 5.41l3.26 2.53C7.31 7.93 9.46 6.21 12 6.21Z" />
  </svg>
)

const Signuppage = () => {
  const navigate = useNavigate()
  const { signInWithGoogle, authLoading, error: authError } = useAuth()
  const [error, setError] = useState('')

  const handleGoogleSignup = async () => {
    setError('')
    try {
      await signInWithGoogle()
      navigate('/complete-profile', { replace: true })
    } catch (authActionError) {
      setError(authError || authActionError.message)
    }
  }

  return (
    <section className="relative flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-100 px-4 py-10">
      <div className="w-full max-w-[520px] overflow-hidden rounded-[2.5rem] border border-white bg-white p-7 shadow-2xl shadow-emerald-900/10 sm:p-12">
        <div className="flex flex-col justify-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600">
            <UserPlus size={30} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900">Create Account</h2>
          <p className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">Continue with Google to get started.</p>

          {error && <p className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-600">{error}</p>}

          <button type="button" onClick={handleGoogleSignup} disabled={authLoading} className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60">
            {authLoading ? <Loader2 className="animate-spin" size={19} /> : <GoogleIcon />}
            {authLoading ? 'Connecting to Google…' : 'Continue with Google'}
          </button>

          <p className="mt-8 text-center text-sm font-medium text-slate-500">Already have an account?{' '}<Link to="/signin" className="font-bold text-emerald-600 hover:text-teal-500">Sign in</Link></p>
        </div>
      </div>
    </section>
  )
}

export default Signuppage
