import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircleMore,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Check,
  Copy,
  ArrowUpRight,
  BookOpen,
  HelpCircle,
  Sparkles,
  Clock,
  GraduationCap,
} from "lucide-react";

const WHATSAPP_NUMBER = "917304930375";

const QUICK_TOPICS = [
  {
    label: "Concept Doubt",
    desc: "Chapter & theory clarification",
    icon: BookOpen,
    msg: "Hello Rethish Sir, I have a concept doubt in Innovative Science 2.",
  },
  {
    label: "Quiz / PYQ Help",
    desc: "Practice & board questions",
    icon: HelpCircle,
    msg: "Hello Rethish Sir, I need help with a practice question in Innovative Science 2.",
  },
  {
    label: "School / Batch Query",
    desc: "Class info",
    icon: Sparkles,
    msg: "Hello Rethish Sir, I have a query regarding Classes / school support.",
  },
];

const getWaUrl = (msg) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    msg || "Hello Rethish Sir, I need help with Innovative Science 2.",
  )}`;

const Contactpage = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("+91 73049 30375");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="relative min-h-[calc(100dvh-76px)] w-full overflow-hidden bg-slate-50 px-3.5 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      {/* Animated Ambient Background Orbs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl lg:h-96 lg:w-96"
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl lg:h-96 lg:w-96"
      />

      {/* Full-Width Desktop Bento Container (Matches Navbar Span) */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto flex min-h-[calc(100dvh-140px)] w-full max-w-[1440px] flex-col justify-between overflow-hidden rounded-3xl border border-white/90 bg-white/90 p-5 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8 lg:p-12"
      >
        {/* Top Micro Trust Bar */}
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-emerald-700">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Direct Mentor Desk • Innovative Science 2
          </span>
          <div className="flex flex-wrap items-center gap-4 font-medium text-slate-500">
            
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified • No Forms • Privacy Safe
            </span>
          </div>
        </div>

        {/* Main Full-Span Desktop Grid */}
        <div className="my-auto grid items-center gap-8 py-6 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          {/* Left Column: Hero Heading, CTAs & 1-Tap Cards */}
          <div>
            <h1 className="font-serif text-3xl leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
              Ask{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Directly !!
              </span>{" "}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Fast, clear, step-by-step answers on WhatsApp for Innovative
              Science 2 doubts, PYQs, and school-level academic support.
            </p>

            {/* Primary CTA + Feedback Link */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={getWaUrl()}
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-emerald-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 sm:w-auto sm:text-base"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <MessageCircleMore className="h-5 w-5 shrink-0" />
                Chat on WhatsApp
                <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.a>

              <Link
                to="/feedback"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/90 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-800 sm:w-auto sm:text-base"
              >
                Website Feedback
              </Link>
            </div>

            {/* 1-Tap Quick Topic Cards (Spreads nicely across wide desktop) */}
            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                1-Tap Quick Topics (Pre-filled WhatsApp Message)
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {QUICK_TOPICS.map(({ label, desc, icon: Icon, msg }, i) => (
                  <motion.a
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    href={getWaUrl(msg)}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50/60 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-600 shadow-2xs ring-1 ring-slate-200/70 transition-colors group-hover:bg-emerald-600 group-hover:text-white group-hover:ring-emerald-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-600" />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                        {label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Official Mentor Card */}
          <div className="flex flex-col justify-between gap-3.5 rounded-3xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50/90 p-5 shadow-inner sm:p-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                Official Contact Card
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                Mr. Rethish Mudaliar
              </span>
            </div>

            {/* Phone with Copy & Tap-to-Call */}
            <motion.div
              whileHover={{ x: 3 }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-2xs"
            >
              <a
                href="tel:+917304930375"
                className="flex min-w-0 items-center gap-3.5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100/80 text-emerald-700">
                  <PhoneCall className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Call / WhatsApp
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                    +91 73049 30375
                  </p>
                </div>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy phone number"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Location */}
            <motion.div
              whileHover={{ x: 3 }}
              className="flex items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-2xs"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100/80 text-emerald-700">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Location
                </p>
                <p className="text-sm font-bold text-slate-900 sm:text-base">
                  Mumbai, Maharashtra
                </p>
              </div>
            </motion.div>

            {/* Support Hours & Reply Style */}
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-600/5 p-4 text-xs leading-6 text-slate-600 sm:text-sm">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Clock className="h-4 w-4" />
                Quick & Crisp Replies
              </div>
              <p className="mt-1">
                Available <strong>Mon–Sat (9:00 AM – 8:00 PM)</strong> so
                students get fast clarity and get back to practice right away.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Subtle Footer Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
          <span>Innovative Science 2 • Student Support Portal</span>
          <span>Direct WhatsApp & Voice Assistance</span>
        </div>
      </motion.div>
    </section>
  );
};

export default Contactpage;
