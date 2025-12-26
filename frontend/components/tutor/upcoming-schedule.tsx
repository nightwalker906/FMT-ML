'use client';

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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
            <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-1">
            No upcoming sessions
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Accepted sessions will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <img
                src={session.studentAvatar}
                alt={session.studentName}
                className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-600 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">
                    {session.studentName}
                  </h4>
                  {isToday(session.scheduledAt) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      Today
                    </span>
                  )}
                  {isTomorrow(session.scheduledAt) && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      Tomorrow
                    </span>
                  )}
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
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
          </div>
        ))}
      </div>
    </div>
  );
}
