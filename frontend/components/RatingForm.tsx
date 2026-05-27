'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';

interface RatingFormProps {
  sessionId: string;
  tutorName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function RatingForm({
  sessionId,
  tutorName,
  onSuccess,
  onCancel,
}: RatingFormProps) {
  const [knowledge, setKnowledge] = useState(0);
  const [teachingStyle, setTeachingStyle] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!knowledge || !teachingStyle || !communication) {
      setError('Please rate all categories');
      setLoading(false);
      return;
    }

    const overall = (knowledge + teachingStyle + communication) / 3;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ratings/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            session: sessionId,
            knowledge_rating: knowledge,
            teaching_style_rating: teachingStyle,
            communication_rating: communication,
            overall_rating: parseFloat(overall.toFixed(2)),
            review_text: review || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting rating');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (val: number) => void;
    label: string;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">Rate {tutorName}</h2>
          <p className="text-gray-600 mb-6">
            Your feedback helps improve the tutoring experience
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <StarRating
              value={knowledge}
              onChange={setKnowledge}
              label="Knowledge & Expertise"
            />
            <StarRating
              value={teachingStyle}
              onChange={setTeachingStyle}
              label="Teaching Style"
            />
            <StarRating
              value={communication}
              onChange={setCommunication}
              label="Communication"
            />

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Additional Comments (optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {loading ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
