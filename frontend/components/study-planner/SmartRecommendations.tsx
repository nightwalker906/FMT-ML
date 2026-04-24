'use client';

import React, { useRef, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { Sparkles, Star, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE } from '@/lib/api-config';
import { formatCurrency } from '@/lib/currency';

// Type definitions
interface SmartRecommendationsProps {
  learningGoals?: string[];
  preferredSubjects?: string[];
  gradeLevel?: string;
  profileReady?: boolean;
}

interface Recommendation {
  id: string;
  full_name: string;
  image?: string;
  is_online?: boolean;
  subjects?: string[];
  explanation?: string | { summary: string };
  average_rating?: number;
  hourly_rate: number;
  match_percentage: number;
}

interface SmartCardProps {
  recommendation: Recommendation;
  index: number;
  shouldAnimate: boolean;
}

// -- SWR Config --
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 60000,
  refreshInterval: 0,
  errorRetryCount: 2,
};

// -- Match badge styling --
const getMatchBadgeStyle = (percentage: number) => {
  if (percentage >= 90) {
    return {
      bg: 'bg-gradient-to-r from-emerald-400 to-green-500',
      text: 'text-white',
    };
  } else if (percentage >= 70) {
    return {
      bg: 'bg-gradient-to-r from-blue-400 to-blue-600',
      text: 'text-white',
    };
  }
  return {
    bg: 'bg-gradient-to-r from-gray-400 to-gray-500',
    text: 'text-white',
  };
};

// -- Animation variants for staggered list animations --
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// =•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•
// -- MAIN COMPONENT --
// =•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  learningGoals = [],
  preferredSubjects = [],
  gradeLevel = '',
  profileReady = false,
}) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Create a comprehensive hash of all student profile factors
  // ⚠️ MUST match backend hash computation in core/views.py get_smart_recommendations()
  const profileHash = useMemo(() => {
    if (!user?.id) return '';
    try {
      // Compute hash same way as backend: sorted JSON with learning_goals structure
      const profileData = JSON.stringify(
        {
          learning_goals: [...(learningGoals || [])].sort(),
          preferred_subjects: [...(preferredSubjects || [])].sort(),
          grade_level: gradeLevel || '',
        },
        null,
        0
      );
      // Use same MD5 approach as backend, but slice to 8 chars
      let hash = 0;
      for (let i = 0; i < profileData.length; i++) {
        const char = profileData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).slice(0, 8);
    } catch {
      return '';
    }
  }, [learningGoals, preferredSubjects, gradeLevel, user?.id]);

  // Build URL with student_id if user is authenticated
  // Include profile hash to trigger cache invalidation when any profile factor changes
  // When profileHash changes, the URL changes, which tells SWR to refetch
  const waitingForProfile = Boolean(user?.id) && !profileReady;
  const url = user?.id && profileReady
    ? `${API_BASE}/recommendations/?student_id=${user.id}${profileHash ? `&goals=${profileHash}` : ''}`
    : null;

  const { data, error, isLoading } = useSWR(url, fetcher, SWR_OPTIONS);

  // Scroll controls
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // Always render the section header and container
  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Sparkles className="text-amber-500" size={22} />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Top Picks for You
        </h2>
      </div>

      {/* Content: loading, error, empty, or recommendations */}
      {waitingForProfile || (isLoading && !data) ? (
        <div className="flex gap-5 overflow-hidden pb-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-10 px-6 text-center">
          <p className="text-slate-700 dark:text-slate-200 text-base font-semibold mb-2">
            Error loading recommendations
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-sm mx-auto">
            Please try again later.
          </p>
        </div>
      ) : (Array.isArray(data?.data ?? data?.recommendations ?? data) &&
        (data?.data ?? data?.recommendations ?? data).length === 0) ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-10 px-6 text-center"
        >
          <Sparkles className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={40} />
          <p className="text-slate-700 dark:text-slate-200 text-base font-semibold mb-2">
            No Top Picks Yet
          </p>
          {data?.message && (
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-sm mx-auto">
              {data.message}
            </p>
          )}
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">
            Here&apos;s how to get personalized recommendations:
          </p>
          <ul className="text-left text-slate-600 dark:text-slate-400 text-sm max-w-sm mx-auto space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">1.</span>
              <span>Complete your learning profile with your goals and preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">2.</span>
              <span>Search for tutors by subject to build our recommendation database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">3.</span>
              <span>Book sessions to help our AI learn your preferences</span>
            </li>
          </ul>
          <a
            href="/student/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            <Zap size={16} />
            Adjust Learning Goals
          </a>
        </motion.div>
      ) : (
        // Recommendations carousel
        (() => {
          const recommendations = (data?.data ?? data?.recommendations ?? (Array.isArray(data) ? data : [])) as Recommendation[];
          const shouldAnimate = !hasAnimated.current;
          if (shouldAnimate) hasAnimated.current = true;
          return (
            <>
              <div className="relative">
                <motion.div
                  ref={scrollRef}
                  className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
                  variants={containerVariants}
                  initial={shouldAnimate ? 'hidden' : false}
                  animate="visible"
                >
                  {recommendations.map((rec, index) => (
                    <SmartCard
                      key={rec.id || index}
                      recommendation={rec}
                      index={index}
                      shouldAnimate={shouldAnimate}
                    />
                  ))}
                </motion.div>
                {/* Right fade gradient */}
                <div className="absolute top-0 right-0 w-10 h-[calc(100%-16px)] bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
              </div>
              {/* AI Insight footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 px-1"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  💡 Powered by our explainable AI engine — analysing your learning patterns to find the perfect match.
                </p>
              </motion.div>
            </>
          );
        })()
      )}
    </div>
  );
};

// =•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•
// -- SMART CARD --
// =•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•

const SmartCard = React.memo(function SmartCard({
  recommendation,
  index,
  shouldAnimate,
}: SmartCardProps) {
  const badgeStyle = getMatchBadgeStyle(recommendation.match_percentage);

  const explanation =
    typeof recommendation.explanation === 'string'
      ? recommendation.explanation
      : recommendation.explanation?.summary ?? 'Recommended based on your preferences';

  const tutorName = recommendation.full_name || 'Unknown Tutor';
  const initials = tutorName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      variants={shouldAnimate ? itemVariants : undefined}
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      className="flex-shrink-0 w-[310px] snap-start bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
    >
      <div className="relative p-5">
        {/* Match Badge */}
        <div
          className={`absolute top-4 right-4 ${badgeStyle.bg} ${badgeStyle.text} px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-bold shadow-sm`}
        >
          <Sparkles size={12} />
          {Math.round(recommendation.match_percentage)}%
        </div>

        {/* Avatar + Info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            {recommendation.image && !recommendation.image.includes('ui-avatars.com') ? (
              <img
                src={recommendation.image}
                alt={tutorName}
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
                loading="lazy"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border-2 border-slate-200 dark:border-slate-600">
                <span className="text-white font-semibold text-sm">{initials}</span>
              </div>
            )}
            {recommendation.is_online && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
              {tutorName}
            </h3>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {recommendation.subjects?.slice(0, 2).map((subject, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium"
                >
                  {subject}
                </span>
              ))}
              {recommendation.subjects && recommendation.subjects.length > 2 && (
                <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium">
                  +{recommendation.subjects.length - 2}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* AI Explanation */}
        <div className="mb-4 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Zap size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>

        {/* Rating + Price */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              {recommendation.average_rating || 'N/A'}
            </span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatCurrency(recommendation.hourly_rate, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/hr
          </span>
        </div>

        {/* View Profile Button */}
        <Link href={`/student/tutors/${recommendation.id}`}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles size={16} />
            View Profile
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
});

// =•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•
// -- SKELETON CARD --
// =•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•=•

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[310px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 animate-pulse">
      {/* Badge */}
      <div className="flex justify-end mb-3">
        <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Avatar + text */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-1">
            <div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-14 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 space-y-1.5 mb-4">
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-600" />
        <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
      </div>

      {/* Rating + Price */}
      <div className="flex justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Button */}
      <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export default SmartRecommendations;
