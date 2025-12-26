'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Star, X, Loader2, CheckCircle, MessageSquare } from 'lucide-react'
import { getStudentBookings, submitReview } from '@/app/actions/student'

type Booking = {
  id: string
  subject: string
  status: string
  scheduled_at: string
  notes?: string
  tutor_id: string
  tutor: {
    id: string
    first_name: string
    last_name: string
    avatar_url?: string
  }
  hasReview?: boolean
}

export default function StudentSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<Booking[]>([])
  const [past, setPast] = useState<Booking[]>([])
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    const data = await getStudentBookings()
    if (!data.error) {
      setUpcoming(data.upcoming)
      setPast(data.past)
    }
    setLoading(false)
  }

  function openReviewModal(booking: Booking) {
    setSelectedBooking(booking)
    setRating(5)
    setReviewText('')
    setSubmitSuccess(false)
    setReviewModalOpen(true)
  }

  async function handleSubmitReview() {
    if (!selectedBooking) return
    
    setSubmitting(true)
    const formData = new FormData()
    formData.append('tutorId', selectedBooking.tutor_id)
    formData.append('bookingId', selectedBooking.id)
    formData.append('rating', rating.toString())
    formData.append('reviewText', reviewText)

    const result = await submitReview(formData)
    
    if (result.success) {
      setSubmitSuccess(true)
      // Update local state
      setPast(prev => prev.map(b => 
        b.id === selectedBooking.id ? { ...b, hasReview: true } : b
      ))
      setTimeout(() => {
        setReviewModalOpen(false)
      }, 1500)
    }
    setSubmitting(false)
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

  function getStatusColor(status: string) {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'completed': return 'bg-blue-100 text-blue-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-gray-600">View your upcoming and past tutoring sessions</p>
      </div>

      {/* Upcoming Sessions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-teal-600" />
          Upcoming Sessions
        </h2>
        
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming sessions</p>
            <p className="text-sm text-gray-400 mt-1">Book a tutor to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {booking.tutor?.avatar_url ? (
                        <img
                          src={booking.tutor.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-500 font-semibold">
                          {booking.tutor?.first_name?.[0]}{booking.tutor?.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {booking.tutor?.first_name} {booking.tutor?.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{booking.subject}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                
                <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(booking.scheduled_at)}</span>
                  </div>
                </div>

                {booking.notes && (
                  <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    {booking.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Sessions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Past Sessions
        </h2>
        
        {past.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No past sessions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {past.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {booking.tutor?.avatar_url ? (
                        <img
                          src={booking.tutor.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-500 font-semibold">
                          {booking.tutor?.first_name?.[0]}{booking.tutor?.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {booking.tutor?.first_name} {booking.tutor?.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{booking.subject}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                    {!booking.hasReview && booking.status === 'completed' && (
                      <button
                        onClick={() => openReviewModal(booking)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <Star className="h-4 w-4" />
                        Write Review
                      </button>
                    )}
                    {booking.hasReview && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Reviewed
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(booking.scheduled_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Review Modal */}
      {reviewModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            {submitSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900">Review Submitted!</h3>
                <p className="text-gray-500 mt-2">Thank you for your feedback</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    {selectedBooking.tutor?.avatar_url ? (
                      <img
                        src={selectedBooking.tutor.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-500 font-semibold">
                        {selectedBooking.tutor?.first_name?.[0]}{selectedBooking.tutor?.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.tutor?.first_name} {selectedBooking.tutor?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedBooking.subject}</p>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Text */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review (Optional)
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    placeholder="Share your experience with this tutor..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Submit Review
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
