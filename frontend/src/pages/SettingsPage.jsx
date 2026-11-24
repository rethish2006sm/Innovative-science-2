import { AlertTriangle, ArrowLeft, Bell, Loader2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiRequest } from '../api'

const SettingsPage = () => {
  const [notificationsAllowed, setNotificationsAllowed] = useState(true)
  const [deletionRequest, setDeletionRequest] = useState(null)
  const [deletionLoading, setDeletionLoading] = useState(true)
  const [deletionSending, setDeletionSending] = useState(false)
  const [deletionError, setDeletionError] = useState('')

  useEffect(() => {
    apiRequest('/api/auth/account-deletion-request')
      .then((data) => setDeletionRequest(data.request || null))
      .catch((error) => setDeletionError(error.message))
      .finally(() => setDeletionLoading(false))
  }, [])

  const requestAccountDeletion = async () => {
    const confirmed = window.confirm(
      'Send an account deletion request to the admin? Your account will only be deleted if the admin approves it.',
    )

    if (!confirmed) return

    setDeletionSending(true)
    setDeletionError('')
    try {
      const data = await apiRequest('/api/auth/account-deletion-request', { method: 'POST' })
      setDeletionRequest(data.request || { status: 'pending' })
    } catch (error) {
      setDeletionError(error.message)
    } finally {
      setDeletionSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        {/* Back */}
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-7">
            
            {/* Left side */}
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-600">
                <Bell className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  Notifications
                </h2>

              </div>
            </div>

            {/* Sliding notification toggle */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setNotificationsAllowed(!notificationsAllowed)
                }
                aria-label={
                  notificationsAllowed
                    ? 'Disable notifications'
                    : 'Enable notifications'
                }
                className={`group relative h-10 w-20 shrink-0 rounded-full border p-1 transition-colors duration-300 active:scale-95 ${
                  notificationsAllowed
                    ? 'border-sky-500 bg-sky-500 shadow-lg shadow-sky-200 hover:bg-sky-600'
                    : 'border-slate-300 bg-slate-200 hover:bg-slate-300'
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
                    notificationsAllowed ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  <Bell className={`h-3 w-3 ${notificationsAllowed ? 'text-sky-500' : 'text-slate-500'}`} />
                </span>
              </button>
              <span className="text-[10px] font-semibold leading-none text-slate-400">
                {notificationsAllowed ? 'Allow' : 'Not allow'}
              </span>
            </div>
          </div>

        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">Delete account</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Request permanent deletion of your account and saved progress. An admin must approve the request first.
                </p>
              </div>
            </div>

            {deletionError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{deletionError}</p>}

            {deletionLoading ? (
              <p className="text-sm font-semibold text-slate-400">Checking request status...</p>
            ) : deletionRequest?.status === 'pending' ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                Your deletion request is waiting for admin approval.
              </div>
            ) : (
              <button
                type="button"
                onClick={requestAccountDeletion}
                disabled={deletionSending}
                className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletionSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletionSending ? 'Sending request...' : 'Request account deletion'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default SettingsPage
