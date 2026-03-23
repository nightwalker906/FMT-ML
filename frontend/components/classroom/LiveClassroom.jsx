'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-config';
import '@excalidraw/excalidraw/index.css';

const JitsiMeeting = dynamic(
  () => import('@jitsi/react-sdk').then((mod) => mod.JitsiMeeting),
  { ssr: false }
);

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

/**
 * Phase 1 classroom UI:
 * - Left panel (30% on md+): Jitsi video
 * - Right panel (70% on md+): Excalidraw whiteboard
 * - Mobile: stacked vertically
 */
export default function LiveClassroom({
  sessionId,
  redirectPath = '/student/my-courses',
  userInfo = {},
}) {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const redirectAfterRecordingRef = useRef(false);
  const endSessionAfterRecordingRef = useRef(false);
  const endLessonRequestedRef = useRef(false);
  const stopFallbackTimerRef = useRef(null);
  const finalizeInProgressRef = useRef(false);
  const captureMetaRef = useRef(null);

  const isTutor = userInfo?.role === 'tutor';

  const participant = useMemo(
    () => ({
      displayName: userInfo?.displayName || 'FMT User',
      email: userInfo?.email || '',
    }),
    [userInfo]
  );

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const clearStopFallbackTimer = useCallback(() => {
    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
    }
  }, []);

  const startRecordingTimer = useCallback(() => {
    clearRecordingTimer();
    recordingTimerRef.current = setInterval(() => {
      const startedAt = recordingStartedAtRef.current;
      if (!startedAt) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setRecordingSeconds(elapsed);
    }, 1000);
  }, [clearRecordingTimer]);

  const sleep = useCallback((ms) => new Promise((resolve) => setTimeout(resolve, ms)), []);

  const waitForRecordedData = useCallback(async (maxWaitMs = 9000, pollMs = 250) => {
    let waitedMs = 0;
    while (waitedMs < maxWaitMs) {
      const currentChunks = recordedChunksRef.current || [];
      const hasData = currentChunks.some((chunk) => chunk && chunk.size > 0);
      if (hasData) return true;
      await sleep(pollMs);
      waitedMs += pollMs;
    }
    return false;
  }, [sleep]);

  const cleanupMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const loadRecordings = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/recordings`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });

      if (!res.ok) return;
      const payload = await res.json();
      setRecordings(Array.isArray(payload?.recordings) ? payload.recordings : []);
    } catch {
      // Keep classroom usable even if recording list fails.
    }
  }, [sessionId]);

  const endSession = useCallback(async () => {
    if (!sessionId || !isTutor) return;
    try {
      await fetch(`/api/live/sessions/${sessionId}/end`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort: do not block leaving the classroom.
    }
  }, [isTutor, sessionId]);

  const finalizeAndUploadRecording = useCallback(async () => {
    if (finalizeInProgressRef.current) return;
    finalizeInProgressRef.current = true;

    clearStopFallbackTimer();
    clearRecordingTimer();
    setIsRecording(false);
    setRecordingStatus('Finalizing recording...');
    await waitForRecordedData(12000, 250);
    const chunks = (recordedChunksRef.current || []).filter((chunk) => chunk && chunk.size > 0);
    const captureMeta = captureMetaRef.current;
    const elapsedMs = captureMeta?.startedAt ? Date.now() - captureMeta.startedAt : 0;
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

    cleanupMediaStream();
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
    captureMetaRef.current = null;

    if (!chunks.length) {
      const captureTarget =
        captureMeta?.displaySurface && captureMeta.displaySurface !== 'unknown'
          ? captureMeta.displaySurface
          : 'shared screen';
      setRecordingStatus('Recording stopped, but no media was captured.');
      setRecordingError(
        `No media data was captured from ${captureTarget}${elapsedSeconds ? ` after ${elapsedSeconds}s` : ''}. Re-start recording and choose a full screen or application window to share.`
      );
      finalizeInProgressRef.current = false;
      if (redirectAfterRecordingRef.current) {
        const shouldEndSession = endSessionAfterRecordingRef.current;
        endSessionAfterRecordingRef.current = false;
        redirectAfterRecordingRef.current = false;
        if (shouldEndSession) {
          await endSession();
        }
        router.push(redirectPath);
      }
      return;
    }

    setUploadingRecording(true);
    setRecordingError('');
    setRecordingStatus('Uploading lesson recording...');

    try {
      const mimeType = chunks[0]?.type || 'video/webm';
      const blob = new Blob(chunks, { type: mimeType });
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `lesson-${timestamp}.${extension}`;
      const file = new File([blob], fileName, { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/live/sessions/${sessionId}/recordings`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to upload lesson recording.');
      }

      if (payload?.recording_resource_error) {
        setRecordingStatus('Recording uploaded, but lesson metadata was not saved.');
        setRecordingError(
          `Video is in the lessons bucket, but DB save failed: ${payload.recording_resource_error}`
        );
      } else {
        setRecordingStatus('Recording saved to lessons bucket.');
      }
      await loadRecordings();
    } catch (uploadErr) {
      setRecordingError(uploadErr instanceof Error ? uploadErr.message : 'Failed to save recording.');
      setRecordingStatus('');
    } finally {
      finalizeInProgressRef.current = false;
      setUploadingRecording(false);
      setRecordingSeconds(0);
      if (redirectAfterRecordingRef.current) {
        const shouldEndSession = endSessionAfterRecordingRef.current;
        endSessionAfterRecordingRef.current = false;
        redirectAfterRecordingRef.current = false;
        if (shouldEndSession) {
          await endSession();
        }
        router.push(redirectPath);
      }
    }
  }, [cleanupMediaStream, clearRecordingTimer, clearStopFallbackTimer, endSession, loadRecordings, redirectPath, router, sessionId, waitForRecordedData]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setIsRecording(false);
      setRecordingStatus('');
      return;
    }

    setRecordingStatus('Stopping recording...');
    setIsRecording(false);
    clearRecordingTimer();

    try {
      if (recorder.state === 'inactive') {
        finalizeAndUploadRecording();
        return;
      }

      captureMetaRef.current = {
        ...(captureMetaRef.current || {}),
        stopRequestedAt: Date.now(),
      };
      recorder.stop();
      clearStopFallbackTimer();
      stopFallbackTimerRef.current = setTimeout(() => {
        finalizeAndUploadRecording();
      }, 12000);
    } catch (stopErr) {
      setRecordingError(
        stopErr instanceof Error
          ? stopErr.message
          : 'Unable to stop recording cleanly. Finalizing now.'
      );
      finalizeAndUploadRecording();
    }
  }, [clearRecordingTimer, clearStopFallbackTimer, finalizeAndUploadRecording]);

  const startRecording = useCallback(async () => {
    if (!isTutor || !sessionId) return;

    if (
      typeof window === 'undefined' ||
      typeof window.MediaRecorder === 'undefined' ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      setRecordingError('Recording is not supported in this browser.');
      return;
    }

    setRecordingError('');

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = displayStream;
      const [videoTrack] = displayStream.getVideoTracks();
      if (!videoTrack) {
        displayStream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        throw new Error('Screen share started without a video track. Choose a full screen or app window.');
      }

      const [audioTrack] = displayStream.getAudioTracks();
      const videoSettings =
        typeof videoTrack.getSettings === 'function' ? videoTrack.getSettings() : {};

      let recorder = null;
      let selectedMimeType = '';
      let lastRecorderError = null;

      try {
        recorder = new window.MediaRecorder(displayStream);
        selectedMimeType = recorder.mimeType || '';
      } catch (defaultErr) {
        lastRecorderError = defaultErr;
      }

      if (!recorder) {
        const preferredTypes = [
          'video/webm',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9,opus',
        ];
        const supportedMimeType = preferredTypes.find((type) => window.MediaRecorder.isTypeSupported(type));
        if (!supportedMimeType) {
          throw (
            lastRecorderError ||
            new Error('This browser could not initialize a screen recorder.')
          );
        }
        recorder = new window.MediaRecorder(displayStream, { mimeType: supportedMimeType });
        selectedMimeType = supportedMimeType;
      }

      finalizeInProgressRef.current = false;
      clearStopFallbackTimer();
      recordedChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      captureMetaRef.current = {
        startedAt: recordingStartedAtRef.current,
        displaySurface: videoSettings?.displaySurface || 'unknown',
        hasAudioTrack: !!audioTrack,
        mimeType: selectedMimeType || recorder.mimeType || '',
      };
      setRecordingSeconds(0);
      setRecordingStatus('Recording in progress...');
      setIsRecording(true);
      startRecordingTimer();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        const mediaRecorderError = event?.error?.message || 'Recording failed. Please try again.';
        setRecordingError(mediaRecorderError);
      };

      recorder.onstop = () => {
        finalizeAndUploadRecording();
      };
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        });
      }

      recorder.start(1000);
    } catch (recordErr) {
      cleanupMediaStream();
      clearRecordingTimer();
      setIsRecording(false);
      setRecordingStatus('');
      captureMetaRef.current = null;
      setRecordingError(
        recordErr instanceof Error
          ? recordErr.message
          : 'Unable to start recording. Please allow screen and audio access.'
      );
    }
  }, [
    cleanupMediaStream,
    clearRecordingTimer,
    finalizeAndUploadRecording,
    isTutor,
    sessionId,
    startRecordingTimer,
  ]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  useEffect(() => {
    return () => {
      clearStopFallbackTimer();
      clearRecordingTimer();
      cleanupMediaStream();
    };
  }, [cleanupMediaStream, clearRecordingTimer, clearStopFallbackTimer]);

  const handleEndLesson = useCallback(async () => {
    endLessonRequestedRef.current = true;
    if (isRecording) {
      endSessionAfterRecordingRef.current = true;
      redirectAfterRecordingRef.current = true;
      stopRecording();
      return;
    }

    if (uploadingRecording) {
      endSessionAfterRecordingRef.current = true;
      redirectAfterRecordingRef.current = true;
      return;
    }

    await endSession();
    router.push(redirectPath);
  }, [endSession, isRecording, redirectPath, router, stopRecording, uploadingRecording]);

  const fetchOrCreateRoom = useCallback(async (isReconnect = false) => {
    if (!sessionId) {
      setError('Missing session ID.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setReconnecting(isReconnect);
      setError('');

      const endpoints = [
        `/api/live/sessions/${sessionId}/join`,
        `${API_BASE}/courses/sessions/${sessionId}/join/`,
      ];

      let joined = false;
      let lastError = 'Failed to join live session.';

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include',
          });

          const contentType = res.headers.get('content-type') || '';
          const payload = contentType.includes('application/json')
            ? await res.json()
            : null;

          if (res.ok && payload?.room_name) {
            setRoomName(payload.room_name);
            joined = true;
            break;
          }

          lastError =
            payload?.error ||
            payload?.detail ||
            payload?.message ||
            lastError;
        } catch (endpointErr) {
          lastError =
            endpointErr instanceof Error ? endpointErr.message : lastError;
        }
      }

      if (!joined) {
        throw new Error(lastError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join session.');
    } finally {
      setLoading(false);
      setReconnecting(false);
    }
  }, [sessionId]);

  const handleCallEnded = useCallback(() => {
    if (endLessonRequestedRef.current) {
      return;
    }
    fetchOrCreateRoom(true);
  }, [fetchOrCreateRoom]);

  useEffect(() => {
    fetchOrCreateRoom(false);
  }, [fetchOrCreateRoom]);

  const loadingMessage = reconnecting ? 'Reconnecting to live classroom...' : 'Joining live classroom...';

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm md:text-base">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Unable to start live class</p>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/70 px-3 py-2 md:px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Live Classroom</p>
            <p className="truncate text-sm font-medium text-white">{participant.displayName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isTutor && (
              <>
                <button
                  type="button"
                  onClick={handleEndLesson}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  End Lesson
                </button>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={uploadingRecording}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    disabled={uploadingRecording}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Stop Recording
                  </button>
                )}
              </>
            )}

            {isRecording && (
              <span className="rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-mono text-red-200">
                REC {formatDuration(recordingSeconds)}
              </span>
            )}

            {uploadingRecording && (
              <span className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                Uploading...
              </span>
            )}

            {recordingStatus && (
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                {recordingStatus}
              </span>
            )}
          </div>
        </div>

        {recordingError && (
          <p className="mt-2 text-xs text-red-300">{recordingError}</p>
        )}

        {recordings.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Past lesson files:</span>
            {recordings.slice(0, 3).map((recording) => (
              <a
                key={recording.id || recording.path || recording.name}
                href={recording.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
              >
                {recording.name}
              </a>
            ))}
          </div>
        )}
      </header>

      <div className="min-h-0 flex flex-1 flex-col md:flex-row">
        <section className="h-[45%] min-h-[220px] w-full border-b border-slate-800 md:h-full md:w-[30%] md:border-b-0 md:border-r">
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={roomName}
            userInfo={participant}
            configOverwrite={{
              prejoinPageEnabled: false,
              startWithAudioMuted: false,
              startWithVideoMuted: false,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            }}
            onReadyToClose={handleCallEnded}
            onApiReady={(externalApi) => {
              externalApi.addEventListener('videoConferenceLeft', handleCallEnded);
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
              iframeRef.style.border = '0';
            }}
          />
        </section>

        <section className="h-[55%] min-h-[220px] w-full md:h-full md:w-[70%]">
          <div className="h-full w-full">
            <Excalidraw />
          </div>
        </section>
      </div>
    </div>
  );
}
