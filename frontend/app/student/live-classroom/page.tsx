import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { Video, Calendar, Users, PlayCircle } from 'lucide-react';

type Course = {
  id: string;
  title: string;
  tutor_id: string;
};

type Session = {
  id: string;
  course_id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
};

type TutorProfile = {
  id: string;
  first_name: string;
  last_name: string;
};

type LessonRecording = {
  id: string;
  session_id: string;
  session_title: string;
  course_title: string;
  tutor_name: string;
  file_name: string;
  file_url: string;
  recorded_at: string | null;
  size_bytes: number | null;
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

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes <= 0) return '';
  const mb = sizeBytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export default async function StudentLiveClassroomPage() {
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

  if (profile?.user_type !== 'student') {
    redirect('/tutor/live-classroom');
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', user.id)
    .in('status', ['enrolled', 'active']);

  const courseIds = (enrollments || []).map((e) => e.course_id);

  if (courseIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Classroom</h1>
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-6">
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            You are not enrolled in any group course yet.
          </p>
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
          >
            <Users size={16} />
            Browse Group Classes
          </Link>
        </div>
      </div>
    );
  }

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, tutor_id')
    .in('id', courseIds);

  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, course_id, title, scheduled_start, scheduled_end, status')
    .in('course_id', courseIds)
    .in('status', ['live', 'scheduled', 'completed'])
    .order('scheduled_start', { ascending: false });

  const tutorIds = [...new Set(((courses || []) as Course[]).map((c) => c.tutor_id).filter(Boolean))];
  const { data: tutorProfiles } = tutorIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', tutorIds)
    : { data: [] as TutorProfile[] };

  const courseMap = new Map(((courses || []) as Course[]).map((c) => [c.id, c]));
  const tutorMap = new Map(((tutorProfiles || []) as TutorProfile[]).map((t) => [t.id, t]));

  const sessionRows = (sessions || []) as Session[];
  const liveSessions = sessionRows
    .filter((s) => s.status === 'live')
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  const upcomingSessions = sessionRows
    .filter((s) => s.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  const recordingCandidateSessions = sessionRows
    .filter((s) => s.status !== 'scheduled')
    .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())
    .slice(0, 20);

  let storageClient: any = supabase;
  try {
    storageClient = createAdminClient();
  } catch {
    storageClient = supabase;
  }

  const recordingGroups = await Promise.all(
    recordingCandidateSessions.map(async (session) => {
      const folderPath = `${session.course_id}/${session.id}`;
      const { data: files } = await storageClient.storage.from('lessons').list(folderPath, {
        limit: 20,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (!files || files.length === 0) {
        return [] as LessonRecording[];
      }

      const course = courseMap.get(session.course_id);
      const tutor = course ? tutorMap.get(course.tutor_id) : null;
      const tutorName = tutor ? `${tutor.first_name} ${tutor.last_name}` : 'Tutor';

      const recordings = await Promise.all(
        files.map(async (file: any) => {
          if (!file?.name) return null;

          const objectPath = `${folderPath}/${file.name}`;
          let fileUrl: string | null = null;

          const { data: signedData } = await storageClient.storage
            .from('lessons')
            .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

          if (signedData?.signedUrl) {
            fileUrl = signedData.signedUrl;
          } else {
            const { data: publicData } = storageClient.storage.from('lessons').getPublicUrl(objectPath);
            fileUrl = publicData?.publicUrl || null;
          }

          if (!fileUrl) return null;

          return {
            id: file.id || `${session.id}-${file.name}`,
            session_id: session.id,
            session_title: session.title,
            course_title: course?.title || 'Course',
            tutor_name: tutorName,
            file_name: file.name,
            file_url: fileUrl,
            recorded_at: file.created_at || file.updated_at || null,
            size_bytes: typeof file.metadata?.size === 'number' ? file.metadata.size : null,
          } as LessonRecording;
        })
      );

      return recordings.filter(Boolean) as LessonRecording[];
    })
  );

  const lessonRecordings = recordingGroups
    .flat()
    .sort((a, b) => {
      const aTime = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
      const bTime = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Live Classroom</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Join your live class when your tutor starts the session.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live Now</h2>
        {liveSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4 text-sm text-slate-500 dark:text-slate-400">
            No class is live right now. Check upcoming sessions below.
          </div>
        ) : (
          <div className="space-y-2">
            {liveSessions.map((session) => {
              const course = courseMap.get(session.course_id);
              const tutor = course ? tutorMap.get(course.tutor_id) : null;
              const tutorName = tutor ? `${tutor.first_name} ${tutor.last_name}` : 'Tutor';

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-red-200/60 dark:border-red-700/40 bg-red-50/60 dark:bg-red-900/10 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{session.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {course?.title || 'Course'} - {tutorName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Started: {formatDateTime(session.scheduled_start)}
                      </p>
                    </div>
                    <Link
                      href={`/live-class/${session.id}?role=student&redirect=/student/live-classroom`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                    >
                      <Video size={16} />
                      Join Live Class
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Sessions</h2>
        {upcomingSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4 text-sm text-slate-500 dark:text-slate-400">
            No scheduled sessions found.
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingSessions.map((session) => {
              const course = courseMap.get(session.course_id);
              const tutor = course ? tutorMap.get(course.tutor_id) : null;
              const tutorName = tutor ? `${tutor.first_name} ${tutor.last_name}` : 'Tutor';

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{session.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {course?.title || 'Course'} - {tutorName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDateTime(session.scheduled_start)}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Waiting for tutor to start
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Past Lessons</h2>
        {lessonRecordings.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4 text-sm text-slate-500 dark:text-slate-400">
            No lesson recordings yet. Your tutor can record classes and save them to the lessons library.
          </div>
        ) : (
          <div className="space-y-2">
            {lessonRecordings.map((recording) => (
              <div
                key={recording.id}
                className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{recording.session_title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {recording.course_title} - {recording.tutor_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Recorded {recording.recorded_at ? formatDateTime(recording.recorded_at) : 'recently'}
                      {recording.size_bytes ? ` | ${formatFileSize(recording.size_bytes)}` : ''}
                    </p>
                  </div>
                  <a
                    href={recording.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                  >
                    <PlayCircle size={16} />
                    Watch Lesson
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
