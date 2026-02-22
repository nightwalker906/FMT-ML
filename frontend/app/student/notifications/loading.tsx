export default function NotificationsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 skeleton rounded-xl" />
          <div className="h-5 w-52 skeleton rounded-xl" />
        </div>
        <div className="h-9 w-28 skeleton rounded-xl" />
      </div>

      {/* Notification items */}
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-4 flex items-start gap-4" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="h-10 w-10 rounded-xl skeleton flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 skeleton rounded-lg" />
              <div className="h-3 w-1/2 skeleton rounded-lg" />
            </div>
            <div className="h-3 w-16 skeleton rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
