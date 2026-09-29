import { ArrowLeft, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

const SettingsPage = () => {
  const [notificationsAllowed, setNotificationsAllowed] = useState(true)

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
      </div>
    </main>
  )
}

export default SettingsPage
