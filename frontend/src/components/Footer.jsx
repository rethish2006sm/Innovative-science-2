import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { NavLink } from "react-router-dom";

import instagramLogo from "../assets/instalogo.png";
import youtubeLogo from "../assets/youtubelogo.webp";
import websiteLogo from "../assets/logo.svg";

import {
  Heart,
  Mail,
  MapPin,
  Phone,
  ArrowUpRight,
} from "lucide-react";

/* ---------------- NAVIGATION ---------------- */

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Chapters", href: "/chapters" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Feedback", href: "/feedback" },
];

/* ---------------- ANIMATIONS ---------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

/* ---------------- MAGNETIC EFFECT ---------------- */

const useMagnet = (strength = 0.3) => {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;

    const { left, top, width, height } = ref.current.getBoundingClientRect();

    const x = e.clientX - (left + width / 2);
    const y = e.clientY - (top + height / 2);

    ref.current.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "translate(0px, 0px)";
  };

  return { ref, handleMouseMove, handleLeave };
};

/* ---------------- CONTACT LINK ---------------- */

const ContactLink = ({ href, icon, label, value }) => (
  <a href={href} className="group flex items-center gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-all duration-300 group-hover:border-sky-300/60 group-hover:bg-sky-400/10 group-hover:text-sky-300">
      {icon}
    </div>

    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm text-slate-300 transition-colors group-hover:text-sky-300">
        {value}
      </p>
    </div>
  </a>
);

/* ---------------- CREATOR CREDIT ---------------- */

const CreatorCredit = () => (
  <motion.div
    variants={itemVariants}
    className="group mt-7 inline-flex items-center gap-3 border-l-2 border-sky-400/50 pl-4 text-left transition-all duration-300 hover:border-sky-300"
  >
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors group-hover:text-sky-300">
        Founder & Developer
      </p>

      <p className="mt-1 text-sm font-semibold tracking-wide text-slate-200 transition-colors group-hover:text-white">
        Rethish Mudaliar
      </p>

      <p className="mt-0.5 text-[10px] tracking-wide text-slate-600">
        Innovative Science 2
      </p>
    </div>
  </motion.div>
);

/* ---------------- FOOTER ---------------- */

const Footer = () => {
  const reduceMotion = useReducedMotion();

  const instagram = useMagnet();
  const youtube = useMagnet();

  const socials = [
    {
      label: "Instagram",
      icon: instagram,
      href: "#",
      symbol: instagramLogo,
    },
    {
      label: "YouTube",
      icon: youtube,
      href: "#",
      symbol: youtubeLogo,
    },
  ];

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/5 bg-[#0a0f1a] text-white">
      {/* ---------------- MARQUEE ---------------- */}

      <div className="pointer-events-none absolute left-0 top-4 w-full overflow-hidden opacity-[0.08]">
        <motion.div
          animate={reduceMotion ? undefined : { x: [0, -600] }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="whitespace-nowrap text-[14vw] font-black italic sm:text-[10vw] md:text-[12vw]"
        >
          INNOVATIVE SCIENCE 2 INNOVATIVE SCIENCE 2 INNOVATIVE SCIENCE 2
          INNOVATIVE SCIENCE 2
        </motion.div>
      </div>

      {/* ---------------- GLOW BACKGROUND ---------------- */}

      <div className="absolute -left-[10%] -top-[10%] h-[250px] w-[250px] rounded-full bg-[#1280c7]/10 blur-[120px] sm:h-[400px] sm:w-[400px]" />

      <div className="absolute -bottom-[10%] -right-[10%] h-[200px] w-[200px] rounded-full bg-sky-400/10 blur-[120px] sm:h-[350px] sm:w-[350px]" />

      {/* ---------------- MAIN CONTENT ---------------- */}

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-20 md:px-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-10 text-center sm:gap-14 md:grid-cols-12 md:text-left"
        >
          {/* BRAND */}

          <motion.div
            variants={itemVariants}
            className="space-y-5 md:col-span-5"
          >
            <NavLink to="/" className="inline-flex items-center gap-3">
              <motion.div
                whileHover={
                  reduceMotion ? undefined : { rotate: 10, scale: 1.1 }
                }
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-400/10 p-1"
              >
                <img
                  src={websiteLogo}
                  alt="Innovative Science 2 logo"
                  className="h-full w-full rounded-xl object-cover"
                />
              </motion.div>

              <div className="text-left">
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  Innovative Science
                  <span className="text-sky-300"> 2.</span>
                </h2>

                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
                  Learn · Understand · Excel
                </p>
              </div>
            </NavLink>

            <p className="mx-auto max-w-sm text-sm leading-7 text-slate-400 md:mx-0">
              Making science simpler, smarter and more interesting. Building
              strong concepts, one chapter at a time.
            </p>

            {/* PROFESSIONAL CREATOR CREDIT */}

            <CreatorCredit />
          </motion.div>

          {/* NAVIGATION */}

          <motion.div variants={itemVariants} className="md:col-span-4">
            <h3 className="mb-5 text-[10px] uppercase tracking-[0.4em] text-slate-500">
              Navigation
            </h3>

            <div className="grid grid-cols-2 justify-items-center gap-3 sm:gap-4 md:justify-items-start">
              {navLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.href}
                  className={({ isActive }) =>
                    `group flex items-center gap-1 text-xs font-bold transition-all duration-300 sm:text-sm ${
                      isActive
                        ? "text-sky-300"
                        : "text-slate-300 hover:translate-x-1 hover:text-sky-300"
                    }`
                  }
                >
                  {link.label.toUpperCase()}

                  <ArrowUpRight
                    size={12}
                    className="opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
                  />
                </NavLink>
              ))}
            </div>
          </motion.div>

          {/* CONTACT */}

          <motion.div
            variants={itemVariants}
            className="space-y-5 md:col-span-3"
          >
            <h3 className="text-[10px] uppercase tracking-[0.4em] text-slate-500">
              Get In Touch
            </h3>

            <div className="space-y-5 text-left">
              <ContactLink
                href="mailto:innovativesci2@gmail.com"
                icon={<Mail size={17} />}
                label="Email"
                value="innovativesci2@gmail.com"
              />

              <ContactLink
                href="tel:+917304930375"
                icon={<Phone size={17} />}
                label="Phone"
                value="+91 73049 30375"
              />

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400">
                  <MapPin size={17} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Mumbai, Maharashtra
                  </p>
                </div>
              </div>
            </div>

            {/* SOCIAL ICONS */}

            <p className="pt-2 text-[10px] uppercase tracking-[0.4em] text-slate-500">
              Follow us on
            </p>

            <div className="flex justify-center gap-4 pt-2 md:justify-start">
              {socials.map((social) => (
                <div
                  key={social.label}
                  ref={social.icon.ref}
                  onMouseMove={
                    reduceMotion ? undefined : social.icon.handleMouseMove
                  }
                  onMouseLeave={social.icon.handleLeave}
                  className="transition-transform duration-200"
                >
                  <motion.a
                    href={social.href}
                    target={social.href === "#" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    whileHover={reduceMotion ? undefined : { scale: 1.1 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-slate-300 transition-all duration-300 hover:bg-sky-400/10 hover:text-sky-300 sm:h-16 sm:w-16"
                  >
                    <img
                      src={social.symbol}
                      alt={social.label}
                      className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                    />
                  </motion.a>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ---------------- BOTTOM SECTION ---------------- */}

        <div className="mt-14 flex items-center justify-center border-t border-white/5 pt-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500">
            <span>© {new Date().getFullYear()} Innovative Science 2</span>

            <span className="text-slate-700">·</span>

            <span>All rights reserved.</span>

            <Heart size={12} className="fill-sky-300 text-sky-300" />
          </div>
        </div>
      </div>

      {/* ---------------- BOTTOM GLOW LINE ---------------- */}

      <div className="h-px bg-gradient-to-r from-transparent via-sky-300/30 to-transparent transition-all duration-700 hover:via-sky-300/80" />
    </footer>
  );
};

export default Footer;
