export default function QuickTutorLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl skeleton" />
          <div className="space-y-2">
            <div className="h-5 w-36 skeleton rounded-lg" />
            <div className="h-3 w-24 skeleton rounded-lg" />
          </div>
        </div>
        <div className="h-9 w-24 skeleton rounded-xl" />
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-center">
          <div className="h-48 w-80 skeleton rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 skeleton rounded-xl" />
          ))}
        </div>
      </div>

      {/* Input skeleton */}
      <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-700/40">
        <div className="h-14 skeleton rounded-2xl" />
      </div>
    </div>
  );
}
