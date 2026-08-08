import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Lock,
  LogIn,
  TrendingUp,
  Target,
  Award,
  Sparkles,
  X,
} from 'lucide-react';
import { apiRequest } from '../api';
import { authEvents, getStoredAuth } from '../authStorage';
import ChapterWeightageGraph from '../components/ChapterWeightageGraph';

const chapterWeightagePreviewMs =
  Number(import.meta.env.VITE_CHAPTER_WEIGHTAGE_PREVIEW_MS) || 10000;

const Chapter_weightage = () => {
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredChapter, setHoveredChapter] = useState(null);
  const [distributionMode, setDistributionMode] = useState('withOption');
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [isSigninPromptVisible, setIsSigninPromptVisible] = useState(false);

  const getChapterMarks = useCallback((chapter) => {
    return Number(
      distributionMode === 'withOption'
        ? chapter.marks
        : chapter.marksWithoutOption
    ) || 0;
  }, [distributionMode]);

  useEffect(() => {
    const loadChapters = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await apiRequest('/api/chapters');
        const nextChapters = Array.isArray(data.chapters) ? data.chapters : [];
        setChapters(nextChapters);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadChapters();
  }, []);

  useEffect(() => {
    const syncAuth = () => setAuth(getStoredAuth());

    window.addEventListener(authEvents.changed, syncAuth);
    window.addEventListener('storage', syncAuth);

    return () => {
      window.removeEventListener(authEvents.changed, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, []);

  useEffect(() => {
    if (auth) {
      setIsSigninPromptVisible(false);
      return undefined;
    }

    const promptTimer = window.setTimeout(() => {
      setIsSigninPromptVisible(true);
      setIsGraphOpen(false);
    }, chapterWeightagePreviewMs);

    return () => window.clearTimeout(promptTimer);
  }, [auth]);

  useEffect(() => {
    if (isGraphOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isGraphOpen]);

  const totalMarks = useMemo(
    () => chapters.reduce((sum, chapter) => sum + getChapterMarks(chapter), 0),
    [chapters, getChapterMarks]
  );

  const chaptersByMarks = useMemo(() => {
    return [...chapters].sort(
      (a, b) => getChapterMarks(b) - getChapterMarks(a)
    );
  }, [chapters, getChapterMarks]);

  const sortedChapters = useMemo(() => {
    return [...chapters].sort(
      (a, b) => Number(a.number || 0) - Number(b.number || 0)
    );
  }, [chapters]);

  const highestMarks = Math.max(
    ...chapters.map((chapter) => getChapterMarks(chapter)),
    1
  );

  const averageMarks = totalMarks / chapters.length || 0;

  const graphChapters = useMemo(() => {
    return sortedChapters.map((chapter) => ({
      ...chapter,
      marks: getChapterMarks(chapter),
    }));
  }, [sortedChapters, getChapterMarks]);

  const highPriorityChapters = chaptersByMarks.filter(
    (_, idx) => idx < Math.ceil(chaptersByMarks.length * 0.3)
  );

  const totalHighPriorityMarks = highPriorityChapters.reduce(
    (sum, ch) => sum + getChapterMarks(ch),
    0
  );

  const highPriorityPercentage = totalMarks
    ? Math.round((totalHighPriorityMarks / totalMarks) * 100)
    : 0;

  const getPriorityLevel = (chapter) => {
    const rankIndex = chaptersByMarks.findIndex(
      (c) => c._id === chapter._id || c.number === chapter.number
    );

    if (rankIndex < Math.ceil(chapters.length * 0.3)) {
      return {
        label: 'High Priority',
        color: 'text-rose-500',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
      };
    }

    if (rankIndex < Math.ceil(chapters.length * 0.7)) {
      return {
        label: 'Medium Priority',
        color: 'text-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
      };
    }

    return {
      label: 'Low Priority',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    };
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-gray-50 px-4 py-8 md:py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="relative mb-10 md:mb-16 text-center animate-fadeInUp">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-gradient-to-r from-rose-200 to-amber-200 blur-3xl" />
          </div>

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 shadow-sm border border-gray-100">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
              <span className="text-[10px] sm:text-xs font-medium text-gray-600 tracking-wide">
                Interactive Analytics
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-3 sm:mb-4">
              Chapter Weightage
            </h1>

            <p className="max-w-2xl mx-auto text-gray-500 text-base sm:text-lg leading-relaxed px-2">
              Discover your optimal study path with intelligent priority mapping
              and detailed mark distribution insights
            </p>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && !error && chapters.length > 0 && (
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 animate-fadeInUp animation-delay-200">
            <div className="group relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="absolute top-0 right-0 h-24 w-24 sm:h-32 sm:w-32 bg-gradient-to-br from-rose-100/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="mb-3 inline-flex rounded-xl bg-rose-50 p-2.5 sm:p-3">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Total Marks
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {totalMarks}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2">
                  across all chapters
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="absolute top-0 right-0 h-24 w-24 sm:h-32 sm:w-32 bg-gradient-to-br from-amber-100/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="mb-3 inline-flex rounded-xl bg-amber-50 p-2.5 sm:p-3">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Average Marks
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {Math.round(averageMarks)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2">per chapter</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="absolute top-0 right-0 h-24 w-24 sm:h-32 sm:w-32 bg-gradient-to-br from-emerald-100/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="mb-3 inline-flex rounded-xl bg-emerald-50 p-2.5 sm:p-3">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Top Priority
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {highPriorityPercentage}%
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2">
                  of total marks
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="absolute top-0 right-0 h-24 w-24 sm:h-32 sm:w-32 bg-gradient-to-br from-indigo-100/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative">
                <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2.5 sm:p-3">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Total Chapters
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {chapters.length}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2">to master</p>
              </div>
            </div>
          </div>
        )}

        {/* Distribution Toggle */}
        {!isLoading && !error && chapters.length > 0 && (
          <div className="mb-6 sm:mb-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <p className="text-sm font-semibold text-gray-900">
                Distribution of marks
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Switch between weightage with option and without option.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setDistributionMode('withOption')}
                className={`rounded-xl px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition ${
                  distributionMode === 'withOption'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                With option
              </button>

              <button
                type="button"
                onClick={() => setDistributionMode('withoutOption')}
                className={`rounded-xl px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition ${
                  distributionMode === 'withoutOption'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Without option
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
            <div className="relative">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-4 border-gray-200 border-t-rose-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 animate-pulse" />
              </div>
            </div>

            <p className="mt-4 text-sm sm:text-base text-gray-500 font-medium">
              Loading chapter insights...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-6 sm:p-8 text-center animate-shake">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-3" />

            <p className="text-sm sm:text-base text-red-600 font-medium">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : chapters.length > 0 ? (
          <div className="animate-fadeInUp animation-delay-400">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Chapter Analysis
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Sorted by chapter sequence
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-gray-400">Priority:</span>

                <div className="flex gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-rose-50 text-rose-600">
                    High
                  </span>

                  <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-amber-50 text-amber-600">
                    Medium
                  </span>

                  <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-600">
                    Low
                  </span>
                </div>
              </div>
            </div>

            {/* Chapters */}
            <div className="grid gap-3 sm:gap-4">
              {sortedChapters.map((chapter, index) => {
                const marks = getChapterMarks(chapter);

                const contribution = totalMarks
                  ? Math.round((marks / totalMarks) * 100)
                  : 0;

                const priority = getPriorityLevel(chapter);

                const priorityRank =
                  chaptersByMarks.findIndex(
                    (c) => c._id === chapter._id || c.number === chapter.number
                  ) + 1;

                const isHovered =
                  hoveredChapter === chapter._id ||
                  hoveredChapter === chapter.number;

                return (
                  <div
                    key={chapter._id || chapter.number}
                    className="group relative animate-slideIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onMouseEnter={() =>
                      setHoveredChapter(chapter._id || chapter.number)
                    }
                    onMouseLeave={() => setHoveredChapter(null)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-amber-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <Link
                      to={`/chapters/${chapter.number}/topics`}
                      className="relative block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                      aria-label={`Open Chapter ${chapter.number}: ${chapter.name}`}
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${priority.bg} ${priority.color} border ${priority.border}`}
                              >
                                <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {priority.label}
                              </span>

                              <span className="text-[10px] sm:text-xs text-gray-400">
                                Priority #{priorityRank}
                              </span>
                            </div>

                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors line-clamp-2 md:line-clamp-none">
                              Chapter {chapter.number}: {chapter.name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-400" />
                                <span className="text-xs sm:text-sm text-gray-600">
                                  <span className="font-semibold">
                                    {marks}
                                  </span>{' '}
                                  marks
                                </span>
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-slate-300" />
                                <span className="text-xs sm:text-sm text-gray-500">
                                  {distributionMode === 'withOption'
                                    ? 'With option'
                                    : 'Without option'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-400" />
                                <span className="text-xs sm:text-sm text-gray-600">
                                  <span className="font-semibold">
                                    {contribution}%
                                  </span>{' '}
                                  of total
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                {marks}
                              </div>
                              <div className="text-xs text-gray-400">marks</div>
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="relative mt-2 md:mt-0">
                          <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${(marks / highestMarks) * 100}%`,
                                background: `linear-gradient(90deg, 
                                  ${
                                    priority.color === 'text-rose-500'
                                      ? '#f43f5e'
                                      : priority.color === 'text-amber-500'
                                      ? '#f59e0b'
                                      : '#10b981'
                                  } 0%,
                                  ${
                                    priority.color === 'text-rose-500'
                                      ? '#fb7185'
                                      : priority.color === 'text-amber-500'
                                      ? '#fbbf24'
                                      : '#34d399'
                                  } 100%)`,
                              }}
                            />
                          </div>

                          <div
                            className="absolute inset-0 h-1.5 sm:h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                              background: `linear-gradient(90deg, 
                                ${
                                  priority.color === 'text-rose-500'
                                    ? '#f43f5e'
                                    : priority.color === 'text-amber-500'
                                    ? '#f59e0b'
                                    : '#10b981'
                                } 0%,
                                ${
                                  priority.color === 'text-rose-500'
                                    ? '#fb7185'
                                    : priority.color === 'text-amber-500'
                                    ? '#fbbf24'
                                    : '#34d399'
                                } 100%)`,
                              filter: 'blur(4px)',
                              opacity: 0.3,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex justify-end">
                          <div
                            className={`text-[10px] sm:text-xs font-medium ${priority.color} transition-all duration-300 transform md:${
                              isHovered
                                ? 'translate-x-0 opacity-100'
                                : 'translate-x-2 opacity-0'
                            }`}
                          >
                            {contribution}% contribution
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 sm:mt-12 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-emerald-50 p-5 sm:p-6 border border-gray-100 animate-fadeInUp animation-delay-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-shrink-0 hidden sm:block">
                  <div className="rounded-full bg-white p-3 shadow-sm">
                    <TrendingUp className="h-6 w-6 text-rose-500" />
                  </div>
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1 text-base sm:text-lg">
                    Study Suggestion
                  </h4>

                  <p className="text-xs sm:text-sm text-gray-600">
                    Focus on the top {Math.ceil(chapters.length * 0.3)}{' '}
                    high-priority chapters covering {highPriorityPercentage}% of
                    total marks.
                  </p>
                </div>

                <Link
                  to="/chapters"
                  className="group inline-flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-gray-300 mt-2 sm:mt-0"
                >
                  Manage Chapters
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 sm:py-20 animate-fadeIn">
            <div className="inline-flex rounded-full bg-gray-100 p-5 sm:p-6 mb-4">
              <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              No chapters yet
            </h2>

            <p className="text-sm sm:text-base text-gray-500 mb-6">
              Add chapters to see your personalized weightage analysis
            </p>

            <Link
              to="/chapters"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gray-900 text-white rounded-xl text-sm sm:text-base font-medium hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* NEXT LEVEL FLOATING BUTTON + MODAL */}
      {!isLoading && !error && chapters.length > 0 && (
        <>
          {/* FAB */}
          <motion.button
            type="button"
            onClick={() => setIsGraphOpen(true)}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            whileHover={{ scale: 1.12, rotate: 8 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 grid h-14 w-14 sm:h-16 sm:w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rose-500 via-orange-400 to-emerald-400 text-white shadow-[0_20px_60px_rgba(244,63,94,0.45)] focus:outline-none"
            aria-label="Open chapter weightage graph"
          >
            {/* Animated Aura */}
            <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[-3px] rounded-full border border-white/30"
            />

            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-white/0 blur-md"
            />

            <BarChart3 className="relative z-10 h-6 w-6 sm:h-7 sm:w-7" />
          </motion.button>

          {/* MODAL */}
          <AnimatePresence mode="wait">
            {isGraphOpen && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(8px) sm:blur(18px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                transition={{ duration: 0.45 }}
                className="fixed inset-0 z-[100] overflow-hidden bg-black/40 sm:bg-black/35"
                onClick={() => setIsGraphOpen(false)}
              >
                {/* Smooth Glow Background */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute bottom-0 right-0 h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] rounded-full bg-gradient-to-br from-rose-400/20 via-amber-300/10 to-emerald-400/20 blur-3xl pointer-events-none"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{
                    scale: 0.95,
                    opacity: 0,
                    y: 20,
                    borderRadius: '24px',
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    borderRadius: '24px',
                  }}
                  exit={{
                    scale: 0.95,
                    opacity: 0,
                    y: 20,
                    borderRadius: '24px',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 250,
                    damping: 25,
                    mass: 0.5,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-3 flex flex-col overflow-hidden rounded-2xl bg-white/95 shadow-[0_20px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:inset-6 sm:rounded-[32px] sm:shadow-[0_40px_120px_rgba(0,0,0,0.25)] md:inset-10"
                >
                  {/* Glass Shine */}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.02)_35%,rgba(255,255,255,0.05)_100%)]" />

                  {/* Header */}
                  <div className="relative z-10 flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:items-center sm:px-6 sm:py-5">
                    <div>
                      <p className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700 sm:px-3 sm:py-1 sm:text-xs">
                        Expanded analytics
                      </p>

                      <h2 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:mt-2 sm:text-3xl">
                        {distributionMode === 'withOption'
                          ? 'With option'
                          : 'Without option'}{' '}
                        graph
                      </h2>
                    </div>

                    <motion.button
                      whileHover={{ rotate: 90, scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={() => setIsGraphOpen(false)}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition sm:h-12 sm:w-12"
                      aria-label="Close graph"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </motion.button>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-1 items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
                    <ChapterWeightageGraph
                      chapters={graphChapters}
                      distributionMode={distributionMode}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {isSigninPromptVisible && (
        <div className="fixed inset-x-0 bottom-0 top-24 z-[120] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.35)]"
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-white shadow-lg">
              <Lock className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              Sign in to continue
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Create or access your account to see the full chapter weightage
              analysis.
            </p>

            <Link
              to="/signin"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </motion.div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-15px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
          opacity: 0;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-600 { animation-delay: 600ms; }

        ::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }

        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
};

export default Chapter_weightage;
