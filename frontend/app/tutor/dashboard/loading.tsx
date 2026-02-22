import { SkeletonDashboard } from '@/components/ui/skeleton';

export default function TutorDashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-48 skeleton rounded-lg" />
            <div className="h-7 w-20 skeleton rounded-full" />
          </div>
          <div className="h-5 w-72 skeleton rounded" />
        </div>
        <div className="h-10 w-32 skeleton rounded-xl" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-stat animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-8 w-20 skeleton rounded" />
                <div className="h-3 w-28 skeleton rounded" />
              </div>
              <div className="h-12 w-12 rounded-xl skeleton" />
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 skeleton rounded" />
            <div className="h-4 w-20 skeleton rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-stat p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton rounded" />
                    <div className="h-3 w-24 skeleton rounded" />
                  </div>
                  <div className="hidden sm:flex gap-2">
                    <div className="h-9 w-20 skeleton rounded-xl" />
                    <div className="h-9 w-20 skeleton rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="h-6 w-36 skeleton rounded" />
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 skeleton rounded" />
                    <div className="h-3 w-20 skeleton rounded" />
                    <div className="h-3 w-32 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
