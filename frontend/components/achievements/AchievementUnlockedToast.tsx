'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { Achievement, TIER_CONFIG } from '@/lib/achievements'
import { AchievementBadge } from './AchievementBadge'
import { X, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
//  🎉 ACHIEVEMENT UNLOCKED TOAST — Celebratory popup with particles
// ═══════════════════════════════════════════════════════════════════════════

interface AchievementToast {
  id: string
  achievement: Achievement
}

interface AchievementToastContextType {
  celebrate: (achievement: Achievement) => void
}

const AchievementToastContext = createContext<AchievementToastContextType | null>(null)

export function useAchievementToast() {
  const ctx = useContext(AchievementToastContext)
  if (!ctx) {
    // Return a no-op so it doesn't crash outside the provider
    return { celebrate: () => {} }
  }
  return ctx
}

// ── Confetti Particle ─────────────────────────────────────────────────────

function ConfettiParticle({ index, tier }: { index: number; tier: string }) {
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']
  const color = colors[index % colors.length]
  const angle = (index / 12) * 360
  const distance = 60 + Math.random() * 40
  const x = Math.cos((angle * Math.PI) / 180) * distance
  const y = Math.sin((angle * Math.PI) / 180) * distance
  const size = 4 + Math.random() * 6

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: '50%',
        top: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x,
        y: y - 20,
        opacity: 0,
        scale: 0,
        rotate: Math.random() * 360,
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        delay: 0.1 + index * 0.03,
        ease: 'easeOut',
      }}
    />
  )
}

// ── Single Toast ──────────────────────────────────────────────────────────

function AchievementToastItem({
  toast,
  onDismiss,
}: {
  toast: AchievementToast
  onDismiss: () => void
}) {
  const tier = TIER_CONFIG[toast.achievement.tier]

  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 80, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative pointer-events-auto w-full max-w-sm',
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
        'rounded-2xl shadow-2xl overflow-hidden'
      )}
    >
      {/* Top gradient accent */}
      <div
        className={cn(
          'h-1 w-full bg-gradient-to-r',
          tier.gradient
        )}
      />

      {/* Confetti particles */}
      <div className="absolute top-8 left-1/2 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} tier={toast.achievement.tier} />
        ))}
      </div>

      <div className="p-4 flex items-center gap-4">
        {/* Badge */}
        <div className="flex-shrink-0">
          <AchievementBadge
            achievement={toast.achievement}
            unlocked
            isNew
            size="sm"
            showProgress={false}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <PartyPopper className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Achievement Unlocked!
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {toast.achievement.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {toast.achievement.description}
          </p>
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mt-1">
            +{toast.achievement.xp} XP earned
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROVIDER — Wrap at layout level
// ═══════════════════════════════════════════════════════════════════════════

export function AchievementToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AchievementToast[]>([])

  const celebrate = useCallback((achievement: Achievement) => {
    const id = `ach-${achievement.id}-${Date.now()}`
    setToasts((prev) => [...prev.slice(-2), { id, achievement }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <AchievementToastContext.Provider value={{ celebrate }}>
      {children}

      {/* Toast Container — Bottom Center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <AchievementToastItem
              key={t.id}
              toast={t}
              onDismiss={() => dismiss(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </AchievementToastContext.Provider>
  )
}
