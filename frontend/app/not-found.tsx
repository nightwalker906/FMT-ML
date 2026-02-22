'use client'

import Link from 'next/link'
import { Search, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-primary-500/5 dark:bg-primary-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-lg w-full text-center space-y-8 animate-fade-in">
        {/* Big 404 */}
        <div className="relative">
          <h1 className="text-[10rem] sm:text-[12rem] font-black leading-none tracking-tighter bg-gradient-to-br from-primary-400 via-primary-500 to-accent-500 bg-clip-text text-transparent select-none">
            404
          </h1>
          <div className="absolute inset-0 text-[10rem] sm:text-[12rem] font-black leading-none tracking-tighter text-primary-500/5 dark:text-primary-500/10 blur-2xl select-none">
            404
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3 -mt-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Page not found
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. 
            Let&apos;s get you back on track.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/student/search"
            className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Search className="w-4 h-4" />
            Find a Tutor
          </Link>
        </div>

        {/* Back link */}
        <div>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-500 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go back to previous page
          </button>
        </div>
      </div>
    </div>
  )
}
