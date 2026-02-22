'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementsShowcase } from '@/components/achievements/AchievementsShowcase';
import {
  BookOpen,
  Clock,
  TrendingUp,
  Users,
  Star,
  Calendar,
  Award,
  Target,
  Flame,
  ArrowRight,
  Loader2,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { OnlineDot } from '@/components/OnlineStatusIndicator';

// -- Types --
interface Booking {
  id: string;
  subject: string;
  status: string;
  scheduled_at: string;
  notes?: string;
  tutor_id: string;
  duration_minutes?: number;
  created_at: string;
}

interface TutorInfo {
  id: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  is_online?: boolean;
}

interface SubjectStat {
  name: string;
  count: number;
  hours: number;
  percentage: number;
  color: string;
}

interface WeeklyStat {
  label: string;
  hours: number;
  sessions: number;
}

// Palette for subject bars
const COLORS = [
  'bg-primary-50 dark:bg-primary-950/300',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-amber-500',
];

export default function LearningProgressPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [tutorMap, setTutorMap] = useState<Record<string, TutorInfo>>({});
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [preferredSubjects, setPreferredSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchProgressData();
  }, [user]);

  async function fetchProgressData() {
    setLoading(true);

    // 1. All bookings (any status)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_id', user!.id)
      .order('scheduled_at', { ascending: false });

    const all = bookings || [];
    setAllBookings(all);
    setCompletedBookings(all.filter((b) => b.status === 'completed'));

    // 2. Tutor profiles
    const tutorIds = [...new Set(all.map((b) => b.tutor_id))];
    if (tutorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar, is_online')
        .in('id', tutorIds);

      const map: Record<string, TutorInfo> = {};
      profiles?.forEach((p) => (map[p.id] = p));
      setTutorMap(map);
    }

    // 3. Student profile — goals & preferred subjects
    const { data: studentProfile } = await supabase
      .from('students')
      .select('learning_goals, preferred_subjects')
      .eq('profile_id', user!.id)
      .single();

    if (studentProfile) {
      setLearningGoals(studentProfile.learning_goals || []);
      setPreferredSubjects(studentProfile.preferred_subjects || []);
    }

    setLoading(false);
  }

  // -- Derived stats --
  const totalSessions = completedBookings.length;
  const totalHours = useMemo(
    () =>
      completedBookings.reduce((sum, b) => sum + (b.duration_minutes || 60) / 60, 0),
    [completedBookings]
  );
  const uniqueTutors = useMemo(
    () => new Set(allBookings.map((b) => b.tutor_id)).size,
    [allBookings]
  );

  // -- Subject breakdown --
  const subjectStats: SubjectStat[] = useMemo(() => {
    const map = new Map<string, { count: number; hours: number }>();
    completedBookings.forEach((b) => {
      const subj = b.subject || 'Unknown';
      const prev = map.get(subj) || { count: 0, hours: 0 };
      map.set(subj, {
        count: prev.count + 1,
        hours: prev.hours + (b.duration_minutes || 60) / 60,
      });
    });

    const total = completedBookings.length || 1;
    return Array.from(map.entries())
      .map(([name, s], i) => ({
        name,
        count: s.count,
        hours: Math.round(s.hours * 10) / 10,
        percentage: Math.round((s.count / total) * 100),
        color: COLORS[i % COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [completedBookings]);

  // -- Weekly activity (last 8 weeks) --
  const weeklyStats: WeeklyStat[] = useMemo(() => {
    const weeks: WeeklyStat[] = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekBookings = completedBookings.filter((b) => {
        const d = new Date(b.scheduled_at);
        return d >= weekStart && d < weekEnd;
      });

      const label =
        i === 0
          ? 'This week'
          : i === 1
            ? 'Last week'
            : `${i}w ago`;

      weeks.push({
        label,
        sessions: weekBookings.length,
        hours: Math.round(
          weekBookings.reduce((s, b) => s + (b.duration_minutes || 60) / 60, 0) * 10
        ) / 10,
      });
    }
    return weeks;
  }, [completedBookings]);

  const maxWeeklyHours = Math.max(...weeklyStats.map((w) => w.hours), 1);

  // -- Streak calculation --
  const currentStreak = useMemo(() => {
    if (completedBookings.length === 0) return 0;

    const sessionDays = new Set(
      completedBookings.map((b) =>
        new Date(b.scheduled_at).toISOString().split('T')[0]
      )
    );

    const sortedDays = Array.from(sessionDays).sort().reverse();
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = checkDate.toISOString().split('T')[0];

      if (sessionDays.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }, [completedBookings]);

  // -- Achievement system --
  const achievementStats = useMemo(() => {
    if (loading) return null;
    return {
      totalSessions,
      currentStreak,
      totalHours,
      uniqueSubjects: subjectStats.length,
      uniqueTutors,
    };
  }, [loading, totalSessions, currentStreak, totalHours, subjectStats, uniqueTutors]);

  const { achievements } = useAchievements(achievementStats, user?.id);

  // -- Recent tutors --
  const recentTutors = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; sessions: number; lastSession: string; avatar?: string; isOnline?: boolean }[] = [];

    for (const b of allBookings) {
      if (!seen.has(b.tutor_id)) {
        seen.add(b.tutor_id);
        const info = tutorMap[b.tutor_id];
        const name = info
          ? `${info.first_name} ${info.last_name || ''}`.trim()
          : 'Unknown Tutor';
        const tutorSessions = allBookings.filter((x) => x.tutor_id === b.tutor_id).length;
        result.push({
          id: b.tutor_id,
          name,
          sessions: tutorSessions,
          lastSession: b.scheduled_at,
          avatar: info?.avatar,
          isOnline: info?.is_online,
        });
      }
      if (result.length >= 5) break;
    }
    return result;
  }, [allBookings, tutorMap]);

  // -- Loading skeleton --
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
            >
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 mb-3" />
              <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700 mb-1" />
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 h-64" />
          <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-primary-600 dark:text-primary-400 dark:text-teal-400" />
          My Learning Progress
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Track your sessions, subjects, and growth over time
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-primary-600 dark:text-primary-400 dark:text-teal-400" />}
          bgIcon="bg-primary-100 dark:bg-primary-900/30 dark:bg-teal-900/30"
          value={totalSessions}
          label="Sessions Completed"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          bgIcon="bg-blue-100 dark:bg-blue-900/30"
          value={`${Math.round(totalHours * 10) / 10}h`}
          label="Total Hours Learned"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
          bgIcon="bg-purple-100 dark:bg-purple-900/30"
          value={uniqueTutors}
          label="Tutors Worked With"
        />
        <StatCard
          icon={<Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
          bgIcon="bg-orange-100 dark:bg-orange-900/30"
          value={`${currentStreak}d`}
          label="Current Streak"
        />
      </div>

      {/* 🏆 Achievements Section */}
      <AchievementsShowcase achievements={achievements} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400 dark:text-teal-400" />
            Weekly Activity
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Hours studied per week (last 8 weeks)
          </p>

          {totalSessions === 0 ? (
            <EmptyChartPlaceholder message="Complete your first session to see weekly activity" />
          ) : (
            <div className="flex items-end gap-2 h-40">
              {weeklyStats.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {w.hours > 0 ? `${w.hours}h` : ''}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                    <div
                      className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-teal-600 to-teal-400 dark:from-teal-500 dark:to-teal-300 transition-all duration-500"
                      style={{
                        height: `${Math.max((w.hours / maxWeeklyHours) * 100, w.hours > 0 ? 8 : 2)}%`,
                        minHeight: '2px',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Subject Breakdown
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Sessions by subject
          </p>

          {subjectStats.length === 0 ? (
            <EmptyChartPlaceholder message="No completed sessions yet — book your first!" />
          ) : (
            <div className="space-y-3">
              {subjectStats.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {s.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {s.count} sessions · {s.hours}h
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all duration-700`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tutors */}
        <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Your Tutors
            </h2>
            <Link
              href="/student/search"
              className="text-sm text-primary-600 dark:text-primary-400 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              Find more <ArrowRight size={14} />
            </Link>
          </div>

          {recentTutors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No tutors yet. Book your first session!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTutors.map((t) => (
                <Link
                  key={t.id}
                  href={`/student/tutors/${t.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={t.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=0d9488&color=fff`}
                      alt={t.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <OnlineDot isOnline={t.isOnline ?? false} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:text-primary-400 dark:group-hover:text-teal-400 transition-colors">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.sessions} session{t.sessions !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-400 group-hover:text-primary-600 dark:text-primary-400 dark:group-hover:text-teal-400 transition-colors"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Learning Goals */}
        <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Learning Goals
            </h2>
            <Link
              href="/student/settings"
              className="text-sm text-primary-600 dark:text-primary-400 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              Edit <ArrowRight size={14} />
            </Link>
          </div>

          {learningGoals.length === 0 && preferredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Set your learning goals to track progress
              </p>
              <Link
                href="/student/settings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors text-sm font-medium"
              >
                <Target size={16} />
                Set Goals
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preferred subjects */}
              {preferredSubjects.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Preferred Subjects
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preferredSubjects.map((subj) => {
                      const completed = subjectStats.find(
                        (s) => s.name.toLowerCase() === subj.toLowerCase()
                      );
                      return (
                        <span
                          key={subj}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                            completed
                              ? 'bg-primary-100 dark:bg-primary-900/30 dark:bg-teal-900/30 text-primary-700 dark:text-primary-300 dark:text-teal-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {completed && <CheckCircle size={14} />}
                          {subj}
                          {completed && (
                            <span className="text-xs opacity-70">
                              ({completed.count})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Goals list */}
              {learningGoals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Goals
                  </p>
                  <ul className="space-y-2">
                    {learningGoals.map((goal, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                      >
                        <Award
                          size={16}
                          className="text-amber-500 flex-shrink-0 mt-0.5"
                        />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Completed Sessions */}
      <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400 dark:text-teal-400" />
            Recent Sessions
          </h2>
          <Link
            href="/student/schedule"
            className="text-sm text-primary-600 dark:text-primary-400 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {completedBookings.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">
              No completed sessions yet
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Book your first session to start tracking progress!
            </p>
            <Link
              href="/student/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors text-sm font-medium"
            >
              Find a Tutor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                    Tutor
                  </th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                    Subject
                  </th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                    Duration
                  </th>
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {completedBookings.slice(0, 10).map((b) => {
                  const tutor = tutorMap[b.tutor_id];
                  const tutorName = tutor
                    ? `${tutor.first_name} ${tutor.last_name || ''}`.trim()
                    : 'Unknown';
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {new Date(b.scheduled_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/student/tutors/${b.tutor_id}`}
                          className="text-slate-900 dark:text-white hover:text-primary-600 dark:text-primary-400 dark:hover:text-teal-400 font-medium transition-colors"
                        >
                          {tutorName}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                          {b.subject}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {b.duration_minutes || 60} min
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                          <CheckCircle size={12} />
                          Completed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Stat Card sub-component --
function StatCard({
  icon,
  bgIcon,
  value,
  label,
}: {
  icon: React.ReactNode;
  bgIcon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${bgIcon}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// -- Empty state for charts --
function EmptyChartPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center">
      <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
