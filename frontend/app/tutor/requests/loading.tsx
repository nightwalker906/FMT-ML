export default function RequestsLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="h-5 w-72 skeleton rounded-xl" />
      </div>

      {/* Badge */}
      <div className="h-7 w-28 skeleton rounded-xl" />

      {/* Request cards */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 space-y-4" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl skeleton" />
                <div className="space-y-2">
                  <div className="h-5 w-36 skeleton rounded-lg" />
                  <div className="h-4 w-24 skeleton rounded-lg" />
                </div>
              </div>
              <div className="h-4 w-14 skeleton rounded-lg" />
            </div>
            <div className="h-14 skeleton rounded-xl" />
            <div className="flex gap-3">
              <div className="flex-1 h-11 skeleton rounded-xl" />
              <div className="flex-1 h-11 skeleton rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
