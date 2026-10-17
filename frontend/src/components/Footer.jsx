import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  PhoneCall,
  Mail,
  MapPin,
  Trophy,
  Info,
  Sparkles,
  Heart,
  ArrowUp,
  MessageCircleMore,
  Award,
  Users,
  Calendar,
  FlaskConical,
} from 'lucide-react';

const mainNavItems = [
  { name: 'HOME', path: '/', Icon: Home },
  { name: 'CHAPTERS', path: '/chapters', Icon: BookOpen },
  { name: 'CONTACT', path: '/contact', Icon: PhoneCall },
  { name: 'FEEDBACK', path: '/feedback', Icon: MessageCircleMore },
];

const resultNavItems = [
  { name: 'LEADERBOARD', path: '/leaderboard', Icon: Trophy },
  { name: 'ABOUT', path: '/about', Icon: Info },
];

const navLinkClass = ({ isActive }) =>
  `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium
   transition-colors duration-200
   ${
     isActive
       ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/10'
       : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
   }`;

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="relative isolate overflow-hidden border-t border-cyan-500/10 bg-[#111a1d] text-white">

      {/* Static background: no continuous animation or heavy blur */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-teal-500/[0.07] blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-cyan-500/[0.06] blur-3xl" />

        <div className="absolute inset-0 opacity-[0.025] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-12 lg:px-10 lg:py-14">

        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

          {/* Column 1: Brand */}
          <div className="flex flex-col gap-5">

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-teal-500/15">
                <FlaskConical
                  size={27}
                  className="text-cyan-400"
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-1.5 text-xl font-black tracking-tight sm:text-2xl">
                  Innovative Science 2
                  <Sparkles size={16} className="text-cyan-400" />
                </h2>

                <p className="mt-1 text-xs tracking-wide text-slate-400">
                  Mr. Rethish Mudaliar
                </p>
              </div>
            </div>

            <p className="text-sm leading-7 text-slate-300">
              Simplifying complex scientific concepts and fostering core
              conceptual clarity.
            </p>

            <div className="rounded-xl border border-cyan-500/15 bg-white/[0.035] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Owner
              </p>

              <p className="text-sm font-semibold text-white">
                Mr. Rethish Mudaliar
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Computer Engineering
              </p>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-400">
              <span className="h-px w-5 bg-cyan-400/60" />
              NAVIGATION
            </h3>

            <nav className="flex flex-col gap-2" aria-label="Main navigation">
              {mainNavItems.map(({ name, path, Icon }) => (
                <NavLink key={name} to={path} className={navLinkClass}>
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0 text-cyan-400 transition-colors duration-200 group-hover:text-white"
                  />
                  <span>{name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Column 3: Resources */}
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-400">
              <span className="h-px w-5 bg-cyan-400/60" />
              RESOURCES
            </h3>

            <nav className="flex flex-col gap-2" aria-label="Resources">
              {resultNavItems.map(({ name, path, Icon }) => (
                <NavLink key={name} to={path} className={navLinkClass}>
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0 text-cyan-400 transition-colors duration-200 group-hover:text-white"
                  />
                  <span>{name}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-2 flex items-center gap-2 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] px-3 py-3">
              <Award size={16} className="shrink-0 text-cyan-400" />

              <span className="text-xs leading-5 text-slate-300">
                Top Science Ranks Every Year
              </span>
            </div>
          </div>

          {/* Column 4: Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-400">
              <span className="h-px w-5 bg-cyan-400/60" />
              GET IN TOUCH
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-slate-300">
                <MapPin size={17} className="mt-0.5 shrink-0 text-cyan-400" />

                <div>
                  <p>Mumbai</p>
                  <p className="mt-1 text-xs text-slate-400">Maharashtra</p>
                </div>
              </div>

              <a
                href="tel:+917304930375"
                className="group flex items-center gap-3 text-sm text-slate-300 transition-colors duration-200 hover:text-cyan-400"
              >
                <PhoneCall
                  size={17}
                  className="shrink-0 text-cyan-400"
                />
                <span>+91 73049 30375</span>
              </a>

              <a
                href="mailto:innovativesci2@gmail.com"
                className="group flex items-start gap-3 break-all text-sm text-slate-300 transition-colors duration-200 hover:text-cyan-400"
              >
                <Mail
                  size={17}
                  className="mt-0.5 shrink-0 text-cyan-400"
                />
                <span>innovativesci2@gmail.com</span>
              </a>
            </div>

            <div className="mt-2 flex items-center gap-3 pt-2">
              <div className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-slate-400">
                <Users size={16} />
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-slate-400">
                <Calendar size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright and back-to-top */}
        <div className="mt-10 flex flex-col items-center justify-between gap-5 border-t border-white/[0.08] pt-7 sm:mt-12 md:flex-row">

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-center text-xs text-slate-500 md:justify-start">
            <span>
              © {new Date().getFullYear()} Innovative Science 2.
            </span>

            <span>All rights reserved.</span>

            <Heart
              size={13}
              className="fill-cyan-400 text-cyan-400"
            />
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="group inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/[0.035] px-5 py-2.5 text-xs font-semibold text-cyan-400 transition-colors duration-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a1d] motion-reduce:transition-none"
          >
            <ArrowUp
              size={15}
              className="transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none"
            />

            Back to Top
          </button>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    </footer>
  );
};

export default Footer;