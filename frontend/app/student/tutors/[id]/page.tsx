'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/auth-context';
import { formatCurrency } from '@/lib/currency';
import {
  Star,
  MapPin,
  DollarSign,
  Clock,
  Award,
  MessageSquare,
  BookOpen,
  ArrowLeft,
  Loader2,
  Heart,
  Share2,
  Check,
  Phone,
  Send,
  X,
  GraduationCap,
  Users,
  Video,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import { OnlineStatusBadge, OnlineStatusText } from '@/components/OnlineStatusIndicator';

interface TutorDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  location?: string;
  is_online: boolean;
  last_seen?: string | null;
  experience_years: number;
  hourly_rate: number;
  teaching_style: string;
  qualifications: string[];
  bio_text: string;
  availability: Record<string, any>;
  average_rating: number;
  reviews_count: number;
  total_students?: number;
  response_time?: string;
  avatar?: string;
}

interface TutorCourse {
  id: string;
  title: string;
  description: string | null;
  price: number;
  max_students: number;
  is_active: boolean;
  created_at: string;
  subject_name: string | null;
  enrolled_count: number;
  spots_remaining: number;
  next_session: { title: string; scheduled_start: string; scheduled_end: string } | null;
  total_sessions: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const tutorId = params.id as string;

  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [tutorCourses, setTutorCourses] = useState<TutorCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTutorDetails();
    fetchTutorCourses();
  }, [tutorId]);

  // Load chat when modal opens
  useEffect(() => {
    if (showChat && user) {
      loadChatMessages();
    }
  }, [showChat, user]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          // Listen for messages in BOTH directions:
          // 1. Messages FROM tutor TO student (tutor replies)
          // 2. Messages FROM student TO tutor (student sends)
          filter: `or(and(sender_id.eq.${tutorId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${tutorId}))`,
        },
        (payload) => {
          // Only add if not already in messages (avoid duplicates)
          const newMsg = payload.new as Message;
          const messageExists = messages.some((m) => m.id === newMsg.id);
          if (!messageExists) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, tutorId, messages]);

  async function fetchTutorDetails() {
    try {
      setLoading(true);
      setError(null);

      // Fetch tutor profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, avatar')
        .eq('id', tutorId)
        .single();

      if (profileError) throw profileError;

      // Fetch tutor-specific data
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('*')
        .eq('profile_id', tutorId)
        .single();

      if (tutorError) throw tutorError;

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('ratings')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch total students (count of unique students who rated this tutor)
      const { count: studentCount } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', tutorId);

      // Calculate availability string
      let availabilityDays = '';
      if (tutorData.availability?.days && Array.isArray(tutorData.availability.days)) {
        availabilityDays = tutorData.availability.days.join(', ');
      }

      setTutor({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: tutorData.phone_number,
        location: tutorData.location,
        is_online: profile.is_online,
        last_seen: profile.last_seen || null,
        experience_years: tutorData.experience_years,
        hourly_rate: tutorData.hourly_rate,
        teaching_style: tutorData.teaching_style,
        qualifications: tutorData.qualifications || [],
        bio_text: tutorData.bio_text,
        availability: tutorData.availability || {},
        average_rating: tutorData.average_rating,
        reviews_count: reviewData?.length || 0,
        total_students: studentCount || 0,
        response_time: availabilityDays || 'Flexible',
        avatar: profile.avatar || undefined,
      });

      setReviews(reviewData || []);
    } catch (err) {
      console.error('Error fetching tutor details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tutor details');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTutorCourses() {
    try {
      setCoursesLoading(true);

      // Fetch courses taught by this tutor
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id, title, description, price, max_students, is_active, created_at, subject_id,
          subjects ( id, name, category )
        `)
        .eq('tutor_id', tutorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (coursesError || !coursesData || coursesData.length === 0) {
        setTutorCourses([]);
        setCoursesLoading(false);
        return;
      }

      const courseIds = coursesData.map(c => c.id);

      // Fetch enrollment counts and sessions in parallel
      const [enrollmentsRes, sessionsRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('course_id, student_id')
          .in('course_id', courseIds)
          .eq('status', 'enrolled'),
        supabase
          .from('course_sessions')
          .select('id, course_id, title, scheduled_start, scheduled_end, status')
          .in('course_id', courseIds)
          .gte('scheduled_start', new Date().toISOString())
          .eq('status', 'scheduled')
          .order('scheduled_start', { ascending: true }),
      ]);

      const enrollments = enrollmentsRes.data || [];
      const sessions = sessionsRes.data || [];

      // Build maps
      const enrollCountMap: Record<string, number> = {};
      const userEnrolled = new Set<string>();
      for (const e of enrollments) {
        enrollCountMap[e.course_id] = (enrollCountMap[e.course_id] || 0) + 1;
        if (user && e.student_id === user.id) {
          userEnrolled.add(e.course_id);
        }
      }
      setEnrolledCourseIds(userEnrolled);

      const nextSessionMap: Record<string, any> = {};
      const sessionCountMap: Record<string, number> = {};
      for (const s of sessions) {
        sessionCountMap[s.course_id] = (sessionCountMap[s.course_id] || 0) + 1;
        if (!nextSessionMap[s.course_id]) {
          nextSessionMap[s.course_id] = s;
        }
      }

      const fullCourses: TutorCourse[] = coursesData.map(c => {
        const subj = c.subjects as any;
        const enrolledCount = enrollCountMap[c.id] || 0;
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          price: c.price,
          max_students: c.max_students,
          is_active: c.is_active,
          created_at: c.created_at,
          subject_name: subj?.name || null,
          enrolled_count: enrolledCount,
          spots_remaining: Math.max(0, c.max_students - enrolledCount),
          next_session: nextSessionMap[c.id] || null,
          total_sessions: sessionCountMap[c.id] || 0,
        };
      });

      setTutorCourses(fullCourses);
    } catch (err) {
      console.error('Error fetching tutor courses:', err);
    } finally {
      setCoursesLoading(false);
    }
  }

  async function handleCourseEnroll(courseId: string) {
    if (!user) {
      alert('Please sign in to enroll in a course.');
      return;
    }

    setEnrollingCourse(courseId);
    try {
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (existingEnrollment) {
        alert('You are already enrolled in this course.');
        setEnrolledCourseIds(prev => new Set([...prev, courseId]));
        return;
      }

      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({ student_id: user.id, course_id: courseId, status: 'enrolled' });

      if (enrollError) throw enrollError;

      setEnrolledCourseIds(prev => new Set([...prev, courseId]));
      setTutorCourses(prev =>
        prev.map(c =>
          c.id === courseId
            ? { ...c, enrolled_count: c.enrolled_count + 1, spots_remaining: c.spots_remaining - 1 }
            : c
        )
      );
    } catch (err) {
      console.error('Error enrolling:', err);
      alert('Failed to enroll. Please try again.');
    } finally {
      setEnrollingCourse(null);
    }
  }

  async function loadChatMessages() {
    if (!user) return;

    try {
      setChatLoading(true);

      // Fetch conversation between current user and tutor
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${tutorId}),and(sender_id.eq.${tutorId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', tutorId);
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMessage() {
    if (!user || !newMessage.trim()) return;

    try {
      setSendingMessage(true);

      // Create message object for immediate display
      const messageContent = newMessage.trim();
      const newMsg: Message = {
        id: `temp-${Date.now()}`, // Temporary ID until inserted
        sender_id: user.id,
        receiver_id: tutorId,
        content: messageContent,
        created_at: new Date().toISOString(),
        is_read: false,
      };

      // Add message to state immediately (optimistic update)
      setMessages((prev) => [...prev, newMsg]);

      // Then insert to database
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: tutorId,
            content: messageContent,
          },
        ])
        .select();

      if (error) throw error;

      // Replace temporary message with real one from database
      if (data && data[0]) {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? (data[0] as Message) : m))
        );
      }

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto animate-pulse">
          {/* Back button skeleton */}
          <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 mb-6" />

          <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            {/* Hero banner skeleton */}
            <div className="bg-gradient-to-r from-teal-600/60 to-teal-500/60 dark:from-teal-800/40 dark:to-teal-700/40 px-6 sm:px-8 py-12">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/20" />
                <div className="flex-1 pt-2 space-y-3">
                  <div className="h-3 w-20 rounded bg-white/20" />
                  <div className="h-8 w-56 rounded bg-white/20" />
                  <div className="flex gap-4">
                    <div className="h-4 w-28 rounded bg-white/20" />
                    <div className="h-4 w-36 rounded bg-white/20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content skeleton */}
            <div className="px-6 sm:px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-8">
                  {/* About */}
                  <div>
                    <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                  {/* Teaching Style */}
                  <div>
                    <div className="h-6 w-36 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
                    <div className="flex flex-wrap gap-2">
                      {[80, 96, 72, 88].map((w, i) => (
                        <div key={i} className="h-8 rounded-full bg-slate-200 dark:bg-slate-700" style={{ width: w }} />
                      ))}
                    </div>
                  </div>
                  {/* Reviews */}
                  <div>
                    <div className="h-6 w-28 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
                    {[0, 1].map((i) => (
                      <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="space-y-1.5">
                            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                          </div>
                        </div>
                        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 mt-3" />
                        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700 mt-1.5" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                  {/* Pricing card */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 space-y-4">
                    <div className="h-8 w-24 rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="h-12 w-full rounded-lg bg-slate-200 dark:bg-slate-600" />
                    <div className="h-12 w-full rounded-lg bg-slate-200 dark:bg-slate-600" />
                  </div>
                  {/* Info cards */}
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-600" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-600" />
                        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary-600 dark:text-primary-400 dark:text-teal-400 hover:text-primary-700 dark:text-primary-300 dark:hover:text-teal-300 mb-6"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <p className="text-red-600 dark:text-red-400 text-lg">{error || 'Tutor not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary-600 dark:text-primary-400 dark:text-teal-400 hover:text-primary-700 dark:text-primary-300 dark:hover:text-teal-300 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Results
        </button>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          {/* Top Section with Basic Info */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 sm:px-8 py-12">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <img
                src={tutor.avatar || `https://ui-avatars.com/api/?name=${tutor.first_name}+${tutor.last_name}&background=0d9488&color=fff&size=120`}
                alt={`${tutor.first_name} ${tutor.last_name}`}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg"
              />

              {/* Info */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <OnlineStatusBadge
                    isOnline={tutor.is_online}
                    lastSeen={tutor.last_seen}
                    className="[&_span]:text-white/90 [&>span:first-child]:!bg-green-400"
                  />
                </div>
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
                  {tutor.first_name} {tutor.last_name}
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    <span className="text-white font-semibold">{tutor.average_rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-teal-100">({tutor.reviews_count} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-teal-100">
                    <Clock className="w-5 h-5" />
                    <span>{tutor.experience_years}+ years experience</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-3 rounded-full transition-all ${
                    isFavorite
                      ? 'bg-red-500 text-white'
                      : 'bg-white dark:bg-slate-800/80 bg-opacity-20 text-white hover:bg-opacity-30'
                  }`}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button className="p-3 bg-white dark:bg-slate-800/80 bg-opacity-20 text-white rounded-full hover:bg-opacity-30 transition-all">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="px-6 sm:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Teaching Style & Qualifications */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">About</h2>
                  {tutor.bio_text && (
                    <p className="text-slate-600 dark:text-slate-300 text-lg mb-6 leading-relaxed">{tutor.bio_text}</p>
                  )}
                  {tutor.teaching_style && (
                    <div className="bg-primary-50 dark:bg-primary-950/30 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-teal-900 dark:text-teal-300 mb-2">Teaching Style</h3>
                      <p className="text-teal-800 dark:text-teal-400">{tutor.teaching_style}</p>
                    </div>
                  )}
                </div>

                {/* Qualifications */}
                {tutor.qualifications && tutor.qualifications.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Award className="w-6 h-6 text-primary-600 dark:text-primary-400 dark:text-teal-400" />
                      Qualifications & Subjects
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {tutor.qualifications.map((qual, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2"
                        >
                          <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="font-medium text-blue-900 dark:text-blue-300">{qual}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Group Classes by This Tutor ── */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    Group Classes
                  </h2>

                  {coursesLoading ? (
                    <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                      <Loader2 className="w-5 h-5 animate-spin text-primary-600 dark:text-primary-400" />
                      <span className="text-slate-500 dark:text-slate-400">Loading courses...</span>
                    </div>
                  ) : tutorCourses.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-center">
                      <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 dark:text-slate-400">
                        This tutor hasn&apos;t created any group classes yet.
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        You can still book a 1-on-1 session above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tutorCourses.map((course) => {
                        const isEnrolled = enrolledCourseIds.has(course.id);
                        const isFull = course.spots_remaining <= 0;

                        return (
                          <div
                            key={course.id}
                            className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700/40 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              {/* Course Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {course.subject_name && (
                                    <span className="px-2 py-0.5 bg-primary-50 dark:bg-teal-900/25 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full border border-primary-100 dark:border-teal-700/30">
                                      {course.subject_name}
                                    </span>
                                  )}
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    isFull
                                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                      : course.spots_remaining <= 5
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    {isFull ? 'Full' : `${course.spots_remaining} spots left`}
                                  </span>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                  {course.title}
                                </h3>

                                {course.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                                    {course.description}
                                  </p>
                                )}

                                {/* Stats */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Users size={13} className="text-blue-500" />
                                    {course.enrolled_count}/{course.max_students} students
                                  </span>
                                  {course.total_sessions > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Video size={13} className="text-purple-500" />
                                      {course.total_sessions} session{course.total_sessions !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {course.next_session && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={13} className="text-amber-500" />
                                      Next: {new Date(course.next_session.scheduled_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Price & Action */}
                              <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                                    {formatCurrency(course.price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">/ course</span>
                                </div>

                                {isEnrolled ? (
                                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium rounded-xl border border-green-200 dark:border-green-800/40">
                                    <Check size={14} />
                                    Enrolled
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleCourseEnroll(course.id)}
                                    disabled={isFull || enrollingCourse === course.id}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {enrollingCourse === course.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Sparkles size={14} />
                                    )}
                                    {isFull ? 'Full' : enrollingCourse === course.id ? 'Enrolling...' : 'Enroll'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Enrollment Progress Bar */}
                            <div className="mt-3">
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isFull ? 'bg-red-500' : course.spots_remaining <= 5 ? 'bg-amber-500' : 'bg-primary-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (course.enrolled_count / course.max_students) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Link to all courses */}
                      <Link
                        href={`/student/courses`}
                        className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors"
                      >
                        Browse all group classes
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Reviews */}
                {reviews.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Recent Reviews</h2>
                    <div className="space-y-4">
                      {reviews.map((review, idx) => (
                        <div
                          key={idx}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={`${
                                    i < (review.rating || 0)
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-slate-600 dark:text-slate-400 text-sm">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Pricing Card */}
                <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-700 dark:to-slate-700/50 border border-teal-200 dark:border-slate-600 rounded-xl p-6 mb-6 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Hourly Rate</span>
                    <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400 dark:text-teal-400" />
                  </div>
                  <p className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                    ${tutor.hourly_rate}
                    <span className="text-lg text-slate-600">/hr</span>
                  </p>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowChat(true)}
                      className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={18} />
                      Send Message
                    </button>
                    <button
                      onClick={() => setShowBooking(true)}
                      className="w-full border-2 border-teal-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:bg-primary-950/30 dark:hover:bg-teal-900/20 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <BookOpen size={18} />
                      Book Session
                    </button>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="space-y-3">
                  {tutor?.phone_number && (
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                          Phone
                        </p>
                        <a href={`tel:${tutor.phone_number}`} className="text-slate-900 font-semibold hover:text-primary-600 dark:text-primary-400">
                          {tutor.phone_number}
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1">
                      Response Time
                    </p>
                    <p className="text-slate-900 dark:text-white font-semibold">Usually within 1 hour</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1">
                      Total Students
                    </p>
                    <p className="text-slate-900 dark:text-white font-semibold">{tutor?.total_students || 0}+ students</p>
                  </div>
                  {tutor?.location && (
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                          Location
                        </p>
                        <p className="text-slate-900 font-semibold">{tutor.location}</p>
                      </div>
                    </div>
                  )}
                  {tutor?.availability?.days && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                        Available Days
                      </p>
                      <p className="text-slate-900 font-semibold capitalize">{tutor.response_time}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {tutor && (
        <BookingModal
          isOpen={showBooking}
          onClose={() => setShowBooking(false)}
          tutor={{
            id: tutor.id,
            first_name: tutor.first_name,
            last_name: tutor.last_name,
            hourly_rate: tutor.hourly_rate,
            qualifications: tutor.qualifications,
            availability: tutor.availability,
          }}
        />
      )}

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800/80 dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md h-[600px] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-white">Chat with {tutor?.first_name}</h3>
                <div className="flex items-center gap-3">
                  <OnlineStatusText
                    isOnline={tutor?.is_online ?? false}
                    lastSeen={tutor?.last_seen}
                    className="!text-teal-100"
                  />
                  <Link
                    href={`/student/messages?chat=${tutorId}`}
                    className="text-xs text-teal-200 hover:text-white underline transition-colors"
                  >
                    Open full chat →
                  </Link>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-white hover:bg-white dark:bg-slate-800/80 hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-800">
              {chatLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600 dark:text-primary-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-400 dark:text-slate-500 text-center">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user?.id
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800/80 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-teal-100' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/80 dark:bg-slate-900 rounded-b-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !sendingMessage) {
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2 transition-colors flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
