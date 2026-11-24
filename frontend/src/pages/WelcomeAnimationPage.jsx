import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Sparkles, ChevronRight } from "lucide-react";
import logo from "../assets/logo.svg";

/* ================================================================== */
/*  TIMELINE                                                           */
/*  Total ≈ 11s. SPEED scales the whole intro (0.8 = faster, 1.3 =     */
/*  slower). Every scene auto-advances; the last one waits for the CTA */
/*  but still auto-finishes after `finalHold`.                         */
/* ================================================================== */
const SPEED = 1;

const SCENES = [
  { key: "question", hold: 2200 },
  { key: "curiosity", hold: 1900 },
  { key: "learn", hold: 5600 },
  { key: "brand", hold: 2600 },
  { key: "welcome", hold: 9000, final: true },
];

const EASE = [0.22, 1, 0.36, 1];
const SOFT = [0.16, 1, 0.3, 1];
const EXIT_EASE = [0.32, 0, 0.2, 1];
const random = (min, max) => Math.random() * (max - min) + min;

const LEARN_STEPS = [
  {
    word: "LEARN",
    gradient: "from-amber-200 via-amber-300 to-orange-300",
    ring: "rgba(252,211,77,0.9)",
  },
  {
    word: "PRACTICE",
    gradient: "from-sky-200 via-cyan-300 to-sky-400",
    ring: "rgba(56,189,248,0.9)",
  },
  {
    word: "IMPROVE",
    gradient: "from-amber-100 via-white to-sky-200",
    ring: "rgba(255,255,255,0.9)",
  },
];

/* ================================================================== */
/*  BACKGROUND LAYERS                                                  */
/* ================================================================== */

/* dual-tone royal starfield */
const StarField = ({ count = 72, reduceMotion }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: `${random(2, 98)}%`,
        left: `${random(2, 98)}%`,
        size: random(1.1, 2.6),
        delay: random(0, 4),
        duration: random(2.4, 5.4),
        isGold: i % 3 === 0,
      })),
    [count],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className={`absolute rounded-full ${
            s.isGold
              ? "bg-amber-200 shadow-[0_0_8px_rgba(252,211,77,0.75)]"
              : "bg-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.65)]"
          }`}
          style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.12, 0.95, 0.12], scale: [0.9, 1.5, 0.9] }
          }
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

/* drifting aurora orb */
const Orb = ({ className, from, to, duration, reduceMotion }) => (
  <motion.div
    aria-hidden="true"
    className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
    style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    animate={
      reduceMotion
        ? undefined
        : { x: [-26, 26, -26], y: [-20, 24, -20], scale: [1, 1.12, 1] }
    }
    transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
  />
);

/* film grain */
const Grain = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 z-[7] opacity-[0.045] mix-blend-soft-light"
    style={{
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.65'/></svg>")`,
      backgroundSize: "140px 140px",
    }}
  />
);

/* the "light passes across the screen" moment, re-fired per scene */
const LightSweep = () => (
  <motion.div
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-0 left-0 z-[6] w-[45vw] -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
    initial={{ x: "-45vw", opacity: 0 }}
    animate={{ x: "165vw", opacity: [0, 1, 0] }}
    transition={{ duration: 1.5, ease: "easeInOut" }}
  />
);

/* ================================================================== */
/*  TEXT HELPERS                                                       */
/* ================================================================== */

/* word-by-word blur → sharp reveal */
const WordReveal = ({
  text,
  className = "",
  delay = 0,
  stagger = 0.055,
  reduceMotion,
}) => {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block whitespace-nowrap">
          <motion.span
            className="inline-block will-change-transform"
            initial={
              reduceMotion
                ? false
                : { opacity: 0, y: "0.45em", filter: "blur(10px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.85,
              delay: reduceMotion ? 0 : delay + i * stagger,
              ease: EASE,
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && "\u00A0"}
        </span>
      ))}
    </span>
  );
};

/* ================================================================== */
/*  SCENE 1 — THE BEGINNING                                            */
/* ================================================================== */
const SceneQuestion = ({ reduceMotion }) => (
  <div className="flex flex-col items-center text-center">
    <h2 className="mt-6 max-w-xl text-2xl font-bold leading-[1.25] tracking-[-0.02em] text-white sm:text-4xl">
      <WordReveal
        text="Every great journey begins with a question."
        delay={0.35}
        stagger={0.06}
        reduceMotion={reduceMotion}
      />
    </h2>

    <motion.div
      initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 1, delay: reduceMotion ? 0 : 0.9, ease: EASE }}
      className="mt-7 h-px w-24 origin-center bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"
    />
  </div>
);

/* ================================================================== */
/*  SCENE 2 — CURIOSITY                                                */
/* ================================================================== */
const SceneCuriosity = ({ reduceMotion }) => (
  <div className="relative flex flex-col items-center text-center">
    {/* expanding halo behind the line */}
    {!reduceMotion && (
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_70%)] blur-2xl"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.5, 1.15], opacity: [0, 0.9, 0.55] }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
    )}

    <h2 className="relative mt-6 max-w-xl text-2xl font-bold leading-[1.25] tracking-[-0.02em] text-white sm:text-4xl">
      <WordReveal
        text="Curiosity creates possibilities."
        delay={0.25}
        stagger={0.075}
        reduceMotion={reduceMotion}
      />
    </h2>

    <motion.p
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.95, ease: EASE }}
      className="mt-4 max-w-sm text-sm leading-6 text-slate-400"
    >
      Ask more. Explore deeper. Discover what you are capable of.
    </motion.p>
  </div>
);

/* ================================================================== */
/*  SCENE 3 — LEARN → PRACTICE → IMPROVE                               */
/* ================================================================== */
const SceneLearn = ({ reduceMotion, pace }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, LEARN_STEPS.length - 1));
    }, 1500 * pace);
    return () => window.clearInterval(id);
  }, [reduceMotion, pace]);

  const active = LEARN_STEPS[step];

  return (
    <div className="flex flex-col items-center text-center">
      {/* cycling word stage */}
      <div className="relative mt-8 grid h-[4.5rem] w-full place-items-center sm:h-[6rem]">
        {reduceMotion ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {LEARN_STEPS.map((s) => (
              <span
                key={s.word}
                className={`bg-gradient-to-r ${s.gradient} bg-clip-text text-2xl font-black tracking-[0.08em] text-transparent sm:text-4xl`}
              >
                {s.word}
              </span>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={active.word}
              initial={{
                opacity: 0,
                y: 46,
                filter: "blur(16px)",
                rotateX: -60,
              }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)", rotateX: 0 }}
              exit={{ opacity: 0, y: -46, filter: "blur(16px)", rotateX: 60 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute flex flex-col items-center"
            >
              <span
                className={`bg-gradient-to-r ${active.gradient} bg-clip-text text-[2rem] font-black tracking-[0.12em] text-transparent drop-shadow-[0_0_28px_rgba(252,211,77,0.25)] sm:text-6xl`}
                style={{ WebkitTextStroke: "0.5px rgba(255,255,255,0.06)" }}
              >
                {active.word}
              </span>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 3-segment stepper */}
      <div className="mt-4 flex items-center gap-2">
        {LEARN_STEPS.map((s, i) => (
          <div key={s.word} className="flex items-center gap-2">
            <motion.div
              animate={{
                width: i === step ? 30 : 10,
                opacity: i <= step ? 1 : 0.28,
                backgroundColor:
                  i <= step ? "rgba(252,211,77,0.9)" : "rgba(148,163,184,0.9)",
                boxShadow:
                  i === step
                    ? "0 0 12px rgba(252,211,77,0.8)"
                    : "0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.45, ease: EASE }}
              className="h-[3px] rounded-full"
            />
            {i < LEARN_STEPS.length - 1 && (
              <ChevronRight size={11} className="text-slate-600" />
            )}
          </div>
        ))}
      </div>

      <motion.p
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: reduceMotion ? 0 : 1.6 }}
        className="mt-6 max-w-xs text-xs leading-5 text-slate-500 sm:text-sm"
      >
        A simple loop, repeated daily, compounds into mastery.
      </motion.p>
    </div>
  );
};

/* ================================================================== */
/*  SCENE 4 — BRAND REVEAL                                             */
/* ================================================================== */
const SceneBrand = ({ reduceMotion }) => (
  <div className="flex flex-col items-center text-center">
    {/* ---- crest ---- */}
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.72, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.95, ease: EASE }}
      className="relative mb-7 grid h-24 w-24 place-items-center sm:mb-8 sm:h-32 sm:w-32"
    >
      {/* shockwaves */}
      {!reduceMotion && (
        <>
          <motion.span
            className="pointer-events-none absolute h-24 w-24 rounded-full border border-amber-200/50 sm:h-32 sm:w-32"
            initial={{ scale: 0.4, opacity: 0.85 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 1.7, delay: 0.3, ease: "easeOut" }}
          />
          <motion.span
            className="pointer-events-none absolute h-24 w-24 rounded-full border border-sky-300/40 sm:h-32 sm:w-32"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 2, delay: 0.55, ease: "easeOut" }}
          />
        </>
      )}

      {/* orbit rings */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <motion.div
          className="absolute h-28 w-28 rounded-full border border-amber-200/25 sm:h-36 sm:w-36"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.95)]" />
        </motion.div>
        <motion.div
          className="absolute h-36 w-36 rounded-full border border-dashed border-sky-300/20 sm:h-46 sm:w-46"
          animate={reduceMotion ? undefined : { rotate: -360 }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute top-1/2 -right-[3px] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.95)]" />
        </motion.div>
      </div>

      {/* rotating conic halo */}
      <motion.div
        aria-hidden="true"
        className="absolute -inset-3 rounded-[2.2rem] opacity-70 blur-xl"
        style={{
          background:
            "conic-gradient(from 0deg, #fcd34d, #38bdf8, #1e3a8a, #f59e0b, #fcd34d)",
        }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* crest card + light reveal wipe */}
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative h-full w-full overflow-hidden rounded-[1.8rem] border border-amber-200/35 bg-[#0a1124]/85 p-2.5 shadow-[0_0_65px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl"
      >
        <img
          src={logo}
          alt="Innovative Science"
          className="h-full w-full rounded-[1.35rem] object-cover"
        />
        {!reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.9) 50%, transparent 75%)",
            }}
            initial={{ x: "-130%" }}
            animate={{ x: "130%" }}
            transition={{ duration: 1.15, delay: 0.3, ease: "easeInOut" }}
          />
        )}
        <motion.span
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.35, 1],
                  opacity: [0.55, 1, 0.55],
                  rotate: [0, 20, 0],
                }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-2 -top-2 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.9)]"
        >
          <Sparkles size={20} />
        </motion.span>
      </motion.div>
    </motion.div>

    {/* ---- wordmark ---- */}
    <motion.h2
      initial={
        reduceMotion ? false : { opacity: 0, y: 18, filter: "blur(12px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: reduceMotion ? 0 : 0.55, ease: EASE }}
      className="text-[1.35rem] font-black uppercase leading-none tracking-[0.14em] text-white sm:text-4xl"
    >
      Innovative Science
    </motion.h2>

    {/* ---- sub brands ---- */}
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.95, ease: EASE }}
      className="mt-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-200/85 sm:text-xs"
    >
      <span>Science 1</span>
      <span className="h-3 w-px bg-white/20" />
      <span>Science 2</span>
    </motion.div>

    <motion.div
      initial={reduceMotion ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 1.1, delay: reduceMotion ? 0 : 1.15, ease: EASE }}
      className="mt-5 h-px w-32 origin-center bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"
    />
  </div>
);

/* ================================================================== */
/*  SCENE 5 — WELCOME + CTA                                            */
/* ================================================================== */
const SceneWelcome = ({ reduceMotion, onBegin }) => (
  <div className="flex flex-col items-center text-center">
    <h2 className="mt-6 max-w-lg text-[1.6rem] font-black leading-[1.2] tracking-[-0.02em] text-white sm:text-[2.6rem]">
      <WordReveal
        text="Your journey towards excellence starts here."
        delay={0.28}
        stagger={0.06}
        reduceMotion={reduceMotion}
      />
    </h2>

    <motion.p
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.9, ease: EASE }}
      className="mt-4 max-w-sm text-sm leading-6 text-slate-400"
    >
      One question at a time. One concept at a time. Let's build something that
      lasts.
    </motion.p>

    {/* ---------------- CTA ---------------- */}
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.65,
        delay: reduceMotion ? 0 : 1.25,
        ease: EASE,
      }}
      className="relative mt-8"
    >
      {!reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(252,211,77,0.42)",
              "0 0 0 16px rgba(252,211,77,0)",
            ],
          }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      <motion.button
        type="button"
        onClick={onBegin}
        whileHover={reduceMotion ? undefined : { scale: 1.04, y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className="group relative inline-flex items-center justify-center rounded-full p-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04070f]"
      >
        {/* static gradient border */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-90"
          style={{
            background:
              "conic-gradient(from 0deg, #fcd34d, #38bdf8, #1e3a8a, #f59e0b, #fcd34d)",
          }}
        />

        {/* inner pill */}
        <span className="relative inline-flex min-h-12 items-center gap-2.5 overflow-hidden rounded-full bg-[#050a17]/95 px-7 text-sm font-black text-white transition-colors duration-300 group-hover:bg-[#0a1124]">
          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 h-full w-14 bg-white/25 blur-md"
              style={{ skewX: -20 }}
              animate={{ x: [-80, 320] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 2.4,
                ease: "easeInOut",
              }}
            />
          )}
          <span className="relative bg-gradient-to-r from-amber-200 via-white to-sky-200 bg-clip-text text-transparent">
            Let's Begin
          </span>
          <ArrowRight
            size={17}
            className="relative text-amber-200 transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </motion.button>
    </motion.div>

    <motion.p
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: reduceMotion ? 0 : 1.7 }}
      className="mt-3 hidden text-[10px] uppercase tracking-[0.28em] text-slate-500 sm:block"
    >
      or press Enter
    </motion.p>
  </div>
);

/* ================================================================== */
/*  MAIN                                                               */
/* ================================================================== */
const WelcomeAnimationPage = ({ onComplete }) => {
  const reduceMotion = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const doneRef = useRef(false);

  const pace = reduceMotion ? 0.55 : SPEED;
  const exitMs = reduceMotion ? 220 : 900;
  const total = SCENES.length;

  /* ---------------- finish ---------------- */
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setIsClosing(true);
    window.setTimeout(() => onComplete?.(), exitMs);
  }, [exitMs, onComplete]);

  /* ---------------- auto timeline ---------------- */
  useEffect(() => {
    if (isClosing) return;
    const current = SCENES[scene];
    if (!current) return;

    const isFinal = scene === total - 1;
    if (isFinal) return;
    const hold = current.hold * pace;

    const t = window.setTimeout(() => {
      setScene((s) => Math.min(s + 1, total - 1));
    }, hold);

    return () => window.clearTimeout(t);
  }, [scene, isClosing, pace, total, finish]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  /* ---------------- pointer parallax ---------------- */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });

  const contentX = useTransform(sx, [-1, 1], [-14, 14]);
  const contentY = useTransform(sy, [-1, 1], [-9, 9]);
  const bgX = useTransform(sx, [-1, 1], [34, -34]);
  const bgY = useTransform(sy, [-1, 1], [22, -22]);
  const glowLeft = useTransform(sx, [-1, 1], ["36%", "64%"]);
  const glowTop = useTransform(sy, [-1, 1], ["36%", "64%"]);

  const handleMouse = (e) => {
    if (reduceMotion || isClosing) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  /* ---------------- scene switch ---------------- */
  const renderScene = () => {
    switch (SCENES[scene].key) {
      case "question":
        return <SceneQuestion reduceMotion={reduceMotion} />;
      case "curiosity":
        return <SceneCuriosity reduceMotion={reduceMotion} />;
      case "learn":
        return <SceneLearn reduceMotion={reduceMotion} pace={pace} />;
      case "brand":
        return <SceneBrand reduceMotion={reduceMotion} />;
      case "welcome":
        return <SceneWelcome reduceMotion={reduceMotion} onBegin={finish} />;
      default:
        return null;
    }
  };

  return (
    <main
      aria-label="Welcome to Innovative Science"
      onMouseMove={handleMouse}
      className="fixed inset-0 grid h-[100dvh] max-h-[100dvh] w-full place-items-center overflow-hidden overscroll-none select-none bg-[#04070f] px-5 text-white sm:px-6"
    >
      {/* ---------- vignette ---------- */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(245,158,11,0.13),transparent_42%),radial-gradient(circle_at_50%_55%,rgba(56,189,248,0.15),transparent_56%),radial-gradient(circle_at_50%_100%,rgba(30,27,75,0.7),transparent_62%)]"
      />

      {/* ---------- aurora orbs ---------- */}
      <motion.div
        style={{ x: bgX, y: bgY }}
        animate={
          isClosing ? { scale: 1.3, opacity: 0 } : { scale: 1, opacity: 1 }
        }
        transition={{ duration: exitMs / 1000, ease: EXIT_EASE }}
        className="pointer-events-none absolute inset-0"
      >
        <Orb
          className="-left-28 -top-24 h-[26rem] w-[26rem] opacity-35"
          from="#1d4ed8"
          to="#312e81"
          duration={10}
          reduceMotion={reduceMotion}
        />
        <Orb
          className="-right-24 top-1/5 h-[22rem] w-[22rem] opacity-25"
          from="#f59e0b"
          to="#38bdf8"
          duration={12}
          reduceMotion={reduceMotion}
        />
        <Orb
          className="-bottom-28 left-1/3 h-[25rem] w-[25rem] opacity-35"
          from="#1e1b4b"
          to="#0284c7"
          duration={14}
          reduceMotion={reduceMotion}
        />
      </motion.div>

      {/* ---------- cursor glow ---------- */}
      <motion.div
        aria-hidden="true"
        style={{ left: glowLeft, top: glowTop }}
        className="pointer-events-none absolute hidden h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16),transparent_65%)] blur-2xl sm:block"
      />

      {/* ---------- perspective floor ---------- */}
      <motion.div
        aria-hidden="true"
        animate={
          isClosing
            ? { opacity: 0, scale: 1.28, y: 40 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ duration: 0.7, ease: EXIT_EASE }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] [perspective:520px]"
      >
        <div
          className="absolute inset-0 origin-bottom [transform:rotateX(64deg)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(251,191,36,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.14) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to top, black 28%, transparent)",
            WebkitMaskImage: "linear-gradient(to top, black 28%, transparent)",
          }}
        />
      </motion.div>

      <StarField reduceMotion={reduceMotion} />
      <Grain />

      {/* light sweep re-fires on every scene change */}
      <AnimatePresence>
        <LightSweep key={`sweep-${scene}`} />
      </AnimatePresence>

      {/* ---------- scene stage ---------- */}
      <motion.div
        style={{ x: contentX, y: contentY }}
        animate={
          isClosing
            ? reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 1.08, y: -18, filter: "blur(12px)" }
            : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
        }
        transition={{ duration: exitMs / 1000, ease: EXIT_EASE }}
        className="relative z-10 grid w-full max-w-3xl place-items-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: EASE }}
            className="w-full"
          >
            {renderScene()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ---------- skip ---------- */}
      <motion.button
        type="button"
        onClick={finish}
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ delay: reduceMotion ? 0 : 1.2, duration: 0.5 }}
        className="absolute right-4 top-4 z-30 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:right-6 sm:top-6"
      >
        Skip intro
      </motion.button>

      {/* ---------- scene progress dots ---------- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.6, duration: 0.6 }}
        className="absolute inset-x-0 bottom-7 z-30 flex items-center justify-center gap-2"
      >
        {SCENES.map((s, i) => (
          <motion.span
            key={s.key}
            className="h-[3px] rounded-full"
            animate={{
              width: i === scene ? 26 : 8,
              backgroundColor:
                i === scene
                  ? "rgba(252,211,77,0.95)"
                  : i < scene
                    ? "rgba(148,163,184,0.5)"
                    : "rgba(148,163,184,0.18)",
              boxShadow: i === scene ? "0 0 12px rgba(252,211,77,0.8)" : "none",
            }}
            transition={{ duration: 0.45, ease: EASE }}
          />
        ))}
      </motion.div>

      {/* ---------- exit bloom ---------- */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          isClosing
            ? { opacity: [0, 0.5, 0], scale: 1.4 }
            : { opacity: 0, scale: 0.85 }
        }
        transition={{ duration: exitMs / 1000, ease: EXIT_EASE }}
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,rgba(253,230,138,0.5)_0%,rgba(56,189,248,0.24)_40%,transparent_76%)]"
      />
    </main>
  );
};

export default WelcomeAnimationPage;
