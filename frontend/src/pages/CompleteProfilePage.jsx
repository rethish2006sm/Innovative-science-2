import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStoredAuth } from '../authStorage'

const CITY_API_URL = 'https://countriesnow.space/api/v0.1/countries/state/cities'
const FALLBACK_CITIES = ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Thane', 'Aurangabad', 'Kolhapur', 'Solapur']
const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) => String(2000 + index))
const MONTH_OPTIONS = [
  ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'],
  ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'],
  ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
]
const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50'
const labelClass = 'grid gap-2 text-sm font-bold text-slate-700'

const CompactSelect = ({ value, placeholder, options, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className={`${inputClass} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-slate-100`}>
        <span className={selectedOption ? 'text-slate-800' : 'text-slate-500'}>{selectedOption?.label || placeholder}</span>
        <span className="text-slate-500">⌄</span>
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${option.value === value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'}`}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CompleteProfilePage = () => {
  const navigate = useNavigate()
  const { user, completeProfile } = useAuth()
  const savedUser = getStoredAuth()?.user
  const [form, setForm] = useState({
    name: savedUser?.name || user?.displayName || '',
    phoneNumber: savedUser?.phoneNumber || '',
    dateOfBirth: savedUser?.dateOfBirth || '',
    gender: savedUser?.gender || '',
    bloodGroup: savedUser?.bloodGroup || '',
    state: 'Maharashtra',
    city: savedUser?.city || '',
    area: savedUser?.area || '',
    schoolName: savedUser?.schoolName || '',
    finalExamPercentage: savedUser?.finalExamPercentage ?? '',
  })
  const [dateParts, setDateParts] = useState(() => {
    const [year = '', month = '', day = ''] = (savedUser?.dateOfBirth || '').split('-')
    return { year, month, day }
  })
  const [cities, setCities] = useState(FALLBACK_CITIES)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLocatingCity, setIsLocatingCity] = useState(false)

  useEffect(() => {
    let active = true
    fetch(CITY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'India', state: 'Maharashtra' }),
    })
      .then((response) => response.json())
      .then((result) => {
        const nextCities = Array.isArray(result?.data) ? result.data.filter(Boolean).sort() : []
        if (active && nextCities.length) setCities(nextCities)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const selectedYear = dateParts.year
  const selectedMonth = dateParts.month
  const selectedDay = dateParts.day
  const daysInMonth = selectedYear && selectedMonth
    ? new Date(Number(selectedYear), Number(selectedMonth), 0).getDate()
    : 0

  const updateDatePart = (part, value) => {
    const nextParts = {
      year: selectedYear,
      month: selectedMonth,
      day: selectedDay,
      [part]: value,
    }
    const maxDay = nextParts.year && nextParts.month
      ? new Date(Number(nextParts.year), Number(nextParts.month), 0).getDate()
      : 0
    if (maxDay && Number(nextParts.day) > maxDay) nextParts.day = ''
    setDateParts(nextParts)
    updateField(
      'dateOfBirth',
      nextParts.year && nextParts.month && nextParts.day
        ? `${nextParts.year}-${nextParts.month}-${nextParts.day}`
        : '',
    )
  }

  const getMyCity = () => {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser.')
      return
    }

    setIsLocatingCity(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}&localityLanguage=en`,
          )
          if (!response.ok) throw new Error('Could not identify your city.')
          const location = await response.json()
          const state = String(location.principalSubdivision || '').trim()
          if (!state.toLowerCase().includes('maharashtra')) {
            throw new Error('Please allow a location inside Maharashtra.')
          }

          const city = String(
            location.city || location.localityInfo?.administrative?.find((item) => item?.name)?.name || location.locality || '',
          ).trim()
          if (!city) throw new Error('Could not identify your city.')

          setCities((current) => current.some((item) => item.toLowerCase() === city.toLowerCase())
            ? current
            : [...current, city].sort((a, b) => a.localeCompare(b)))
          updateField('city', city)
        } catch (locationError) {
          setError(locationError.message || 'Could not identify your city.')
        } finally {
          setIsLocatingCity(false)
        }
      },
      (geolocationError) => {
        setError(geolocationError.code === geolocationError.PERMISSION_DENIED
          ? 'Location permission was denied. Please allow location access and try again.'
          : 'Could not read your current location. Please try again.')
        setIsLocatingCity(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const phone = form.phoneNumber.trim()
    const percentage = Number(form.finalExamPercentage)

    if (!form.name.trim() || !form.dateOfBirth || !form.gender || !form.bloodGroup) {
      setError('Please complete every required field.')
      return
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Mobile number must contain exactly 10 digits.')
      return
    }
    if (!form.city || !form.area.trim() || !form.schoolName.trim()) {
      setError('Please complete every required field.')
      return
    }
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      setError('Final exam percentage must be between 0 and 100.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await completeProfile({
        ...form,
        name: form.name.trim(),
        phoneNumber: phone,
        area: form.area.trim(),
        schoolName: form.schoolName.trim(),
        finalExamPercentage: percentage,
      })
      navigate('/', { replace: true })
    } catch (profileError) {
      setError(profileError.message || 'Could not save your profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-gradient-to-br from-emerald-50 via-white to-teal-100 px-4 py-8 sm:py-12">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white bg-white p-6 shadow-2xl shadow-emerald-900/10 sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-400 text-white shadow-lg shadow-emerald-500/25"><UserRound size={30} /></div>
        <h1 className="mt-6 text-center text-3xl font-black text-slate-900">Complete your profile</h1>
        <p className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">Please enter all required details to finish creating your student account.</p>

        <div className="mt-8 grid gap-5">
          <h2 className="border-b border-slate-100 pb-2 text-lg font-black text-slate-800">Basic Information</h2>
          <label className={labelClass}>Full name<input className={inputClass} value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
          <label className={labelClass}>Email<input className={`${inputClass} cursor-not-allowed bg-slate-100`} value={user?.email || savedUser?.email || ''} readOnly /></label>
          <label className={labelClass}>Mobile number<input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={form.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" required /></label>

          <h2 className="mt-3 border-b border-slate-100 pb-2 text-lg font-black text-slate-800">Personal Details</h2>
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Date of birth</span>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <label className={labelClass}><span className="text-xs font-semibold text-slate-500">Year</span><CompactSelect value={selectedYear} placeholder="Year" options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))} onChange={(value) => updateDatePart('year', value)} /></label>
              <label className={labelClass}><span className="text-xs font-semibold text-slate-500">Month</span><CompactSelect value={selectedMonth} placeholder="Month" options={MONTH_OPTIONS.map(([value, label]) => ({ value, label }))} onChange={(value) => updateDatePart('month', value)} /></label>
              <label className={labelClass}><span className="text-xs font-semibold text-slate-500">Day</span><CompactSelect value={selectedDay} placeholder="Day" options={Array.from({ length: daysInMonth }, (_, index) => { const day = String(index + 1).padStart(2, '0'); return { value: day, label: String(index + 1) } })} onChange={(value) => updateDatePart('day', value)} disabled={!daysInMonth} /></label>
            </div>
          </div>
          <label className={labelClass}>Gender<select className={inputClass} value={form.gender} onChange={(event) => updateField('gender', event.target.value)} required><option value="">Select gender</option>{GENDER_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className={labelClass}>Blood group<select className={inputClass} value={form.bloodGroup} onChange={(event) => updateField('bloodGroup', event.target.value)} required><option value="">Select blood group</option>{BLOOD_GROUP_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className={labelClass}>State<input className={`${inputClass} cursor-not-allowed bg-slate-100`} value="Maharashtra" readOnly /></label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">
              <span>City</span>
              <button type="button" onClick={getMyCity} disabled={isLocatingCity || loading} className="rounded-md px-2 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60">
                {isLocatingCity ? 'Locating…' : 'Get my city'}
              </button>
            </span>
            <select className={inputClass} value={form.city} onChange={(event) => updateField('city', event.target.value)} required><option value="">Select city</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
          </label>
          <label className={labelClass}>Area<input className={inputClass} value={form.area} onChange={(event) => updateField('area', event.target.value)} placeholder="Enter your local area" required /></label>

          <h2 className="mt-3 border-b border-slate-100 pb-2 text-lg font-black text-slate-800">Education Details</h2>
          <label className={labelClass}>School name<input className={inputClass} value={form.schoolName} onChange={(event) => updateField('schoolName', event.target.value)} required /></label>
          <label className={labelClass}>Std 9 final exam semester percentage<input className={inputClass} type="number" min="0" max="100" step="0.01" value={form.finalExamPercentage} onChange={(event) => updateField('finalExamPercentage', event.target.value)} placeholder="Example: 85.50" required /></label>
        </div>

        {error && <p className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-600">{error}</p>}
        <button type="submit" disabled={loading} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={18} /> : 'Save and continue'}</button>
      </form>
    </section>
  )
}

export default CompleteProfilePage
