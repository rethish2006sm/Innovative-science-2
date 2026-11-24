
import { useEffect, useMemo, useState } from "react";
import { Brain, Check, Gift, KeyRound, X } from "lucide-react";
import { apiRequest } from "../api";

const rewardDetails = (day) =>
  day?.type === "restore-key"
    ? { label: "Streak Restore Key", amount: "1 key", Icon: KeyRound }
    : { label: "Brain Cells", amount: "10 cells", Icon: Brain };

const getLocalDateKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const DAILY_REWARDS_DISMISSED_KEY = "daily-rewards-dismissed-date";

const DailyRewardsPopup = ({ enabled = false, showButton = true }) => {
  const [weeklyRewards, setWeeklyRewards] = useState(null);
  const [showRewards, setShowRewards] = useState(false);
  const [claimingDate, setClaimingDate] = useState("");
  const [claimedReward, setClaimedReward] = useState(null);
  const [closingSuccess, setClosingSuccess] = useState(false);
  const [dontRemindToday, setDontRemindToday] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    apiRequest("/api/daily-streak/rewards", { cache: "no-store" })
      .then((data) => {
        if (!cancelled) {
          setWeeklyRewards(data.rewards || null);

          const dismissedDate = window.localStorage.getItem(
            DAILY_REWARDS_DISMISSED_KEY,
          );

          if (
            data.rewards?.days?.some(
              (day) => day.isToday && !day.claimed,
            ) &&
            dismissedDate !== getLocalDateKey()
          ) {
            setShowRewards(true);
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const openRewards = () => setShowRewards(true);

    window.addEventListener("daily-rewards:open", openRewards);

    return () =>
      window.removeEventListener("daily-rewards:open", openRewards);
  }, [enabled]);

  const calendarCells = useMemo(() => {
    if (!weeklyRewards?.days?.length) return [];

    const firstDay = new Date(
      `${weeklyRewards.days[0].localDate}T00:00:00`,
    ).getDay();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...weeklyRewards.days,
    ];
  }, [weeklyRewards]);

  const hasUnclaimedReward = Boolean(
    weeklyRewards?.days?.some(
      (day) => day.isToday && !day.claimed,
    ),
  );

  const todayRewardDate =
    weeklyRewards?.days?.find((day) => day.isToday)?.localDate || "";

  const claimReward = async (day) => {
    if (!day?.isToday || day.claimed || claimingDate) return;

    setClaimingDate(day.localDate);

    try {
      const data = await apiRequest(
        "/api/daily-streak/rewards/claim",
        {
          method: "POST",
          body: JSON.stringify({
            localDate: day.localDate,
          }),
        },
      );

      setWeeklyRewards(data.rewards || null);
      setClaimedReward(day);
    } finally {
      setClaimingDate("");
    }
  };

  const closeSuccess = () => {
    setClosingSuccess(true);

    window.setTimeout(() => {
      setClaimedReward(null);
      setClosingSuccess(false);
    }, 220);
  };

  const closeRewards = () => {
    if (dontRemindToday) {
      window.localStorage.setItem(
        DAILY_REWARDS_DISMISSED_KEY,
        getLocalDateKey(),
      );
    }

    setShowRewards(false);
    setDontRemindToday(false);
  };

  if (!enabled || !weeklyRewards) return null;

  return (
    <>
      <div className="daily-rewards-floating relative z-40">

        {/* DAILY REWARDS CALENDAR */}
        {showRewards && (
          <div
            className="
              daily-rewards-panel
              absolute bottom-16 right-0
              w-[min(23rem,calc(100vw-1.5rem))]
              rounded-3xl border border-slate-200/80
              bg-white p-3.5 sm:p-4
              shadow-[0_20px_70px_rgba(15,23,42,0.16)]
              animate-in fade-in slide-in-from-bottom-2 duration-200
            "
          >
            {/* HEADER */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="
                  grid h-10 w-10 shrink-0 place-items-center
                  rounded-xl bg-orange-50 text-orange-500
                ">
                  <Gift size={19} strokeWidth={2.2} />
                </div>

                <div>
                  <h3 className="text-sm font-black tracking-tight text-slate-900">
                    Daily Rewards
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Keep your streak growing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeRewards}
                className="
                  grid h-8 w-8 shrink-0 place-items-center
                  rounded-full bg-slate-50 text-slate-400
                  transition hover:bg-slate-100 hover:text-slate-700
                "
                aria-label="Close rewards"
              >
                <X size={16} />
              </button>
            </div>

            {/* WEEK DAYS */}
            <div className="mt-4 mb-2 grid grid-cols-7 gap-1.5">
              {["S", "M", "T", "W", "T", "F", "S"].map(
                (label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="
                      text-center text-[10px] font-bold
                      uppercase text-slate-400
                    "
                  >
                    {label}
                  </div>
                ),
              )}
            </div>

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="aspect-square"
                    />
                  );
                }

                const { Icon: RewardIcon } = rewardDetails(day);

                const isAvailable =
                  day.isToday && !day.claimed;

                const isExpired =
                  !day.isToday &&
                  !day.claimed &&
                  todayRewardDate &&
                  day.localDate < todayRewardDate;

                const isUpcoming =
                  !day.isToday &&
                  !day.claimed &&
                  !isExpired;

                const isClaiming =
                  claimingDate === day.localDate;

                let cellStyle = "";
                let iconStyle = "";
                let dateStyle = "";

                if (day.claimed) {
                  cellStyle =
                    "bg-emerald-50/80 border-emerald-100 hover:bg-emerald-50";
                  iconStyle =
                    "bg-emerald-100 text-emerald-600";
                  dateStyle = "text-emerald-700";
                } else if (isAvailable) {
                  cellStyle =
                    "bg-orange-50 border-orange-300 ring-2 ring-orange-100 shadow-sm";
                  iconStyle =
                    "bg-orange-100 text-orange-600";
                  dateStyle = "text-orange-700";
                } else if (isExpired) {
                  cellStyle =
                    "bg-slate-50 border-slate-100 opacity-50";
                  iconStyle =
                    "bg-slate-100 text-slate-400";
                  dateStyle = "text-slate-400";
                } else {
                  cellStyle =
                    "bg-white border-slate-100 hover:bg-sky-50";
                  iconStyle =
                    "bg-sky-50 text-sky-500";
                  dateStyle = "text-slate-400";
                }

                return (
                  <button
                    key={day.localDate}
                    type="button"
                    disabled={!isAvailable || Boolean(claimingDate)}
                    onClick={() => claimReward(day)}
                    aria-label={`${day.localDate}, ${
                      day.claimed
                        ? "claimed"
                        : isAvailable
                          ? "claim reward"
                          : isExpired
                            ? "expired"
                            : "upcoming"
                    }`}
                    className={`
                      relative flex aspect-square min-w-0
                      flex-col items-center justify-center
                      gap-1 rounded-xl border
                      transition-all duration-200
                      ${cellStyle}
                      ${
                        isAvailable
                          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                          : "cursor-default"
                      }
                    `}
                  >
                    {/* DATE */}
                    <span className={`text-[10px] font-extrabold ${dateStyle}`}>
                      {Number(day.localDate.slice(-2))}
                    </span>

                    {/* REWARD ICON */}
                    <span
                      className={`
                        relative grid h-7 w-7 place-items-center
                        rounded-full transition-transform duration-200
                        ${iconStyle}
                        ${isAvailable ? "animate-pulse" : ""}
                      `}
                    >
                      {isClaiming ? (
                        <span className="
                          h-3.5 w-3.5 animate-spin rounded-full
                          border-2 border-orange-300
                          border-t-orange-600
                        " />
                      ) : (
                        <RewardIcon size={15} strokeWidth={2.4} />
                      )}

                      {/* COMPLETED TICK */}
                      {day.claimed && (
                        <span className="
                          absolute -right-1 -top-1
                          grid h-3.5 w-3.5 place-items-center
                          rounded-full border-2 border-white
                          bg-emerald-500 text-white
                        ">
                          <Check size={8} strokeWidth={3.5} />
                        </span>
                      )}

                      {/* TODAY INDICATOR */}
                      {isAvailable && (
                        <span className="
                          absolute -right-1 -top-1
                          h-2.5 w-2.5 rounded-full
                          border-2 border-white bg-orange-500
                        " />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* STATUS LEGEND */}
            <div className="
              mt-3 flex items-center justify-center gap-4
              border-t border-slate-100 pt-3
            ">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-semibold text-slate-500">
                  Completed
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-[9px] font-semibold text-slate-500">
                  Today
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="text-[9px] font-semibold text-slate-500">
                  Expired
                </span>
              </div>
            </div>

            {/* REMINDER */}
            <label className="
              mt-3 flex cursor-pointer items-center gap-2
              rounded-xl bg-slate-50 px-3 py-2.5
              transition hover:bg-slate-100
            ">
              <input
                type="checkbox"
                checked={dontRemindToday}
                onChange={(event) =>
                  setDontRemindToday(event.target.checked)
                }
                className="h-3.5 w-3.5 cursor-pointer accent-orange-500"
              />

              <span className="text-[11px] font-semibold text-slate-500">
                Do not remind me today
              </span>
            </label>
          </div>
        )}

        {/* FLOATING REWARD BUTTON */}
        {showButton && (
          <button
            type="button"
            onClick={() =>
              setShowRewards((current) => !current)
            }
            aria-label="Open daily rewards"
            className={`
              relative grid h-12 w-12 place-items-center
              rounded-2xl
              bg-gradient-to-br from-orange-500 to-rose-500
              text-white shadow-lg shadow-orange-500/25
              transition-all duration-300
              hover:-translate-y-1 hover:shadow-xl
              active:scale-95
              ${
                hasUnclaimedReward
                  ? "ring-4 ring-orange-200/70 ring-offset-2"
                  : ""
              }
            `}
          >
            <Gift size={21} strokeWidth={2.2} />

            {hasUnclaimedReward && (
              <span className="
                absolute -right-1 -top-1
                h-3 w-3 rounded-full border-2
                border-white bg-emerald-500
              " />
            )}
          </button>
        )}
      </div>

      {/* ORIGINAL REWARD CLAIM SUCCESS POPUP */}
      {claimedReward &&
        (() => {
          const {
            Icon: RewardIcon,
            amount,
            label,
          } = rewardDetails(claimedReward);

          return (
            <div
              className={`daily-reward-success-backdrop ${
                closingSuccess ? "is-closing" : ""
              }`}
              role="presentation"
            >
              <div
                className="daily-reward-success-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reward-claimed-title"
              >
                <button
                  type="button"
                  onClick={closeSuccess}
                  className="
                    absolute right-3 top-3 grid h-9 w-9
                    place-items-center rounded-full
                    bg-slate-100 text-slate-500
                    transition hover:bg-orange-50 hover:text-orange-600
                  "
                  aria-label="Close reward confirmation"
                >
                  <X size={17} />
                </button>

                <div className="daily-reward-success-check">
                  <Check size={32} strokeWidth={3} />
                </div>

                <h2
                  id="reward-claimed-title"
                  className="mt-4 text-xl font-black text-slate-950"
                >
                  Reward Claimed!
                </h2>

                <p className="
                  mt-2 max-w-xs text-center
                  text-sm leading-6 text-slate-500
                ">
                  Your daily reward has been successfully claimed.
                </p>

                <div className="
                  mt-5 flex items-center gap-3
                  rounded-2xl border border-orange-100
                  bg-orange-50 px-5 py-3
                ">
                  <span className="
                    grid h-11 w-11 place-items-center
                    rounded-xl bg-white text-orange-600 shadow-sm
                  ">
                    <RewardIcon size={23} />
                  </span>

                  <span className="text-left">
                    <strong className="
                      block text-sm font-black text-slate-900
                    ">
                      {amount}
                    </strong>

                    <span className="
                      text-xs font-semibold text-slate-500
                    ">
                      {label}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default DailyRewardsPopup;
