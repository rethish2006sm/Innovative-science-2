import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../api'
import AcademicPerformanceDashboard from '../components/AcademicPerformanceDashboard'

const ProfilePerformancePage = () => {
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('studentId')
  const isAdminStudentView = Boolean(studentId)
  const [studentData, setStudentData] = useState(null)
  const [studentError, setStudentError] = useState('')

  useEffect(() => {
    if (!isAdminStudentView) return undefined
    let active = true
    apiRequest(`/api/admin/students/${encodeURIComponent(studentId)}`, { cache: 'no-store' })
      .then((data) => { if (active) setStudentData(data) })
      .catch((error) => { if (active) setStudentError(error.message || 'Could not load student profile.') })
    return () => { active = false }
  }, [isAdminStudentView, studentId])

  return (
  <main className="min-h-screen bg-[#f5f7fa] text-slate-800">
    <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-7">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-7 lg:px-9">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">{isAdminStudentView ? 'Admin · Student performance' : 'Profile'}</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Performance</h1>
          </div>
          <Link
            to={isAdminStudentView ? '/admin' : '/profile'}
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 sm:px-4 sm:text-sm"
          >
            {isAdminStudentView ? 'Back to all students' : 'Back to profile'}
          </Link>
        </div>
        {isAdminStudentView && <StudentProfileCard data={studentData} error={studentError} />}
        <AcademicPerformanceDashboard performanceStudentId={studentId} />
      </div>
    </div>
  </main>
  )
}

const StudentProfileCard = ({ data, error }) => {
  if (error) return <p className="m-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
  if (!data?.user) return <div className="mx-3 mt-3 h-36 animate-pulse rounded-3xl bg-slate-100 sm:mx-5 lg:mx-7" />
  const user = data.user
  const progress = data.progress || {}
  const details = [
    ['Email', user.email || 'Not available'],
    ['Phone', user.phoneNumber || 'Not available'],
    ['Class', user.className || 'No class assigned'],
    ['Brain cells', Number(progress.totalBrainCells ?? user.totalBrainCells ?? 0)],
    ['Average', `${progress.averagePercent || 0}%`],
    ['Attempts', progress.attemptCount || 0],
  ]
  return <section className="border-b border-slate-200 bg-white px-3 py-5 sm:px-5 lg:px-7"><div className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-700">Student profile details</p><h2 className="mt-2 text-2xl font-black text-slate-950">{user.name || 'Unnamed student'}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div key={label} className="rounded-2xl bg-white/80 p-3"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-black text-slate-700">{value}</p></div>)}</div></div></section>
}

export default ProfilePerformancePage
