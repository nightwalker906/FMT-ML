'use client';

import { useTutors, useSubjects } from '@/hooks/useApi';

export default function TutorsPage() {
  const { data: tutors, loading: tutorsLoading, error: tutorsError } = useTutors();
  const { data: subjects, loading: subjectsLoading, error: subjectsError } = useSubjects();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Find Your Tutor</h1>
        <p className="text-slate-600 mb-8">Browse and connect with experienced tutors</p>

        {/* Error Messages */}
        {tutorsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            Error loading tutors: {tutorsError}
          </div>
        )}

        {/* Loading State */}
        {tutorsLoading ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="mt-4 text-slate-600">Loading tutors...</p>
          </div>
        ) : tutors && tutors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutors.map((tutor) => (
              <div
                key={tutor.id}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {tutor.profile.first_name} {tutor.profile.last_name}
                    </h3>
                    <p className="text-sm text-slate-600">{tutor.profile.email}</p>
                  </div>
                </div>

                <p className="text-slate-700 mb-4">{tutor.bio}</p>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Subjects:</p>
                  <div className="flex flex-wrap gap-2">
                    {tutor.subjects.map((subjectId: number) => {
                      const subject = subjects?.find((s) => s.id === subjectId);
                      return (
                        <span
                          key={subjectId}
                          className="inline-block bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded"
                        >
                          {subject?.name || `Subject ${subjectId}`}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-lg font-bold text-emerald-600">
                    ${tutor.hourly_rate}/hr
                  </span>
                  {tutor.average_rating && (
                    <span className="text-sm text-amber-600 font-semibold">
                      ★ {tutor.average_rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <button className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                  Book Session
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center text-slate-600">
            No tutors available at the moment
          </div>
        )}
      </div>
    </div>
  );
}
