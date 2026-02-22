export default function SearchLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-5 w-72 skeleton rounded-xl" />
      </div>

      {/* Search bar */}
      <div className="flex gap-4">
        <div className="flex-1 h-12 skeleton rounded-xl" />
        <div className="h-12 w-28 skeleton rounded-xl" />
      </div>

      {/* Results count */}
      <div className="h-4 w-32 skeleton rounded-xl" />

      {/* Tutor cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 space-y-4" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 skeleton rounded-lg" />
                <div className="h-4 w-20 skeleton rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full skeleton rounded-lg" />
              <div className="h-3 w-3/4 skeleton rounded-lg" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 skeleton rounded-lg" />
              <div className="h-6 w-20 skeleton rounded-lg" />
              <div className="h-6 w-14 skeleton rounded-lg" />
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex-1 h-10 skeleton rounded-xl" />
              <div className="flex-1 h-10 skeleton rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
