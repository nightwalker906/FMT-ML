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
import { OnlineDot } from '@/components/OnlineStatusIndicator';
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
  GraduationCap,
  Video,
} from 'lucide-react';

interface UpcomingSession {
  id: string;
  tutorName: string;
  tutorAvatar: string;
  isOnline: boolean;
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

interface FeaturedCourse {
  id: string;
  title: string;
  price: number;
  subject_name: string | null;
  tutor_name: string;
  tutor_id: string;
  tutor_avatar: string;
  tutor_is_online: boolean;
  enrolled_count: number;
  max_students: number;
  spots_remaining: number;
  next_session_date: string | null;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [recentTutors, setRecentTutors] = useState<RecentTutor[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [preferredSubjects, setPreferredSubjects] = useState<string[]>([]);
  const [gradeLevel, setGradeLevel] = useState<string>('');
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
          .select('id, first_name, last_name, avatar, is_online')
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
              isOnline: tutor?.is_online ?? false,
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

      // Fetch featured courses (popular, with spots available)
      try {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title, price, max_students, is_active, created_at, subject_id, tutor_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (coursesData && coursesData.length > 0) {
          const courseIds = coursesData.map(c => c.id);
          const tutorIds = [...new Set(coursesData.map(c => c.tutor_id).filter(Boolean))];
          const subjectIds = [...new Set(coursesData.map(c => c.subject_id).filter(Boolean))];

          const [enrollRes, sessionRes, tutorProfilesRes, subjectsRes] = await Promise.all([
            supabase
              .from('enrollments')
              .select('course_id')
              .in('course_id', courseIds)
              .eq('status', 'enrolled'),
            supabase
              .from('course_sessions')
              .select('course_id, scheduled_start')
              .in('course_id', courseIds)
              .gte('scheduled_start', new Date().toISOString())
              .eq('status', 'scheduled')
              .order('scheduled_start', { ascending: true })
              .limit(20),
            tutorIds.length > 0
              ? supabase.from('profiles').select('id, first_name, last_name, avatar, is_online').in('id', tutorIds)
              : Promise.resolve({ data: [], error: null }),
            subjectIds.length > 0
              ? supabase.from('subjects').select('id, name').in('id', subjectIds)
              : Promise.resolve({ data: [], error: null }),
          ]);

          const tutorMap: Record<string, any> = {};
          (tutorProfilesRes.data || []).forEach((t: any) => { tutorMap[t.id] = t; });

          const subjectNameMap: Record<string, string> = {};
          (subjectsRes.data || []).forEach((s: any) => { subjectNameMap[s.id] = s.name; });

          const enrollCountMap: Record<string, number> = {};
          for (const e of (enrollRes.data || [])) {
            enrollCountMap[e.course_id] = (enrollCountMap[e.course_id] || 0) + 1;
          }

          const nextSessionMap: Record<string, string> = {};
          for (const s of (sessionRes.data || [])) {
            if (!nextSessionMap[s.course_id]) {
              nextSessionMap[s.course_id] = s.scheduled_start;
            }
          }

          const featured: FeaturedCourse[] = coursesData
            .map(c => {
              const profile = tutorMap[c.tutor_id] || null;
              const tutorName = profile ? `${profile.first_name} ${profile.last_name}` : 'Tutor';
              const enrolledCount = enrollCountMap[c.id] || 0;
              return {
                id: c.id,
                title: c.title,
                price: c.price,
                subject_name: subjectNameMap[c.subject_id] || null,
                tutor_name: tutorName,
                tutor_id: profile?.id || '',
                tutor_avatar: profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=0d9488&color=fff`,
                tutor_is_online: profile?.is_online || false,
                enrolled_count: enrolledCount,
                max_students: c.max_students,
                spots_remaining: Math.max(0, c.max_students - enrolledCount),
                next_session_date: nextSessionMap[c.id] || null,
              };
            })
            .filter(c => c.spots_remaining > 0)
            .sort((a, b) => b.enrolled_count - a.enrolled_count)
            .slice(0, 3);

          setFeaturedCourses(featured);
        }
      } catch (err) {
        console.error('Error fetching featured courses:', err);
      }

      // Fetch learning goals and profile data
      try {
        const { data: studentData } = await supabase
          .from('students')
          .select('learning_goals, preferred_subjects, grade_level')
          .eq('profile_id', user.id)
          .single();

        if (studentData?.learning_goals) {
          setLearningGoals(Array.isArray(studentData.learning_goals) ? studentData.learning_goals : []);
        }
        if (studentData?.preferred_subjects) {
          setPreferredSubjects(Array.isArray(studentData.preferred_subjects) ? studentData.preferred_subjects : []);
        }
        if (studentData?.grade_level) {
          setGradeLevel(studentData.grade_level);
        }
      } catch (err) {
        console.error('Error fetching learning goals:', err);
      }

      setLoading(false);
    };

    fetchData();

    // ──────────────────────────────────────────────────────────────────────
    // REAL-TIME SUBSCRIPTIONS
    // Listen for changes to student learning goals, preferences, and profile
    // ──────────────────────────────────────────────────────────────────────

    // Subscribe to student profile changes (learning goals, preferences)
    const studentSubscription = supabase
      .channel(`student-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',  // Only listen for UPDATE events (when goals are saved)
          schema: 'public',
          table: 'students',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('[Dashboard] 🔔 Real-time: Student profile updated', payload);
          const newData = payload.new as Record<string, any>;
          
          // Update learning goals if they changed
          if (newData?.learning_goals) {
            const newGoals = Array.isArray(newData.learning_goals) ? newData.learning_goals : [];
            console.log('[Dashboard] ✅ Learning goals changed to:', newGoals);
            setLearningGoals(newGoals);
          }
          
          if (newData?.preferred_subjects) {
            setPreferredSubjects(Array.isArray(newData.preferred_subjects) ? newData.preferred_subjects : []);
          }
          if (newData?.grade_level) {
            setGradeLevel(newData.grade_level);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Dashboard] Subscription status for students table: ${status}`);
      });

    // Subscribe to profile changes (avatar, name, etc)
    const profileSubscription = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Dashboard] Real-time update: profile changed', payload);
          // Refresh entire page to reflect profile changes
          window.location.reload();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount.
    return () => {
      studentSubscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
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
      {/* Smart Recommendations Carousel
          ─────────────────────────────────────────────────────────────
          Recommendations automatically refetch when learning goals change.
          
          Flow:
          1. User updates learning goals in complete-profile page
          2. Changes saved to database
          3. User redirected back to dashboard
          4. Dashboard fetches fresh learning goals from Supabase
          5. learningGoals state is updated
          6. New goals passed to SmartRecommendations component
          7. goalsHash computed from goals (useMemo dependency)
          8. URL changes with new goalsHash parameter
          9. SmartRecommendations useEffect detects goalsHash change
          10. mutate() called to refetch from API
          11. Backend validates hash and cache-busts if needed
          12. Fresh recommendations returned matching new learning goals
          ─────────────────────────────────────────────────────────────
      */}
      <SmartRecommendations 
        learningGoals={learningGoals}
        preferredSubjects={preferredSubjects}
        gradeLevel={gradeLevel}
      />

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
                      <div className="relative">
                        <img
                          src={session.tutorAvatar}
                          alt={session.tutorName}
                          className="w-12 h-12 rounded-full ring-2 ring-primary-200/50 dark:ring-primary-700/30"
                        />
                        <OnlineDot isOnline={session.isOnline} size="sm" />
                      </div>
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
