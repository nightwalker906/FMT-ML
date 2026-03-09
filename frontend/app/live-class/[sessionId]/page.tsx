import LiveClassroom from '@/components/classroom/LiveClassroom';
import { createClient } from '@/utils/supabase/server';

type PageProps = {
  params: { sessionId: string };
  searchParams?: { redirect?: string | string[]; role?: string | string[] };
};

export default async function LiveClassroomPage({ params, searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roleParam = searchParams?.role;
  const role = Array.isArray(roleParam) ? roleParam[0] : roleParam;
  let detectedRole: string | null = role || null;

  let displayName = 'FMT User';
  let email = '';

  if (user) {
    email = user.email || '';
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, user_type')
      .eq('id', user.id)
      .single();

    const first = profile?.first_name || '';
    const last = profile?.last_name || '';
    const fullName = `${first} ${last}`.trim();
    displayName = fullName || displayName;
    detectedRole = detectedRole || profile?.user_type || null;

    // Tutor launch flow: when tutor enters room, mark session as live.
    if (detectedRole === 'tutor') {
      const { data: session } = await supabase
        .from('course_sessions')
        .select('id, course_id, status')
        .eq('id', params.sessionId)
        .single();

      if (session?.course_id) {
        const { data: course } = await supabase
          .from('courses')
          .select('tutor_id')
          .eq('id', session.course_id)
          .single();

        if (course?.tutor_id === user.id && session.status !== 'live') {
          await supabase
            .from('course_sessions')
            .update({ status: 'live' })
            .eq('id', params.sessionId);
        }
      }
    }
  }

  const redirectParam = searchParams?.redirect;
  const redirectPath = Array.isArray(redirectParam)
    ? redirectParam[0]
    : redirectParam || (detectedRole === 'tutor' ? '/tutor/live-classroom' : '/student/live-classroom');

  return (
    <LiveClassroom
      sessionId={params.sessionId}
      redirectPath={redirectPath}
      userInfo={{ displayName, email, role: detectedRole }}
    />
  );
}
