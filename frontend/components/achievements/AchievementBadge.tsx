'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Achievement, TIER_CONFIG, AchievementTier } from '@/lib/achievements'
import {
  Footprints, Rocket, GraduationCap, Award, Zap, Crown,
  Flame, Shield, Target, Trophy,
  Clock, Timer, Brain, BookOpenCheck, Scroll,
  Compass, Palette, Layers,
  UserPlus, Users, Star,
  Sparkles, Lock,
} from 'lucide-react'
import { ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
//  ICON MAP — Maps string icon names → Lucide components
// ═══════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints, Rocket, GraduationCap, Award, Zap, Crown,
  Flame, Shield, Target, Trophy,
  Clock, Timer, Brain, BookOpenCheck, Scroll,
  Compass, Palette, Layers,
  UserPlus, Users, Star,
  Sparkles,
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[name] || Star
}

// ═══════════════════════════════════════════════════════════════════════════
//  ACHIEVEMENT BADGE — Main visual component
// ═══════════════════════════════════════════════════════════════════════════

interface AchievementBadgeProps {
  achievement: Achievement
  unlocked: boolean
  /** 0-100 progress toward unlocking */
  progress?: number
  /** Trigger the "just unlocked" animation */
  isNew?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show progress text */
  showProgress?: boolean
  className?: string
}

export function AchievementBadge({
  achievement,
  unlocked,
  progress = 0,
  isNew = false,
  size = 'md',
  showProgress = true,
  className,
}: AchievementBadgeProps) {
  const tier = TIER_CONFIG[achievement.tier]
  const IconComponent = getIcon(achievement.icon)

  const sizes = {
    sm: { wrapper: 'w-14 h-14', icon: 'w-6 h-6', ring: 'p-0.5' },
    md: { wrapper: 'w-20 h-20', icon: 'w-8 h-8', ring: 'p-1' },
    lg: { wrapper: 'w-28 h-28', icon: 'w-12 h-12', ring: 'p-1.5' },
  }

  const s = sizes[size]

  return (
    <motion.div
      className={cn('flex flex-col items-center gap-2 group', className)}
      initial={isNew ? { scale: 0, rotate: -180 } : { opacity: 1 }}
      animate={isNew ? { scale: 1, rotate: 0 } : { opacity: 1 }}
      transition={
        isNew
          ? { type: 'spring', stiffness: 200, damping: 15, duration: 0.8 }
          : { duration: 0.3 }
      }
    >
      {/* Badge Circle */}
      <div className="relative">
        {/* Glow effect for unlocked */}
        {unlocked && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500',
              `bg-gradient-to-br ${tier.gradient}`
            )}
            animate={isNew ? { opacity: [0, 0.8, 0.3], scale: [1, 1.4, 1.1] } : undefined}
            transition={isNew ? { duration: 1.2, ease: 'easeOut' } : undefined}
          />
        )}

        {/* Progress ring (for locked badges with progress) */}
        {!unlocked && progress > 0 && (
          <svg
            className={cn('absolute inset-0', s.wrapper)}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200 dark:text-slate-700"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className={tier.text}
              strokeDasharray={`${2 * Math.PI * 46}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 46 * (1 - progress / 100),
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}

        {/* Badge circle */}
        <motion.div
          className={cn(
            'relative rounded-full flex items-center justify-center transition-all duration-300',
            s.wrapper,
            s.ring,
            unlocked
              ? cn(
                  'ring-2',
                  tier.ring,
                  `bg-gradient-to-br ${tier.gradient}`,
                  `shadow-lg ${tier.glow}`
                )
              : 'ring-1 ring-slate-300 dark:ring-slate-600 bg-slate-100 dark:bg-slate-800'
          )}
          whileHover={unlocked ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {unlocked ? (
            <IconComponent className={cn(s.icon, 'text-white drop-shadow-sm')} />
          ) : (
            <Lock className={cn(s.icon, 'text-slate-400 dark:text-slate-500')} />
          )}

          {/* Shimmer effect on new unlock */}
          {isNew && unlocked && (
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeInOut' }}
            />
          )}
        </motion.div>

        {/* Tier label */}
        {unlocked && (
          <motion.span
            className={cn(
              'absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
              `bg-gradient-to-r ${tier.gradient}`,
              'text-white shadow-sm'
            )}
            initial={isNew ? { scale: 0, y: 10 } : { scale: 1 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          >
            {tier.label}
          </motion.span>
        )}
      </div>

      {/* Title & Description */}
      <div className="text-center max-w-[120px]">
        <p
          className={cn(
            'text-xs font-semibold leading-tight',
            unlocked
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {achievement.title}
        </p>
        {showProgress && !unlocked && progress > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {Math.round(progress)}%
          </p>
        )}
        {unlocked && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            +{achievement.xp} XP
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  XP LEVEL BAR — Shows current XP and level progress
// ═══════════════════════════════════════════════════════════════════════════

interface XpLevelBarProps {
  level: number
  currentXp: number
  nextLevelXp: number
  progress: number
  totalXp: number
  levelTitle: string
}

export function XpLevelBar({ level, currentXp, nextLevelXp, progress, totalXp, levelTitle }: XpLevelBarProps) {
  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20"
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            {level}
          </motion.div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Level {level}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {levelTitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {totalXp.toLocaleString()} XP
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {currentXp} / {nextLevelXp} to next
          </p>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  )
}
