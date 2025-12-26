'use client';

import { useState, useTransition } from 'react';
import { Wallet, Star, Wifi, WifiOff, TrendingUp, Clock } from 'lucide-react';
import { updateTutorStatus, type TutorStats } from '@/app/actions/tutor';

interface StatsOverviewProps {
  stats: TutorStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const [isAvailable, setIsAvailable] = useState(stats.isAvailable);
  const [isPending, startTransition] = useTransition();

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus); // Optimistic update
    
    startTransition(async () => {
      const result = await updateTutorStatus(newStatus);
      if (!result.success) {
        // Revert on error
        setIsAvailable(!newStatus);
        console.error('Failed to update status:', result.error);
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Earnings Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Earnings
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(stats.totalEarnings)}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp size={12} />
              {stats.totalHours} sessions completed
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Rating Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Average Rating
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
              <span className="text-lg text-slate-400 dark:text-slate-500">/5.0</span>
            </p>
            <div className="flex items-center gap-0.5 mt-1">
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
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Star className="h-6 w-6 text-amber-500 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Hours Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Active Requests
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.activeRequests}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <Clock size={12} />
              Pending approval
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Availability Toggle Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Availability
            </p>
            <p className={`text-lg font-semibold mt-1 ${
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
          <div className="flex flex-col items-center gap-2">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              isAvailable 
                ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              {isAvailable ? (
                <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              )}
            </div>
            {/* Toggle Switch */}
            <button
              onClick={handleToggleAvailability}
              disabled={isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isAvailable 
                  ? 'bg-emerald-600' 
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              role="switch"
              aria-checked={isAvailable}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  isAvailable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
