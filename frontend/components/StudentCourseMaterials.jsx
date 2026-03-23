'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api-config';

export default function StudentCourseMaterials({ courseId }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId) return;
    // Fetch course details and extract resources (materials + quizzes).
    async function fetchResources() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/courses/${courseId}/`, {
          method: 'GET',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load course resources.');
        }
        const list = payload?.course?.resources || [];
        setResources(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.message || 'Failed to load resources.');
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, [courseId]);

  function formatDueDate(value) {
    if (!value) return 'No due date set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading materials...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (resources.length === 0) {
    return <p className="text-sm text-slate-500">No materials yet.</p>;
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const isQuiz = resource.resource_type === 'quiz';
        const linkHref = resource.file_url || '#';
        const isExternal = linkHref.startsWith('http');

        // Quiz resources route to the in-app quiz page; materials are downloads.
        return (
          <div
            key={resource.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-800/80 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{resource.title}</p>
              {isQuiz ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Due: {formatDueDate(resource.due_date)}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Material</p>
              )}
            </div>

            {isQuiz ? (
              isExternal ? (
                <a
                  href={linkHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Take Quiz
                </a>
              ) : (
                <Link
                  href={linkHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Take Quiz
                </Link>
              )
            ) : (
              <a
                href={linkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Download
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
