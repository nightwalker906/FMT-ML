'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {/* Background mesh */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative max-w-md w-full text-center space-y-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center"
        >
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </motion.div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            An unexpected error occurred. Don&apos;t worry, your data is safe.
            Try again or head back to the home page.
          </p>
        </div>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-left"
          >
            <p className="text-xs font-mono text-red-300 break-all">
              {error.message}
            </p>
          </motion.div>
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
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </motion.span>
          </Link>
        </div>

        {/* Digest */}
        {error?.digest && (
          <p className="text-xs text-slate-600">
            Error ID: {error.digest}
          </p>
        )}
      </motion.div>
    </div>
  )
}
