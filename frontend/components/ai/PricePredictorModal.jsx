'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { predictTutorRate } from '@/services/aiService';
import { X, Sparkles, TrendingUp, Loader2, Zap, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

const subjects = [
  'Math', 'Physics', 'Chemistry', 'Biology', 'English',
  'Computer Science', 'Economics', 'History', 'Other'
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};

export default function PricePredictorModal({ isOpen, onClose, onRateApplied, onboarding = false }) {
  const [experience, setExperience] = useState('');
  const [subject, setSubject] = useState('Math');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (onboarding && isOpen === undefined) {
      setTimeout(() => {
        if (typeof onClose === 'function') return;
      }, 0);
    }
  }, [onboarding, isOpen, onClose]);

  if (!isOpen) return null;

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    setPrediction(null);
    try {
      const rate = await predictTutorRate(Number(experience), subject);
      if (rate === null) throw new Error('No rate returned. Try different experience or subject, or check the backend.');
      setPrediction(rate);
    } catch (err) {
      console.error('Price prediction error:', err);
      setError(err.message || 'Prediction failed.');
      if (err && err.backend) setDebugInfo(err.backend);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (prediction !== null) {
      onRateApplied(prediction);
      onClose();
      setExperience('');
      setPrediction(null);
      setError('');
    }
  };

  const handleClose = () => {
    onClose();
    setExperience('');
    setPrediction(null);
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-glass-lg border border-slate-200/60 dark:border-slate-700/60 p-6 sm:p-8 w-full max-w-md relative overflow-hidden"
          >
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500" />

            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Smart Pricing</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI-powered rate suggestion</p>
              </div>
            </div>

            {/* Onboarding Banner */}
            <AnimatePresence>
              {onboarding && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/30 dark:to-secondary-950/30 rounded-xl border border-primary-200/50 dark:border-primary-800/30"
                >
                  <span className="text-base font-semibold text-slate-900 dark:text-white block mb-1">Welcome, new tutor! 🎉</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Let us help you set a competitive and fair hourly rate based on your subject and experience.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Experience Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Years of Experience</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={experience}
                onChange={e => setExperience(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>

            {/* Subject Select */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
              <select
                className="input-field"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                {subjects.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>

            {/* Calculate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
              onClick={handlePredict}
              disabled={loading || !experience}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Sparkles size={18} />
                  Calculate Rate
                </>
              )}
            </motion.button>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Debug Info */}
            {debugInfo && (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <div className="font-semibold mb-1 text-slate-700 dark:text-slate-300">Debug info:</div>
                <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32 scrollbar-thin">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}

            {/* Prediction Result */}
            <AnimatePresence>
              {prediction !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center my-4 p-5 rounded-2xl bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-primary-950/30 dark:via-slate-800 dark:to-secondary-950/30 border border-primary-200/50 dark:border-primary-800/30"
                >
                  <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-2">
                    <TrendingUp size={16} className="text-primary-500" />
                    Suggested Rate
                  </div>
                  <div className="text-4xl font-bold text-slate-900 dark:text-white mb-1">
                    {formatCurrency(prediction, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-lg font-medium text-slate-400 dark:text-slate-500">/hr</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                    onClick={handleApply}
                  >
                    <CheckCircle2 size={18} />
                    Use this Rate
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
