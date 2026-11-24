
import React from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  GraduationCap,
  Layers3,
  LineChart,
  LockKeyhole,
  Medal,
  MessageCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
  FileText,
  Swords,
  CalendarDays,
  Gauge,
  ChartNoAxesCombined,
  Lightbulb,
  History,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

// --------------------------------------------------
// ANIMATION CONFIGURATION
// --------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09 },
  },
}

const revealProps = (reduced) => ({
  initial: reduced ? false : 'hidden',
  whileInView: 'visible',
  viewport: { once: true, amount: 0.12 },
  variants: reduced
    ? {}
    : stagger,
})

const cardReveal = (reduced) =>
  reduced
    ? {}
    : {
        variants: fadeUp,
      }

// --------------------------------------------------
// WEBSITE FEATURES
// --------------------------------------------------

const features = [
  {
    number: '01',
    icon: BookOpen,
    title: 'Chapter-based learning',
    description:
      'Explore Science 2 chapters, study individual topics, read learning material and continue practising from where you left off.',
    tag: 'LEARN',
    color: 'orange',
  },
  {
    number: '02',
    icon: Layers3,
    title: 'Multiple question types',
    description:
      'Practise MCQs, True or False, Correlation, Odd Man Out, Match the Following, tables, diagrams, symbols and numericals.',
    tag: 'PRACTICE',
    color: 'blue',
  },
  {
    number: '03',
    icon: Brain,
    title: 'Brain Cell rewards',
    description:
      'Earn Brain Cells through eligible questions. Rewards are tracked separately to prevent repeated rewards for the same question.',
    tag: 'REWARDS',
    color: 'purple',
  },
  {
    number: '04',
    icon: Flame,
    title: 'Daily Streak',
    description:
      'Build a consistent learning habit with daily challenges, streak records, challenge accuracy and milestone rewards.',
    tag: 'CONSISTENCY',
    color: 'orange',
  },
  {
    number: '05',
    icon: Swords,
    title: 'Battle Mode',
    description:
      'Create or join live battle rooms, compete using room codes, answer timed questions and explore your battle results.',
    tag: 'COMPETE',
    color: 'red',
  },
  {
    number: '06',
    icon: Trophy,
    title: 'Leaderboards',
    description:
      'Explore overall and class rankings, compare Brain Cells and track your position within your learning community.',
    tag: 'RANKINGS',
    color: 'yellow',
  },
  {
    number: '07',
    icon: Target,
    title: 'Custom Test Builder',
    description:
      'Build personalised practice tests by selecting chapters, topics, question types and the number of questions.',
    tag: 'TESTS',
    color: 'blue',
  },
  {
    number: '08',
    icon: FileText,
    title: 'Previous Year Questions',
    description:
      'Access previous year Science 2 question papers with year-wise browsing and month-wise paper organisation.',
    tag: 'EXAM PREP',
    color: 'purple',
  },
  {
    number: '09',
    icon: BarChart3,
    title: 'Performance dashboard',
    description:
      'Understand your learning through accuracy, activity graphs, performance trends, personal records and practice history.',
    tag: 'ANALYTICS',
    color: 'green',
  },
  {
    number: '10',
    icon: ChartNoAxesCombined,
    title: 'Chapter & topic analysis',
    description:
      'Identify strong chapters, weaker topics, accuracy, attempts and the areas that need more revision.',
    tag: 'INSIGHTS',
    color: 'orange',
  },
  {
    number: '11',
    icon: History,
    title: 'Progress history',
    description:
      'Review saved attempts, question-level answers, test results, chapter breakdowns and reward history.',
    tag: 'HISTORY',
    color: 'blue',
  },
  {
    number: '12',
    icon: Gauge,
    title: 'Answering speed',
    description:
      'Analyse response time, average speed, median time and the time taken for correct and incorrect answers when available.',
    tag: 'SPEED',
    color: 'green',
  },
  {
    number: '13',
    icon: UserRound,
    title: 'Student profile',
    description:
      'Manage your personal information, profile image, class details, password and notification preferences.',
    tag: 'PROFILE',
    color: 'purple',
  },
  {
    number: '14',
    icon: Users,
    title: 'Class community',
    description:
      'Access class information, notices, announcements, learning materials and class-based leaderboards according to your access.',
    tag: 'COMMUNITY',
    color: 'blue',
  },
  {
    number: '15',
    icon: MessageCircle,
    title: 'Feedback & support',
    description:
      'Share feedback, submit ratings, report questions and request help whenever you need assistance.',
    tag: 'SUPPORT',
    color: 'orange',
  },
]

// --------------------------------------------------
// LEARNING PROCESS
// --------------------------------------------------

const steps = [
  {
    number: '01',
    icon: UserRound,
    title: 'Create your account',
    text: 'Sign up or log in to access your personalised learning space.',
  },
  {
    number: '02',
    icon: BookOpen,
    title: 'Choose what to learn',
    text: 'Select a chapter, topic, custom test or daily challenge.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Start practising',
    text: 'Answer questions loaded from the learning database.',
  },
  {
    number: '04',
    icon: CheckCircle2,
    title: 'Get your results',
    text: 'Your answers are checked and your results are recorded.',
  },
  {
    number: '05',
    icon: Brain,
    title: 'Earn rewards',
    text: 'Eligible activities update your Brain Cells and progress.',
  },
  {
    number: '06',
    icon: LineChart,
    title: 'Analyse performance',
    text: 'Explore your accuracy, speed, attempts and improvement.',
  },
  {
    number: '07',
    icon: Lightbulb,
    title: 'Find weak areas',
    text: 'Identify topics that need more attention and revision.',
  },
  {
    number: '08',
    icon: RefreshCw,
    title: 'Improve continuously',
    text: 'Practise again and build stronger learning habits.',
  },
]

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

const Aboutpage = () => {
  const reduced = useReducedMotion()

  return (
    <main className="about-page relative min-h-screen overflow-hidden bg-white text-slate-900">

      {/* GLOBAL BACKGROUND */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="about-grid absolute inset-0 opacity-[0.24]" />

        <motion.div
          className="absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-orange-200/30 blur-[110px]"
          animate={
            reduced
              ? {}
              : {
                  x: [0, 35, 0],
                  y: [0, 25, 0],
                }
          }
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute -right-40 top-[700px] h-[450px] w-[450px] rounded-full bg-amber-200/25 blur-[120px]"
          animate={
            reduced
              ? {}
              : {
                  x: [0, -30, 0],
                  y: [0, 35, 0],
                }
          }
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* 01. HERO SECTION */}

      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-10 lg:pb-28">

        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">

          {/* HERO CONTENT */}

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >

            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold tracking-wide text-orange-700">
              <Sparkles size={14} />
              YOUR SCIENCE LEARNING ECOSYSTEM
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            </div>

            <h1 className="mt-7 max-w-3xl text-[42px] font-black leading-[1.08] tracking-[-2px] text-slate-950 sm:text-6xl lg:text-[68px]">
              Learning science.
              <br />
              <span className="about-gradient-text">
                Tracking growth.
              </span>
              <br />
              Becoming better.
            </h1>

            <p className="mt-7 max-w-xl text-[15px] leading-8 text-slate-500 sm:text-base">
              Innovative Science 2 is an interactive Science 2 learning
              platform designed to make practice meaningful, progress
              measurable and exam preparation more engaging.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">

              <Link
                to="/chapters"
                className="about-primary-btn group inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold text-white"
              >
                Start learning
                <ArrowRight
                  size={17}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/test-builder"
                className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 transition-all duration-300 hover:border-orange-300 hover:bg-orange-50"
              >
                <Play size={16} className="text-orange-600" />
                Build a test
              </Link>

            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500">

              <span className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-green-600" />
                Saved learning progress
              </span>

              <span className="flex items-center gap-2">
                <Brain size={15} className="text-orange-500" />
                Reward-based practice
              </span>

              <span className="flex items-center gap-2">
                <ChartNoAxesCombined size={15} className="text-blue-500" />
                Performance insights
              </span>

            </div>

          </motion.div>

          {/* HERO VISUAL */}

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.94, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative mx-auto w-full max-w-[510px]"
          >

            <div className="relative rounded-[34px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-[0_30px_100px_-35px_rgba(234,88,12,0.25)] sm:p-7">

              {/* TOP HEADER */}

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Learning overview
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    Your growth space
                  </h2>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
                  <GraduationCap size={22} />
                </div>

              </div>

              {/* BRAIN CELL CARD */}

              <div className="mt-7 rounded-[25px] bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-200/60">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-semibold text-orange-100">
                      REWARD SYSTEM
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      Brain Cells
                    </p>
                    <p className="mt-1 text-xs text-orange-100">
                      Earn through eligible questions
                    </p>
                  </div>

                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur-md">
                    <Brain size={31} />
                  </div>

                </div>

                <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-3 text-xs font-semibold">
                  <Zap size={15} />
                  Every eligible new question can reward 1 Brain Cell
                </div>

              </div>

              {/* FEATURE GRID */}

              <div className="mt-5 grid grid-cols-2 gap-3">

                <VisualCard
                  icon={Flame}
                  title="Daily Streak"
                  description="Build consistency"
                  color="orange"
                />

                <VisualCard
                  icon={Swords}
                  title="Battle Mode"
                  description="Challenge others"
                  color="purple"
                />

                <VisualCard
                  icon={Trophy}
                  title="Leaderboard"
                  description="Track rankings"
                  color="yellow"
                />

                <VisualCard
                  icon={BarChart3}
                  title="Analytics"
                  description="Understand growth"
                  color="blue"
                />

              </div>

              {/* FLOATING DECORATIONS */}

              {!reduced && (
                <>
                  <motion.div
                    animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute -right-4 top-28 hidden h-14 w-14 place-items-center rounded-2xl border border-orange-100 bg-white text-orange-500 shadow-xl sm:grid"
                  >
                    <Sparkles size={24} />
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 9, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute -bottom-4 -left-4 hidden h-12 w-12 place-items-center rounded-2xl border border-orange-100 bg-white text-orange-500 shadow-xl sm:grid"
                  >
                    <Award size={22} />
                  </motion.div>
                </>
              )}

            </div>

            <p className="mt-4 text-center text-xs font-medium text-slate-400">
              A learning experience built around your progress
            </p>

          </motion.div>

        </div>

        <div className="mt-16 flex justify-center">
          <a
            href="#platform"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-orange-600"
          >
            Explore the platform
            <ArrowDown size={15} />
          </a>
        </div>

      </section>

      {/* 02. PLATFORM INTRODUCTION */}

      <section
        id="platform"
        className="relative border-y border-slate-100 bg-slate-50/70 py-20 sm:py-24"
      >

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <SectionHeading
            eyebrow="MORE THAN JUST QUESTIONS"
            title={
              <>
                One platform.
                <br />
                <span className="about-gradient-text">
                  Multiple ways to grow.
                </span>
              </>
            }
            description="From learning individual concepts to analysing your exam preparation, everything comes together in one connected learning experience."
          />

          <motion.div
            className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            {...revealProps(reduced)}
          >

            <SummaryCard
              icon={BookOpen}
              title="Learn"
              description="Explore chapters, topics and study materials."
              number="01"
            />

            <SummaryCard
              icon={Target}
              title="Practise"
              description="Solve different objective questions and tests."
              number="02"
            />

            <SummaryCard
              icon={Trophy}
              title="Compete"
              description="Participate in battles and explore rankings."
              number="03"
            />

            <SummaryCard
              icon={LineChart}
              title="Improve"
              description="Understand your performance and revise better."
              number="04"
            />

          </motion.div>

        </div>

      </section>

      {/* 03. FEATURE SECTION */}

      <section className="relative py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <SectionHeading
            eyebrow="EXPLORE THE ECOSYSTEM"
            title={
              <>
                Everything you need
                <br />
                <span className="about-gradient-text">
                  to learn smarter.
                </span>
              </>
            }
            description="Discover the tools and features designed to support your Science 2 learning journey, from your first question to your latest performance report."
          />

          <div className="mt-12 flex items-center justify-between gap-4">

            <p className="text-sm font-semibold text-slate-500">
              Explore all platform features
            </p>

            <span className="rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600">
              15 FEATURES
            </span>

          </div>

          <motion.div
            className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            {...revealProps(reduced)}
          >

            {features.map((feature) => (
              <FeatureCard
                key={feature.number}
                feature={feature}
                reduced={reduced}
              />
            ))}

          </motion.div>

        </div>

      </section>

      {/* 04. GAMIFICATION SECTION */}

      <section className="relative overflow-hidden bg-[#111318] py-20 text-white sm:py-28">

        <div className="pointer-events-none absolute -right-40 top-0 h-[450px] w-[450px] rounded-full bg-orange-500/15 blur-[120px]" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">

          <motion.div
            initial={reduced ? false : { opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >

            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-xs font-bold text-orange-300">
              <Zap size={14} />
              LEARNING MEETS GAMIFICATION
            </div>

            <h2 className="mt-7 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Make every
              <br />
              question count.
              <br />
              <span className="about-dark-gradient">
                Make progress visible.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-8 text-slate-400 sm:text-base">
              Learning becomes more engaging when students can see their
              achievements, maintain consistency and understand how their
              performance changes over time.
            </p>

            <div className="mt-9 grid gap-5">

              <DarkFeature
                icon={Brain}
                title="Brain Cell rewards"
                text="Earn eligible rewards and monitor your accumulated Brain Cells."
              />

              <DarkFeature
                icon={Flame}
                title="Daily Streak challenges"
                text="Build a consistent practice routine and celebrate milestones."
              />

              <DarkFeature
                icon={Swords}
                title="Live Battle Mode"
                text="Challenge classmates and explore your battle performance."
              />

              <DarkFeature
                icon={Medal}
                title="Student leaderboards"
                text="Discover your ranking across the overall and class leaderboards."
              />

            </div>

          </motion.div>

          {/* GAMIFICATION VISUAL */}

          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >

            <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl sm:p-7">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Your learning journey
                  </p>
                  <h3 className="mt-2 text-xl font-black">
                    Stay consistent
                  </h3>
                </div>

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/15 text-orange-400">
                  <Flame size={25} />
                </div>

              </div>

              {/* STREAK */}

              <div className="mt-7 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/15 to-transparent p-5">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-xs font-semibold text-orange-300">
                      DAILY STREAK
                    </p>
                    <p className="mt-2 text-3xl font-black">
                      Stay on track
                    </p>
                  </div>

                  <Flame size={38} className="text-orange-400" />

                </div>

                <p className="mt-3 text-xs leading-6 text-slate-400">
                  Daily challenges, longest streak records, accuracy and
                  milestone rewards.
                </p>

              </div>

              {/* THREE CARDS */}

              <div className="mt-4 grid grid-cols-2 gap-3">

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Brain size={23} className="text-orange-400" />
                  <p className="mt-4 text-sm font-bold">Brain Cells</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Question rewards
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Trophy size={23} className="text-amber-400" />
                  <p className="mt-4 text-sm font-bold">Leaderboard</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Class rankings
                  </p>
                </div>

              </div>

              {/* BATTLE */}

              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">

                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-500/15 text-purple-300">
                  <Swords size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Battle Mode</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Compete. Answer. Review.
                  </p>
                </div>

                <ArrowUpRight className="text-slate-500" size={20} />

              </div>

            </div>

            {!reduced && (
              <motion.div
                animate={{ y: [0, -9, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -bottom-5 -right-3 hidden rounded-2xl border border-white/10 bg-[#24262e] p-4 shadow-xl sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-green-500/15 text-green-400">
                    <CheckCircle2 size={19} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Progress saved</p>
                    <p className="text-[10px] text-slate-500">
                      Your learning history
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </motion.div>

        </div>

      </section>

      {/* 05. PERFORMANCE ANALYTICS */}

      <section className="relative bg-orange-50/50 py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <div className="grid items-center gap-12 lg:grid-cols-2">

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-bold text-orange-700">
                <ChartNoAxesCombined size={15} />
                UNDERSTAND YOUR PERFORMANCE
              </div>

              <h2 className="mt-7 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Don't just solve
                <br />
                questions.
                <br />
                <span className="about-gradient-text">
                  Understand yourself.
                </span>
              </h2>

              <p className="mt-6 text-sm leading-8 text-slate-500 sm:text-base">
                Your performance dashboard turns saved practice records
                into meaningful insights. Understand what is improving,
                what needs attention and where your next practice session
                should begin.
              </p>

              <div className="mt-8 grid gap-4">

                <AnalyticsPoint
                  icon={Target}
                  title="Accuracy tracking"
                  text="Understand your correct and incorrect answers."
                />

                <AnalyticsPoint
                  icon={Clock3}
                  title="Answering speed"
                  text="Review average and median response times when available."
                />

                <AnalyticsPoint
                  icon={BookOpen}
                  title="Chapter-wise analysis"
                  text="Find strong chapters and topics that need revision."
                />

                <AnalyticsPoint
                  icon={RefreshCw}
                  title="Improvement insights"
                  text="Compare your recent performance with earlier attempts."
                />

              </div>

              <Link
                to="/profile/performance"
                className="mt-9 inline-flex items-center gap-3 text-sm font-bold text-orange-600 transition-all hover:gap-5"
              >
                Explore performance
                <ArrowRight size={17} />
              </Link>

            </motion.div>

            {/* ANALYTICS VISUAL */}

            <motion.div
              initial={reduced ? false : { opacity: 0, x: 25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="rounded-[30px] border border-orange-100 bg-white p-5 shadow-[0_25px_80px_-40px_rgba(234,88,12,0.25)] sm:p-7"
            >

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Performance analytics
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">
                    Learning overview
                  </h3>
                </div>

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                  <BarChart3 size={23} />
                </div>

              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">

                <MetricCard
                  icon={BookOpen}
                  title="Questions"
                  subtitle="Total attempts"
                />

                <MetricCard
                  icon={Target}
                  title="Accuracy"
                  subtitle="Answer correctness"
                />

                <MetricCard
                  icon={Clock3}
                  title="Response time"
                  subtitle="Answering speed"
                />

                <MetricCard
                  icon={Flame}
                  title="Streak"
                  subtitle="Daily consistency"
                />

              </div>

              {/* GRAPH REPRESENTATION */}

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">

                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    Learning activity
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">
                    VISUAL PREVIEW
                  </span>
                </div>

                <div className="mt-7 flex h-32 items-end justify-between gap-2">

                  {[32, 52, 42, 72, 57, 85, 68, 95, 76, 88, 63, 100].map(
                    (height, index) => (
                      <motion.div
                        key={index}
                        initial={reduced ? false : { height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.6,
                          delay: reduced ? 0 : index * 0.045,
                        }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-amber-400"
                      />
                    )
                  )}

                </div>

                <p className="mt-4 text-center text-[10px] text-slate-400">
                  Illustrative interface — actual dashboard data is based on saved attempts.
                </p>

              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-orange-50 p-4">

                <Lightbulb size={21} className="shrink-0 text-orange-500" />

                <p className="text-xs leading-6 text-slate-600">
                  Learning insights use rule-based calculations from your
                  recorded performance.
                </p>

              </div>

            </motion.div>

          </div>

        </div>

      </section>

      {/* 06. HOW IT WORKS */}

      <section className="relative py-20 sm:py-28">

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <SectionHeading
            eyebrow="YOUR LEARNING JOURNEY"
            title={
              <>
                Simple steps.
                <br />
                <span className="about-gradient-text">
                  Meaningful progress.
                </span>
              </>
            }
            description="Every practice session contributes to a clearer picture of your learning journey."
          />

          <motion.div
            className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
            {...revealProps(reduced)}
          >

            {steps.map((step, index) => {
              const Icon = step.icon

              return (
                <motion.div
                  key={step.number}
                  {...cardReveal(reduced)}
                  className="relative"
                >

                  <div className="relative mb-5 flex items-center justify-between">

                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600 transition-all duration-300 hover:-translate-y-1 hover:bg-orange-500 hover:text-white">
                      <Icon size={25} />
                    </div>

                    <span className="text-4xl font-black tracking-tighter text-slate-100">
                      {step.number}
                    </span>

                  </div>

                  <h3 className="text-lg font-black text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {step.text}
                  </p>

                  {index !== steps.length - 1 && (
                    <div className="absolute right-0 top-7 hidden translate-x-1/2 text-orange-200 lg:block">
                      <ChevronRight size={20} />
                    </div>
                  )}

                </motion.div>
              )
            })}

          </motion.div>

        </div>

      </section>

      {/* 07. DATA TRANSPARENCY */}

      <section className="border-y border-slate-100 bg-slate-50 py-16 sm:py-20">

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                BUILT AROUND REAL PROGRESS
              </p>

              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                Your progress.
                <br />
                Your records.
                <br />
                Your improvement.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-500">
                Performance insights are calculated from recorded learning
                activity, rather than displaying random or invented results.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              <TrustCard
                icon={ShieldCheck}
                title="Saved attempts"
                text="Practice history is maintained for performance analysis."
              />

              <TrustCard
                icon={LockKeyhole}
                title="Reward tracking"
                text="Previously rewarded questions are tracked separately."
              />

              <TrustCard
                icon={Clock3}
                title="Timing records"
                text="Response timing is available for attempts that recorded it."
              />

              <TrustCard
                icon={RefreshCw}
                title="Separate challenges"
                text="Daily challenge performance is separate from regular chapter practice."
              />

            </div>

          </div>

        </div>

      </section>

      {/* 08. FINAL CTA */}

      <section className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28">

        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[34px] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-6 py-14 text-center shadow-[0_30px_90px_-35px_rgba(234,88,12,0.55)] sm:px-14 sm:py-20">

          <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full border-[45px] border-white/[0.07]" />

          <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full border-[55px] border-white/[0.07]" />

          {!reduced && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 35,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute right-12 top-10 hidden text-white/15 sm:block"
            >
              <Sparkles size={65} />
            </motion.div>
          )}

          <div className="relative z-10 mx-auto max-w-3xl">

            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/15 text-white backdrop-blur-lg">
              <GraduationCap size={32} />
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-orange-100">
              YOUR NEXT CHAPTER STARTS HERE
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
              Ready to make
              <br />
              learning count?
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-orange-100 sm:text-base">
              Start practising, discover your strengths, work on your weak
              areas and make every learning session more meaningful.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">

              <Link
                to="/chapters"
                className="group inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-sm font-black text-orange-600 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                Explore chapters
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/"
                className="inline-flex items-center gap-3 rounded-2xl border border-white/30 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20"
              >
                Back to home
              </Link>

            </div>

            <p className="mt-9 text-xs font-medium text-orange-100/70">
              Innovative Science 2 · Learn · Practise · Improve
            </p>

          </div>

        </div>

      </section>

    </main>
  )
}

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

const SectionHeading = ({ eyebrow, title, description }) => {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl"
    >

      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
        {eyebrow}
      </p>

      <h2 className="mt-5 text-4xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-5xl">
        {title}
      </h2>

      <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-500 sm:text-base">
        {description}
      </p>

    </motion.div>
  )
}

const VisualCard = ({ icon: Icon, title, description, color }) => {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg">

      <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>

      <p className="mt-3 text-sm font-black text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>

    </div>
  )
}

const SummaryCard = ({ icon: Icon, title, description, number }) => {
  const reduced = useReducedMotion()

  return (
    <motion.article
      {...cardReveal(reduced)}
      className="group relative overflow-hidden rounded-[25px] border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_20px_50px_-25px_rgba(234,88,12,0.3)]"
    >

      <span className="absolute right-5 top-5 text-4xl font-black text-slate-100 transition-colors group-hover:text-orange-100">
        {number}
      </span>

      <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600 transition-all duration-300 group-hover:bg-orange-500 group-hover:text-white">
        <Icon size={23} />
      </div>

      <h3 className="mt-6 text-xl font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-7 text-slate-500">
        {description}
      </p>

      <div className="mt-5 h-1 w-9 rounded-full bg-orange-400 transition-all duration-300 group-hover:w-16" />

    </motion.article>
  )
}

const FeatureCard = ({ feature, reduced }) => {
  const Icon = feature.icon

  const colorStyles = {
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-500',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-500',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-500',
    red: 'bg-rose-50 text-rose-600 group-hover:bg-rose-500',
    yellow: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-500',
  }

  return (
    <motion.article
      {...cardReveal(reduced)}
      className="group relative overflow-hidden rounded-[25px] border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:shadow-[0_20px_55px_-30px_rgba(234,88,12,0.35)] sm:p-7"
    >

      <div className="flex items-start justify-between">

        <div className={`grid h-12 w-12 place-items-center rounded-2xl transition-all duration-300 group-hover:text-white ${colorStyles[feature.color]}`}>
          <Icon size={23} />
        </div>

        <span className="text-xs font-black tracking-widest text-slate-200 transition-colors group-hover:text-orange-300">
          {feature.number}
        </span>

      </div>

      <div className="mt-6">

        <span className="text-[10px] font-black tracking-[0.18em] text-orange-500">
          {feature.tag}
        </span>

        <h3 className="mt-2 text-lg font-black text-slate-900 transition-colors group-hover:text-orange-700">
          {feature.title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          {feature.description}
        </p>

      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

        <span className="text-xs font-semibold text-slate-400">
          Innovative Science 2
        </span>

        <ArrowUpRight
          size={17}
          className="text-slate-300 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-orange-500"
        />

      </div>

    </motion.article>
  )
}

const DarkFeature = ({ icon: Icon, title, text }) => (
  <div className="group flex items-start gap-4">

    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-orange-400 transition-all duration-300 group-hover:border-orange-400/30 group-hover:bg-orange-500/15">
      <Icon size={21} />
    </div>

    <div>
      <h3 className="text-sm font-bold text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-6 text-slate-400 sm:text-sm">
        {text}
      </p>
    </div>

  </div>
)

const MetricCard = ({ icon: Icon, title, subtitle }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4">

    <div className="flex items-center gap-2">
      <Icon size={17} className="text-orange-500" />
      <p className="text-xs font-bold text-slate-800">
        {title}
      </p>
    </div>

    <p className="mt-2 text-[11px] text-slate-400">
      {subtitle}
    </p>

  </div>
)

const AnalyticsPoint = ({ icon: Icon, title, text }) => (
  <div className="flex items-start gap-3">

    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-orange-600 shadow-sm">
      <Icon size={19} />
    </div>

    <div>
      <p className="text-sm font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-6 text-slate-500">
        {text}
      </p>
    </div>

  </div>
)

const TrustCard = ({ icon: Icon, title, text }) => (
  <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg">

    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
      <Icon size={21} />
    </div>

    <div>
      <h3 className="text-sm font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        {text}
      </p>
    </div>

  </div>
)

export default Aboutpage
