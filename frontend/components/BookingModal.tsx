'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { bookSession } from '@/app/actions/student'

// ── Types ────────────────────────────────────────────────────────────────────
interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  tutor: {
    id: string
    first_name: string
    last_name: string
    hourly_rate: number
    qualifications: string[]
    availability?: Record<string, any>
  }
}

type BookingState = 'form' | 'submitting' | 'success' | 'error'

// ── Duration options ─────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { value: '30', label: '30 min', price: 0.5 },
  { value: '60', label: '1 hour', price: 1 },
  { value: '90', label: '1.5 hours', price: 1.5 },
  { value: '120', label: '2 hours', price: 2 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1) // At least tomorrow
  return d.toISOString().slice(0, 10)
}

function getMaxDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 2) // Up to 2 months ahead
  return d.toISOString().slice(0, 10)
}

// ── Overlay + Modal animation ────────────────────────────────────────────────
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
}

// ═════════════════════════════════════════════════════════════════════════════
//  BOOKING MODAL
// ═════════════════════════════════════════════════════════════════════════════

export default function BookingModal({ isOpen, onClose, tutor }: BookingModalProps) {
  const [subject, setSubject] = useState(tutor.qualifications?.[0] || '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<BookingState>('form')
  const [errorMsg, setErrorMsg] = useState('')

  const hourlyRate = Number(tutor.hourly_rate) || 0
  const durationMultiplier = DURATION_OPTIONS.find((d) => d.value === duration)?.price || 1
  const estimatedCost = (hourlyRate * durationMultiplier).toFixed(2)

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!subject || !date || !time) {
      setErrorMsg('Please fill in all required fields.')
      setState('error')
      return
    }

    // Build ISO datetime
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

    setState('submitting')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('tutorId', tutor.id)
    formData.append('subject', subject)
    formData.append('scheduledAt', scheduledAt)
    formData.append('duration', duration)
    formData.append('notes', notes)

    const result = await bookSession(formData)

    if (result.success) {
      setState('success')
      // Auto-close after 2 seconds
      setTimeout(() => {
        resetAndClose()
      }, 2000)
    } else {
      setErrorMsg(result.error || 'Something went wrong. Please try again.')
      setState('error')
    }
  }

  function resetAndClose() {
    setState('form')
    setDate('')
    setTime('10:00')
    setNotes('')
    setErrorMsg('')
    onClose()
  }

  // ── Availability hint ──────────────────────────────────────────────────────
  const availableDays = tutor.availability?.days as string[] | undefined

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={resetAndClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-glass-lg dark:shadow-glass-dark-lg border border-slate-200/60 dark:border-slate-700/50 overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin"
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Book a Session</h3>
                <p className="text-teal-100 text-sm">
                  with {tutor.first_name} {tutor.last_name}
                </p>
              </div>
              <button
                onClick={resetAndClose}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Success State ─────────────────────────────────────────── */}
            {state === 'success' && (
              <div className="px-6 py-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Booking Requested!
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {tutor.first_name} will review your request and confirm shortly.
                </p>
              </div>
            )}

            {/* ── Form State ──────────────────────────────────────────── */}
            {state !== 'success' && (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {/* Error banner */}
                {state === 'error' && errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
                  </motion.div>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <BookOpen className="w-4 h-4 inline mr-1 -mt-0.5" />
                    Subject *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  >
                    <option value="">Select a subject</option>
                    {tutor.qualifications?.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Calendar className="w-4 h-4 inline mr-1 -mt-0.5" />
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={getMinDate()}
                    max={getMaxDate()}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  />
                  {availableDays && availableDays.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      💡 Available: {availableDays.join(', ')}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    <Clock className="w-4 h-4 inline mr-1 -mt-0.5" />
                    Time *
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    min="07:00"
                    max="21:00"
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Duration
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDuration(opt.value)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                          duration === opt.value
                            ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-primary-600 shadow-md shadow-primary-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="What topics would you like to cover?"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors resize-none"
                  />
                </div>

                {/* Price Summary */}
                <div className="bg-gradient-to-r from-slate-50 to-primary-50/30 dark:from-slate-800 dark:to-primary-950/30 rounded-xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-700/50">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Estimated Cost
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    R{estimatedCost}
                  </span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={state === 'submitting'}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
                >
                  {state === 'submitting' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
