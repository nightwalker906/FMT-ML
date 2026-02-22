export default function TutorNotificationsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 skeleton rounded-xl" />
          <div className="h-5 w-56 skeleton rounded-xl" />
        </div>
        <div className="h-9 w-28 skeleton rounded-xl" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 skeleton rounded-full" />
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="card p-4 flex items-start gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-10 w-10 rounded-xl skeleton flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-64 skeleton rounded-lg" />
              <div className="h-3 w-full skeleton rounded-lg" />
              <div className="h-3 w-24 skeleton rounded-lg" />
            </div>
            <div className="h-2 w-2 rounded-full skeleton flex-shrink-0 mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
