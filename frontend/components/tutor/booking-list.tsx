'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Calendar, Clock, BookOpen, Inbox, MessageSquare } from 'lucide-react';
import { respondToBooking, type BookingRequest } from '@/app/actions/tutor';

interface BookingListProps {
  bookings: BookingRequest[];
}

export function BookingList({ bookings: initialBookings }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleRespond = (bookingId: string, action: 'accept' | 'reject') => {
    setPendingIds((prev) => new Set([...prev, bookingId]));

    startTransition(async () => {
      const result = await respondToBooking(bookingId, action);

      if (result.success) {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      } else {
        console.error('Failed to respond:', result.error);
      }

      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    });
  };

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

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return formatDate(dateString);
  };

  if (bookings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="card p-12"
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mb-4 shadow-sm">
            <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No new requests pending
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            When students request tutoring sessions with you, they&apos;ll appear here for your review.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {bookings.map((booking, index) => {
          const isProcessing = pendingIds.has(booking.id);

          return (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              layout
              className={`card group p-4 transition-all sm:p-5 ${
                isProcessing ? 'opacity-60 scale-[0.99]' : ''
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Student Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={booking.studentAvatar}
                      alt={booking.studentName}
                      className="h-12 w-12 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-600 group-hover:border-primary-300 dark:group-hover:border-primary-600 transition-colors"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                      {booking.studentName}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      New tutoring request
                    </p>
                  </div>
                </div>

                {/* Subject & Schedule */}
                <div className="hidden flex-1 flex-col items-start gap-1 md:flex">
                  <div className="flex items-center gap-1.5 text-sm">
                    <BookOpen size={14} className="text-primary-600 dark:text-primary-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {booking.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(booking.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTime(booking.scheduledAt)}
                    </span>
                  </div>
                </div>

                {/* Time Badge */}
                <div className="hidden lg:block">
                  <span className="badge-primary">
                    {getRelativeTime(booking.scheduledAt)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRespond(booking.id, 'accept')}
                    disabled={isProcessing}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:from-emerald-400 disabled:to-emerald-400 dark:focus-visible:ring-offset-slate-900 md:w-auto"
                  >
                    <Check size={16} />
                    <span>Accept</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRespond(booking.id, 'reject')}
                    disabled={isProcessing}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:ring-offset-slate-900 md:w-auto"
                  >
                    <X size={16} />
                    <span>Decline</span>
                  </motion.button>
                </div>
              </div>

              {/* Mobile subject info */}
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700/50 md:hidden">
                <div className="flex items-center gap-1.5 text-sm mb-1">
                  <BookOpen size={14} className="text-primary-600 dark:text-primary-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {booking.subject}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(booking.scheduledAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatTime(booking.scheduledAt)}
                  </span>
                  <span className="badge-primary">{getRelativeTime(booking.scheduledAt)}</span>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">Note: </span>
                      {booking.notes}
                    </span>
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
