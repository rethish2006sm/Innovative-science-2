import { memo, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

const polarToCartesian = (cx, cy, r, angle) => {
  const rad = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

const createArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return `
    M ${start.x} ${start.y}
    A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}
  `
}

const ChapterWeightagePieChart = ({
  chapters = [],
  distributionMode = 'withOption',
  animateIntro = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(null)

  const orderedChapters = useMemo(() => [...chapters].sort((a, b) => {
    const aNumber = Number(a.number)
    const bNumber = Number(b.number)
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber
    return String(a.number || '').localeCompare(String(b.number || ''), undefined, { numeric: true })
  }), [chapters])

  const totalMarks = orderedChapters.reduce(
    (acc, curr) => acc + (Number(curr.marks) || 0),
    0
  )

  const segments = useMemo(() => {
    const gapAngle = orderedChapters.length > 1 ? 2 : 0 

    return orderedChapters.reduce((acc, chapter, index) => {
      const value = Number(chapter.marks) || 0
      const percentage = totalMarks ? (value / totalMarks) * 100 : 0
      const angle = (percentage / 100) * 360

      const startAngle = acc.cumulativeAngle + gapAngle / 2
      const endAngle = acc.cumulativeAngle + angle - gapAngle / 2

      return {
        cumulativeAngle: acc.cumulativeAngle + angle,
        items: [
          ...acc.items,
          {
            ...chapter,
            value,
            percentage,
            startAngle,
            endAngle: endAngle < startAngle ? startAngle : endAngle,
            color: COLORS[index % COLORS.length],
          },
        ],
      }
    }, { cumulativeAngle: 0, items: [] }).items
  }, [orderedChapters, totalMarks])

  return (
    <div className="flex w-full items-center justify-center">
      <div className="relative mx-auto flex w-fit shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-2 shadow-xl sm:p-6">
        <motion.svg
          viewBox="0 0 300 300"
          className="h-[230px] w-[230px] min-[380px]:h-[270px] min-[380px]:w-[270px] sm:h-[360px] sm:w-[360px]"
          {...(animateIntro
            ? {
                initial: { rotate: -90 },
                animate: { rotate: 0 },
                transition: { duration: 1.2, ease: 'easeOut' },
              }
            : {})}
        >
          <circle
            cx="150"
            cy="150"
            r="105"
            fill="transparent"
            stroke="rgba(0,0,0,0.02)"
            strokeWidth="42"
          />

          {segments.map((segment, index) => {
            const isActive = activeIndex === index
            const pathMotionProps = animateIntro
              ? {
                  initial: { pathLength: 0, opacity: 0 },
                  animate: {
                    pathLength: 1,
                    opacity: 1,
                    scale: isActive ? 1.03 : 1,
                  },
                  transition: {
                    duration: 1,
                    delay: index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  },
                }
              : {
                  animate: {
                    opacity: 1,
                    scale: isActive ? 1.03 : 1,
                  },
                  transition: {
                    duration: 0.18,
                  },
                }

            return (
              <motion.path
                key={segment._id || index}
                d={createArc(
                  150,
                  150,
                  isActive ? 118 : 105,
                  segment.startAngle,
                  segment.endAngle
                )} 
                fill="transparent"
                stroke={segment.color}
                strokeWidth={isActive ? 42 : 34}
                {...pathMotionProps}
                whileHover={{
                  scale: 1.05,
                  filter: 'drop-shadow(0px 0px 16px rgba(0,0,0,0.15))',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveIndex(isActive ? null : index)
                }}
                className="cursor-pointer transition-all duration-300"
              />
            )
          })}

          <foreignObject x="85" y="85" width="130" height="130">
            <motion.div
              animate={{
                scale: activeIndex !== null ? 1.05 : 1,
              }}
              className="flex h-full w-full flex-col items-center justify-center rounded-full border border-slate-200 bg-white/70 text-center shadow-inner"
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-600 sm:text-xs sm:tracking-[0.25em]">
                {activeIndex !== null ? 'Selected' : 'Overview'}
              </p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <h3 className="mt-1 text-2xl font-black text-slate-900 sm:mt-2 sm:text-3xl">
                    {activeIndex !== null
                      ? `${segments[activeIndex].percentage.toFixed(0)}%`
                      : totalMarks}
                  </h3>

                  <p className="mx-auto mt-1 max-w-[90px] truncate text-[10px] text-slate-600 sm:max-w-[100px] sm:text-[11px]">
                    {activeIndex !== null
                      ? segments[activeIndex].name
                      : 'Total Marks'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </foreignObject>
        </motion.svg>
      </div>
    </div>
  )
}

export default memo(ChapterWeightagePieChart)
