import DailyStreakPage from './DailyStreakPage'

// Daily practice has its own route and page entry point. The existing daily
// challenge implementation is reused so answers, scoring, streaks, and
// question progression stay exactly the same.
const DailyPracticePage = () => <DailyStreakPage dailyPracticePage />

export default DailyPracticePage
