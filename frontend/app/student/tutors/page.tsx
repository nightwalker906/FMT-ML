import { getTutors } from '@/app/actions/get-tutors'
import TutorCard from '@/components/tutor-card'
import { Search, Users } from 'lucide-react'
import Link from 'next/link'

export default async function StudentTutorsPage() {
  const tutors = await getTutors()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Find a Tutor
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Browse and book sessions with expert tutors
          </p>
        </div>

        {/* Search Bar Link */}
        <Link
          href="/student/search"
          className="flex items-center gap-3 w-full md:w-96 mb-8 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors"
        >
          <Search className="w-5 h-5" />
          <span>Search tutors by name or subject...</span>
        </Link>

        {/* Tutors Grid or Empty State */}
        {tutors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              No Tutors Found
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
              There are no tutors available at the moment. Please check back later or contact support for assistance.
            </p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Showing {tutors.length} tutor{tutors.length !== 1 ? 's' : ''}
            </p>
            
            {/* Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutors.map((tutor) => (
                <TutorCard key={tutor.profile_id} tutor={tutor} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
