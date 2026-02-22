export default function TutorStudentsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 skeleton rounded-xl" />
          <div className="h-5 w-52 skeleton rounded-xl" />
        </div>
        <div className="h-10 w-28 skeleton rounded-xl" />
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="flex-1 h-11 skeleton rounded-xl" />
        <div className="h-11 w-28 skeleton rounded-xl" />
      </div>

      {/* Student cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 space-y-4" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl skeleton" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 skeleton rounded-lg" />
                <div className="h-3 w-24 skeleton rounded-lg" />
              </div>
            </div>
            <div className="divider" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 skeleton rounded-lg" />
              <div className="h-3 w-16 skeleton rounded-lg" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 skeleton rounded-full" />
              <div className="h-6 w-20 skeleton rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 flex-1 skeleton rounded-xl" />
              <div className="h-9 flex-1 skeleton rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
