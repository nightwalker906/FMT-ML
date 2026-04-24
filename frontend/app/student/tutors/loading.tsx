import { SkeletonTutorGrid } from '@/components/ui/skeleton';

export default function TutorsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
          <div className="h-6 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>

        {/* Search Bar Skeleton */}
        <div className="w-full md:w-96 mb-8 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl animate-pulse">
          <div className="h-5 w-full bg-slate-200 dark:bg-slate-700 rounded" />
        </div>

        {/* Results Count Skeleton */}
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-6" />

        {/* Tutor Cards Skeleton Grid */}
        <SkeletonTutorGrid count={6} />
      </div>
    </div>
  );
}
