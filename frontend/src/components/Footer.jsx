import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  UserPlus,
  Award,
  Users,
  Calendar,
  FlaskConical,
} from 'lucide-react';

// Navigation Links
const mainNavItems = [
  { name: 'HOME', path: '/', icon: <Home size={18} /> },
  { name: 'CHAPTERS', path: '/chapters', icon: <BookOpen size={18} /> },
  { name: 'CONTACT', path: '/contact', icon: <PhoneCall size={18} /> },
  { name: 'FEEDBACK', path: '/feedback', icon: <MessageCircleMore size={18} /> },
];

const resultNavItems = [
  { name: 'LEADERBOARD', path: '/leaderboard', icon: <Trophy size={18} /> },
  { name: 'ABOUT', path: '/about', icon: <Info size={18} /> },
];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 18,
    },
  },
};

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <motion.footer
      initial={{ y: 120, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative overflow-hidden border-t border-cyan-500/10 bg-gradient-to-b from-[#162226] to-[#0f1618] backdrop-blur-2xl"
    >
      {/* Animated Background Elements matching the Navbar theme */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: ['0%', '50%', '0%'],
            y: ['0%', '20%', '0%'],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute left-[-180px] top-[-120px] h-96 w-96 rounded-full bg-gradient-to-r from-teal-500/10 to-cyan-500/15 blur-3xl"
        />

        <motion.div
          animate={{
            x: ['0%', '-40%', '0%'],
            y: ['0%', '15%', '0%'],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-[-140px] right-[-140px] h-96 w-96 rounded-full bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 blur-3xl"
        />

        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'dotPattern\' x=\'0\' y=\'0\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle fill=\'rgba(255,255,255,0.015)\' cx=\'2\' cy=\'2\' r=\'1.5\'%3E%3C/circle%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23dotPattern)\'%3E%3C/rect%3E%3C/svg%3E')] opacity-30" />
      </div>

      {/* Main Footer Content */}
      <div className="relative mx-auto max-w-7xl px-6 py-12 md:px-10 lg:py-16">
        {/* Grid Layout - 4 columns on desktop */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Column 1: Brand & About */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-5"
          >
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 blur-xl"
                />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 shadow-2xl backdrop-blur-sm">
                  <FlaskConical size={26} className="text-cyan-400" />
                </div>
              </motion.div>
              <div>
                <h1 className="flex items-center gap-1.5 text-xl font-black tracking-tight text-white sm:text-2xl">
                  Innovative Science 2
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                  >
                    <Sparkles size={16} className="text-cyan-400" />
                  </motion.span>
                </h1>
                <p className="text-xs tracking-wide text-slate-400">by Rethish Sir</p>
              </div>
            </motion.div>

            <motion.p variants={itemVariants} className="text-sm leading-relaxed text-slate-300">
              Simplifying complex scientific concepts and fostering core conceptual clarity.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-2 rounded-xl border border-cyan-500/20 bg-white/5 p-3 backdrop-blur-sm"
            >
              <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Owner</p>
              <p className="text-sm font-semibold text-white">Rethish Sir</p>
              <p className="text-xs text-slate-400">Computer Engg.</p>
            </motion.div>
          </motion.div>

          {/* Column 2: Main Navigation */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            <motion.h3
              variants={itemVariants}
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-400"
            >
              <span className="h-px w-5 bg-cyan-400/60" />
              NAVIGATION
            </motion.h3>
            <div className="flex flex-col gap-2">
              {mainNavItems.map((item) => (
                <motion.div key={item.name} variants={itemVariants}>
                  <NavLink to={item.path}>
                    {({ isActive }) => (
                      <motion.div
                        whileHover={{ x: 6 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className={`group relative overflow-hidden rounded-xl px-4 py-2.5 transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            : 'bg-white/5 text-slate-300 backdrop-blur-sm hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute left-[-120%] top-0 h-full w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-700 group-hover:left-[120%]" />
                        </div>
                        <div className="relative flex items-center gap-3 text-sm font-medium">
                          {React.cloneElement(item.icon, { className: 'text-cyan-400 group-hover:text-white transition-colors' })}
                          {item.name}
                        </div>
                      </motion.div>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Column 3: Results & Info */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            <motion.h3
              variants={itemVariants}
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-400"
            >
              <span className="h-px w-5 bg-cyan-400/60" />
              RESOURCES
            </motion.h3>
            <div className="flex flex-col gap-2">
              {resultNavItems.map((item) => (
                <motion.div key={item.name} variants={itemVariants}>
                  <NavLink to={item.path}>
                    {({ isActive }) => (
                      <motion.div
                        whileHover={{ x: 6 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className={`group relative overflow-hidden rounded-xl px-4 py-2.5 transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            : 'bg-white/5 text-slate-300 backdrop-blur-sm hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute left-[-120%] top-0 h-full w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-700 group-hover:left-[120%]" />
                        </div>
                        <div className="relative flex items-center gap-3 text-sm font-medium">
                          {React.cloneElement(item.icon, { className: 'text-cyan-400 group-hover:text-white transition-colors' })}
                          {item.name}
                        </div>
                      </motion.div>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </div>

            {/* Achievement Badge */}
            <motion.div
              variants={itemVariants}
              className="mt-3 flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 border border-cyan-500/20"
            >
              <Award size={14} className="text-cyan-400" />
              <span className="text-xs text-slate-300">Top Science Ranks Every Year</span>
            </motion.div>
          </motion.div>

          {/* Column 4: Contact & Location */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            <motion.h3
              variants={itemVariants}
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-400"
            >
              <span className="h-px w-5 bg-cyan-400/60" />
              GET IN TOUCH
            </motion.h3>

            <div className="space-y-3">
              <motion.div
                variants={itemVariants}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-cyan-400" />
                <div>
                  <p>Mumbai</p>
                  <p className="text-xs text-slate-400">Maharashtra</p>
                </div>
              </motion.div>

              <motion.a
                variants={itemVariants}
                href="tel:7304930375"
                className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-cyan-400"
              >
                <PhoneCall size={16} className="text-cyan-400" />
                <span>+91 73049 30375</span>
              </motion.a>

              <motion.a
                variants={itemVariants}
                href="mailto:innovativesci2@gmail.com"
                className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-cyan-400"
              >
                <Mail size={16} className="text-cyan-400" />
                <span>innovativesci2@gmail.com</span>
              </motion.a>
            </div>

            <motion.div
              variants={itemVariants}
              className="mt-2 flex gap-3 pt-2"
            >
              {[Users, Calendar].map((Icon, idx) => (
                <div
                  key={idx}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-cyan-400/40 hover:text-cyan-400"
                >
                  <Icon size={14} />
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Bar with Copyright and Back to Top */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} Innovative Science 2.</span>
            <span>All rights reserved.</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="inline-flex"
            >
              <Heart size={12} className="fill-cyan-400 text-cyan-400" />
            </motion.span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToTop}
            className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-cyan-500/30 bg-white/5 px-5 py-2 text-xs font-medium text-cyan-400 backdrop-blur-sm transition-all duration-300 hover:bg-cyan-500/10 hover:text-cyan-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <ArrowUp size={14} className="relative z-10" />
            <span className="relative z-10">Back to Top</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Bottom Glow Border reflecting the navbar header line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    </motion.footer>
  );
};

export default Footer;
