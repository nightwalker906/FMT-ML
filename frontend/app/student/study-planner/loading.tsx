export default function StudyPlannerLoading() {
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 skeleton rounded-xl" />
          <div className="h-5 w-64 skeleton rounded-xl" />
        </div>
        <div className="h-10 w-36 skeleton rounded-xl" />
      </div>

      {/* Calendar / Weekly view */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 skeleton rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-8 skeleton rounded-lg" />
            <div className="h-8 w-8 skeleton rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-4 w-8 mx-auto skeleton rounded-lg" />
              <div className="h-10 w-10 mx-auto skeleton rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Tasks list */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 skeleton rounded-lg" />
          <div className="h-5 w-16 skeleton rounded-full" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-5 w-5 skeleton rounded-md" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-56 skeleton rounded-lg" />
              <div className="h-3 w-36 skeleton rounded-lg" />
            </div>
            <div className="h-6 w-20 skeleton rounded-full" />
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card-stat p-4 space-y-3">
            <div className="h-10 w-10 skeleton rounded-xl" />
            <div className="h-3 w-24 skeleton rounded-lg" />
            <div className="h-6 w-16 skeleton rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
