import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  MessageCircleMore,
  PhoneCall,
  ShieldCheck,
  Check,
  Copy,
  ArrowUpRight,
  BookOpen,
  HelpCircle,
  Sparkles,
  Clock,
} from "lucide-react";

const WHATSAPP_NUMBER = "917304930375";

const QUICK_TOPICS = [
  {
    label: "Concept Doubt",
    icon: BookOpen,
    msg: "Hello Rethish Sir, I have a concept doubt in Innovative Science 2.",
  },
  {
    label: "PYQ Help",
    icon: HelpCircle,
    msg: "Hello Rethish Sir, I need help with a practice question in Innovative Science 2.",
  },
  {
    label: "Batch Query",
    icon: Sparkles,
    msg: "Hello Rethish Sir, I have a query regarding Classes / school support.",
  },
];

const getWaUrl = (msg) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    msg || "Hello Rethish Sir, I need help with Innovative Science 2.",
  )}`;

const EASE = [0.22, 1, 0.36, 1];

const Contactpage = () => {
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();

  const handleCopy = () => {
    navigator.clipboard.writeText("+91 73049 30375");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="relative flex min-h-[calc(100dvh-76px)] w-full items-center justify-center overflow-hidden bg-[#FAFBFA] px-4 py-6 text-slate-900 antialiased sm:px-6 sm:py-8">
      {/* ─── Ambient Background ─── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(16,185,129,0.10),transparent_65%)]" />

        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage:
              "radial-gradient(ellipse 65% 55% at 50% 45%, #000 25%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 45%, #000 25%, transparent 80%)",
          }}
        />

        {!reduced && (
          <>
            <motion.div
              animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[12%] top-[18%] hidden h-52 w-52 rounded-full bg-emerald-200/30 blur-[110px] md:block"
            />
            <motion.div
              animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[14%] right-[10%] hidden h-56 w-56 rounded-full bg-teal-200/25 blur-[110px] md:block"
            />
          </>
        )}
      </div>

      {/* ─── Single Centered Card ─── */}
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative mx-auto w-full max-w-xl"
      >
        <div className="relative overflow-hidden rounded-[28px] border border-emerald-100/70 bg-white/85 p-6 shadow-[0_24px_70px_-30px_rgba(16,185,129,0.28)] backdrop-blur-xl sm:rounded-[32px] sm:p-9">
          {/* corner glows */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-200/50 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-gradient-to-tr from-teal-200/40 to-transparent blur-2xl" />

          {/* ── Trust badge ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06, ease: EASE }}
            className="relative flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/80 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Direct Mentor Desk
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              Online
            </span>
          </motion.div>

          {/* ── Headline ── */}
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="relative mt-6 text-center font-serif text-[32px] leading-[1.1] tracking-[-0.02em] text-slate-950 sm:text-[44px]"
          >
            Ask{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
              directly.
            </span>
          </motion.h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: EASE }}
            className="relative mx-auto mt-3 max-w-md text-center text-[13.5px] leading-6 text-slate-500 sm:text-sm sm:leading-7"
          >
            Clear answers on WhatsApp — doubts, PYQs and school support.
          </motion.p>

          {/* ── Primary CTA ── */}
          <motion.a
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            href={getWaUrl()}
            target="_blank"
            rel="noreferrer"
            className="group relative mt-7 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-4 text-[14.5px] font-bold text-white shadow-[0_14px_36px_-14px_rgba(16,185,129,0.65)] transition-all hover:shadow-[0_18px_44px_-14px_rgba(16,185,129,0.75)] sm:text-[15px]"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <MessageCircleMore className="relative h-5 w-5 shrink-0" />
            <span className="relative">Chat on WhatsApp</span>
            <ArrowUpRight className="relative h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.a>

          {/* ── Quick topic chips ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="mt-3 grid grid-cols-3 gap-2"
          >
            {QUICK_TOPICS.map(({ label, icon: Icon, msg }) => (
              <motion.a
                key={label}
                href={getWaUrl(msg)}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="group/chip flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50/60"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 transition-all duration-300 group-hover/chip:bg-emerald-600 group-hover/chip:text-white">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] font-bold text-slate-700 group-hover/chip:text-emerald-800">
                  {label}
                </span>
              </motion.a>
            ))}
          </motion.div>

          {/* ── Divider ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative mt-6 flex items-center gap-3"
          >
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              or reach out
            </span>
            <span className="h-px flex-1 bg-slate-100" />
          </motion.div>

          {/* ── Compact contact row ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.45, ease: EASE }}
            className="relative mt-4 flex items-center gap-2"
          >
            <a
              href="tel:+917304930375"
              className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <PhoneCall className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Call
                </span>
                <span className="block truncate text-[12px] font-black text-slate-900">
                  +91 73049 30375
                </span>
              </span>
            </a>

            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy phone number"
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition-all active:scale-95 ${
                copied
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200/80 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </motion.div>

          {/* ── Availability + feedback ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="relative mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] font-semibold text-slate-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-emerald-600" />
              Mon–Sat · 9 AM – 8 PM
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Verified mentor
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <Link
              to="/feedback"
              className="inline-flex items-center gap-1 text-slate-500 underline-offset-2 transition-colors hover:text-emerald-700 hover:underline"
            >
              Feedback
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
};

export default Contactpage;
