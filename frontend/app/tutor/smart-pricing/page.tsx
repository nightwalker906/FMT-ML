'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SmartPricingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tutor/dashboard?openPricing=1');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Redirecting to Smart Pricing...</p>
      </div>
    </div>
  );
}
