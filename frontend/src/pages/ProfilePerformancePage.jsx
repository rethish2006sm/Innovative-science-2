import { Link } from 'react-router-dom'
import AcademicPerformanceDashboard from '../components/AcademicPerformanceDashboard'

const ProfilePerformancePage = () => (
  <main className="min-h-screen bg-[#f5f7fa] text-slate-800">
    <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-7">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-7 lg:px-9">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Profile</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Performance</h1>
          </div>
          <Link
            to="/profile"
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:px-4 sm:text-sm"
          >
            Back to profile
          </Link>
        </div>
        <AcademicPerformanceDashboard />
      </div>
    </div>
  </main>
)

export default ProfilePerformancePage
