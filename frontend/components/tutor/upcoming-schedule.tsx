'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, User } from 'lucide-react';
import type { UpcomingSession } from '@/app/actions/tutor';

interface UpcomingScheduleProps {
  sessions: UpcomingSession[];
}

export function UpcomingSchedule({ sessions }: UpcomingScheduleProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateString: string) => {
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  if (sessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="card p-6"
      >
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mb-3 shadow-sm">
            <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-1">
            No upcoming sessions
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Accepted sessions will appear here
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card overflow-hidden"
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {sessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`p-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group ${
              isToday(session.scheduledAt)
                ? 'bg-primary-50/50 dark:bg-primary-950/20 border-l-2 border-l-primary-500'
                : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={session.studentAvatar}
                  alt={session.studentName}
                  className="h-10 w-10 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-600 group-hover:border-primary-300 dark:group-hover:border-primary-600 transition-colors"
                />
                {isToday(session.scheduledAt) && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 animate-pulse-soft" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">
                    {session.studentName}
                  </h4>
                  {isToday(session.scheduledAt) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30 text-emerald-700 dark:text-emerald-300 shadow-sm">
                      Today
                    </span>
                  )}
                  {isTomorrow(session.scheduledAt) && (
                    <span className="badge-primary">
                      Tomorrow
                    </span>
                  )}
                </div>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                  {session.subject}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(session.scheduledAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatTime(session.scheduledAt)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
