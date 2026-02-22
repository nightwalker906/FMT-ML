'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import SmartRecommendations from '@/components/study-planner/SmartRecommendations';
import { MiniAchievements } from '@/components/achievements/AchievementsShowcase';
import { useAchievements } from '@/hooks/useAchievements';
import { PageTransition, StaggerContainer, StaggerItem, AnimatedCounter } from '@/components/ui/motion';
import { SkeletonStatsGrid, SkeletonList } from '@/components/ui/skeleton';
import {
  Search,
  Calendar,
  MessageSquare,
  BookOpen,
  Clock,
  Star,
  ArrowRight,
  Users,
  Sparkles,
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
    currentStreak: 0,
    uniqueSubjects: 0,
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
          .select('id, first_name, last_name, avatar')
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
              tutorAvatar: tutor?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=0d9488&color=fff`,
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

      // Fetch completed bookings for streak & subjects (for achievements)
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select('scheduled_at, subject')
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      // Calculate streak
      let streak = 0;
      if (completedBookings && completedBookings.length > 0) {
        const sessionDays = new Set(
          completedBookings.map((b) =>
            new Date(b.scheduled_at).toISOString().split('T')[0]
          )
        );
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
      }

      const uniqueSubjectCount = new Set(
        completedBookings?.map((b) => b.subject).filter(Boolean) || []
      ).size;

      setStats({
        totalSessions: totalSessions || 0,
        totalHours: (totalSessions || 0) * 1, // Assuming 1 hour per session
        activeTutors: activeTutorCount,
        currentStreak: streak,
        uniqueSubjects: uniqueSubjectCount,
      });

      setLoading(false);
    };

    fetchData();
  }, [user, supabase]);

  // Achievement system
  const achievementStats = loading
    ? null
    : {
        totalSessions: stats.totalSessions,
        currentStreak: stats.currentStreak,
        totalHours: stats.totalHours,
        uniqueSubjects: stats.uniqueSubjects,
        uniqueTutors: stats.activeTutors,
      };
  const { achievements } = useAchievements(achievementStats, user?.id);

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
    <PageTransition className="space-y-8">
      {/* Smart Recommendations Carousel */}
      <SmartRecommendations />

      {/* Quick Actions */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/student/search', icon: Search, title: 'Find a Tutor', desc: 'Browse available tutors', color: 'teal' },
          { href: '/student/schedule', icon: Calendar, title: 'My Schedule', desc: 'View your sessions', color: 'blue' },
          { href: '/student/messages', icon: MessageSquare, title: 'Messages', desc: 'Chat with tutors', color: 'purple' },
          { href: '/student/progress', icon: BookOpen, title: 'My Learning', desc: 'Track progress', color: 'orange' },
        ].map((action) => {
          const colorStyles: Record<string, string> = {
            teal: 'bg-primary-100 dark:bg-primary-900/30 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 text-primary-600 dark:text-primary-400',
            blue: 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 text-blue-600 dark:text-blue-400',
            purple: 'bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 text-purple-600 dark:text-purple-400',
            orange: 'bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 text-orange-600 dark:text-orange-400',
          }
          return (
            <StaggerItem key={action.href}>
              <Link
                href={action.href}
                className="group card-stat flex items-center gap-4 p-5 hover:border-primary-200 dark:hover:border-primary-800/50 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
              >
                <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${colorStyles[action.color]}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{action.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
              </Link>
            </StaggerItem>
          )
        })}
      </StaggerContainer>

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStatsGrid count={3} />
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4" delay={0.2}>
          {[
            { icon: BookOpen, value: stats.totalSessions, label: 'Total Sessions', color: 'primary' },
            { icon: Clock, value: stats.totalHours, label: 'Hours Learned', color: 'blue' },
            { icon: Users, value: stats.activeTutors, label: 'Tutors Worked With', color: 'purple' },
          ].map((stat) => {
            const iconColors: Record<string, string> = {
              primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
              blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
              purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
            }
            return (
              <StaggerItem key={stat.label}>
                <div className="card-stat">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${iconColors[stat.color]}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        <AnimatedCounter value={stat.value} />
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      )}

      {/* 🏆 Achievement Mini-Widget */}
      {!loading && <MiniAchievements achievements={achievements} />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">
              <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Upcoming Sessions
            </h2>
            <Link
              href="/student/schedule"
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <SkeletonList count={3} />
          ) : upcomingSessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card text-center py-12"
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No Upcoming Sessions</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs mx-auto">
                Book a session with a tutor to get started on your learning journey!
              </p>
              <Link
                href="/student/search"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Search size={16} />
                Find a Tutor
              </Link>
            </motion.div>
          ) : (
            <StaggerContainer className="space-y-3" delay={0.3}>
              {upcomingSessions.map((session) => (
                <StaggerItem key={session.id}>
                  <div className="card-stat p-4 hover:border-primary-200/50 dark:hover:border-primary-800/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <img
                        src={session.tutorAvatar}
                        alt={session.tutorName}
                        className="w-12 h-12 rounded-full ring-2 ring-primary-200/50 dark:ring-primary-700/30"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {session.tutorName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{session.subject}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatDate(session.scheduledAt)}
                        </p>
                        <Link
                          href="/student/schedule"
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                        >
                          View Session
                        </Link>
                      </div>
                      {/* Mobile date */}
                      <div className="sm:hidden">
                        <Link
                          href="/student/schedule"
                          className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        {/* Quick Tips / Recommendations */}
        <div className="lg:col-span-1">
          <h2 className="section-title mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Tips for Success
          </h2>
          <div className="card space-y-1">
            {[
              { icon: BookOpen, title: 'Prepare Questions', desc: 'Write down questions before your session', color: 'primary' },
              { icon: Clock, title: 'Be On Time', desc: 'Join sessions 5 minutes early', color: 'blue' },
              { icon: MessageSquare, title: 'Communicate', desc: 'Message your tutor with any concerns', color: 'purple' },
              { icon: Star, title: 'Leave Reviews', desc: 'Help others by rating your tutors', color: 'orange' },
            ].map((tip) => {
              const tipColors: Record<string, string> = {
                primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
              }
              return (
                <div key={tip.title} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className={`p-2 rounded-lg ${tipColors[tip.color]}`}>
                    <tip.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                      {tip.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tip.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
