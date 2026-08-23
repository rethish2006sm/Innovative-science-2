import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Sparkles,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

/* ==========================================================================
   BATTLE RESULTS PAGE
   Cinematic / Responsive / Mobile Optimized
   ========================================================================== */

const BattleResultsPage = ({ room, leaveToHome }) => {
  const [visible, setVisible] = useState(false);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [celebration, setCelebration] = useState(false);

  const players = room?.players || [];
  const leaderboard = room?.leaderboard || [];
  const rewards = room?.battleSummary?.rewards || [];

  const selfPlayer =
    players.find((player) => player.isSelf) ||
    leaderboard.find((player) => player.isSelf) ||
    null;

  const selfReward = rewards.find(
    (item) => String(item.userId) === String(selfPlayer?.userId)
  );

  const selfRank = Number(selfReward?.rank || selfPlayer?.rank || 0);

  const selfScore = Number(
    selfReward?.score ?? selfPlayer?.score ?? 0
  );

  const correctCount = Number(selfPlayer?.correctCount || 0);
  const wrongCount = Number(selfPlayer?.wrongCount || 0);

  const highestStreak = Number(
    selfPlayer?.highestStreak || selfPlayer?.streak || 0
  );

  const totalQuestions = Number(
    room?.battleSummary?.totalQuestions ||
      room?.totalQuestions ||
      correctCount + wrongCount ||
      0
  );

  const brainCells = Number(selfReward?.brainCells || 0);

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const displayedPlayers = showAllPlayers
    ? leaderboard
    : leaderboard.slice(0, 5);

  /* ------------------------------------------------------------------------
     Entrance
     ------------------------------------------------------------------------ */

  useEffect(() => {
    const entrance = setTimeout(() => {
      setVisible(true);
    }, 100);

    const celebrationTimer = setTimeout(() => {
      setCelebration(true);
    }, 1100);

    return () => {
      clearTimeout(entrance);
      clearTimeout(celebrationTimer);
    };
  }, []);

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  const ordinal = (rank) => {
    if (!rank) return "-";

    if (rank % 100 >= 11 && rank % 100 <= 13) {
      return `${rank}th`;
    }

    switch (rank % 10) {
      case 1:
        return `${rank}st`;
      case 2:
        return `${rank}nd`;
      case 3:
        return `${rank}rd`;
      default:
        return `${rank}th`;
    }
  };

  const rankMessage = useMemo(() => {
    if (selfRank === 1) {
      return {
        title: "You conquered the arena!",
        subtitle:
          "An incredible performance. You finished at the top of the leaderboard.",
      };
    }

    if (selfRank === 2) {
      return {
        title: "So close to the crown!",
        subtitle:
          "An amazing battle. You secured an impressive second-place finish.",
      };
    }

    if (selfRank === 3) {
      return {
        title: "You made the podium!",
        subtitle:
          "Excellent work. Your performance earned you a top-three finish.",
      };
    }

    return {
      title: "Battle complete!",
      subtitle:
        "Every answer counted. Your final score and rewards have been added.",
    };
  }, [selfRank]);

  return (
    <div
      className={`
        relative min-h-screen w-full overflow-x-hidden
        bg-[#f5f8ff] px-3 py-3 text-slate-900
        sm:px-5 sm:py-5
        lg:px-8 lg:py-8
        transition-all duration-1000
        ${visible ? "opacity-100" : "opacity-0"}
      `}
    >
      {/* ====================================================================
          CINEMATIC BACKGROUND
          ==================================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.13),transparent_30%),
            radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.12),transparent_30%),
            radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.08),transparent_35%)]
          "
        />

        <div
          className="
            absolute -left-40 -top-40
            h-[380px] w-[380px]
            rounded-full
            bg-cyan-300/20
            blur-[100px]
            animate-[float_9s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute -right-40 top-20
            h-[450px] w-[450px]
            rounded-full
            bg-violet-300/20
            blur-[110px]
            animate-[floatReverse_11s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute bottom-[-200px] left-[35%]
            h-[400px] w-[400px]
            rounded-full
            bg-emerald-300/15
            blur-[100px]
            animate-[float_12s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute inset-0 opacity-[0.035]
            [background-image:linear-gradient(#0f172a_1px,transparent_1px),linear-gradient(90deg,#0f172a_1px,transparent_1px)]
            [background-size:42px_42px]
          "
        />

        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle,transparent_45%,rgba(15,23,42,0.06)_100%)]
          "
        />
      </div>

      <CinematicParticles />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        {/* ==================================================================
            HEADER
            ================================================================== */}

        <div
          className={`
            mb-4 flex items-center justify-between gap-3
            transition-all duration-1000
            sm:mb-6
            ${
              visible
                ? "translate-y-0 opacity-100"
                : "-translate-y-8 opacity-0"
            }
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                group relative grid h-11 w-11 shrink-0
                place-items-center rounded-2xl
                bg-gradient-to-br
                from-cyan-500 via-blue-600 to-violet-600
                text-white
                shadow-xl shadow-cyan-200/60
              "
            >
              <div
                className="
                  absolute inset-0 rounded-2xl
                  bg-white/20 blur-md
                  opacity-0 transition-opacity
                  group-hover:opacity-100
                "
              />

              <Trophy
                className="
                  relative h-5 w-5
                  animate-[trophyBounce_3s_ease-in-out_infinite]
                "
              />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-[8px] font-black uppercase
                  tracking-[0.28em] text-cyan-600
                "
              >
                Battle results
              </p>

              <h1
                className="
                  truncate text-lg font-black
                  tracking-tight text-slate-950
                  sm:text-2xl
                "
              >
                Match Summary
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="
                hidden rounded-full border border-slate-200
                bg-white/80 px-3 py-2
                text-[9px] font-black uppercase
                tracking-[0.16em] text-slate-500
                shadow-sm backdrop-blur
                sm:block
              "
            >
              Room {room?.code || "------"}
            </div>

            <div
              className="
                flex items-center gap-1.5
                rounded-full border border-emerald-200
                bg-emerald-50/90 px-2.5 py-2
                text-[8px] font-black uppercase
                tracking-[0.12em] text-emerald-600
                shadow-sm sm:px-3
              "
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="
                    absolute inline-flex h-full w-full
                    animate-ping rounded-full
                    bg-emerald-400 opacity-70
                  "
                />

                <span
                  className="
                    relative inline-flex h-2 w-2
                    rounded-full bg-emerald-500
                  "
                />
              </span>

              Complete
            </div>
          </div>
        </div>

        {/* ==================================================================
            TOP PODIUM CARD
            ================================================================== */}

        <section
          className={`
            relative mb-4 overflow-hidden
            rounded-[1.8rem]
            border border-white/90
            bg-white/90
            shadow-[0_25px_90px_rgba(15,23,42,0.10)]
            backdrop-blur-xl
            transition-all duration-1000
            sm:mb-6 sm:rounded-[2.5rem]
            ${
              visible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-10 scale-[0.97] opacity-0"
            }
          `}
        >
          {/* Animated shine */}

          <div
            className="
              pointer-events-none absolute inset-0
              bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.7)_50%,transparent_75%)]
              bg-[length:220%_100%]
              animate-[shine_7s_linear_infinite]
            "
          />

          {/* Glow */}

          <div
            className="
              pointer-events-none absolute
              -right-28 -top-32
              h-96 w-96 rounded-full
              bg-amber-300/20
              blur-[100px]
              animate-[float_8s_ease-in-out_infinite]
            "
          />

          <div
            className="
              pointer-events-none absolute
              -bottom-32 -left-20
              h-80 w-80 rounded-full
              bg-cyan-300/15
              blur-[100px]
            "
          />

          {/* Podium heading */}

          <div className="relative flex items-center justify-between px-4 pt-4 sm:px-7 sm:pt-6">
            <div className="flex items-center gap-2.5">
              <div
                className="
                  grid h-9 w-9 place-items-center
                  rounded-xl
                  bg-gradient-to-br
                  from-amber-100 to-orange-100
                  text-amber-600
                  shadow-sm
                  sm:h-11 sm:w-11
                "
              >
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              <div>
                <p
                  className="
                    text-[8px] font-black uppercase
                    tracking-[0.2em] text-amber-600
                  "
                >
                  The podium
                </p>

                <h2
                  className="
                    text-base font-black text-slate-950
                    sm:text-xl
                  "
                >
                  Final leaderboard
                </h2>
              </div>
            </div>

            <span
              className="
                hidden rounded-full bg-slate-100
                px-3 py-1.5
                text-[9px] font-black uppercase
                tracking-wider text-slate-500
                sm:block
              "
            >
              {leaderboard.length} Players
            </span>
          </div>

          {/* ==================================================================
              PODIUM
              
              IMPORTANT:
              - 1st shows when available
              - 2nd only shows when leaderboard[1] exists
              - 3rd only shows when leaderboard[2] exists
              - 3rd is NOT hidden on mobile
              ================================================================== */}

          {leaderboard.length > 0 && (
            <div
              className="
                relative mx-auto mt-5
                flex max-w-3xl items-end
                justify-center
                px-2 pb-0
                sm:mt-7 sm:px-8
              "
            >
              {/* ==============================================================
                  SECOND PLACE
                  ============================================================= */}

              {leaderboard[1] && (
                <div
                  className="
                    min-w-0
                    w-[30%]
                  "
                >
                  <PodiumPlayer
                    player={leaderboard[1]}
                    position={2}
                    delay={500}
                  />
                </div>
              )}

              {/* ==============================================================
                  FIRST PLACE
                  ============================================================= */}

              {leaderboard[0] && (
                <div
                  className="
                    relative z-20
                    min-w-0
                    w-[38%]
                  "
                >
                  <PodiumPlayer
                    player={leaderboard[0]}
                    position={1}
                    delay={200}
                  />
                </div>
              )}

              {/* ==============================================================
                  THIRD PLACE

                  NO hidden class here.

                  It appears on BOTH mobile and desktop,
                  but ONLY when leaderboard[2] exists.
                  ============================================================= */}

              {leaderboard[2] && (
                <div
                  className="
                    min-w-0
                    w-[30%]
                  "
                >
                  <PodiumPlayer
                    player={leaderboard[2]}
                    position={3}
                    delay={800}
                  />
                </div>
              )}
            </div>
          )}

          {/* Mobile hint */}

          {leaderboard.length > 2 && (
            <div
              className="
                relative flex justify-center
                pb-3 pt-1
                text-[8px] font-bold
                uppercase tracking-wider
                text-slate-300
                sm:hidden
              "
            >
              Top performers
            </div>
          )}
        </section>

        {/* ==================================================================
            LEADERBOARD + DETAILS
            ================================================================== */}

        <div
          className="
            grid gap-4
            lg:grid-cols-[1fr_360px]
            lg:gap-5
          "
        >
          {/* ================================================================
              LEADERBOARD LIST
              ================================================================ */}

          <section
            className={`
              min-w-0
              overflow-hidden
              rounded-[1.8rem]
              border border-slate-200/80
              bg-white/90
              p-3.5
              shadow-[0_25px_70px_rgba(15,23,42,0.07)]
              backdrop-blur-xl
              transition-all duration-1000
              sm:rounded-[2rem]
              sm:p-5
              ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }
            `}
          >
            {/* List heading */}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className="
                    text-[8px] font-black uppercase
                    tracking-[0.2em] text-cyan-600
                  "
                >
                  Complete ranking
                </p>

                <h3
                  className="
                    mt-0.5 text-lg font-black
                    text-slate-950 sm:text-xl
                  "
                >
                  All players
                </h3>
              </div>

              <div
                className="
                  grid h-9 w-9 place-items-center
                  rounded-xl bg-slate-100
                  text-slate-500
                  sm:h-10 sm:w-10
                "
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>

            {/* Mobile list is intentionally compact */}

            <div
              className="
                mt-3 space-y-2
                sm:mt-4
              "
            >
              {displayedPlayers.map((player, index) => (
                <LeaderboardRow
                  key={player.userId || index}
                  player={player}
                  index={index}
                />
              ))}
            </div>

            {leaderboard.length > 5 && (
              <button
                type="button"
                onClick={() =>
                  setShowAllPlayers((value) => !value)
                }
                className="
                  group mt-3 flex w-full
                  items-center justify-center gap-2
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  py-2.5
                  text-[10px] font-black
                  text-slate-600
                  transition-all duration-300
                  hover:-translate-y-0.5
                  hover:border-cyan-200
                  hover:bg-cyan-50
                  hover:text-cyan-700
                  sm:mt-4 sm:py-3 sm:text-xs
                "
              >
                {showAllPlayers
                  ? "Show less"
                  : `Show all ${leaderboard.length} players`}

                <ChevronRight
                  className={`
                    h-3.5 w-3.5
                    transition-transform duration-300
                    ${
                      showAllPlayers
                        ? "-rotate-90"
                        : "rotate-90"
                    }
                  `}
                />
              </button>
            )}
          </section>

          {/* ================================================================
              RIGHT SIDE
              ================================================================ */}

          <div
            className={`
              min-w-0 space-y-4
              transition-all duration-1000 delay-200
              ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }
            `}
          >
            {/* ==============================================================
                PERSONAL RESULT
                ============================================================== */}

            <section
              className="
                overflow-hidden
                rounded-[1.8rem]
                border border-white
                bg-white/90
                p-4
                shadow-[0_25px_70px_rgba(15,23,42,0.07)]
                backdrop-blur-xl
                sm:rounded-[2rem] sm:p-5
              "
            >
              <div
                className="
                  rounded-2xl
                  bg-gradient-to-br
                  from-slate-950 via-slate-800 to-slate-700
                  p-4 text-white
                  shadow-xl
                "
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="
                        grid h-11 w-11 shrink-0
                        place-items-center rounded-xl
                        bg-white/10
                        ring-1 ring-white/10
                      "
                    >
                      <Award className="h-5 w-5 text-amber-300" />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          text-[8px] font-black uppercase
                          tracking-[0.2em] text-slate-400
                        "
                      >
                        Your result
                      </p>

                      <h3
                        className="
                          truncate text-base font-black
                          sm:text-lg
                        "
                      >
                        {selfPlayer?.name || "Your Result"}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className="
                        text-[8px] font-black uppercase
                        tracking-wider text-slate-400
                      "
                    >
                      Rank
                    </p>

                    <p className="text-2xl font-black text-amber-300">
                      #{selfRank || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat
                    label="Score"
                    value={selfScore}
                  />

                  <MiniStat
                    label="Brain"
                    value={`+${brainCells}`}
                  />

                  <MiniStat
                    label="Accuracy"
                    value={`${accuracy}%`}
                  />
                </div>
              </div>
            </section>

            {/* ==============================================================
                PERFORMANCE
                ============================================================== */}

            <section
              className="
                rounded-[1.8rem]
                border border-slate-200/80
                bg-white/90
                p-4
                shadow-[0_25px_70px_rgba(15,23,42,0.07)]
                backdrop-blur-xl
                sm:rounded-[2rem] sm:p-5
              "
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="
                      text-[8px] font-black uppercase
                      tracking-[0.22em] text-violet-500
                    "
                  >
                    Performance
                  </p>

                  <h3
                    className="
                      mt-0.5 text-lg font-black
                      text-slate-950
                    "
                  >
                    Your stats
                  </h3>
                </div>

                <div
                  className="
                    grid h-9 w-9 place-items-center
                    rounded-xl bg-violet-50
                    text-violet-600
                    sm:h-10 sm:w-10
                  "
                >
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <PerformanceCard
                  icon={<CheckCircle2 />}
                  label="Correct"
                  value={correctCount}
                  type="success"
                  delay={200}
                />

                <PerformanceCard
                  icon={<XCircle />}
                  label="Wrong"
                  value={wrongCount}
                  type="danger"
                  delay={300}
                />

                <PerformanceCard
                  icon={<Flame />}
                  label="Best streak"
                  value={highestStreak}
                  type="orange"
                  delay={400}
                />

                <PerformanceCard
                  icon={<Users />}
                  label="Players"
                  value={players.length}
                  type="blue"
                  delay={500}
                />
              </div>

              {/* Accuracy */}

              <div
                className="
                  mt-3 rounded-2xl
                  border border-slate-200
                  bg-slate-50
                  p-3
                "
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">
                    Accuracy
                  </span>

                  <span className="text-xs font-black text-slate-950">
                    {accuracy}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="
                      relative h-full rounded-full
                      bg-gradient-to-r
                      from-cyan-500
                      via-blue-500
                      to-emerald-500
                      transition-all duration-[1600ms]
                    "
                    style={{
                      width: visible ? `${accuracy}%` : "0%",
                    }}
                  >
                    <div
                      className="
                        absolute inset-y-0 right-0
                        w-10 bg-white/60 blur-sm
                        animate-[progressShine_2s_linear_infinite]
                      "
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ==============================================================
                REWARDS
                ============================================================== */}

            <section
              className="
                overflow-hidden
                rounded-[1.8rem]
                border border-slate-200/80
                bg-white
                shadow-[0_25px_70px_rgba(15,23,42,0.07)]
                sm:rounded-[2rem]
              "
            >
              <div
                className="
                  relative overflow-hidden
                  bg-gradient-to-br
                  from-violet-600 via-indigo-600 to-blue-600
                  p-5 text-white
                "
              >
                <div
                  className="
                    absolute -right-16 -top-16
                    h-44 w-44 rounded-full
                    bg-white/10 blur-3xl
                    animate-[float_7s_ease-in-out_infinite]
                  "
                />

                <Sparkles
                  className="
                    absolute right-6 top-6
                    h-4 w-4 text-white/40
                    animate-pulse
                  "
                />

                <p
                  className="
                    text-[8px] font-black uppercase
                    tracking-[0.22em] text-violet-200
                  "
                >
                  Rewards unlocked
                </p>

                <div className="mt-1 flex items-end justify-between">
                  <div>
                    <p
                      className="
                        text-4xl font-black
                        tracking-tight
                        animate-[numberReveal_1s_ease-out]
                      "
                    >
                      +{brainCells}
                    </p>

                    <p className="mt-0.5 text-[10px] font-bold text-violet-200">
                      Brain Cells earned
                    </p>
                  </div>

                  <div
                    className="
                      grid h-12 w-12 place-items-center
                      rounded-xl bg-white/10
                      text-amber-200 backdrop-blur
                      animate-[float_4s_ease-in-out_infinite]
                    "
                  >
                    <Award className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p
                  className="
                    text-[8px] font-black uppercase
                    tracking-[0.2em] text-slate-400
                  "
                >
                  Top rewards
                </p>

                <div className="mt-2 space-y-1.5">
                  {leaderboard.slice(0, 3).map((player, index) => {
                    const reward = rewards.find(
                      (item) =>
                        String(item.userId) ===
                        String(player.userId)
                    );

                    return (
                      <div
                        key={player.userId || index}
                        className={`
                          flex items-center
                          justify-between rounded-xl
                          px-3 py-2.5
                          transition-all duration-300
                          hover:-translate-y-0.5
                          hover:shadow-md
                          ${
                            player.isSelf
                              ? "bg-emerald-50 ring-1 ring-emerald-100"
                              : "bg-slate-50"
                          }
                        `}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <RankBadge rank={player.rank} />

                          <div className="min-w-0">
                            <p
                              className="
                                truncate text-[10px]
                                font-black text-slate-800
                              "
                            >
                              {player.name}
                              {player.isSelf ? " · You" : ""}
                            </p>

                            <p
                              className="
                                mt-0.5 text-[8px]
                                font-bold uppercase
                                tracking-wider text-slate-400
                              "
                            >
                              {ordinal(player.rank)} place
                            </p>
                          </div>
                        </div>

                        <span
                          className="
                            shrink-0 text-[10px]
                            font-black text-emerald-600
                          "
                        >
                          +{reward?.brainCells || 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ==============================================================
                CTA
                ============================================================== */}

            <button
              type="button"
              onClick={leaveToHome}
              className="
                group relative flex w-full
                items-center justify-between
                overflow-hidden
                rounded-[1.5rem]
                bg-slate-950
                px-4 py-3.5
                text-left text-white
                shadow-xl shadow-slate-300/50
                transition-all duration-500
                hover:-translate-y-1
                hover:shadow-2xl
                focus:outline-none
                focus-visible:ring-4
                focus-visible:ring-cyan-300
                active:scale-[0.98]
                sm:px-5 sm:py-4
              "
            >
              <div
                className="
                  pointer-events-none absolute
                  -right-10 -top-10
                  h-32 w-32 rounded-full
                  bg-cyan-500/20 blur-2xl
                  transition-transform duration-700
                  group-hover:scale-[2]
                "
              />

              <div
                className="
                  pointer-events-none absolute inset-0
                  bg-gradient-to-r
                  from-transparent via-white/5 to-transparent
                  translate-x-[-100%]
                  group-hover:translate-x-[100%]
                  transition-transform duration-1000
                "
              />

              <div className="relative flex items-center gap-3">
                <div
                  className="
                    grid h-9 w-9 place-items-center
                    rounded-xl bg-white/10
                    transition-transform duration-500
                    group-hover:rotate-[-8deg]
                  "
                >
                  <ArrowRight className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-black sm:text-sm">
                    Return to website
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold text-slate-400">
                    Continue exploring and play again
                  </p>
                </div>
              </div>

              <ChevronRight
                className="
                  relative h-4 w-4
                  text-slate-400
                  transition-all duration-300
                  group-hover:translate-x-1
                  group-hover:text-white
                "
              />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          CELEBRATION
          ==================================================================== */}

      {celebration && selfRank === 1 && (
        <div
          className="
            pointer-events-none fixed inset-0 z-50
            animate-[celebrationFade_2s_ease-out_forwards]
            bg-white/10
          "
        />
      )}

      {/* ====================================================================
          ANIMATIONS
          ==================================================================== */}

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(20px, -25px, 0) scale(1.05);
          }
        }

        @keyframes floatReverse {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-25px, 20px, 0) scale(1.08);
          }
        }

        @keyframes shine {
          0% {
            background-position: 200% 0;
          }

          100% {
            background-position: -200% 0;
          }
        }

        @keyframes progressShine {
          0% {
            transform: translateX(-100px);
          }

          100% {
            transform: translateX(100px);
          }
        }

        @keyframes trophyBounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-3px) rotate(-4deg);
          }
        }

        @keyframes rankPop {
          0% {
            transform: scale(0.3) rotate(-15deg);
            opacity: 0;
          }

          60% {
            transform: scale(1.15) rotate(4deg);
          }

          100% {
            transform: scale(1) rotate(0);
            opacity: 1;
          }
        }

        @keyframes podiumReveal {
          0% {
            opacity: 0;
            transform: translateY(90px) scale(0.75);
          }

          55% {
            opacity: 1;
            transform: translateY(-10px) scale(1.04);
          }

          75% {
            transform: translateY(5px) scale(0.99);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes winnerGlow {
          0%, 100% {
            box-shadow:
              0 0 0 0 rgba(251,191,36,0.15),
              0 20px 45px rgba(251,191,36,0.20);
          }

          50% {
            box-shadow:
              0 0 0 14px rgba(251,191,36,0),
              0 25px 65px rgba(251,191,36,0.35);
          }
        }

        @keyframes numberReveal {
          0% {
            transform: translateY(15px);
            opacity: 0;
          }

          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes celebrationFade {
          0% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes cardReveal {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.96);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes rowReveal {
          from {
            opacity: 0;
            transform: translateX(-25px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 640px) {
          html,
          body {
            overflow-x: hidden;
            max-width: 100%;
          }

          * {
            max-width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

/* ==========================================================================
   CINEMATIC PARTICLES
   ========================================================================== */

const CinematicParticles = () => {
  const particles = Array.from({ length: 18 });

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((_, index) => {
        const left = (index * 37) % 100;
        const top = (index * 61) % 100;
        const size = 2 + (index % 3);

        return (
          <span
            key={index}
            className="
              absolute rounded-full
              bg-cyan-400/40
              animate-[particleFloat_8s_ease-in-out_infinite]
            "
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${index * -0.45}s`,
              animationDuration: `${6 + (index % 5)}s`,
            }}
          />
        );
      })}

      <style>{`
        @keyframes particleFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.15;
          }

          25% {
            transform: translate3d(15px, -25px, 0);
            opacity: 0.7;
          }

          50% {
            transform: translate3d(-10px, -50px, 0);
            opacity: 0.3;
          }

          75% {
            transform: translate3d(20px, -20px, 0);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

/* ==========================================================================
   PODIUM PLAYER
   ========================================================================== */

const PodiumPlayer = ({
  player,
  position,
  delay = 0,
}) => {
  /*
    Safety check:
    If a position does not exist, render nothing.

    This is important because we now conditionally render
    2nd and 3rd place from the parent.
  */

  if (!player) {
    return null;
  }

  const isFirst = position === 1;

  const medalStyles = {
    1: `
      from-amber-300
      via-yellow-400
      to-orange-400
      text-amber-950
      shadow-amber-300/60
    `,
    2: `
      from-slate-200
      via-slate-300
      to-slate-400
      text-slate-700
      shadow-slate-200
    `,
    3: `
      from-orange-200
      via-orange-300
      to-orange-400
      text-orange-900
      shadow-orange-200
    `,
  };

  return (
    <div
      className={`
        flex min-w-0 flex-col items-center
        ${isFirst ? "relative -translate-y-3" : ""}
      `}
      style={{
        animation: `
          podiumReveal
          900ms
          cubic-bezier(.2,.8,.2,1)
          ${delay}ms
          both
        `,
      }}
    >
      {/* Winner */}

      {isFirst && (
        <div
          className="
            mb-2 flex items-center gap-1
            rounded-full
            bg-gradient-to-r
            from-amber-50 to-orange-50
            px-2.5 py-1
            text-[7px] font-black
            uppercase tracking-wider
            text-amber-600
            shadow-sm
            animate-pulse
            sm:px-3 sm:text-[8px]
          "
        >
          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          Winner
        </div>
      )}

      {/* Avatar */}

      <div
        className={`
          relative grid place-items-center
          rounded-full
          bg-gradient-to-br
          ${medalStyles[position]}
          shadow-xl
          ring-4 ring-white
          transition-transform duration-500
          hover:scale-110
          ${
            isFirst
              ? `
                h-20 w-20
                sm:h-28 sm:w-28
                animate-[winnerGlow_2.5s_ease-in-out_infinite]
              `
              : `
                h-14 w-14
                sm:h-20 sm:w-20
              `
          }
        `}
      >
        {/* Rotating ring */}

        <div
          className="
            absolute inset-[-5px]
            rounded-full
            border border-dashed
            border-current/20
            animate-[spin_12s_linear_infinite]
          "
        />

        {/* Extra winner ring */}

        {isFirst && (
          <div
            className="
              absolute inset-[-10px]
              rounded-full
              border border-amber-300/30
              animate-ping
            "
          />
        )}

        <span
          className={`
            relative font-black
            ${
              isFirst
                ? "text-2xl sm:text-4xl"
                : "text-lg sm:text-2xl"
            }
          `}
        >
          {player.name?.charAt(0)?.toUpperCase() || "?"}
        </span>

        {/* Rank */}

        <div
          className={`
            absolute -bottom-1 -right-1
            grid place-items-center
            rounded-full
            border-2 border-white
            bg-slate-950
            text-[8px] font-black text-white
            ${
              isFirst
                ? "h-6 w-6 sm:h-8 sm:w-8 sm:text-[10px]"
                : "h-5 w-5 sm:h-6 sm:w-6"
            }
          `}
        >
          {position}
        </div>
      </div>

      {/* Name */}

      <p
        className="
          mt-2 max-w-[85px]
          truncate text-center
          text-[9px] font-black
          text-slate-800
          sm:mt-3 sm:max-w-[120px]
          sm:text-xs
        "
      >
        {player.name}
      </p>

      {/* Score */}

      <p
        className="
          mt-0.5 text-[8px]
          font-bold text-slate-400
          sm:text-[10px]
        "
      >
        {player.score || 0} pts
      </p>

      {/* Podium block */}

      <div
        className={`
          mt-2 w-full
          rounded-t-xl
          border-x border-t border-slate-900/10
          shadow-[0_-8px_20px_rgba(15,23,42,0.12)]
          sm:mt-3 sm:rounded-t-2xl
          ${
            isFirst
              ? `
                h-12
                bg-gradient-to-t
                from-amber-400 to-amber-200
                sm:h-20
              `
              : position === 2
              ? `
                  h-9
                  bg-gradient-to-t
                  from-slate-400 to-slate-200
                  sm:h-14
                `
              : `
                  h-7
                  bg-gradient-to-t
                  from-orange-400 to-orange-200
                  sm:h-11
                `
          }
        `}
      />
    </div>
  );
};

/* ==========================================================================
   LEADERBOARD ROW
   ========================================================================== */

const LeaderboardRow = ({
  player,
  index,
}) => {
  const rank = Number(player.rank || index + 1);

  return (
    <div
      className={`
        group flex min-w-0
        items-center gap-2.5
        rounded-xl
        border
        px-2.5 py-2.5
        transition-all duration-500
        hover:-translate-y-0.5
        hover:shadow-md
        sm:gap-3
        sm:rounded-2xl
        sm:px-4 sm:py-3
        ${
          player.isSelf
            ? `
              border-emerald-200
              bg-emerald-50/80
              shadow-sm
            `
            : `
              border-slate-100
              bg-slate-50/60
              hover:border-cyan-100
              hover:bg-white
            `
        }
      `}
      style={{
        animation: `
          rowReveal
          600ms
          ease-out
          ${150 + index * 80}ms
          both
        `,
      }}
    >
      <RankBadge rank={rank} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className="
              truncate text-[10px]
              font-black text-slate-800
              sm:text-sm
            "
          >
            {player.name}
          </p>

          {player.isSelf && (
            <span
              className="
                shrink-0 rounded-full
                bg-emerald-100
                px-1.5 py-0.5
                text-[6px] font-black
                uppercase tracking-wider
                text-emerald-700
                sm:px-2 sm:text-[8px]
              "
            >
              You
            </span>
          )}
        </div>

        <div
          className="
            mt-0.5 flex items-center
            gap-x-2.5
            sm:mt-1 sm:gap-x-3
          "
        >
          <span
            className="
              flex items-center gap-1
              text-[7px] font-bold
              text-slate-400
              sm:text-[9px]
            "
          >
            <CheckCircle2
              className="
                h-2.5 w-2.5
                text-emerald-500
                sm:h-3 sm:w-3
              "
            />

            {player.correctCount || 0} correct
          </span>

          <span
            className="
              flex items-center gap-1
              text-[7px] font-bold
              text-slate-400
              sm:text-[9px]
            "
          >
            <Flame
              className="
                h-2.5 w-2.5
                text-orange-500
                sm:h-3 sm:w-3
              "
            />

            {player.streak || 0} streak
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p
          className="
            text-xs font-black
            text-slate-900
            transition-transform duration-300
            group-hover:scale-110
            sm:text-base
          "
        >
          {player.score || 0}
        </p>

        <p
          className="
            text-[6px] font-black
            uppercase tracking-wider
            text-slate-400
            sm:text-[8px]
          "
        >
          points
        </p>
      </div>

      <ChevronRight
        className="
          hidden h-4 w-4
          text-slate-300
          transition-all duration-300
          group-hover:translate-x-1
          group-hover:text-cyan-500
          sm:block
        "
      />
    </div>
  );
};

/* ==========================================================================
   MINI STAT
   ========================================================================== */

const MiniStat = ({
  label,
  value,
}) => {
  return (
    <div
      className="
        rounded-xl
        bg-white/10
        px-2.5 py-2
        ring-1 ring-white/10
        backdrop-blur
      "
    >
      <p
        className="
          text-[6px] font-black
          uppercase tracking-wider
          text-slate-400
        "
      >
        {label}
      </p>

      <p className="mt-0.5 text-sm font-black sm:text-base">
        {value}
      </p>
    </div>
  );
};

/* ==========================================================================
   PERFORMANCE CARD
   ========================================================================== */

const PerformanceCard = ({
  icon,
  label,
  value,
  type = "blue",
  delay = 0,
}) => {
  const styles = {
    success: {
      wrapper: "bg-emerald-50 border-emerald-100",
      icon: "text-emerald-600",
    },

    danger: {
      wrapper: "bg-rose-50 border-rose-100",
      icon: "text-rose-500",
    },

    orange: {
      wrapper: "bg-orange-50 border-orange-100",
      icon: "text-orange-500",
    },

    blue: {
      wrapper: "bg-blue-50 border-blue-100",
      icon: "text-blue-600",
    },
  };

  const style = styles[type];

  return (
    <div
      className={`
        group rounded-xl
        border p-2.5
        transition-all duration-500
        hover:-translate-y-1
        hover:shadow-lg
        sm:rounded-2xl sm:p-3.5
        ${style.wrapper}
      `}
      style={{
        animation: `
          cardReveal
          700ms
          ease-out
          ${delay}ms
          both
        `,
      }}
    >
      <div
        className={`
          h-3.5 w-3.5
          transition-transform duration-500
          group-hover:scale-125
          group-hover:rotate-6
          ${style.icon}
        `}
      >
        {React.cloneElement(icon, {
          className: "h-3.5 w-3.5",
        })}
      </div>

      <p
        className="
          mt-2 text-[7px]
          font-black uppercase
          tracking-[0.14em]
          text-slate-400
          sm:mt-3 sm:text-[9px]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-0.5 text-lg
          font-black text-slate-950
          sm:text-xl
        "
      >
        {value}
      </p>
    </div>
  );
};

/* ==========================================================================
   RANK BADGE
   ========================================================================== */

const RankBadge = ({ rank }) => {
  const styles = {
    1: `
      bg-gradient-to-br
      from-amber-300 to-yellow-400
      text-amber-950
      shadow-amber-100
    `,

    2: `
      bg-gradient-to-br
      from-slate-200 to-slate-300
      text-slate-700
      shadow-slate-100
    `,

    3: `
      bg-gradient-to-br
      from-orange-200 to-orange-300
      text-orange-900
      shadow-orange-100
    `,
  };

  return (
    <div
      className={`
        grid h-8 w-8
        shrink-0 place-items-center
        rounded-lg
        text-[9px] font-black
        shadow-sm
        transition-transform duration-300
        group-hover:scale-110
        sm:h-10 sm:w-10
        sm:rounded-xl sm:text-xs
        ${
          styles[rank] ||
          "bg-white text-slate-500 ring-1 ring-slate-200"
        }
      `}
    >
      {rank}
    </div>
  );
};

export default BattleResultsPage;
