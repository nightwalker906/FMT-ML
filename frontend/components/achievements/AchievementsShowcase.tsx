'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Achievement,
  AchievementCategory,
  ACHIEVEMENTS,
  CATEGORY_CONFIG,
  TIER_CONFIG,
  calculateLevel,
  getLevelTitle,
} from '@/lib/achievements'
import { AchievementBadge, XpLevelBar } from './AchievementBadge'
import { Trophy, ChevronRight, Sparkles, Filter } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
//  🏆 ACHIEVEMENTS SHOWCASE — Full grid with category filter
// ═══════════════════════════════════════════════════════════════════════════

export interface AchievementStatus {
  achievement: Achievement
  unlocked: boolean
  progress: number  // 0-100
  isNew?: boolean
}

interface AchievementsShowcaseProps {
  achievements: AchievementStatus[]
  className?: string
}

export function AchievementsShowcase({ achievements, className }: AchievementsShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all')

  const totalXp = useMemo(
    () =>
      achievements
        .filter((a) => a.unlocked)
        .reduce((sum, a) => sum + a.achievement.xp, 0),
    [achievements]
  )

  const levelInfo = useMemo(() => calculateLevel(totalXp), [totalXp])
  const levelTitle = getLevelTitle(levelInfo.level)

  const unlockedCount = achievements.filter((a) => a.unlocked).length
  const totalCount = achievements.length

  const filtered = useMemo(
    () =>
      activeCategory === 'all'
        ? achievements
        : achievements.filter((a) => a.achievement.category === activeCategory),
    [achievements, activeCategory]
  )

  // Sort: unlocked first (newest first), then locked by progress descending
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1
        if (!a.unlocked && b.unlocked) return 1
        if (a.unlocked && b.unlocked) return b.achievement.xp - a.achievement.xp
        return b.progress - a.progress
      }),
    [filtered]
  )

  const categories: { key: AchievementCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({
      key: key as AchievementCategory,
      label: val.label,
    })),
  ]

  return (
    <div className={cn('space-y-5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Achievements
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
        </div>

        {/* Unlocked ratio badge */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {totalXp.toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* XP Level Bar */}
      <XpLevelBar
        level={levelInfo.level}
        currentXp={levelInfo.currentXp}
        nextLevelXp={levelInfo.nextLevelXp}
        progress={levelInfo.progress}
        totalXp={totalXp}
        levelTitle={levelTitle}
      />

      {/* Category Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.key
          const count =
            cat.key === 'all'
              ? achievements.filter((a) => a.unlocked).length
              : achievements.filter(
                  (a) => a.achievement.category === cat.key && a.unlocked
                ).length
          const total =
            cat.key === 'all'
              ? achievements.length
              : achievements.filter((a) => a.achievement.category === cat.key).length

          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {cat.label}
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  isActive
                    ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}
              >
                {count}/{total}
              </span>
            </button>
          )
        })}
      </div>

      {/* Badge Grid */}
      <motion.div
        layout
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {sorted.map((item) => (
            <motion.div
              key={item.achievement.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex flex-col items-center p-3 rounded-xl transition-colors duration-200',
                item.unlocked
                  ? 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:shadow-md'
                  : 'bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800'
              )}
            >
              <AchievementBadge
                achievement={item.achievement}
                unlocked={item.unlocked}
                progress={item.progress}
                isNew={item.isNew}
                size="sm"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-center leading-tight">
                {item.achievement.description}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MINI SHOWCASE — Compact widget for dashboard
// ═══════════════════════════════════════════════════════════════════════════

interface MiniAchievementsProps {
  achievements: AchievementStatus[]
  className?: string
}

export function MiniAchievements({ achievements, className }: MiniAchievementsProps) {
  const unlocked = achievements.filter((a) => a.unlocked)
  const totalXp = unlocked.reduce((sum, a) => sum + a.achievement.xp, 0)
  const levelInfo = calculateLevel(totalXp)

  // Show latest 4 unlocked + next 1 to unlock
  const recentUnlocked = unlocked
    .sort((a, b) => b.achievement.xp - a.achievement.xp)
    .slice(0, 4)

  const nextToUnlock = achievements
    .filter((a) => !a.unlocked && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 1)

  const displayBadges = [...recentUnlocked, ...nextToUnlock]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-5',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Achievements
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
            Lv. {levelInfo.level}
          </span>
        </div>
        <a
          href="/student/progress"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          View all <ChevronRight size={14} />
        </a>
      </div>

      {/* XP mini bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>{totalXp} XP</span>
          <span>{unlocked.length}/{achievements.length} badges</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Badge row */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {displayBadges.map((item) => (
          <AchievementBadge
            key={item.achievement.id}
            achievement={item.achievement}
            unlocked={item.unlocked}
            progress={item.progress}
            size="sm"
            showProgress
          />
        ))}
        {displayBadges.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-4">
            Complete sessions to start earning badges! 🏆
          </p>
        )}
      </div>
    </motion.div>
  )
}
