import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { Video, CircleStop, Calendar, BookOpen } from 'lucide-react';
import { StartInstantSessionButton, StartLiveClassLink } from '@/components/classroom/StartLiveButtons';
import AutoQuizGenerator from '@/components/classroom/AutoQuizGenerator';

type TutorCourse = {
  id: string;
  title: string;
  tutor_id: string;
};

type LiveSession = {
  id: string;
  course_id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
};

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  if (status === 'live') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (status === 'scheduled') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400';
}

async function endSessionAction(formData: FormData) {
  'use server';

  const sessionId = formData.get('sessionId') as string;
  if (!sessionId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: session } = await supabase
    .from('course_sessions')
    .select('id, course_id')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  const { data: course } = await supabase
    .from('courses')
    .select('tutor_id')
    .eq('id', session.course_id)
    .single();

  if (!course || course.tutor_id !== user.id) return;

  await supabase
    .from('course_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId);

  revalidatePath('/tutor/live-classroom');
}

async function startInstantSessionAction(formData: FormData) {
  'use server';

  const courseId = (formData.get('courseId') as string | null)?.trim();
  const titleInput = (formData.get('title') as string | null)?.trim();

  if (!courseId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (profile?.user_type !== 'tutor') return;

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, tutor_id')
    .eq('id', courseId)
    .single();

  if (!course || course.tutor_id !== user.id) return;

  const now = new Date();
  const scheduledEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/+$/, '');
  const sessionTitle = titleInput || `${course.title} Live Lesson`;

  let writer: any = supabase;
  try {
    writer = createAdminClient();
  } catch {
    writer = supabase;
  }

  await writer
    .from('course_sessions')
    .update({ status: 'completed' })
    .eq('course_id', courseId)
    .eq('status', 'live');

  const { data: session } = await writer
    .from('course_sessions')
    .insert({
      course_id: courseId,
      title: sessionTitle,
      scheduled_start: now.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: 'live',
      meeting_url: null,
      created_at: now.toISOString(),
    })
    .select('id')
    .single();

  if (!session?.id) return;

  const meetingUrl = `${baseUrl || ''}/live-class/${session.id}`;
  await writer
    .from('course_sessions')
    .update({ meeting_url: meetingUrl })
    .eq('id', session.id);

  revalidatePath('/tutor/live-classroom');
  redirect(`/live-class/${session.id}?role=tutor&redirect=/tutor/live-classroom`);
}

export default async function TutorLiveClassroomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (profile?.user_type !== 'tutor') {
    redirect('/student/live-classroom');
  }

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, tutor_id')
    .eq('tutor_id', user.id)
    .order('created_at', { ascending: false });

  const tutorCourses = (courses || []) as TutorCourse[];
  const courseMap = new Map(tutorCourses.map((c) => [c.id, c]));

  if (tutorCourses.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Classroom</h1>
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-6">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            You need at least one course before starting live sessions.
          </p>
          <Link
            href="/tutor/courses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
          >
            <BookOpen size={16} />
            Go To My Courses
          </Link>
        </div>
      </div>
    );
  }

  const courseIds = tutorCourses.map((c) => c.id);
  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, course_id, title, scheduled_start, scheduled_end, status')
    .in('course_id', courseIds)
    .order('scheduled_start', { ascending: true });

  const liveSessions = ((sessions || []) as LiveSession[]).filter((s) => s.status === 'live');
  const otherSessions = ((sessions || []) as LiveSession[]).filter((s) => s.status !== 'live');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Live Classroom</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Start a live class and let enrolled students join instantly.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4 md:p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Start Instant Lesson</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Start a live class now for any course. Enrolled students can join immediately.
        </p>
        <form action={startInstantSessionAction} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="instant-course" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Course
            </label>
            <select
              id="instant-course"
              name="courseId"
              required
              defaultValue={tutorCourses[0]?.id}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {tutorCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="instant-title" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Session Title (Optional)
            </label>
            <input
              id="instant-title"
              name="title"
              type="text"
              placeholder="e.g. Revision Workshop"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <StartInstantSessionButton />
          </div>
        </form>
      </section>

      {liveSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live Now</h2>
          {liveSessions.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-red-200/60 dark:border-red-700/40 bg-red-50/60 dark:bg-red-900/10 p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{session.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {courseMap.get(session.course_id)?.title || 'Course'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatDateTime(session.scheduled_start)} - {formatDateTime(session.scheduled_end)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/live-class/${session.id}?role=tutor&redirect=/tutor/live-classroom`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                  >
                    <Video size={16} />
                    Join Live Room
                  </Link>
                  <form action={endSessionAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium"
                    >
                      <CircleStop size={16} />
                      End Class
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scheduled Sessions</h2>
        {otherSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4 text-sm text-slate-500 dark:text-slate-400">
            No sessions scheduled yet. Create sessions from <Link href="/tutor/courses" className="text-primary-600 dark:text-primary-400 hover:underline">My Courses</Link>.
          </div>
        ) : (
          <div className="space-y-2">
            {otherSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{session.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {courseMap.get(session.course_id)?.title || 'Course'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateTime(session.scheduled_start)} - {formatDateTime(session.scheduled_end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(session.status)}`}>
                      {session.status}
                    </span>
                    {session.status === 'scheduled' && (
                      <StartLiveClassLink
                        href={`/live-class/${session.id}?role=tutor&redirect=/tutor/live-classroom`}
                      />
                    )}
                    {session.status === 'completed' && (
                      <AutoQuizGenerator
                        sessionId={session.id}
                        courseId={session.course_id}
                        sessionTitle={session.title}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
