'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-config';
import { Loader2, Sparkles, X } from 'lucide-react';

type QuizQuestion = {
  id?: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type AutoQuizGeneratorProps = {
  sessionId: string;
  courseId: string;
  sessionTitle?: string;
};

export default function AutoQuizGenerator({
  sessionId,
  courseId,
  sessionTitle = 'Lesson',
}: AutoQuizGeneratorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setOpen(true);
    setLoading(true);
    setError('');
    setQuizId(null);
    setQuestions([]);
    try {
      const res = await fetch(`${API_BASE}/ai/quiz/generate/${sessionId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to generate quiz.');
      }
      setQuizId(payload.quiz_id);
      setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!quizId) return;
    const titleParam = encodeURIComponent(`${sessionTitle} Quiz`);
    router.push(`/tutor/courses?quizId=${quizId}&courseId=${courseId}&quizTitle=${titleParam}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
      >
        <Sparkles size={16} />
        Auto Generate Quiz
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-800/90 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/40">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Draft Quiz</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Session: {sessionTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating quiz from transcript...
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!loading && !error && questions.length === 0 && (
                <p className="text-sm text-slate-500">No questions generated yet.</p>
              )}

              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="rounded-xl border border-slate-200/60 bg-slate-50 p-4 dark:border-slate-700/40 dark:bg-slate-900/40"
                >
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {idx + 1}. {q.question_text}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {(q.options || []).map((opt, optIdx) => (
                      <li
                        key={`${idx}-${optIdx}`}
                        className={`rounded-md border px-3 py-2 ${
                          optIdx === q.correct_index
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-slate-700/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Review the draft, then approve to set a due date.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!quizId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  Approve & Set Due Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
