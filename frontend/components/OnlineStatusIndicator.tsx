'use client'

import { useMemo } from 'react'

// ── Time-ago formatter (relative to now) ─────────────────────────────────────
function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Offline'

  const now = Date.now()
  const then = new Date(lastSeen).getTime()
  const diffMs = now - then

  if (isNaN(then) || diffMs < 0) return 'Offline'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)

  if (seconds < 60) return 'Last seen just now'
  if (minutes < 60) return `Last seen ${minutes}m ago`
  if (hours < 24) return `Last seen ${hours}h ago`
  if (days < 7) return `Last seen ${days}d ago`
  if (weeks < 4) return `Last seen ${weeks}w ago`

  // Format as date for very old last-seen
  return `Last seen ${new Date(lastSeen).toLocaleDateString()}`
}

// ── Dot Indicator (for avatars) ──────────────────────────────────────────────
interface OnlineDotProps {
  isOnline: boolean
  /** Absolute positioning class — defaults to bottom-right of a relative parent */
  className?: string
  /** Size: 'sm' (10px), 'md' (14px), 'lg' (16px) */
  size?: 'sm' | 'md' | 'lg'
}

const dotSizes = {
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3.5 h-3.5 border-2',
  lg: 'w-4 h-4 border-2',
}

export function OnlineDot({ isOnline, className, size = 'md' }: OnlineDotProps) {
  if (!isOnline) return null

  return (
    <span
      className={`absolute ${dotSizes[size]} rounded-full border-white dark:border-slate-800 bg-green-500 animate-pulse ${className ?? 'bottom-0 right-0'}`}
      title="Online"
    />
  )
}

// ── Text Status (for headers / chat bars) ────────────────────────────────────
interface OnlineStatusTextProps {
  isOnline: boolean
  lastSeen?: string | null
  /** Extra tailwind classes */
  className?: string
}

export function OnlineStatusText({
  isOnline,
  lastSeen,
  className = '',
}: OnlineStatusTextProps) {
  const text = useMemo(() => {
    if (isOnline) return 'Online'
    return formatLastSeen(lastSeen)
  }, [isOnline, lastSeen])

  return (
    <span
      className={`text-sm ${
        isOnline
          ? 'text-green-500 dark:text-green-400 font-medium'
          : 'text-slate-400 dark:text-slate-500'
      } ${className}`}
    >
      {isOnline && (
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
      )}
      {text}
    </span>
  )
}

// ── Full Badge (dot + text together, for tutor cards / detail pages) ─────────
interface OnlineStatusBadgeProps {
  isOnline: boolean
  lastSeen?: string | null
  className?: string
}

export function OnlineStatusBadge({
  isOnline,
  lastSeen,
  className = '',
}: OnlineStatusBadgeProps) {
  const text = useMemo(() => {
    if (isOnline) return 'Online now'
    return formatLastSeen(lastSeen)
  }, [isOnline, lastSeen])

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      />
      <span
        className={`text-sm font-medium ${
          isOnline
            ? 'text-green-600 dark:text-green-400'
            : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {text}
      </span>
    </div>
  )
}

export { formatLastSeen }
