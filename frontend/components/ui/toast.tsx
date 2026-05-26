'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION SYSTEM — Stripe-quality feedback
// ═══════════════════════════════════════════════════════════════════════════

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
}

const borders = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }])
  }, [])

  const value: ToastContextType = {
    toast: addToast,
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container — Bottom Right */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const duration = toast.duration || 4000
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  // Progress bar countdown
  useEffect(() => {
    if (isPaused) return

    const startTime = Date.now()
    const endTime = startTime + duration

    const updateProgress = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const newProgress = (remaining / duration) * 100
      setProgress(newProgress)

      if (remaining > 0 && !isPaused) {
        requestAnimationFrame(updateProgress)
      }
    }

    const rafId = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(rafId)
  }, [duration, isPaused])

  // Auto-dismiss timer
  useEffect(() => {
    if (isPaused) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss, duration, isPaused])

  // Swipe to dismiss
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    if (info.offset.x > 100 || info.velocity.x > 500) {
      onDismiss()
    }
  }

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onHoverStart={() => setIsPaused(true)}
      onHoverEnd={() => setIsPaused(false)}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'pointer-events-auto relative overflow-hidden',
        'flex items-start gap-3 px-4 py-3.5',
        'bg-white dark:bg-slate-800',
        'rounded-xl shadow-glass-lg dark:shadow-glass-dark-lg',
        'border border-slate-200/60 dark:border-slate-700/50',
        'border-l-4',
        borders[toast.type]
      )}
    >
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700">
        <motion.div
          className={cn('h-full', progressColors[toast.type])}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      {/* Icon with animation */}
      <motion.div
        className="flex-shrink-0 mt-0.5"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        {icons[toast.type]}
      </motion.div>

      <p className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{toast.message}</p>

      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
