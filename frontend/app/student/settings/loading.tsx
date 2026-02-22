export default function SettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-32 skeleton rounded-xl" />
        <div className="h-5 w-56 skeleton rounded-xl" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <div className="h-9 w-24 skeleton rounded-lg" />
        <div className="h-9 w-24 skeleton rounded-lg" />
        <div className="h-9 w-28 skeleton rounded-lg" />
      </div>

      {/* Settings card */}
      <div className="card p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl skeleton" />
          <div className="space-y-2">
            <div className="h-5 w-40 skeleton rounded-lg" />
            <div className="h-4 w-56 skeleton rounded-lg" />
          </div>
        </div>

        <div className="divider" />

        {/* Form fields */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 skeleton rounded-lg" />
            <div className="h-11 w-full skeleton rounded-xl" />
          </div>
        ))}

        {/* Save button */}
        <div className="h-11 w-32 skeleton rounded-xl" />
      </div>
    </div>
  )
}
