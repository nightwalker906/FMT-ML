'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  BookOpen,
  Target,
  Zap,
  Award,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

/**
 * StudyPlanTimeline Component
 * 
 * A beautiful, animated vertical timeline component for displaying AI-generated study plans.
 * Features:
 * - Staggered entrance animations
 * - Glassmorphism card design
 * - Expandable week details with smooth transitions
 * - Interactive checklist for action items
 * - Gradient borders and hover effects
 * - Empty and loading states
 */

const StudyPlanTimeline = ({ planData = [], isLoading = false, method = 'unknown' }) => {
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  // Skeleton loader for loading state
  const SkeletonLoader = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="relative flex gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          {/* Left timeline section */}
          <div className="flex flex-col items-center min-w-fit">
            {/* Week badge skeleton */}
            <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full animate-pulse" />
            
            {/* Timeline line skeleton */}
            {i < 3 && (
              <div className="w-1 h-24 bg-slate-200 dark:bg-slate-700 mt-4 animate-pulse" />
            )}
          </div>

          {/* Card skeleton */}
          <div className="flex-1 mt-2">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6 space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
              <div className="flex gap-2">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Empty state
  if (!isLoading && (!planData || planData.length === 0)) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="mb-6"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <BookOpen className="w-20 h-20 text-blue-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Ready to Plan Your Success?
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          Create a personalized study roadmap by telling us your goals and areas to improve.
        </p>
      </motion.div>
    );
  }

  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Get color scheme for week badges
  const getWeekColor = (week) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600',
      'from-cyan-500 to-cyan-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-rose-500 to-rose-600',
      'from-violet-500 to-violet-600',
    ];
    return colors[week % colors.length];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40, x: 20 },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 50,
        damping: 15,
      },
    },
  };

  const toggleWeek = (week) => {
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  const toggleCheckItem = (itemKey) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  return (
    <motion.div
      className="relative w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              {planData.length}-Week Plan
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Your Personalized Learning Roadmap
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {method === 'mock_fallback' && (
              <span className="text-amber-600 dark:text-amber-400">
                ⚡ Template plan (AI service unavailable)
              </span>
            )}
            {method === 'ollama' && (
              <span className="text-green-600 dark:text-green-400">
                🎯 Generated with Ollama
              </span>
            )}
            {method === 'huggingface' && (
              <span className="text-green-600 dark:text-green-400">
                🎯 Generated with Hugging Face
              </span>
            )}
          </p>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="space-y-0 relative">
        {/* Central vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full" />

        {/* Week cards */}
        {planData.map((week, index) => {
          const isExpanded = expandedWeek === week.week;
          const weekKey = `week-${week.week}`;

          return (
            <motion.div
              key={weekKey}
              variants={itemVariants}
              className="relative flex gap-6 mb-8"
            >
              {/* Left side: Week badge and timeline */}
              <div className="flex flex-col items-center min-w-fit relative z-10">
                {/* Week badge - animated gradient border */}
                <motion.div
                  className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${getWeekColor(
                    week.week
                  )} flex items-center justify-center shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {/* Animated glow for active week */}
                  {index === 0 && (
                    <motion.div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${getWeekColor(
                        week.week
                      )} opacity-50 blur-lg`}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <span className="text-white font-bold text-lg relative z-10">
                    {week.week}
                  </span>
                </motion.div>

                {/* Timeline line between cards */}
                {index < planData.length - 1 && (
                  <motion.div
                    className="w-1 bg-gradient-to-b from-current to-transparent mt-4 flex-1 min-h-[100px]"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 120, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.15, duration: 0.6 }}
                  />
                )}
              </div>

              {/* Right side: Card content */}
              <div className="flex-1 mt-2">
                <motion.button
                  onClick={() => toggleWeek(week.week)}
                  className="w-full text-left group"
                  whileHover="hover"
                  initial="normal"
                >
                  {/* Card container with glassmorphism */}
                  <motion.div
                    className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg transition-all"
                    variants={{
                      normal: { boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)' },
                      hover: {
                        boxShadow:
                          isExpanded || index === 0
                            ? '0 20px 40px rgba(59, 130, 246, 0.3)'
                            : '0 12px 20px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    {/* Gradient border effect on hover */}
                    {(isExpanded || index === 0) && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px] pointer-events-none -z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900" />
                      </motion.div>
                    )}

                    {/* Card header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Theme badge */}
                        <motion.div className="inline-flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {week.theme}
                          </span>
                        </motion.div>

                        {/* Topic */}
                        <motion.h3
                          className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                          layout
                        >
                          {week.topic}
                        </motion.h3>

                        {/* Learning objectives as pills */}
                        <motion.div className="flex flex-wrap gap-2 mb-4">
                          {week.learning_objectives?.slice(0, 2).map((obj, i) => (
                            <motion.span
                              key={i}
                              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.3 + i * 0.1 }}
                            >
                              {obj}
                            </motion.span>
                          ))}
                          {week.learning_objectives?.length > 2 && (
                            <span className="text-xs px-3 py-1 bg-slate-200 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 rounded-full font-medium">
                              +{week.learning_objectives.length - 2} more
                            </span>
                          )}
                        </motion.div>

                        {/* Milestone preview */}
                        <motion.div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 mb-4">
                          <Award className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{week.milestone}</span>
                        </motion.div>
                      </div>

                      {/* Expand button */}
                      <motion.div
                        className="ml-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-6"
                        >
                          {/* Learning Objectives */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                          >
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              Learning Objectives
                            </h4>
                            <ul className="space-y-2">
                              {week.learning_objectives?.map((obj, i) => (
                                <motion.li
                                  key={i}
                                  className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.15 + i * 0.05 }}
                                >
                                  <ArrowRight className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                                  {obj}
                                </motion.li>
                              ))}
                            </ul>
                          </motion.div>

                          {/* Action Items Checklist */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              Action Items
                            </h4>
                            <div className="space-y-2">
                              {week.action_items?.map((item, i) => {
                                const itemKey = `${weekKey}-item-${i}`;
                                const isChecked = checkedItems[itemKey];
                                return (
                                  <motion.button
                                    key={i}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toggleCheckItem(itemKey);
                                    }}
                                    className="w-full text-left group/item"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                  >
                                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                      <motion.div
                                        animate={{
                                          scale: isChecked ? 1.1 : 1,
                                          backgroundColor: isChecked
                                            ? 'rgb(34, 197, 94)'
                                            : 'transparent',
                                        }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                        className="mt-1 flex-shrink-0"
                                      >
                                        {isChecked ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-slate-400 group-hover/item:text-slate-500 dark:group-hover/item:text-slate-300" />
                                        )}
                                      </motion.div>
                                      <span
                                        className={`text-sm transition-all ${
                                          isChecked
                                            ? 'text-slate-500 dark:text-slate-500 line-through'
                                            : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        {item}
                                      </span>
                                    </div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>

                          {/* Resources */}
                          {week.resources && week.resources.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-purple-500" />
                                Recommended Resources
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {week.resources.map((resource, i) => (
                                  <motion.span
                                    key={i}
                                    className="text-xs px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-medium"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.35 + i * 0.05 }}
                                  >
                                    {resource}
                                  </motion.span>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer stats */}
      <motion.div
        className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: planData.length * 0.15 + 0.3 }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {planData.length}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Weeks</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {planData.reduce((sum, w) => sum + (w.action_items?.length || 0), 0)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Actions</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
              {planData.reduce((sum, w) => sum + (w.learning_objectives?.length || 0), 0)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Objectives</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StudyPlanTimeline;
