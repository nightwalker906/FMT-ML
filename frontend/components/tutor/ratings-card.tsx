'use client';

import { Star, TrendingUp } from 'lucide-react';
import { RatingStats } from '@/app/actions/tutor';

interface RatingsCardProps {
  stats: RatingStats;
}

export function RatingsCard({ stats }: RatingsCardProps) {
  const StatItem = ({
    label,
    value,
    max = 5,
  }: {
    label: string;
    value: number;
    max?: number;
  }) => (
    <div className="flex flex-col">
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-slate-500">/ {max}</span>
      </div>
    </div>
  );

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="card space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="text-yellow-500 fill-yellow-500" size={20} />
            Student Ratings
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {stats.totalRatings} {stats.totalRatings === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        <div className={`text-4xl font-bold ${getRatingColor(stats.avgOverall)}`}>
          {stats.avgOverall.toFixed(1)}
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-200 dark:border-slate-700">
        <StatItem label="Knowledge" value={stats.avgKnowledge} />
        <StatItem label="Teaching Style" value={stats.avgTeachingStyle} />
        <StatItem label="Communication" value={stats.avgCommunication} />
        <div className="flex flex-col">
          <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
          <div className="flex items-center gap-2 mt-1">
            <TrendingUp size={20} className={getRatingColor(stats.avgOverall)} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {stats.totalRatings > 0 ? 'Active' : 'No ratings yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {stats.recentRatings.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="font-medium text-slate-900 dark:text-white">Recent Reviews</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recentRatings.map((review) => (
              <div
                key={review.id}
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm text-slate-900 dark:text-white">
                    {review.studentName}
                  </span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.round(review.overall)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }
                      />
                    ))}
                  </div>
                </div>
                {review.review && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {review.review}
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No ratings state */}
      {stats.totalRatings === 0 && (
        <div className="py-8 text-center">
          <Star className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No ratings yet. Complete sessions to receive reviews!
          </p>
        </div>
      )}
    </div>
  );
}
