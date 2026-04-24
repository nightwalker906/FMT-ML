'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, Calendar, ChevronDown, ChevronUp, BrainCircuit, Target, Clock, AlertCircle } from 'lucide-react';
import StudyPlanTimeline from '@/components/study-planner/StudyPlanTimeline';
import { API_BASE } from '@/lib/api-config';
import { fetchJsonWithRetry } from '@/lib/fetch-json-with-retry';

interface StudyPlan {
  week: number;
  theme: string;
  topic: string;
  learning_objectives: string[];
  action_items: string[];
  resources: string[];
  milestone: string;
}

interface PlanResponse {
  status: string;
  message: string;
  plan: StudyPlan[];
  metadata: {
    cached?: boolean;
    generated_at: string;
    method: string;
    duration_weeks: number;
  };
}

const loadingMessages = [
  'Analyzing your learning style...',
  'Scanning academic resources...',
  'Structuring weekly milestones...',
  'Finalizing your personalized plan...'
];

export default function StudyPlannerPage() {
  const [goal, setGoal] = useState('');
  const [weakness, setWeakness] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [plan, setPlan] = useState<StudyPlan[] | null>(null);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('');
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPlan(null);
    setExpandedWeek(null);

    if (!goal.trim()) {
      setError('Please enter your learning goal');
      return;
    }
    if (!weakness.trim()) {
      setError('Please specify areas you need to improve');
      return;
    }

    setLoading(true);
    const weeksNum = Math.max(1, Math.min(12, parseInt(weeks) || 4));

    try {
      const [response] = await Promise.all([
        fetchJsonWithRetry<PlanResponse>(`${API_BASE}/generate-plan/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal,
            weakness,
            weeks: weeksNum,
            context: context || ''
          }),
          timeoutMs: 90000,
          retries: 1,
          retryDelayMs: 2000,
        }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);

      if (response.status === 'success' && response.plan) {
        setPlan(response.plan);
        setMethod(response.metadata?.method || 'unknown');
      } else {
        setError(response.message || 'Failed to generate study plan');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('The study plan is taking longer than usual. Please try again in a moment.');
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot reach the server. Make sure the backend is running.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Personal Tutor</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
          Generate Your Master Plan
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Tell us your goal, and our AI will build a week-by-week roadmap to get you there.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-6 sticky top-6"
        >
          <form onSubmit={handleGeneratePlan} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> Main Goal
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                placeholder="e.g. Pass Calculus Exam"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-500" /> Weak Areas
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                placeholder="e.g. Derivatives, Limits..."
                value={weakness}
                onChange={(e) => setWeakness(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Duration (Weeks)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Context (Optional)</label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                placeholder="e.g. Exam in 3 weeks, limited study time..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
            >
              {loading ? 'Processing...' : (
                <>
                  <Sparkles className="w-5 h-5" /> Generate Plan
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl border border-dashed border-gray-200"
              >
                <div className="relative w-16 h-16 mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-gray-600 font-medium text-lg"
                >
                  {loadingMessages[loadingStep]}
                </motion.p>
              </motion.div>
            )}

            {!loading && plan && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <StudyPlanTimeline
                  planData={plan}
                  isLoading={false}
                  method={method}
                />
              </motion.div>
            )}

            {!loading && !plan && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-200"
              >
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-indigo-200" />
                </div>
                <p className="text-gray-400 font-medium">Your personalized study plan will appear here</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
