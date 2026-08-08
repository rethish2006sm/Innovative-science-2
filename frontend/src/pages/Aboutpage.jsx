import { ArrowRight, Award, BookOpen, Brain, Layers3, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
  {
    icon: BookOpen,
    title: 'Chapter-first learning',
    text: 'Every topic starts from the chapter structure so students always know where they stand and what to revise next.',
  },
  {
    icon: Brain,
    title: 'Brain cell scoring',
    text: 'Performance is translated into chapter brain cells so progress is easier to understand than a raw percentage alone.',
  },
  {
    icon: Layers3,
    title: 'Mixed objective practice',
    text: 'MCQs, true or false, correlations, matching, and completion-style questions are all available in one learning flow.',
  },
  {
    icon: Users,
    title: 'Class-aware ranking',
    text: 'Students can compare themselves with the full school or just their own class depending on how they want to practice.',
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const statVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 17 },
  },
};

const Aboutpage = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(135deg,#fdfbfb_0%,#f0f5ff_100%)] px-4 py-12 sm:px-6 lg:px-10">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Column - Main Content */}
          <motion.div
            className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-8 lg:p-10"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-blue-100/80 bg-blue-50/90 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-blue-700 backdrop-blur-sm"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </motion.div>
              About Innovative Science 2
            </motion.div>

            <motion.h1
              className="mt-5 max-w-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text font-serif text-4xl tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              A science practice space built for confidence, not just marks.
            </motion.h1>

            <motion.p
              className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Innovative Science 2 helps students practice objective science questions, understand weak
              concepts, track chapter progress, and improve consistently with an AI-supported learning
              loop.
            </motion.p>

            <motion.div
              className="mt-10 grid gap-5 sm:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {features.map((feature, idx) => (
                <motion.article
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50/0 to-blue-100/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-md transition-all duration-300 group-hover:shadow-blue-500/20">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-lg font-black text-slate-950">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{feature.text}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            <motion.div
              className="mt-10 grid gap-4 sm:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Stat label="Brain cells" value="1000 / chapter" />
              <Stat label="Practice modes" value="Objective + tests" />
              <Stat label="Support" value="Reports + AI teacher" />
            </motion.div>
          </motion.div>

          {/* Right Column - What makes it different */}
          <motion.div
            className="grid gap-5 self-start rounded-[2rem] border border-amber-100/70 bg-gradient-to-br from-amber-50/80 to-white/70 p-6 shadow-md backdrop-blur-sm sm:p-8"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                What makes it different
              </p>
              <h2 className="mt-2 bg-gradient-to-r from-amber-900 to-amber-700 bg-clip-text font-serif text-3xl text-transparent">
                Designed for exam growth
              </h2>
            </motion.div>

            <motion.div
              className="grid gap-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <FeatureRow
                title="Immediate feedback"
                text="Students can reveal answers, review mistakes, and submit practice without losing their attempt history."
              />
              <FeatureRow
                title="Saved improvement history"
                text="Every attempt is stored so chapter weakness and progress trend can be seen over time."
              />
              <FeatureRow
                title="Teacher-friendly admin tools"
                text="The admin panel supports class creation, student assignment, message sending, and student detail viewing."
              />
            </motion.div>

            <motion.div
              className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-5 backdrop-blur-sm"
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-blue-100 to-amber-50 opacity-50 blur-2xl" />
              <div className="relative z-10">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Next steps
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Start with chapters, build a test, check your improvement page, and then use the AI
                  teacher when a concept feels unclear.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/chapters">
                    <motion.button
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
                      whileHover={{ scale: 1.05, gap: '0.75rem' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Explore chapters
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </motion.button>
                  </Link>
                  <Link to="/test-builder">
                    <motion.button
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 backdrop-blur-sm transition-all hover:border-slate-300 hover:bg-white hover:shadow-md"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Build test
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ label, value }) => (
  <motion.div
    className="rounded-3xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    variants={statVariants}
    whileHover={{ scale: 1.02 }}
  >
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <motion.p
      className="mt-2 text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {value}
    </motion.p>
  </motion.div>
);

const FeatureRow = ({ title, text }) => (
  <motion.div
    className="group relative overflow-hidden rounded-3xl border border-amber-100/60 bg-white/60 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    variants={itemVariants}
    whileHover={{ scale: 1.01 }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-amber-50/0 via-amber-50/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    <div className="relative z-10 flex items-start gap-3">
      <motion.div
        whileHover={{ rotate: 12 }}
        transition={{ type: 'spring', stiffness: 500 }}
      >
        <Award className="h-5 w-5 text-amber-600" />
      </motion.div>
      <div>
        <p className="font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  </motion.div>
);

export default Aboutpage;