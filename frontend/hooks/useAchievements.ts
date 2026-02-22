'use client'

import { useMemo, useEffect, useRef } from 'react'
import { ACHIEVEMENTS, Achievement } from '@/lib/achievements'
import { AchievementStatus } from '@/components/achievements/AchievementsShowcase'
import { useAchievementToast } from '@/components/achievements/AchievementUnlockedToast'

// ═══════════════════════════════════════════════════════════════════════════
//  🏆 useAchievements — Evaluates student data against all achievement defs
// ═══════════════════════════════════════════════════════════════════════════

export interface StudentStats {
  totalSessions: number
  currentStreak: number
  totalHours: number
  uniqueSubjects: number
  uniqueTutors: number
}

/** Build a per-user storage key so each student has their own seen-achievements list */
function storageKey(userId: string) {
  return `fmt-unlocked-achievements-${userId}`
}

/** Load previously seen unlocked achievement IDs from localStorage */
function loadSeenAchievements(userId: string): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

/** Save seen achievements to localStorage */
function saveSeenAchievements(userId: string, ids: Set<string>) {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...ids]))
  } catch {
    // Ignore storage errors
  }
}

export function useAchievements(stats: StudentStats | null, userId?: string) {
  const { celebrate } = useAchievementToast()
  const previouslySeenRef = useRef<Set<string>>(loadSeenAchievements(userId || ''))
  const hasCelebratedRef = useRef(false)

  // Re-load seen set when userId changes (e.g. different student logs in)
  useEffect(() => {
    if (userId) {
      previouslySeenRef.current = loadSeenAchievements(userId)
      hasCelebratedRef.current = false
    }
  }, [userId])

  const achievements: AchievementStatus[] = useMemo(() => {
    if (!stats) {
      return ACHIEVEMENTS.map((a) => ({
        achievement: a,
        unlocked: false,
        progress: 0,
        isNew: false,
      }))
    }

    const seen = previouslySeenRef.current

    return ACHIEVEMENTS.map((achievement) => {
      const currentValue = getMetricValue(stats, achievement.metric)
      const unlocked = currentValue >= achievement.threshold
      const progress = Math.min((currentValue / achievement.threshold) * 100, 100)
      const isNew = unlocked && !seen.has(achievement.id)

      return {
        achievement,
        unlocked,
        progress,
        isNew,
      }
    })
  }, [stats])

  // Fire celebration toasts for newly unlocked achievements
  useEffect(() => {
    if (!stats || hasCelebratedRef.current) return

    const newlyUnlocked = achievements.filter((a) => a.isNew)

    if (newlyUnlocked.length > 0) {
      const seen = previouslySeenRef.current

      // Stagger celebrations so they don't all appear at once
      newlyUnlocked.forEach((item, index) => {
        setTimeout(() => {
          celebrate(item.achievement)
        }, index * 1500) // 1.5s between each toast

        seen.add(item.achievement.id)
      })

      previouslySeenRef.current = seen
      if (userId) saveSeenAchievements(userId, seen)
      hasCelebratedRef.current = true
    }
  }, [achievements, stats, celebrate])

  // Summary stats
  const summary = useMemo(() => {
    const unlocked = achievements.filter((a) => a.unlocked)
    const totalXp = unlocked.reduce((sum, a) => sum + a.achievement.xp, 0)
    return {
      unlockedCount: unlocked.length,
      totalCount: achievements.length,
      totalXp,
      newCount: achievements.filter((a) => a.isNew).length,
    }
  }, [achievements])

  return { achievements, summary }
}

// ── Helper ────────────────────────────────────────────────────────────────

function getMetricValue(
  stats: StudentStats,
  metric: Achievement['metric']
): number {
  switch (metric) {
    case 'totalSessions':
      return stats.totalSessions
    case 'currentStreak':
      return stats.currentStreak
    case 'totalHours':
      return stats.totalHours
    case 'uniqueSubjects':
      return stats.uniqueSubjects
    case 'uniqueTutors':
      return stats.uniqueTutors
    case 'special':
      return 0 // Special achievements checked elsewhere
    default:
      return 0
  }
}
