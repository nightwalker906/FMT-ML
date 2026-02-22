'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Check, X, Loader2, Inbox, MessageSquare } from 'lucide-react'
import { getPendingRequests, respondToBooking } from '@/app/actions/tutor'

type Request = {
  id: string
  studentId: string
  studentName: string
  studentAvatar: string
  subject: string
  scheduledAt: string
  notes: string | null
  createdAt: string
}

export default function TutorRequestsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<Request[]>([])
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const result = await getPendingRequests()
    if (result.success && result.data) {
      setRequests(result.data)
    }
    setLoading(false)
  }

  async function handleRespond(requestId: string, action: 'accept' | 'reject') {
    setResponding(requestId)
    
    const result = await respondToBooking(requestId, action)
    
    if (result.success) {
      // Remove the request from the list
      setRequests(prev => prev.filter(r => r.id !== requestId))
    }
    
    setResponding(null)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  function getTimeAgo(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Session Requests</h1>
        <p className="text-slate-500 dark:text-slate-400">Review and respond to student booking requests</p>
      </div>

      {/* Request Count */}
      <div className="flex items-center gap-2 text-sm">
        <span className="badge-primary font-semibold">
          {requests.length} pending
        </span>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-12 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Pending Requests</h3>
          <p className="text-slate-500 dark:text-slate-400">
            When students book sessions with you, their requests will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                layout
                className="card overflow-hidden hover:shadow-card-hover transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 border-2 border-slate-200 dark:border-slate-600">
                        {request.studentAvatar ? (
                          <img src={request.studentAvatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold text-lg">
                            {request.studentName?.[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                          {request.studentName}
                        </h3>
                        <p className="text-primary-600 dark:text-primary-400 font-medium">{request.subject}</p>
                      </div>
                    </div>
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      {getTimeAgo(request.createdAt)}
                    </span>
                  </div>

                  {/* Session Details */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-100 dark:border-slate-700/30">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span className="font-medium">{formatDate(request.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span className="font-medium">{formatTime(request.scheduledAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {request.notes && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>Student&apos;s Notes:</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 bg-primary-50/50 dark:bg-primary-950/20 rounded-xl p-3 text-sm border border-primary-100 dark:border-primary-900/30">
                        {request.notes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRespond(request.id, 'accept')}
                      disabled={responding === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 font-medium"
                    >
                      {responding === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Accept
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRespond(request.id, 'reject')}
                      disabled={responding === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 font-medium"
                    >
                      {responding === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Decline
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
