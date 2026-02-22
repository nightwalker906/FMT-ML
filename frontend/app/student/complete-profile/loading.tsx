export default function StudentCompleteProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 skeleton rounded-lg" />
          <div className="h-4 w-16 skeleton rounded-lg" />
        </div>
        <div className="h-2 w-full skeleton rounded-full" />
      </div>

      <div className="card p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 skeleton rounded-xl" />
          <div className="h-4 w-72 skeleton rounded-lg" />
        </div>

        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl skeleton" />
          <div className="space-y-2">
            <div className="h-9 w-28 skeleton rounded-xl" />
            <div className="h-3 w-40 skeleton rounded-lg" />
          </div>
        </div>

        <div className="divider" />

        {/* Form fields */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 skeleton rounded-lg" />
            <div className="h-11 w-full skeleton rounded-xl" />
          </div>
        ))}

        {/* Subjects multi-select */}
        <div className="space-y-2">
          <div className="h-4 w-20 skeleton rounded-lg" />
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-24 skeleton rounded-full" />
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <div className="h-4 w-32 skeleton rounded-lg" />
          <div className="h-24 w-full skeleton rounded-xl" />
        </div>

        <div className="flex justify-between pt-4">
          <div className="h-11 w-24 skeleton rounded-xl" />
          <div className="h-11 w-32 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  )
}
