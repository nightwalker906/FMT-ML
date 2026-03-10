'use client';

import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Download, FileText, PlayCircle, Video } from 'lucide-react';

type LessonRecordingCardProps = {
  recording: {
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
  status?: 'new' | 'in_progress' | 'completed';
  onWatch?: () => void;
  onMarkComplete?: () => void;
};

const videoExtensions = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogg']);
const audioExtensions = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg']);

function getExtension(value: string) {
  const cleanValue = value.split('?')[0] || '';
  const parts = cleanValue.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export default function LessonRecordingCard({
  recording,
  status,
  onWatch,
  onMarkComplete,
}: LessonRecordingCardProps) {
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    typeof recording.duration_seconds === 'number' ? recording.duration_seconds : null
  );
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    setDurationSeconds(typeof recording.duration_seconds === 'number' ? recording.duration_seconds : null);
    setHasFrame(false);
  }, [recording.id, recording.duration_seconds, recording.file_url]);

  const mediaKind = useMemo(() => {
    const mimeType = (recording.mime_type || '').toLowerCase();
    const extension = getExtension(recording.file_name || recording.file_url || '');
    const isVideo = mimeType.startsWith('video/') || videoExtensions.has(extension);
    const isAudio = !isVideo && (mimeType.startsWith('audio/') || audioExtensions.has(extension));
    return { isVideo, isAudio };
  }, [recording.file_name, recording.file_url, recording.mime_type]);

  const handleDuration = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    setDurationSeconds(Math.floor(value));
  };

  const handleVideoMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    handleDuration(video.duration);

    if (!Number.isFinite(video.duration)) return;
    const seekTarget = Math.min(1, Math.max(0.1, video.duration * 0.05));
    try {
      video.currentTime = seekTarget;
    } catch {
      // Ignore seek errors; thumbnail will fall back to the gradient placeholder.
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[16/8] w-full overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
            <PlayCircle size={20} />
          </div>
        </div>

        {status === 'new' && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
            New
          </span>
        )}
        {status === 'in_progress' && (
          <span className="absolute left-2 top-2 rounded-full bg-blue-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
            In progress
          </span>
        )}

        {mediaKind.isVideo && (
          <video
            src={recording.file_url}
            muted
            playsInline
            preload="metadata"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hasFrame ? 'opacity-100' : 'opacity-0'}`}
            onLoadedMetadata={handleVideoMetadata}
            onLoadedData={() => setHasFrame(true)}
            onSeeked={() => setHasFrame(true)}
          />
        )}

        {mediaKind.isAudio && !mediaKind.isVideo && (
          <audio
            src={recording.file_url}
            preload="metadata"
            className="hidden"
            onLoadedMetadata={(event) => handleDuration(event.currentTarget.duration)}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
            <Video size={12} />
            Lesson
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
            <Clock size={12} />
            {durationSeconds ? formatDuration(durationSeconds) : '...'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Video size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{recording.session_title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{recording.course_title}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Tutor: {recording.tutor_name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/40 px-2 py-0.5">
            <Calendar size={12} />
            {recording.recorded_label}
          </span>
          {recording.size_label && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/40 px-2 py-0.5">
              <Download size={12} />
              {recording.size_label}
            </span>
          )}
          {recording.file_name && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/40 px-2 py-0.5">
              <FileText size={12} />
              <span className="max-w-[160px] truncate">{recording.file_name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Lesson recording</span>
          <div className="flex items-center gap-2">
            {status === 'in_progress' && onMarkComplete && (
              <button
                type="button"
                onClick={onMarkComplete}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
              >
                Mark finished
              </button>
            )}
            <a
              href={recording.file_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onWatch?.()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm"
            >
              <PlayCircle size={14} />
              Watch Lesson
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
