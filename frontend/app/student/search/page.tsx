'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Star, DollarSign, Clock, ChevronDown, X, Loader2, MapPin, BookOpen } from 'lucide-react'
import { searchTutors, getSubjects, bookSession } from '@/app/actions/student'

type Tutor = {
  profile_id: string
  experience_years: number
  hourly_rate: number
  qualifications: string[]
  teaching_style: string
  bio_text: string
  average_rating: number
  profile: {
    id: string
    first_name: string
    last_name: string
    avatar_url?: string
    is_online: boolean
  }
}

type Subject = {
  id: string
  name: string
  category: string
}

export default function StudentSearchPage() {
  const [loading, setLoading] = useState(true)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filters
  const [selectedSubject, setSelectedSubject] = useState('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200])
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Booking modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [bookingSubject, setBookingSubject] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [tutorData, subjectData] = await Promise.all([
      searchTutors(),
      getSubjects()
    ])
    
    setTutors(tutorData.tutors || [])
    setSubjects(subjectData || [])
    setLoading(false)
  }

  async function applyFilters() {
    setLoading(true)
    const data = await searchTutors({
      subject: selectedSubject || undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      isOnline: onlineOnly || undefined
    })
    setTutors(data.tutors || [])
    setLoading(false)
    setShowFilters(false)
  }

  function clearFilters() {
    setSelectedSubject('')
    setPriceRange([0, 200])
    setOnlineOnly(false)
    loadData()
  }

  function openBookingModal(tutor: Tutor) {
    setSelectedTutor(tutor)
    setBookingSubject('')
    setBookingDate('')
    setBookingTime('')
    setBookingNotes('')
    setBookingSuccess(false)
    setBookingModalOpen(true)
  }

  async function handleBookSession() {
    if (!selectedTutor || !bookingSubject || !bookingDate || !bookingTime) return
    
    setBooking(true)
    const scheduledAt = new Date(`${bookingDate}T${bookingTime}`).toISOString()
    
    const formData = new FormData()
    formData.append('tutorId', selectedTutor.profile_id)
    formData.append('subject', bookingSubject)
    formData.append('scheduledAt', scheduledAt)
    formData.append('notes', bookingNotes)

    const result = await bookSession(formData)
    
    if (result.success) {
      setBookingSuccess(true)
      setTimeout(() => {
        setBookingModalOpen(false)
      }, 2000)
    }
    setBooking(false)
  }

  // Filter tutors by search query
  const filteredTutors = tutors.filter(tutor => {
    if (!searchQuery) return true
    const fullName = `${tutor.profile?.first_name} ${tutor.profile?.last_name}`.toLowerCase()
    const quals = (tutor.qualifications || []).join(' ').toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || quals.includes(searchQuery.toLowerCase())
  })

  if (loading && tutors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find a Tutor</h1>
        <p className="text-gray-600">Browse and book sessions with expert tutors</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or subject..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Filter className="h-5 w-5" />
          Filters
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range: ${priceRange[0]} - ${priceRange[1]}/hr
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                  className="flex-1 accent-teal-600"
                />
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="flex-1 accent-teal-600"
                />
              </div>
            </div>

            {/* Online Only Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
              <button
                onClick={() => setOnlineOnly(!onlineOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  onlineOnly
                    ? 'bg-teal-50 border-teal-500 text-teal-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${onlineOnly ? 'bg-green-500' : 'bg-gray-400'}`} />
                Online Now Only
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Clear All
            </button>
            <button
              onClick={applyFilters}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {(selectedSubject || onlineOnly || priceRange[0] > 0 || priceRange[1] < 200) && (
        <div className="flex flex-wrap gap-2">
          {selectedSubject && (
            <span className="flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
              {selectedSubject}
              <button onClick={() => setSelectedSubject('')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {onlineOnly && (
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              Online Now
              <button onClick={() => setOnlineOnly(false)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(priceRange[0] > 0 || priceRange[1] < 200) && (
            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              ${priceRange[0]} - ${priceRange[1]}/hr
              <button onClick={() => setPriceRange([0, 200])}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-gray-500">
        {filteredTutors.length} tutor{filteredTutors.length !== 1 ? 's' : ''} found
      </p>

      {/* Tutor Cards Grid */}
      {filteredTutors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tutors found matching your criteria</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-teal-600 hover:text-teal-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutors.map((tutor) => (
            <div
              key={tutor.profile_id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Tutor Header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                      {tutor.profile?.avatar_url ? (
                        <img
                          src={tutor.profile.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-500 text-xl font-semibold">
                          {tutor.profile?.first_name?.[0]}{tutor.profile?.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    {tutor.profile?.is_online && (
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {tutor.profile?.first_name} {tutor.profile?.last_name}
                    </h3>
                    {tutor.average_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {tutor.average_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {tutor.bio_text && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                    {tutor.bio_text}
                  </p>
                )}

                {/* Qualifications */}
                {tutor.qualifications && tutor.qualifications.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {tutor.qualifications.slice(0, 3).map((qual, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {qual}
                      </span>
                    ))}
                    {tutor.qualifications.length > 3 && (
                      <span className="px-2 py-0.5 text-gray-400 text-xs">
                        +{tutor.qualifications.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{tutor.experience_years}+ yrs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{tutor.teaching_style || 'Flexible'}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                  {tutor.hourly_rate}/hr
                </div>
                <button
                  onClick={() => openBookingModal(tutor)}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Book Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && selectedTutor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            {bookingSuccess ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Session Requested!</h3>
                <p className="text-gray-500 mt-2">The tutor will review your booking request</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Book a Session</h3>
                  <button
                    onClick={() => setBookingModalOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Tutor Info */}
                <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
                    {selectedTutor.profile?.avatar_url ? (
                      <img
                        src={selectedTutor.profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-500 font-semibold">
                        {selectedTutor.profile?.first_name?.[0]}{selectedTutor.profile?.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedTutor.profile?.first_name} {selectedTutor.profile?.last_name}
                    </p>
                    <p className="text-sm text-teal-600">${selectedTutor.hourly_rate}/hr</p>
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <select
                    value={bookingSubject}
                    onChange={(e) => setBookingSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name}
                      </option>
                    ))}
                    {selectedTutor.qualifications?.map((qual, idx) => (
                      <option key={`qual-${idx}`} value={qual}>
                        {qual}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                    placeholder="What would you like to focus on?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setBookingModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookSession}
                    disabled={booking || !bookingSubject || !bookingDate || !bookingTime}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {booking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    Request Session
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
