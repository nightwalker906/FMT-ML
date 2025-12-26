'use client'

import { useState, useEffect } from 'react'
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
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Session Requests</h1>
        <p className="text-gray-600">Review and respond to student booking requests</p>
      </div>

      {/* Request Count */}
      <div className="flex items-center gap-2 text-sm">
        <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
          {requests.length} pending
        </span>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
          <p className="text-gray-500">
            When students book sessions with you, their requests will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {request.studentAvatar ? (
                        <img
                          src={request.studentAvatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-500 font-semibold text-lg">
                          {request.studentName?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {request.studentName}
                      </h3>
                      <p className="text-teal-600 font-medium">{request.subject}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    {getTimeAgo(request.createdAt)}
                  </span>
                </div>

                {/* Session Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{formatDate(request.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{formatTime(request.scheduledAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {request.notes && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Student's Notes:</span>
                    </div>
                    <p className="text-gray-700 bg-blue-50 rounded-lg p-3 text-sm">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleRespond(request.id, 'accept')}
                    disabled={responding === request.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {responding === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(request.id, 'reject')}
                    disabled={responding === request.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {responding === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
