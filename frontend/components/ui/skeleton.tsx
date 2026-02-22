'use client'

import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
//  SKELETON PRIMITIVES — Reusable loading states
// ═══════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string
}

/** Base skeleton with shimmer animation */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />
}

/** Circular skeleton — avatars, icons */
export function SkeletonCircle({ className, size = 'md' }: SkeletonProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-14 h-14' }
  return <div className={cn('skeleton rounded-full', sizes[size], className)} />
}

/** Text line skeleton */
export function SkeletonText({ className, lines = 1, lastLineWidth = '75%' }: SkeletonProps & { lines?: number; lastLineWidth?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 rounded"
          style={{ width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%' }}
        />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRESET SKELETON LAYOUTS
// ═══════════════════════════════════════════════════════════════════════════

/** Skeleton for stat cards (stats grid) */
export function SkeletonStatCard() {
  return (
    <div className="card-stat animate-pulse">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl skeleton w-12 h-12" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-7 w-16 rounded" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for stat cards grid */
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={cn(
      'grid gap-4',
      count <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

/** Skeleton for a session/booking list item */
export function SkeletonListItem() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <SkeletonCircle size="lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="hidden sm:flex gap-2">
          <div className="skeleton h-9 w-20 rounded-xl" />
          <div className="skeleton h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for a list of items */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  )
}

/** Skeleton for a tutor card */
export function SkeletonTutorCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-4">
          <SkeletonCircle size="xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-36 rounded" />
            <div className="skeleton h-3.5 w-24 rounded" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 space-y-3">
        <div className="flex gap-2">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-14 rounded-full" />
        </div>
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-3/4 rounded" />
      </div>
      <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="skeleton h-7 w-20 rounded" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
    </div>
  )
}

/** Skeleton grid of tutor cards */
export function SkeletonTutorGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTutorCard key={i} />
      ))}
    </div>
  )
}

/** Skeleton for the full dashboard page */
export function SkeletonDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats row */}
      <SkeletonStatsGrid count={4} />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="skeleton h-6 w-40 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
          <SkeletonList count={3} />
        </div>
        <div className="lg:col-span-1">
          <div className="skeleton h-6 w-32 rounded mb-4" />
          <div className="card space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-24 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Skeleton for a recommendation carousel */
export function SkeletonCarousel({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[280px] md:w-[320px]">
          <SkeletonTutorCard />
        </div>
      ))}
    </div>
  )
}
