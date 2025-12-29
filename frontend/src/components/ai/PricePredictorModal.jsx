'use client';
import React, { useState, useEffect } from 'react';
import { predictTutorRate } from '../../services/aiService';

const subjects = [
  'Math', 'Physics', 'Chemistry', 'Biology', 'English',
  'Computer Science', 'Economics', 'History', 'Other'
];

export default function PricePredictorModal({ isOpen, onClose, onRateApplied, onboarding = false }) {
  const [experience, setExperience] = useState('');
  const [subject, setSubject] = useState('Math');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');

  // Auto-open for onboarding pop-up
  useEffect(() => {
    if (onboarding && isOpen === undefined) {
      setTimeout(() => {
        if (typeof onClose === 'function') return; // do nothing if onClose is not provided
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
      if (rate === null) throw new Error('No rate returned.');
      setPrediction(rate);
    } catch (err) {
      setError(err.message || 'Prediction failed.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl"
          onClick={handleClose}
          aria-label="Close"
        >&times;</button>
        <h2 className="text-2xl font-bold text-white mb-2">Smart Pricing</h2>
        {onboarding && (
          <div className="mb-4 p-3 bg-blue-900/60 rounded-lg text-blue-200 text-center shadow">
            <span className="text-lg font-semibold block mb-1">Welcome, new tutor! 🎉</span>
            <span>
              We discovered you are new here. Let us help you set a competitive and fair hourly rate for your subject and experience.<br/>
              Use our AI-powered pricing tool below to get started!
            </span>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Years of Experience</label>
          <input
            type="number"
            min="0"
            className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={experience}
            onChange={e => setExperience(e.target.value)}
            placeholder="e.g. 5"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Subject</label>
          <select
            className="w-full p-2 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          >
            {subjects.map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded shadow mb-3 disabled:opacity-50 flex items-center justify-center"
          onClick={handlePredict}
          disabled={loading || !experience}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : '✨ Calculate'}
        </button>
        {error && <div className="text-red-400 mb-2 text-center">{error}</div>}
        {prediction !== null && (
          <div className="text-center my-4">
            <div className="text-lg text-gray-300 mb-1">We suggest</div>
            <div className="text-3xl font-bold text-green-400 mb-2">${prediction.toFixed(2)}/hr</div>
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded shadow"
              onClick={handleApply}
            >
              Use this Rate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
