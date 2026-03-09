import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient, createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: {
    sessionId: string;
  };
};

type SessionRow = {
  id: string;
  course_id: string;
  title: string;
  status: string;
  room_name: string | null;
  meeting_url: string | null;
};

function generateRoomName(sessionId: string) {
  const suffix = randomBytes(5).toString('hex');
  return `fmt-${sessionId.slice(0, 8)}-${suffix}`;
}

async function isAuthorizedToJoin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userType: string | null,
  courseId: string
) {
  if (userType === 'tutor') {
    const { data: course } = await supabase
      .from('courses')
      .select('tutor_id')
      .eq('id', courseId)
      .single();

    return !!course && course.tutor_id === userId;
  }

  if (userType === 'student') {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', userId)
      .in('status', ['enrolled', 'active'])
      .limit(1)
      .maybeSingle();

    return !!enrollment;
  }

  return false;
}

async function ensureRoomName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: SessionRow
) {
  if (session.room_name) {
    return session.room_name;
  }

  let writer: any = supabase;
  try {
    writer = createAdminClient();
  } catch {
    writer = supabase;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateRoomName(session.id);
    const { data: existing } = await writer
      .from('course_sessions')
      .select('id')
      .eq('room_name', candidate)
      .maybeSingle();

    if (existing) continue;

    const { data: updated, error } = await writer
      .from('course_sessions')
      .update({ room_name: candidate })
      .eq('id', session.id)
      .select('room_name')
      .single();

    if (!error && updated?.room_name) {
      return updated.room_name;
    }
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
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
      .single();

    const { data: session, error: sessionError } = await supabase
      .from('course_sessions')
      .select('id, course_id, title, status, room_name, meeting_url')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Course session not found.' }, { status: 404 });
    }

    const authorized = await isAuthorizedToJoin(
      supabase,
      user.id,
      profile?.user_type || null,
      session.course_id
    );

    if (!authorized) {
      return NextResponse.json(
        { error: 'You are not allowed to join this session.' },
        { status: 403 }
      );
    }

    const roomName = await ensureRoomName(supabase, session as SessionRow);
    if (!roomName) {
      return NextResponse.json(
        { error: 'Could not generate a unique room name.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: 'success',
        session_id: session.id,
        course_id: session.course_id,
        title: session.title,
        session_status: session.status,
        meeting_url: session.meeting_url,
        room_name: roomName,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
