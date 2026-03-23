import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getTutorStats,
  getBookingRequests,
  getUpcomingSessions,
} from '@/app/actions/tutor';
import { StatsOverview } from '@/components/tutor/stats-overview';
import { BookingList } from '@/components/tutor/booking-list';
import { UpcomingSchedule } from '@/components/tutor/upcoming-schedule';
import { DollarSign, Bell, CalendarDays, Settings } from 'lucide-react';
import Link from 'next/link';

// Loading skeleton for stats
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="card-stat animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-8 w-20 skeleton rounded" />
              <div className="h-3 w-28 skeleton rounded" />
            </div>
            <div className="h-12 w-12 rounded-xl skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for bookings
function BookingsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="card-stat p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-3 w-24 skeleton rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 skeleton rounded-xl" />
              <div className="h-9 w-20 skeleton rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for schedule
function ScheduleLoadingSkeleton() {
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-3 w-20 skeleton rounded" />
              <div className="h-3 w-32 skeleton rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Server component to fetch stats
async function StatsSection() {
  const result = await getTutorStats();

  if (!result.success || !result.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-600">Failed to load stats</p>
      </div>
    );
  }

  return <StatsOverview stats={result.data} />;
}

// Server component to fetch bookings
async function BookingsSection() {
  const result = await getBookingRequests();

  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-600">Failed to load bookings</p>
      </div>
    );
  }

  return <BookingList bookings={result.data || []} />;
}

// Server component to fetch upcoming sessions
async function ScheduleSection() {
  const result = await getUpcomingSessions();

  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-600">Failed to load schedule</p>
      </div>
    );
  }

  return <UpcomingSchedule sessions={result.data || []} />;
}

export default async function TutorDashboardPage() {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get profile data to check if complete
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, user_type')
    .eq('id', user.id)
    .single();

  // Get tutor record to check if profile is complete
  const { data: tutor } = await supabase
    .from('tutors')
    .select('hourly_rate, profile_id')
    .eq('profile_id', user.id)
    .single();

  // Redirect to complete profile if not complete
  if (!profile?.first_name || !tutor) {
    redirect('/tutor/complete-profile');
  }

  const hourlyRate = tutor?.hourly_rate || 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl">
              Dashboard
            </h1>
            <span className="badge-primary font-semibold">
              <DollarSign size={14} />
              R{hourlyRate}/hr
            </span>
          </div>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Manage your tutoring business and track your progress
          </p>
        </div>
        <Link
          href="/tutor/settings"
          className="btn-secondary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <Settings size={16} />
          Edit Profile
        </Link>
      </div>

      {/* Stats Overview */}
      <section>
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <StatsSection />
        </Suspense>
      </section>

      {/* Main Grid: Requests + Schedule */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:gap-8">
        {/* Incoming Requests - Takes 2 columns */}
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title">
              <Bell size={20} className="text-primary-600 dark:text-primary-400" />
              Incoming Requests
            </h2>
            <Link
              href="/tutor/requests"
              className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              View All
            </Link>
          </div>
          <Suspense fallback={<BookingsLoadingSkeleton />}>
            <BookingsSection />
          </Suspense>
        </section>

        {/* Upcoming Schedule - Takes 1 column */}
        <section className="lg:col-span-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title">
              <CalendarDays size={20} className="text-primary-600 dark:text-primary-400" />
              Upcoming Schedule
            </h2>
          </div>
          <Suspense fallback={<ScheduleLoadingSkeleton />}>
            <ScheduleSection />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
