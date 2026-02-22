export default function EarningsLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-32 skeleton rounded-xl" />
        <div className="h-5 w-64 skeleton rounded-xl" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card-stat" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="h-12 w-12 rounded-2xl skeleton mb-4" />
            <div className="h-4 w-24 skeleton rounded-lg mb-2" />
            <div className="h-8 w-28 skeleton rounded-lg mb-2" />
            <div className="h-3 w-20 skeleton rounded-lg" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-5 w-5 rounded skeleton" />
          <div className="h-6 w-40 skeleton rounded-lg" />
        </div>
        <div className="flex items-end justify-between h-48 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-1 skeleton rounded-t-xl" style={{ height: `${30 + Math.random() * 60}%` }} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/40 space-y-2">
          <div className="h-6 w-44 skeleton rounded-lg" />
          <div className="h-4 w-64 skeleton rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <div className="h-4 w-28 skeleton rounded-lg" />
              <div className="h-4 w-20 skeleton rounded-lg" />
              <div className="h-4 w-24 skeleton rounded-lg" />
              <div className="ml-auto h-4 w-16 skeleton rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
