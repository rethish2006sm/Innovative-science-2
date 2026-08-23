import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStoredAuth } from '../authStorage'

const CompleteProfilePage = () => {
  const navigate = useNavigate()
  const { user, completeProfile } = useAuth()
  const savedUser = getStoredAuth()?.user
  const [name, setName] = useState(savedUser?.name || user?.displayName || '')
  const [phoneNumber, setPhoneNumber] = useState(savedUser?.phoneNumber || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || !phoneNumber.trim()) {
      setError('Name and phone number are required.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await completeProfile({ name: name.trim(), phoneNumber: phoneNumber.trim() })
      navigate('/', { replace: true })
    } catch (profileError) {
      setError(profileError.message || 'Could not save your profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-100 px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] border border-white bg-white p-7 shadow-2xl sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-400 text-white shadow-lg shadow-emerald-500/25">
          <UserRound size={30} />
        </div>
        <h1 className="mt-6 text-center text-3xl font-black text-slate-900">Complete your profile</h1>
        <p className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">
          Add your name and phone number to finish creating your student account.
        </p>

        <div className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Full name
            <input value={name} onChange={(event) => setName(event.target.value)} required className="h-13 rounded-2xl border-2 border-slate-100 px-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Phone number
            <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required className="h-13 rounded-2xl border-2 border-slate-100 px-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10" />
          </label>
        </div>

        {error && <p className="mt-4 text-center text-sm font-bold text-rose-500">{error}</p>}

        <button type="submit" disabled={loading} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Continue'}
        </button>
      </form>
    </section>
  )
}

export default CompleteProfilePage
