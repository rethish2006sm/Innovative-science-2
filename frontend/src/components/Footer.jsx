
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowUp,
  FlaskConical,
  Heart,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { name: 'Home', path: '/' },
  { name: 'Chapters', path: '/chapters' },
  { name: 'Leaderboard', path: '/leaderboard' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'Feedback', path: '/feedback' },
];

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-[#0b1114] text-white">

      {/* Subtle background accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/[0.06] blur-[100px]"
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-16 sm:px-8 lg:px-10 lg:pt-20">

        {/* Top section */}
        <div className="grid grid-cols-1 gap-14 border-b border-white/[0.08] pb-14 md:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_1fr] lg:gap-20">

          {/* Brand */}
          <div className="max-w-md">

            <NavLink to="/" className="group inline-flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] transition-all duration-300 group-hover:border-cyan-400/40 group-hover:bg-cyan-400/[0.14]">
                <FlaskConical
                  size={23}
                  strokeWidth={1.7}
                  className="text-cyan-400"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Innovative Science
                  <span className="text-cyan-400"> 2</span>
                </h2>

                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Learn · Understand · Excel
                </p>
              </div>

            </NavLink>

            <p className="mt-7 max-w-sm text-sm leading-7 text-slate-400">
              Making science simpler, smarter and more interesting.
              Building strong concepts, one chapter at a time.
            </p>

            <div className="mt-7 flex items-center gap-2 text-sm text-slate-400">
              <Sparkles size={15} className="text-cyan-400" />
              <span>Created by</span>
              <span className="font-semibold text-slate-200">
                Mr. Rethish Mudaliar
              </span>
            </div>

          </div>

          {/* Navigation */}
          <div>

            <h3 className="mb-7 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Explore
            </h3>

            <nav className="grid grid-cols-2 gap-x-5 gap-y-5">
              {navigation.map(({ name, path }) => (
                <NavLink
                  key={name}
                  to={path}
                  className={({ isActive }) =>
                    `group flex w-fit items-center gap-1.5 text-sm transition-colors duration-200 ${
                      isActive
                        ? 'text-cyan-400'
                        : 'text-slate-400 hover:text-white'
                    }`
                  }
                >
                  {name}

                  <ArrowUpRight
                    size={13}
                    className="opacity-0 -translate-y-0.5 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                  />
                </NavLink>
              ))}
            </nav>

          </div>

          {/* Contact */}
          <div>

            <h3 className="mb-7 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Get in touch
            </h3>

            <div className="space-y-6">

              <a
                href="mailto:innovativesci2@gmail.com"
                className="group flex items-center gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition-all duration-200 group-hover:border-cyan-400/30 group-hover:text-cyan-400">
                  <Mail size={17} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-1 break-all text-sm text-slate-300 transition-colors group-hover:text-cyan-400">
                    innovativesci2@gmail.com
                  </p>
                </div>
              </a>

              <a
                href="tel:+917304930375"
                className="group flex items-center gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400 transition-all duration-200 group-hover:border-cyan-400/30 group-hover:text-cyan-400">
                  <Phone size={17} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="mt-1 text-sm text-slate-300 transition-colors group-hover:text-cyan-400">
                    +91 73049 30375
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-400">
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
          </div>

        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center justify-between gap-5 py-7 sm:flex-row">

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 sm:justify-start">
            <span>
              © {new Date().getFullYear()} Innovative Science 2
            </span>

            <span className="text-slate-700">·</span>

            <span>All rights reserved.</span>

            <Heart
              size={12}
              className="fill-cyan-400 text-cyan-400"
            />
          </div>

          <div className="flex items-center gap-6">

            <span className="hidden text-xs text-slate-500 sm:inline">
              Made for curious minds.
            </span>

            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-slate-300 transition-all duration-300 hover:border-cyan-400/30 hover:bg-cyan-400/[0.08] hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Back to top

              <ArrowUp
                size={14}
                className="transition-transform duration-200 group-hover:-translate-y-1"
              />
            </button>

          </div>

        </div>

      </div>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

    </footer>
  );
};

export default Footer;
