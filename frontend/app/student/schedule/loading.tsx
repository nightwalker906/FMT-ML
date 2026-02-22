export default function ScheduleLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 skeleton rounded-xl" />
        <div className="h-5 w-64 skeleton rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <div className="h-10 w-28 skeleton rounded-xl" />
        <div className="h-10 w-28 skeleton rounded-xl" />
      </div>

      {/* Session cards */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl skeleton" />
                <div className="space-y-2">
                  <div className="h-5 w-36 skeleton rounded-lg" />
                  <div className="h-4 w-24 skeleton rounded-lg" />
                </div>
              </div>
              <div className="h-6 w-20 skeleton rounded-xl" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-28 skeleton rounded-lg" />
              <div className="h-4 w-20 skeleton rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
