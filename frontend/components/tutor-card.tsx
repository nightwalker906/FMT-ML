'use client'

import Link from 'next/link'
import { Star, Clock, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { TutorWithProfile } from '@/app/actions/get-tutors'
import { staggerItem } from '@/components/ui/motion'

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

  const subjects = tutor.qualifications || []

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="group bg-white dark:bg-slate-900 rounded-2xl shadow-glass dark:shadow-glass-dark border border-slate-200/60 dark:border-slate-700/50 overflow-hidden hover:shadow-card-hover dark:hover:shadow-card-hover-dark hover:border-primary-200 dark:hover:border-primary-800/50 transition-all duration-300"
    >
      {/* Top Section - Avatar and Name */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-4">
          {/* Avatar with gradient ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/50 dark:to-secondary-900/50 flex items-center justify-center ring-2 ring-primary-200/50 dark:ring-primary-700/30 group-hover:ring-primary-300 dark:group-hover:ring-primary-600 transition-all duration-300">
              <span className="text-primary-700 dark:text-primary-300 font-bold text-lg">
                {initials}
              </span>
            </div>
            {/* Online status dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </div>
          
          {/* Name and Rating */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
              {fullName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {tutor.average_rating ? (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {tutor.average_rating.toFixed(1)}
                  </span>
                </div>
              ) : (
                <span className="badge-primary text-xs">New Tutor</span>
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
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {subjects.slice(0, 4).map((subject, index) => (
              <span
                key={index}
                className="badge-primary"
              >
                {subject}
              </span>
            ))}
            {subjects.length > 4 && (
              <span className="badge-neutral">
                +{subjects.length - 4} more
              </span>
            )}
          </div>
        )}

        {tutor.bio_text && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {tutor.bio_text}
          </p>
        )}
      </div>

      {/* Bottom Section - Price and Book Button */}
      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            R{tutor.hourly_rate}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">/hr</span>
        </div>
        
        <Link
          href={`/student/search?tutor=${tutor.profile_id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-xl shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] transition-all duration-200 group/btn"
        >
          <Clock className="w-4 h-4" />
          Book Now
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all duration-200" />
        </Link>
      </div>
    </motion.div>
  )
}
