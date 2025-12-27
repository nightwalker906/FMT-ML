'use client'

import Link from 'next/link'
import { Star, Clock } from 'lucide-react'
import { TutorWithProfile } from '@/app/actions/get-tutors'

interface TutorCardProps {
  tutor: TutorWithProfile
}

export default function TutorCard({ tutor }: TutorCardProps) {
  const fullName = tutor.profiles 
    ? `${tutor.profiles.first_name} ${tutor.profiles.last_name}`
    : 'Unknown Tutor'
  
  const initials = tutor.profiles 
    ? `${tutor.profiles.first_name?.[0] || ''}${tutor.profiles.last_name?.[0] || ''}`
    : '?'

  // Get qualifications as subjects/badges
  const subjects = tutor.qualifications || []

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-slate-200 dark:border-slate-700">
      {/* Top Section - Avatar and Name */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-4">
          {/* Avatar - Always show initials since avatar_url is not in profiles */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg">
                {initials}
              </span>
            </div>
          </div>
          
          {/* Name and Rating */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg truncate">
              {fullName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {tutor.average_rating ? (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {tutor.average_rating.toFixed(1)}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">New Tutor</span>
              )}
              {tutor.experience_years > 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  • {tutor.experience_years} yr{tutor.experience_years > 1 ? 's' : ''} exp
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body Section - Subjects and Bio */}
      <div className="px-5 pb-4">
        {/* Subjects as Badges */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {subjects.slice(0, 4).map((subject, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
              >
                {subject}
              </span>
            ))}
            {subjects.length > 4 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                +{subjects.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Bio - Truncated to 2 lines */}
        {tutor.bio_text && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {tutor.bio_text}
          </p>
        )}
      </div>

      {/* Bottom Section - Price and Book Button */}
      <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            ${tutor.hourly_rate}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">/hr</span>
        </div>
        
        <Link
          href={`/student/search?tutor=${tutor.profile_id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <Clock className="w-4 h-4" />
          Book Now
        </Link>
      </div>
    </div>
  )
}
