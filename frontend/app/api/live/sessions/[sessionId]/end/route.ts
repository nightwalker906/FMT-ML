import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: {
    sessionId: string;
  };
};

function getWriterClient(fallbackClient: any) {
  try {
    return createAdminClient();
  } catch {
    return fallbackClient;
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const sessionId = context.params.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.user_type !== 'tutor') {
      return NextResponse.json({ error: 'Only tutors can end live lessons.' }, { status: 403 });
    }

    const writer = getWriterClient(supabase);
    const { data: session } = await writer
      .from('course_sessions')
      .select('id, course_id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: 'Course session not found.' }, { status: 404 });
    }

    const { data: course } = await writer
      .from('courses')
      .select('tutor_id')
      .eq('id', session.course_id)
      .maybeSingle();

    if (!course || course.tutor_id !== user.id) {
      return NextResponse.json({ error: 'You are not allowed to end this session.' }, { status: 403 });
    }

    await writer
      .from('course_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    return NextResponse.json({ status: 'success', session_id: sessionId }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
