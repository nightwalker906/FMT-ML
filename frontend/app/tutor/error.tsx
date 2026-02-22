'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TutorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Tutor section error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-md w-full text-center space-y-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 border border-red-200 dark:border-red-500/20 flex items-center justify-center"
        >
          <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
        </motion.div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            We hit a snag loading this page. This is usually temporary — please try again.
          </p>
        </div>

        {/* Dev error details */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 text-left">
            <p className="text-xs font-mono text-red-600 dark:text-red-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={reset}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/tutor/dashboard')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </motion.button>
        </div>

        {error?.digest && (
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Error ID: {error.digest}
          </p>
        )}
      </motion.div>
    </div>
  )
}
