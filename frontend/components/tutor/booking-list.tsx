'use client';

import { useState, useTransition } from 'react';
import { Check, X, Calendar, Clock, BookOpen, Inbox } from 'lucide-react';
import { respondToBooking, type BookingRequest } from '@/app/actions/tutor';

interface BookingListProps {
  bookings: BookingRequest[];
}

export function BookingList({ bookings: initialBookings }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const handleRespond = (bookingId: string, action: 'accept' | 'reject') => {
    // Add to pending
    setPendingIds((prev) => new Set([...prev, bookingId]));

    startTransition(async () => {
      const result = await respondToBooking(bookingId, action);
      
      if (result.success) {
        // Remove from list on success
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      } else {
        console.error('Failed to respond:', result.error);
      }
      
      // Remove from pending
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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No new requests pending
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            When students request tutoring sessions with you, they'll appear here for your review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const isProcessing = pendingIds.has(booking.id);
        
        return (
          <div
            key={booking.id}
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-all hover:shadow-md ${
              isProcessing ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Student Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={booking.studentAvatar}
                  alt={booking.studentName}
                  className="h-12 w-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600 flex-shrink-0"
                />
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
              <div className="hidden sm:flex flex-col items-start gap-1 flex-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
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
              <div className="hidden md:block">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {getRelativeTime(booking.scheduledAt)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRespond(booking.id, 'accept')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                >
                  <Check size={16} />
                  <span className="hidden sm:inline">Accept</span>
                </button>
                <button
                  onClick={() => handleRespond(booking.id, 'reject')}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                >
                  <X size={16} />
                  <span className="hidden sm:inline">Reject</span>
                </button>
              </div>
            </div>

            {/* Notes (if any) - Mobile subject info */}
            <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-sm mb-1">
                <BookOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
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

            {booking.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Note: </span>
                  {booking.notes}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
