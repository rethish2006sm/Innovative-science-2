import { useEffect, useMemo, useState } from 'react'
import { Brain, Check, Gift, KeyRound, X } from 'lucide-react'
import { apiRequest } from '../api'

const rewardDetails = (day) => day?.type === 'restore-key'
  ? { label: 'Streak Restore Key', amount: '1 key', Icon: KeyRound }
  : { label: 'Brain Cells', amount: '10 cells', Icon: Brain }

const DailyRewardsPopup = ({ enabled = false, showButton = true }) => {
  const [weeklyRewards, setWeeklyRewards] = useState(null)
  const [showRewards, setShowRewards] = useState(false)
  const [claimingDate, setClaimingDate] = useState('')
  const [claimedReward, setClaimedReward] = useState(null)
  const [closingSuccess, setClosingSuccess] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    apiRequest('/api/daily-streak/rewards', { cache: 'no-store' })
      .then((data) => {
        if (!cancelled) {
          setWeeklyRewards(data.rewards || null)
          if (data.rewards?.days?.some((day) => day.isToday && !day.claimed)) setShowRewards(true)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    const openRewards = () => setShowRewards(true)
    window.addEventListener('daily-rewards:open', openRewards)
    return () => window.removeEventListener('daily-rewards:open', openRewards)
  }, [enabled])

  const calendarCells = useMemo(() => {
    if (!weeklyRewards?.days?.length) return []
    const firstDay = new Date(`${weeklyRewards.days[0].localDate}T00:00:00`).getDay()
    return [...Array.from({ length: firstDay }, () => null), ...weeklyRewards.days]
  }, [weeklyRewards])

  const hasUnclaimedReward = Boolean(weeklyRewards?.days?.some((day) => day.isToday && !day.claimed))
  const todayRewardDate = weeklyRewards?.days?.find((day) => day.isToday)?.localDate || ''

  const claimReward = async (day) => {
    if (!day?.isToday || day.claimed || claimingDate) return
    setClaimingDate(day.localDate)
    try {
      const data = await apiRequest('/api/daily-streak/rewards/claim', { method: 'POST', body: JSON.stringify({ localDate: day.localDate }) })
      setWeeklyRewards(data.rewards || null)
      setClaimedReward(day)
    } finally {
      setClaimingDate('')
    }
  }

  const closeSuccess = () => {
    setClosingSuccess(true)
    window.setTimeout(() => { setClaimedReward(null); setClosingSuccess(false) }, 220)
  }

  if (!enabled || !weeklyRewards) return null

  return (
    <>
      <div className="daily-rewards-floating">
        {showRewards && (
          <div className="daily-rewards-panel absolute bottom-16 right-0 w-[min(28rem,calc(100vw-2rem))] rounded-[1.6rem] border border-orange-100 bg-white p-4 shadow-[0_1.5rem_4rem_rgba(15,23,42,.2)] sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">Daily rewards</p><p className="mt-1 text-xs font-semibold text-slate-500">Claim your reward and keep your streak alive.</p></div><button type="button" onClick={() => setShowRewards(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-orange-50 hover:text-orange-600" aria-label="Close rewards"><X size={15} /></button></div>
            <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <p key={label} className="text-center text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px]">{label}</p>)}
              {calendarCells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="min-h-[4.35rem] sm:min-h-[4.8rem]" />
                const { Icon: RewardIcon } = rewardDetails(day)
                const isAvailable = day.isToday && !day.claimed
                const isExpired = !day.isToday && !day.claimed && todayRewardDate && day.localDate < todayRewardDate
                const isUpcoming = !day.isToday && !day.claimed && !isExpired
                return <button key={day.localDate} type="button" disabled={!isAvailable || Boolean(claimingDate)} onClick={() => claimReward(day)} className={`daily-reward-cell group relative min-w-0 rounded-xl border p-1.5 text-center transition sm:rounded-2xl sm:p-2 ${day.claimed ? 'daily-reward-claimed border-emerald-100 bg-emerald-50/70' : isAvailable ? 'daily-reward-available border-orange-200 bg-orange-50' : isExpired ? 'daily-reward-expired border-slate-200 bg-slate-100' : 'border-slate-100 bg-slate-50/80'} ${isUpcoming ? 'opacity-75' : ''}`} aria-label={`${day.localDate}${day.claimed ? ', claimed' : isAvailable ? ', claim reward' : isExpired ? ', expired' : ', upcoming'}`}>
                  <span className={`block text-[9px] font-black sm:text-[10px] ${day.isToday ? 'text-orange-700' : isExpired ? 'text-slate-400' : 'text-slate-500'}`}>{Number(day.localDate.slice(-2))}</span>
                  <span className={`mx-auto mt-1.5 grid h-7 w-7 place-items-center rounded-full sm:h-8 sm:w-8 ${day.claimed ? 'bg-emerald-100 text-emerald-600' : day.isToday ? 'bg-orange-100 text-orange-600' : isExpired ? 'bg-slate-200 text-slate-400' : 'bg-cyan-50 text-cyan-600'}`}><RewardIcon size={15} strokeWidth={2.4} /></span>
                  {day.claimed ? <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black text-white"><Check size={9} />Done</span> : isAvailable ? <span className="mt-1 block text-[8px] font-black text-orange-700">Claim</span> : isExpired ? <span className="mt-1 block text-[8px] font-black text-slate-400">Expired</span> : <span className="mt-1 block text-[8px] font-bold text-slate-400">Soon</span>}
                </button>
              })}
            </div>
          </div>
        )}
        {showButton && <button type="button" onClick={() => setShowRewards((current) => !current)} aria-label="Open daily rewards" className={`grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-xl shadow-orange-300 transition hover:scale-105 ${hasUnclaimedReward ? 'animate-pulse ring-4 ring-orange-300/70 ring-offset-2' : ''}`}><Gift size={24} /></button>}
      </div>

      {claimedReward && (() => {
        const { Icon: RewardIcon, amount, label } = rewardDetails(claimedReward)
        return <div className={`daily-reward-success-backdrop ${closingSuccess ? 'is-closing' : ''}`} role="presentation"><div className="daily-reward-success-modal" role="dialog" aria-modal="true" aria-labelledby="reward-claimed-title"><button type="button" onClick={closeSuccess} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-orange-50 hover:text-orange-600" aria-label="Close reward confirmation"><X size={17} /></button><div className="daily-reward-success-check"><Check size={32} strokeWidth={3} /></div><h2 id="reward-claimed-title" className="mt-4 text-xl font-black text-slate-950">Reward Claimed!</h2><p className="mt-2 max-w-xs text-center text-sm leading-6 text-slate-500">Your daily reward has been successfully claimed.</p><div className="mt-5 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-5 py-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-orange-600 shadow-sm"><RewardIcon size={23} /></span><span className="text-left"><strong className="block text-sm font-black text-slate-900">{amount}</strong><span className="text-xs font-semibold text-slate-500">{label}</span></span></div></div></div>
      })()}
    </>
  )
}

export default DailyRewardsPopup
