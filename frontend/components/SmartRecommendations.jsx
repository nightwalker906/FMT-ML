'use client'

import { memo, useMemo, useRef } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Star, Sparkles } from 'lucide-react'

// ── SWR Fetcher ──────────────────────────────────────────────────────────────
const fetcher = (url) => fetch(url).then((res) => res.json())

const API_URL = 'http://127.0.0.1:8000/api/recommendations/?user_id=1'

// ── SWR Config (aggressive caching — no unnecessary refetches) ───────────────
const SWR_OPTIONS = {
  revalidateOnFocus: false,       // Don't refetch when tab regains focus
  revalidateOnReconnect: false,   // Don't refetch on network reconnect
  revalidateIfStale: false,       // Don't auto-refetch stale data
  dedupingInterval: 60000,        // Dedup identical requests for 60s
  refreshInterval: 0,             // No polling
  errorRetryCount: 2,             // Only retry twice on error
}

// ── Match Badge Color Logic ──────────────────────────────────────────────────
function getMatchGradient(percentage) {
  if (percentage > 90) return 'bg-gradient-to-r from-emerald-400 to-green-500'
  if (percentage > 70) return 'bg-gradient-to-r from-blue-400 to-blue-600'
  return 'bg-gradient-to-r from-gray-400 to-gray-500'
}

// ── Initials Fallback ────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Framer Motion Variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ── Main Component ───────────────────────────────────────────────────────────
function SmartRecommendations() {
  const { data, error, isLoading } = useSWR(API_URL, fetcher, SWR_OPTIONS)

  // Track whether we've already animated in (don't replay on SWR re-renders)
  const hasAnimated = useRef(false)

  // Skeleton while loading
  if (isLoading) return <SkeletonLoader />

  // Fail gracefully
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null

  // Normalize: API may return { data: [...] } or { recommendations: [...] } or [...]
  const recommendations = Array.isArray(data)
    ? data
    : data.data ?? data.recommendations ?? []
  if (recommendations.length === 0) return null

  // Only animate on first mount, not on SWR background refreshes
  const shouldAnimate = !hasAnimated.current
  if (shouldAnimate) hasAnimated.current = true

  return (
    <section className="w-full py-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Recommended For You
        </h2>
      </div>

      {/* Netflix-Style Horizontal Carousel */}
      <motion.div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
        variants={containerVariants}
        initial={shouldAnimate ? 'hidden' : false}
        animate="visible"
      >
        {recommendations.map((rec, index) => (
          <RecommendationCard key={rec.id ?? rec.tutor_id ?? index} rec={rec} />
        ))}
      </motion.div>
    </section>
  )
}

// ── Recommendation Card ──────────────────────────────────────────────────────
const RecommendationCard = memo(function RecommendationCard({ rec }) {
  const {
    tutor_name = 'Unknown Tutor',
    tutor_id,
    match_percentage = 0,
    explanation = '',
    avatar_url,
    subjects = [],
    hourly_rate,
    average_rating,
  } = rec

  const initials = getInitials(tutor_name)
  const matchGradient = getMatchGradient(match_percentage)

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
      className="relative flex-shrink-0 w-[280px] snap-start bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden cursor-pointer transition-colors"
    >
      {/* Match Badge — Top Right */}
      <div
        className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-lg ${matchGradient}`}
      >
        {Math.round(match_percentage)}% Match
      </div>

      {/* Card Body */}
      <div className="p-5 pt-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-4">
          {/* Circular Avatar with Initials Fallback */}
          <div className="relative w-12 h-12 flex-shrink-0">
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={tutor_name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-600">
                <span className="text-white font-semibold text-sm">{initials}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
              {tutor_name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {average_rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {Number(average_rating).toFixed(1)}
                </span>
              )}
              {hourly_rate != null && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  • R{hourly_rate}/hr
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subject Tags */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {subjects.slice(0, 3).map((subject) => (
              <span
                key={subject}
                className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              >
                {subject}
              </span>
            ))}
            {subjects.length > 3 && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                +{subjects.length - 3}
              </span>
            )}
          </div>
        )}

        {/* XAI Explanation Box */}
        {explanation && (
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
              💡 {explanation}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
})

// ── Skeleton Loader (4 Pulsing Cards) ────────────────────────────────────────
function SkeletonLoader() {
  return (
    <section className="w-full py-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>

      {/* Cards skeleton row */}
      <div className="flex gap-4 overflow-hidden pb-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-5 pt-6 animate-pulse"
          >
            {/* Badge skeleton */}
            <div className="flex justify-end mb-3">
              <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Avatar + Text skeleton */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>

            {/* Tags skeleton */}
            <div className="flex gap-1.5 mb-3">
              <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Explanation skeleton */}
            <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-600" />
              <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SmartRecommendations
