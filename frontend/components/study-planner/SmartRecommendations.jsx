'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';

const SmartRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        // Build URL with student_id if user is authenticated
        let url = 'http://localhost:8000/api/recommendations/';
        if (user?.id) {
          url += `?student_id=${user.id}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
          setRecommendations(data.data || []);
          if (data.message) {
            setMessage(data.message);
          }
        } else {
          setError('No recommendations available');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user?.id]);

  // Match percentage badge styling
  const getMatchBadgeStyle = (percentage) => {
    if (percentage >= 90) {
      return {
        bg: 'bg-gradient-to-r from-green-400 to-emerald-500',
        text: 'text-white',
        label: 'Excellent Match'
      };
    } else if (percentage >= 70) {
      return {
        bg: 'bg-gradient-to-r from-blue-400 to-cyan-500',
        text: 'text-white',
        label: 'Great Match'
      };
    } else {
      return {
        bg: 'bg-gray-300',
        text: 'text-gray-700',
        label: 'Good Match'
      };
    }
  };

  // Skeleton Loader Component
  const SkeletonCard = ({ index }) => (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatType: 'reverse'
      }}
      className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-100 p-6 shadow-md"
    >
      {/* Skeleton Badge */}
      <div className="absolute top-4 right-4 w-20 h-8 bg-gray-300 rounded-full" />

      {/* Skeleton Avatar */}
      <div className="w-16 h-16 bg-gray-300 rounded-full mb-4" />

      {/* Skeleton Name */}
      <div className="w-32 h-4 bg-gray-300 rounded mb-2" />
      <div className="w-24 h-3 bg-gray-200 rounded mb-4" />

      {/* Skeleton Explanation */}
      <div className="space-y-2 mb-4">
        <div className="w-full h-3 bg-gray-200 rounded" />
        <div className="w-5/6 h-3 bg-gray-200 rounded" />
      </div>

      {/* Skeleton Rating */}
      <div className="w-40 h-3 bg-gray-200 rounded mb-4" />

      {/* Skeleton Button */}
      <div className="w-full h-10 bg-gray-300 rounded-lg" />
    </motion.div>
  );

  // Smart Card Component
  const SmartCard = ({ recommendation, index }) => {
    const badgeStyle = getMatchBadgeStyle(recommendation.match_percentage);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        whileHover={{ y: -5, boxShadow: '0 20px 25px -5rgba(0, 0, 0, 0.1)' }}
        className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
      >
        <div className="relative p-6">
          {/* Match Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
            className={`absolute top-4 right-4 ${badgeStyle.bg} ${badgeStyle.text} px-3 py-1 rounded-full flex items-center gap-1 text-xs font-semibold`}
          >
            <Sparkles size={14} />
            {recommendation.match_percentage}%
          </motion.div>

          {/* Avatar & Online Status */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <img
                src={recommendation.image}
                alt={recommendation.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
              {recommendation.is_online && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                  title="Online now"
                />
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">
                {recommendation.full_name}
              </h3>
              <div className="flex flex-wrap gap-1 mt-2">
                {recommendation.subjects?.slice(0, 2).map((subject, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
            className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100"
          >
            <div className="flex items-start gap-2">
              <Zap size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 line-clamp-2 leading-snug">
                {typeof recommendation.explanation === 'string' 
                  ? recommendation.explanation 
                  : typeof recommendation.explanation === 'object' && recommendation.explanation?.summary
                    ? recommendation.explanation.summary
                    : 'Recommended based on your preferences'}
              </p>
            </div>
          </motion.div>

          {/* Rating & Price */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-900">
                {recommendation.average_rating}
              </span>
              <span className="text-sm text-gray-500">({recommendation.average_rating}/5)</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              ${recommendation.hourly_rate}/hr
            </span>
          </div>

          {/* View Profile Button */}
          <Link href={`/student/tutors/${recommendation.id}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              View Profile
            </motion.button>
          </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-blue-600" size={24} />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Top Picks for You
            </h2>
          </div>
          <p className="text-gray-600 text-lg">
            Based on your recent activity and learning goals
          </p>
        </motion.div>

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Carousel Container */}
        <div className="relative">
          <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <div className="flex gap-6 pb-4">
              {loading ? (
                // Skeleton Loading State
                Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={`skeleton-${index}`} index={index} />
                ))
              ) : recommendations.length > 0 ? (
                // Recommendations Cards
                recommendations.map((recommendation, index) => (
                  <SmartCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    index={index}
                  />
                ))
              ) : (
                // Empty State with Call to Action
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full text-center py-12 px-6"
                >
                  <Sparkles className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-700 text-lg font-semibold mb-3">
                    No Top Picks Available Yet
                  </p>
                  {message && (
                    <p className="text-gray-600 text-base mb-6 max-w-md mx-auto">
                      {message}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mb-6">
                    Here's how to get personalized recommendations:
                  </p>
                  <ul className="text-left text-gray-600 text-sm max-w-md mx-auto space-y-2 mb-6">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">1.</span>
                      <span>Complete your learning profile with your goals and preferences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">2.</span>
                      <span>Search for tutors by subject to build our recommendation database</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">3.</span>
                      <span>Book sessions to help our AI learn your preferences</span>
                    </li>
                  </ul>
                  <a
                    href="/student/settings"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200"
                  >
                    <Zap size={18} />
                    Adjust Learning Goals
                  </a>
                </motion.div>
              )}
            </div>
          </div>

          {/* Gradient Fade (Right) */}
          {!loading && recommendations.length > 0 && (
            <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Info Section */}
        {!loading && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 AI Insight:</span> These recommendations are powered by our explainable AI engine, which analyzes your learning patterns to find the perfect match.
            </p>
          </motion.div>
        )}

        {/* Empty State Info */}
        {!loading && recommendations.length === 0 && message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <p className="text-sm text-amber-800">
              <span className="font-semibold">💡 Tip:</span> Your learning profile helps us find the best matches. The more information you provide, the better our recommendations become!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SmartRecommendations;
