import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const LESSONS_BUCKET = 'lessons';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_RECORDING_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB

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
  scheduled_start: string | null;
  scheduled_end: string | null;
};

type StorageFile = {
  id?: string | null;
  name?: string;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: {
    size?: number;
    mimetype?: string;
    contentType?: string;
  } | null;
};

function getStorageClient(fallbackClient: any) {
  try {
    return createAdminClient();
  } catch {
    return fallbackClient;
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120);
}

function inferExtension(mimeType: string) {
  if (!mimeType) return '.webm';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('quicktime')) return '.mov';
  return '.webm';
}

function makeRecordingTitle(sessionTitle: string) {
  const stamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `[Recording] ${sessionTitle} (${stamp})`;
}

async function userCanAccessSession(
  dbClient: any,
  userId: string,
  userType: string | null,
  courseId: string,
  requireTutor = false
) {
  if (userType === 'tutor') {
    const { data: course } = await dbClient
      .from('courses')
      .select('tutor_id')
      .eq('id', courseId)
      .maybeSingle();
    return !!course && course.tutor_id === userId;
  }

  if (!requireTutor && userType === 'student') {
    const { data: enrollment } = await dbClient
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

async function getSessionById(dbClient: any, sessionId: string) {
  const { data, error } = await dbClient
    .from('course_sessions')
    .select('id, course_id, title, status, scheduled_start, scheduled_end')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as SessionRow;
}

async function toRecordingResponse(storageClient: any, folderPath: string, file: StorageFile) {
  if (!file?.name) return null;

  const objectPath = `${folderPath}/${file.name}`;
  const mimeType = file.metadata?.mimetype || file.metadata?.contentType || null;
  const sizeBytes = typeof file.metadata?.size === 'number' ? file.metadata.size : null;

  let fileUrl: string | null = null;
  const { data: signedData } = await storageClient.storage
    .from(LESSONS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signedData?.signedUrl) {
    fileUrl = signedData.signedUrl;
  } else {
    const { data: publicData } = storageClient.storage.from(LESSONS_BUCKET).getPublicUrl(objectPath);
    fileUrl = publicData?.publicUrl || null;
  }

  if (!fileUrl) return null;

  return {
    id: file.id || `${folderPath}-${file.name}`,
    name: file.name,
    path: objectPath,
    url: fileUrl,
    size_bytes: sizeBytes,
    mime_type: mimeType,
    created_at: file.created_at || file.updated_at || null,
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
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

    const storageClient = getStorageClient(supabase);
    const { data: profile } = await storageClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    const session = await getSessionById(storageClient, sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Course session not found.' }, { status: 404 });
    }

    const authorized = await userCanAccessSession(
      storageClient,
      user.id,
      profile?.user_type || null,
      session.course_id
    );

    if (!authorized) {
      return NextResponse.json({ error: 'You are not allowed to access this session.' }, { status: 403 });
    }

    const folderPath = `${session.course_id}/${session.id}`;
    const { data: files, error: listError } = await storageClient.storage
      .from(LESSONS_BUCKET)
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const recordings = (
      await Promise.all(
        (files || []).map((file) => toRecordingResponse(storageClient, folderPath, file as StorageFile))
      )
    )
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });

    return NextResponse.json(
      {
        status: 'success',
        session_id: session.id,
        session_title: session.title,
        course_id: session.course_id,
        recordings,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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

    const storageClient = getStorageClient(supabase);
    const { data: profile } = await storageClient
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    const session = await getSessionById(storageClient, sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Course session not found.' }, { status: 404 });
    }

    const tutorAuthorized = await userCanAccessSession(
      storageClient,
      user.id,
      profile?.user_type || null,
      session.course_id,
      true
    );

    if (!tutorAuthorized) {
      return NextResponse.json(
        { error: 'Only the tutor who owns this course can upload lesson recordings.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string' || typeof (fileEntry as File).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'A recording file is required.' }, { status: 400 });
    }

    const file = fileEntry as File;
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Recording file is empty.' }, { status: 400 });
    }
    if (file.size > MAX_RECORDING_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Recording file is too large. Please keep files under 1 GB.' },
        { status: 400 }
      );
    }

    const safeName = sanitizeFilename(file.name || 'lesson-recording');
    const resolvedName = safeName.includes('.') ? safeName : `${safeName}${inferExtension(file.type)}`;
    const timestampPrefix = new Date().toISOString().replace(/[:.]/g, '-');
    const folderPath = `${session.course_id}/${session.id}`;
    const objectPath = `${folderPath}/${timestampPrefix}-${resolvedName}`;

    const { error: uploadError } = await storageClient.storage.from(LESSONS_BUCKET).upload(objectPath, file, {
      contentType: file.type || 'video/webm',
      upsert: false,
      cacheControl: '3600',
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const recording = await toRecordingResponse(storageClient, folderPath, {
      name: `${timestampPrefix}-${resolvedName}`,
      created_at: new Date().toISOString(),
      metadata: {
        size: file.size,
        mimetype: file.type || 'video/webm',
      },
    });

    // Persist recording metadata in DB so it is tracked as course content.
    const { data: publicData } = storageClient.storage.from(LESSONS_BUCKET).getPublicUrl(objectPath);
    const persistentUrl = publicData?.publicUrl || recording?.url || objectPath;
    let recordingResource = null;
    let recordingResourceError: string | null = null;

    const { data: insertedResource, error: resourceError } = await storageClient
      .from('course_resources')
      .insert({
        course_id: session.course_id,
        title: makeRecordingTitle(session.title),
        file_url: persistentUrl,
        resource_type: 'recording',
      })
      .select('id, course_id, title, file_url, uploaded_at, resource_type')
      .maybeSingle();

    if (resourceError) {
      recordingResourceError = resourceError.message;
    } else if (insertedResource) {
      recordingResource = insertedResource;
    }

    return NextResponse.json(
      {
        status: 'success',
        session_id: session.id,
        course_id: session.course_id,
        recording,
        recording_resource: recordingResource,
        recording_resource_error: recordingResourceError,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
