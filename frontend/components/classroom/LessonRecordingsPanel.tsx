'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LessonRecordingCard from '@/components/classroom/LessonRecordingCard';
import { createClient } from '@/utils/supabase/client';

type RecordingStatus = 'new' | 'in_progress' | 'completed';

type LessonRecordingDisplay = {
  id: string;
  session_title: string;
  course_title: string;
  tutor_name: string;
  file_name: string;
  file_url: string;
  recorded_label: string;
  size_label?: string;
  mime_type?: string | null;
  duration_seconds?: number | null;
};

type LessonRecordingsPanelProps = {
  recordings: LessonRecordingDisplay[];
  userId: string | null;
};

const STORAGE_PREFIX = 'fmtml.lessonProgress';
const NOTIFICATION_TYPES: string[] = ['lesson_new', 'lesson_in_progress'];

export default function LessonRecordingsPanel({ recordings, userId }: LessonRecordingsPanelProps) {
  const storageKey = `${STORAGE_PREFIX}:${userId || 'guest'}`;
  const supabase = useMemo(() => createClient(), []);
  const [statusMap, setStatusMap] = useState<Record<string, RecordingStatus>>({});
  const syncingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setStatusMap(parsed);
      }
    } catch {
      // Ignore localStorage issues.
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(statusMap));
    } catch {
      // Ignore localStorage issues.
    }
  }, [statusMap, storageKey]);

  const enriched = useMemo(
    () =>
      recordings.map((recording) => ({
        ...recording,
        status: (statusMap[recording.id] as RecordingStatus | undefined) || 'new',
      })),
    [recordings, statusMap]
  );

  const markInProgress = (id: string) => {
    setStatusMap((prev) => (prev[id] === 'completed' ? prev : { ...prev, [id]: 'in_progress' }));
  };

  const markCompleted = (id: string) => {
    setStatusMap((prev) => ({ ...prev, [id]: 'completed' }));
  };

  useEffect(() => {
    if (!userId || enriched.length === 0) return;
    if (syncingRef.current) return;

    const syncNotifications = async () => {
      syncingRef.current = true;
      try {
        const { data: existing, error } = await supabase
          .from('notifications')
          .select('id, type, metadata, is_read')
          .eq('user_id', userId)
          .in('type', NOTIFICATION_TYPES);

        if (error) return;

        const existingMap = new Map<string, { id: string; type: string; is_read: boolean; metadata: any }>();
        (existing || []).forEach((row: any) => {
          const keys = [
            row?.metadata?.recording_id,
            row?.metadata?.recording_name,
            row?.metadata?.recording_path,
          ].filter(Boolean);
          if (keys.length === 0) return;
          keys.forEach((key: string) => {
            existingMap.set(`${key}:${row.type}`, row);
          });
        });

        const toInsert: any[] = [];
        const toMarkRead: string[] = [];

        enriched.forEach((recording) => {
          const primaryKey = recording.file_name || recording.id;
          const newKey = `${primaryKey}:lesson_new`;
          const inProgressKey = `${primaryKey}:lesson_in_progress`;
          const existingNew =
            existingMap.get(newKey) ||
            existingMap.get(`${recording.id}:lesson_new`);
          const existingInProgress =
            existingMap.get(inProgressKey) ||
            existingMap.get(`${recording.id}:lesson_in_progress`);

          if (recording.status === 'new') {
            if (!existingNew) {
              toInsert.push({
                user_id: userId,
                type: 'lesson_new',
                title: 'New lesson available',
                message: `"${recording.session_title}" is ready to watch.`,
                is_read: false,
                action_url: '/student/live-classroom',
                metadata: {
                  recording_id: recording.id,
                  recording_name: recording.file_name,
                  session_title: recording.session_title,
                  course_title: recording.course_title,
                  status: 'new',
                },
              });
            }
          } else if (recording.status === 'in_progress') {
            if (!existingInProgress) {
              toInsert.push({
                user_id: userId,
                type: 'lesson_in_progress',
                title: 'Finish your lesson',
                message: `Continue "${recording.session_title}" to catch up with others.`,
                is_read: false,
                action_url: '/student/live-classroom',
                metadata: {
                  recording_id: recording.id,
                  recording_name: recording.file_name,
                  session_title: recording.session_title,
                  course_title: recording.course_title,
                  status: 'in_progress',
                },
              });
            }
            if (existingNew && !existingNew.is_read) {
              toMarkRead.push(existingNew.id);
            }
          } else if (recording.status === 'completed') {
            if (existingNew && !existingNew.is_read) {
              toMarkRead.push(existingNew.id);
            }
            if (existingInProgress && !existingInProgress.is_read) {
              toMarkRead.push(existingInProgress.id);
            }
          }
        });

        if (toMarkRead.length > 0) {
          await supabase.from('notifications').update({ is_read: true }).in('id', toMarkRead);
        }

        if (toInsert.length > 0) {
          await supabase.from('notifications').insert(toInsert);
        }
      } catch {
        // Ignore notification sync errors.
      } finally {
        syncingRef.current = false;
      }
    };

    syncNotifications();
  }, [enriched, supabase, userId]);

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        {enriched.map((recording) => (
          <LessonRecordingCard
            key={recording.id}
            recording={recording}
            status={recording.status}
            onWatch={() => markInProgress(recording.id)}
            onMarkComplete={() => markCompleted(recording.id)}
          />
        ))}
      </div>
    </div>
  );
}
