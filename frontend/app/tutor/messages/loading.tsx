export default function TutorMessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      {/* Conversation List */}
      <div className="w-80 border-r border-slate-200/60 dark:border-slate-700/40 flex flex-col">
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/40">
          <div className="h-10 skeleton rounded-xl" />
        </div>
        <div className="flex-1 p-2 space-y-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="h-12 w-12 rounded-xl skeleton flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 skeleton rounded-lg" />
                <div className="h-3 w-40 skeleton rounded-lg" />
              </div>
              <div className="h-3 w-10 skeleton rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/40 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl skeleton" />
          <div className="space-y-2">
            <div className="h-4 w-32 skeleton rounded-lg" />
            <div className="h-3 w-20 skeleton rounded-lg" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`skeleton rounded-2xl ${i % 2 === 0 ? 'h-12 w-64' : 'h-16 w-48'}`} />
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/40">
          <div className="h-12 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  )
}
