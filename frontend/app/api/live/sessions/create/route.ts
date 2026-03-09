import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type CreateSessionBody = {
  course_id?: string;
  title?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  meeting_url?: string | null;
};

function getBaseAppUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return request.nextUrl.origin;
}

function normalizeMeetingUrl(value?: string | null) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionBody;
    const courseId = body.course_id?.trim();
    const title = body.title?.trim();
    const scheduledStartRaw = body.scheduled_start?.trim();
    const scheduledEndRaw = body.scheduled_end?.trim();

    if (!courseId || !title || !scheduledStartRaw || !scheduledEndRaw) {
      return NextResponse.json(
        { error: 'course_id, title, scheduled_start, and scheduled_end are required.' },
        { status: 400 }
      );
    }

    const scheduledStart = new Date(scheduledStartRaw);
    const scheduledEnd = new Date(scheduledEndRaw);
    if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
      return NextResponse.json({ error: 'Invalid session date/time provided.' }, { status: 400 });
    }
    if (scheduledEnd <= scheduledStart) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
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
      .select('id, user_type')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'tutor') {
      return NextResponse.json({ error: 'Only tutors can schedule live sessions.' }, { status: 403 });
    }

    const { data: course } = await supabase
      .from('courses')
      .select('id, tutor_id')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }
    if (course.tutor_id !== user.id) {
      return NextResponse.json({ error: 'You can only schedule sessions for your own courses.' }, { status: 403 });
    }

    // Prefer service-role writes when available to avoid RLS blocking this action.
    let writer: any = supabase;
    let usingServiceRole = false;
    try {
      writer = createAdminClient();
      usingServiceRole = true;
    } catch {
      writer = supabase;
      usingServiceRole = false;
    }

    const manualMeetingUrl = normalizeMeetingUrl(body.meeting_url);
    const insertPayload: Record<string, unknown> = {
      course_id: courseId,
      title,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: 'scheduled',
      meeting_url: manualMeetingUrl,
      created_at: new Date().toISOString(),
    };

    const { data: created, error: createError } = await writer
      .from('course_sessions')
      .insert(insertPayload)
      .select('id, course_id, title, scheduled_start, scheduled_end, meeting_url, status')
      .single();

    if (createError || !created) {
      let message = createError?.message || 'Failed to create session.';
      if (!usingServiceRole && /row-level security/i.test(message)) {
        message =
          'Session creation is blocked by database permissions. Configure SUPABASE_SERVICE_ROLE_KEY on the server or add an INSERT policy for tutors on course_sessions.';
      }
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    let session = created;
    if (!created.meeting_url) {
      const fallbackUrl = `${getBaseAppUrl(request)}/live-class/${created.id}`;
      const { data: updated, error: updateError } = await writer
        .from('course_sessions')
        .update({ meeting_url: fallbackUrl })
        .eq('id', created.id)
        .select('id, course_id, title, scheduled_start, scheduled_end, meeting_url, status')
        .single();

      if (!updateError && updated) {
        session = updated;
      }
    }

    return NextResponse.json({ status: 'success', session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
