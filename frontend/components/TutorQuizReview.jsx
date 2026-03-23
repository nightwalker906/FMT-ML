'use client';

import { useState } from 'react';
import { API_BASE } from '@/lib/api-config';

export default function TutorQuizReview({ sessionId, courseId }) {
  // Draft quiz state
  const [quizId, setQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calls the backend to generate a draft quiz from the session transcript.
  async function handleGenerateQuiz() {
    if (!sessionId) {
      setError('Missing session ID.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
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
    } catch (err) {
      setError(err.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  }

  // Publishes the draft as a Course Resource (quiz assignment).
  async function handlePublish() {
    if (!quizId) {
      setError('Generate a quiz first.');
      return;
    }
    if (!courseId) {
      setError('Missing course ID.');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }
    setPublishing(true);
    setError('');
    setSuccess('');
    try {
      const isoDueDate = new Date(dueDate).toISOString();
      const res = await fetch(`${API_BASE}/ai/quiz/publish/${quizId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          due_date: isoDueDate,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to publish quiz.');
      }
      setSuccess('Quiz published successfully. Students can now take the assignment.');
    } catch (err) {
      setError(err.message || 'Failed to publish quiz.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">AI Auto-Quiz Generator</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate a 3-question quiz from the latest lesson transcript, review it, and publish as an assignment.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGenerateQuiz}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Quiz'}
        </button>
        {quizId && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Draft ID: {quizId}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Draft questions */}
      {questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-800/80"
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
                        : 'border-slate-200 bg-slate-50 text-slate-700'
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
      )}

      {/* Publish panel */}
      <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-800/80">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Due Date
          </label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !quizId}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
