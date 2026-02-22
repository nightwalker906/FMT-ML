'use client';

import dynamic from 'next/dynamic';

const QuickTutor = dynamic(() => import('@/components/ai/QuickTutor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading Quick Tutor…</p>
      </div>
    </div>
  ),
});

export default function QuickTutorPage() {
  return <QuickTutor />;
}
