'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  Search,
  Calendar,
  MessageSquare,
  BookOpen,
  Clock,
  Star,
  ArrowRight,
  Users,
} from 'lucide-react';

interface UpcomingSession {
  id: string;
  tutorName: string;
  tutorAvatar: string;
  subject: string;
  scheduledAt: string;
}

interface RecentTutor {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  rating: number;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recentTutors, setRecentTutors] = useState<RecentTutor[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    activeTutors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch upcoming sessions
      const { data: sessions } = await supabase
        .from('bookings')
        .select('id, scheduled_at, subject, tutor_id')
        .eq('student_id', user.id)
        .eq('status', 'accepted')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(3);

      if (sessions) {
        // Get tutor profiles for sessions
        const tutorIds = [...new Set(sessions.map((s) => s.tutor_id))];
        const { data: tutorProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', tutorIds);

        const profileMap = new Map(
          tutorProfiles?.map((p) => [p.id, p]) || []
        );

        setUpcomingSessions(
          sessions.map((s) => {
            const tutor = profileMap.get(s.tutor_id);
            const tutorName = tutor
              ? `${tutor.first_name} ${tutor.last_name || ''}`.trim()
              : 'Unknown Tutor';
            return {
              id: s.id,
              tutorName,
              tutorAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=0d9488&color=fff`,
              subject: s.subject,
              scheduledAt: s.scheduled_at,
            };
          })
        );
      }

      // Fetch stats
      const { count: totalSessions } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'completed');

      const { data: uniqueTutors } = await supabase
        .from('bookings')
        .select('tutor_id')
        .eq('student_id', user.id);

      const activeTutorCount = new Set(uniqueTutors?.map((t) => t.tutor_id)).size;

      setStats({
        totalSessions: totalSessions || 0,
        totalHours: (totalSessions || 0) * 1, // Assuming 1 hour per session
        activeTutors: activeTutorCount,
      });

      setLoading(false);
    };

    fetchData();
  }, [user, supabase]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/student/search"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
              <Search className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Find a Tutor</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Browse available tutors</p>
            </div>
          </div>
        </Link>

        <Link
          href="/student/schedule"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">My Schedule</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">View your sessions</p>
            </div>
          </div>
        </Link>

        <Link
          href="/student/messages"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Messages</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Chat with tutors</p>
            </div>
          </div>
        </Link>

        <Link
          href="/student/settings"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">My Learning</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track progress</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-full">
              <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSessions}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Sessions</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalHours}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hours Learned</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeTutors}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tutors Worked With</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Upcoming Sessions
            </h2>
            <Link
              href="/student/schedule"
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="font-medium text-slate-900 dark:text-white mb-2">No Upcoming Sessions</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Book a session with a tutor to get started!
              </p>
              <Link
                href="/student/search"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Search size={16} />
                Find a Tutor
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={session.tutorAvatar}
                      alt={session.tutorName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {session.tutorName}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{session.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatDate(session.scheduledAt)}
                      </p>
                      <Link
                        href={`/student/session/${session.id}`}
                        className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        Join Session
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tips / Recommendations */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Tips for Success
          </h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                  Prepare Questions
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Write down questions before your session
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                  Be On Time
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Join sessions 5 minutes early
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                  Communicate
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Message your tutor with any concerns
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Star className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                  Leave Reviews
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Help others by rating your tutors
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
