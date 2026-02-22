// ═══════════════════════════════════════════════════════════════════════════
//  🏆 ACHIEVEMENT SYSTEM — Gamification Engine for Find My Tutor
//  Defines all badges, tiers, and thresholds
// ═══════════════════════════════════════════════════════════════════════════

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond'
export type AchievementCategory = 'sessions' | 'streaks' | 'hours' | 'subjects' | 'tutors' | 'special'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string        // Lucide icon name
  category: AchievementCategory
  tier: AchievementTier
  threshold: number   // Value needed to unlock
  /** What metric this achievement checks */
  metric: 'totalSessions' | 'currentStreak' | 'totalHours' | 'uniqueSubjects' | 'uniqueTutors' | 'special'
  /** XP reward for unlocking */
  xp: number
}

// ── Tier styling ──────────────────────────────────────────────────────────

export const TIER_CONFIG: Record<AchievementTier, {
  label: string
  gradient: string
  glow: string
  ring: string
  bg: string
  text: string
  iconBg: string
}> = {
  bronze: {
    label: 'Bronze',
    gradient: 'from-amber-600 to-orange-700',
    glow: 'shadow-amber-500/30',
    ring: 'ring-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  silver: {
    label: 'Silver',
    gradient: 'from-slate-400 to-slate-500',
    glow: 'shadow-slate-400/30',
    ring: 'ring-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/30',
    text: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-800/50',
  },
  gold: {
    label: 'Gold',
    gradient: 'from-yellow-400 to-amber-500',
    glow: 'shadow-yellow-400/40',
    ring: 'ring-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
  },
  diamond: {
    label: 'Diamond',
    gradient: 'from-cyan-400 to-blue-500',
    glow: 'shadow-cyan-400/50',
    ring: 'ring-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
  },
}

// ── Category metadata ─────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<AchievementCategory, {
  label: string
  icon: string
  color: string
}> = {
  sessions: { label: 'Sessions', icon: 'BookOpen', color: 'text-teal-500' },
  streaks:  { label: 'Streaks',  icon: 'Flame',    color: 'text-orange-500' },
  hours:    { label: 'Hours',    icon: 'Clock',    color: 'text-blue-500' },
  subjects: { label: 'Subjects', icon: 'Palette',  color: 'text-purple-500' },
  tutors:   { label: 'Tutors',   icon: 'Users',    color: 'text-pink-500' },
  special:  { label: 'Special',  icon: 'Sparkles', color: 'text-yellow-500' },
}

// ═══════════════════════════════════════════════════════════════════════════
//  ALL ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export const ACHIEVEMENTS: Achievement[] = [
  // ── SESSION MILESTONES ────────────────────────────────────────────────
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your very first tutoring session',
    icon: 'Footprints',
    category: 'sessions',
    tier: 'bronze',
    threshold: 1,
    metric: 'totalSessions',
    xp: 50,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Complete 5 tutoring sessions',
    icon: 'Rocket',
    category: 'sessions',
    tier: 'bronze',
    threshold: 5,
    metric: 'totalSessions',
    xp: 100,
  },
  {
    id: 'dedicated-learner',
    title: 'Dedicated Learner',
    description: 'Complete 10 tutoring sessions',
    icon: 'GraduationCap',
    category: 'sessions',
    tier: 'silver',
    threshold: 10,
    metric: 'totalSessions',
    xp: 200,
  },
  {
    id: 'session-pro',
    title: 'Session Pro',
    description: 'Complete 25 tutoring sessions',
    icon: 'Award',
    category: 'sessions',
    tier: 'gold',
    threshold: 25,
    metric: 'totalSessions',
    xp: 500,
  },
  {
    id: 'learning-machine',
    title: 'Learning Machine',
    description: 'Complete 50 tutoring sessions',
    icon: 'Zap',
    category: 'sessions',
    tier: 'gold',
    threshold: 50,
    metric: 'totalSessions',
    xp: 1000,
  },
  {
    id: 'century-club',
    title: 'Century Club',
    description: 'Complete 100 tutoring sessions!',
    icon: 'Crown',
    category: 'sessions',
    tier: 'diamond',
    threshold: 100,
    metric: 'totalSessions',
    xp: 2500,
  },

  // ── STREAK MILESTONES ─────────────────────────────────────────────────
  {
    id: 'on-fire',
    title: 'On Fire',
    description: 'Maintain a 3-day study streak',
    icon: 'Flame',
    category: 'streaks',
    tier: 'bronze',
    threshold: 3,
    metric: 'currentStreak',
    xp: 75,
  },
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: 'Shield',
    category: 'streaks',
    tier: 'silver',
    threshold: 7,
    metric: 'currentStreak',
    xp: 250,
  },
  {
    id: 'fortnight-focus',
    title: 'Fortnight Focus',
    description: 'Maintain a 14-day study streak',
    icon: 'Target',
    category: 'streaks',
    tier: 'gold',
    threshold: 14,
    metric: 'currentStreak',
    xp: 750,
  },
  {
    id: 'monthly-master',
    title: 'Monthly Master',
    description: 'Maintain an incredible 30-day streak!',
    icon: 'Trophy',
    category: 'streaks',
    tier: 'diamond',
    threshold: 30,
    metric: 'currentStreak',
    xp: 2000,
  },

  // ── HOURS MILESTONES ──────────────────────────────────────────────────
  {
    id: 'time-investor',
    title: 'Time Investor',
    description: 'Accumulate 5 hours of learning',
    icon: 'Clock',
    category: 'hours',
    tier: 'bronze',
    threshold: 5,
    metric: 'totalHours',
    xp: 100,
  },
  {
    id: 'marathon-learner',
    title: 'Marathon Learner',
    description: 'Accumulate 10 hours of learning',
    icon: 'Timer',
    category: 'hours',
    tier: 'silver',
    threshold: 10,
    metric: 'totalHours',
    xp: 250,
  },
  {
    id: 'knowledge-seeker',
    title: 'Knowledge Seeker',
    description: 'Accumulate 25 hours of learning',
    icon: 'Brain',
    category: 'hours',
    tier: 'gold',
    threshold: 25,
    metric: 'totalHours',
    xp: 600,
  },
  {
    id: 'scholar',
    title: 'Scholar',
    description: 'Accumulate 50 hours of learning',
    icon: 'BookOpenCheck',
    category: 'hours',
    tier: 'gold',
    threshold: 50,
    metric: 'totalHours',
    xp: 1200,
  },
  {
    id: 'sage',
    title: 'Sage',
    description: 'Accumulate 100 hours of learning!',
    icon: 'Scroll',
    category: 'hours',
    tier: 'diamond',
    threshold: 100,
    metric: 'totalHours',
    xp: 3000,
  },

  // ── SUBJECT DIVERSITY ─────────────────────────────────────────────────
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Study 2 different subjects',
    icon: 'Compass',
    category: 'subjects',
    tier: 'bronze',
    threshold: 2,
    metric: 'uniqueSubjects',
    xp: 100,
  },
  {
    id: 'renaissance-mind',
    title: 'Renaissance Mind',
    description: 'Study 3 different subjects',
    icon: 'Palette',
    category: 'subjects',
    tier: 'silver',
    threshold: 3,
    metric: 'uniqueSubjects',
    xp: 250,
  },
  {
    id: 'polymath',
    title: 'Polymath',
    description: 'Study 5 or more different subjects',
    icon: 'Layers',
    category: 'subjects',
    tier: 'gold',
    threshold: 5,
    metric: 'uniqueSubjects',
    xp: 750,
  },

  // ── TUTOR CONNECTIONS ─────────────────────────────────────────────────
  {
    id: 'social-learner',
    title: 'Social Learner',
    description: 'Work with 2 different tutors',
    icon: 'UserPlus',
    category: 'tutors',
    tier: 'bronze',
    threshold: 2,
    metric: 'uniqueTutors',
    xp: 100,
  },
  {
    id: 'network-builder',
    title: 'Network Builder',
    description: 'Work with 3 different tutors',
    icon: 'Users',
    category: 'tutors',
    tier: 'silver',
    threshold: 3,
    metric: 'uniqueTutors',
    xp: 250,
  },
  {
    id: 'community-star',
    title: 'Community Star',
    description: 'Work with 5 or more different tutors',
    icon: 'Star',
    category: 'tutors',
    tier: 'gold',
    threshold: 5,
    metric: 'uniqueTutors',
    xp: 750,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category)
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/** Calculate student level from total XP */
export function calculateLevel(totalXp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  // XP curve: Level N requires N * 200 XP
  let level = 1
  let xpUsed = 0
  while (true) {
    const needed = level * 200
    if (xpUsed + needed > totalXp) {
      return {
        level,
        currentXp: totalXp - xpUsed,
        nextLevelXp: needed,
        progress: ((totalXp - xpUsed) / needed) * 100,
      }
    }
    xpUsed += needed
    level++
  }
}

/** Get a title based on level */
export function getLevelTitle(level: number): string {
  if (level >= 20) return '🏆 Grand Master'
  if (level >= 15) return '💎 Diamond Scholar'
  if (level >= 12) return '🥇 Gold Academic'
  if (level >= 9) return '🥈 Silver Student'
  if (level >= 6) return '🥉 Bronze Learner'
  if (level >= 3) return '📚 Keen Student'
  return '🌱 Beginner'
}
