'use client';

import { useState, useTransition } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Wallet, Star, Wifi, WifiOff, TrendingUp, Clock } from 'lucide-react';
import { updateTutorStatus, type TutorStats } from '@/app/actions/tutor';

interface StatsOverviewProps {
  stats: TutorStats;
}

const cardEase: [number, number, number, number] = [0, 0, 0.2, 1];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: cardEase },
  }),
};

export function StatsOverview({ stats }: StatsOverviewProps) {
  const [isAvailable, setIsAvailable] = useState(stats.isAvailable);
  const [isPending, startTransition] = useTransition();

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);

    startTransition(async () => {
      const result = await updateTutorStatus(newStatus);
      if (!result.success) {
        setIsAvailable(!newStatus);
        console.error('Failed to update status:', result.error);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString()}`;
  };

  const cards = [
    {
      label: 'Total Earnings',
      value: formatCurrency(stats.totalEarnings),
      sub: (
        <span className="flex items-center gap-1">
          <TrendingUp size={12} />
          {stats.totalHours} sessions completed
        </span>
      ),
      subColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30',
      icon: <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      label: 'Average Rating',
      value: (
        <>
          {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
          <span className="text-lg text-slate-400 dark:text-slate-500">/5.0</span>
        </>
      ),
      sub: (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              className={
                star <= Math.round(stats.averageRating)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
              }
            />
          ))}
        </div>
      ),
      subColor: '',
      iconBg: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30',
      icon: <Star className="h-6 w-6 text-amber-500 dark:text-amber-400" />,
    },
    {
      label: 'Active Requests',
      value: stats.activeRequests,
      sub: (
        <span className="flex items-center gap-1">
          <Clock size={12} />
          Pending approval
        </span>
      ),
      subColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30',
      icon: <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="card-stat group"
        >
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {card.value}
              </p>
              <div className={`mt-1 flex flex-wrap items-center gap-1 text-xs ${card.subColor}`}>{card.sub}</div>
            </div>
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12 ${card.iconBg}`}>
              {card.icon}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Availability Toggle Card */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className="card-stat group"
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Availability
            </p>
            <p className={`text-lg font-semibold mt-1 transition-colors ${
              isAvailable
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              {isAvailable ? 'Online' : 'Offline'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAvailable ? 'Accepting new students' : 'Not visible to students'}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-center gap-2.5">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm group-hover:scale-110 ${
              isAvailable
                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30'
                : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600'
            }`}>
              {isAvailable ? (
                <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              )}
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isAvailable
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/25'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              role="switch"
              aria-checked={isAvailable}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm ${
                  isAvailable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
