export default function ProgressLoading() {
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="space-y-2">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-5 w-72 skeleton rounded-xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card-stat p-4 space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl skeleton" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-16 skeleton rounded-lg" />
                <div className="h-6 w-12 skeleton rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 skeleton rounded-lg" />
          <div className="flex gap-2">
            <div className="h-8 w-20 skeleton rounded-lg" />
            <div className="h-8 w-20 skeleton rounded-lg" />
          </div>
        </div>
        <div className="h-64 w-full skeleton rounded-xl" />
      </div>

      {/* Subject breakdown */}
      <div className="card p-6 space-y-4">
        <div className="h-6 w-44 skeleton rounded-lg" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-24 skeleton rounded-lg" />
              <div className="flex-1 h-3 skeleton rounded-full" />
              <div className="h-4 w-10 skeleton rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="card p-6 space-y-4">
        <div className="h-6 w-36 skeleton rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="h-10 w-10 rounded-xl skeleton" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 skeleton rounded-lg" />
              <div className="h-3 w-32 skeleton rounded-lg" />
            </div>
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
