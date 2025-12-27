'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Get Student Bookings
// ============================================================================

export async function getStudentBookings() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', upcoming: [], past: [] }
  }

  const now = new Date().toISOString()

  // Get upcoming bookings (without join since tutor_id references auth.users)
  const { data: upcoming, error: upcomingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('student_id', user.id)
    .gte('scheduled_at', now)
    .in('status', ['pending', 'accepted'])
    .order('scheduled_at', { ascending: true })

  if (upcomingError) {
    console.error('Error fetching upcoming bookings:', upcomingError)
  }

  // Get past bookings
  const { data: past, error: pastError } = await supabase
    .from('bookings')
    .select('*')
    .eq('student_id', user.id)
    .or(`scheduled_at.lt.${now},status.eq.completed`)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  if (pastError) {
    console.error('Error fetching past bookings:', pastError)
  }

  // Get tutor profiles for all bookings
  const allBookings = [...(upcoming || []), ...(past || [])]
  const tutorIds = [...new Set(allBookings.map(b => b.tutor_id))]
  
  const { data: tutorProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', tutorIds)

  // Create tutor map
  const tutorMap: Record<string, { id: string; first_name: string; last_name: string }> = {}
  tutorProfiles?.forEach(p => {
    tutorMap[p.id] = p
  })

  // Add tutor info to bookings
  const upcomingWithTutor = (upcoming || []).map(b => ({
    ...b,
    tutor: tutorMap[b.tutor_id] || null
  }))

  const pastWithTutor = (past || []).map(b => ({
    ...b,
    tutor: tutorMap[b.tutor_id] || null
  }))

  // Check which past bookings have reviews
  const pastWithReviewStatus = await Promise.all(
    pastWithTutor.map(async (booking) => {
      const { data: review } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', booking.id)
        .single()
      
      return {
        ...booking,
        hasReview: !!review
      }
    })
  )

  return {
    upcoming: upcomingWithTutor,
    past: pastWithReviewStatus
  }
}

// ============================================================================
// Submit Review
// ============================================================================

export async function submitReview(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const tutorId = formData.get('tutorId') as string
  const bookingId = formData.get('bookingId') as string
  const rating = parseInt(formData.get('rating') as string)
  const reviewText = formData.get('reviewText') as string

  if (!tutorId || !bookingId || !rating) {
    return { error: 'Missing required fields' }
  }

  // Check if review already exists for this booking
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .single()

  if (existingReview) {
    return { error: 'You have already reviewed this session' }
  }

  // Insert the review
  const { error } = await supabase
    .from('reviews')
    .insert({
      booking_id: bookingId,
      student_id: user.id,
      tutor_id: tutorId,
      rating: rating,
      comment: reviewText
    })

  if (error) {
    return { error: error.message }
  }

  // Update booking status to completed if not already
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)
  }

  // Update tutor's average rating
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('tutor_id', tutorId)

  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    await supabase
      .from('tutors')
      .update({ average_rating: avgRating })
      .eq('profile_id', tutorId)
  }

  revalidatePath('/student/schedule')
  
  return { success: true }
}

// ============================================================================
// Search Tutors
// ============================================================================

export async function searchTutors(filters?: {
  subject?: string
  minPrice?: number
  maxPrice?: number
  isOnline?: boolean
}) {
  const supabase = await createClient()

  // First, fetch all tutors
  let query = supabase
    .from('tutors')
    .select('*')

  // Apply price filters (check for undefined/null, not just truthy)
  if (filters?.minPrice !== undefined && filters.minPrice !== null && filters.minPrice > 0) {
    query = query.gte('hourly_rate', filters.minPrice)
  }
  if (filters?.maxPrice !== undefined && filters.maxPrice !== null && filters.maxPrice < 200) {
    query = query.lte('hourly_rate', filters.maxPrice)
  }

  const { data: tutorsData, error: tutorsError } = await query.order('average_rating', { ascending: false, nullsFirst: false })

  if (tutorsError) {
    console.error('Error searching tutors:', tutorsError)
    return { tutors: [], error: tutorsError.message }
  }

  if (!tutorsData || tutorsData.length === 0) {
    return { tutors: [] }
  }

  // Fetch profiles for all tutors
  const profileIds = tutorsData.map(t => t.profile_id)
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, is_online')
    .in('id', profileIds)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
  }

  // Combine tutors with their profiles
  const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
  let tutors = tutorsData.map(tutor => ({
    ...tutor,
    profile: profilesMap.get(tutor.profile_id) || null
  }))

  // Filter by subject if provided (subjects is stored in qualifications JSON)
  if (filters?.subject && filters.subject.trim() !== '') {
    const searchSubject = filters.subject.toLowerCase()
    tutors = tutors.filter(tutor => {
      const qualifications = tutor.qualifications || []
      return qualifications.some((q: string) => 
        q.toLowerCase().includes(searchSubject)
      )
    })
  }

  // Filter by online status if specified
  if (filters?.isOnline === true) {
    tutors = tutors.filter(tutor => tutor.profile?.is_online === true)
  }

  return { tutors }
}

// ============================================================================
// Get All Subjects (for filter dropdown)
// ============================================================================

export async function getSubjects() {
  const supabase = await createClient()
  
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching subjects:', error)
    return []
  }

  return subjects || []
}

// ============================================================================
// Book a Session
// ============================================================================

export async function bookSession(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated. Please log in to book a session.' }
  }

  const tutorId = formData.get('tutorId') as string
  const subject = formData.get('subject') as string
  const scheduledAt = formData.get('scheduledAt') as string
  const duration = formData.get('duration') as string
  const notes = formData.get('notes') as string

  if (!tutorId || !subject || !scheduledAt) {
    return { error: 'Please fill in all required fields.' }
  }

  // Validate the scheduled time is in the future
  const scheduledDate = new Date(scheduledAt)
  if (scheduledDate <= new Date()) {
    return { error: 'Please select a future date and time.' }
  }

  // Check if the student has a pending booking with the same tutor at the same time
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('student_id', user.id)
    .eq('tutor_id', tutorId)
    .eq('scheduled_at', scheduledAt)
    .in('status', ['pending', 'accepted'])
    .single()

  if (existingBooking) {
    return { error: 'You already have a booking with this tutor at this time.' }
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      student_id: user.id,
      tutor_id: tutorId,
      subject,
      scheduled_at: scheduledAt,
      notes: notes ? `Duration: ${duration} minutes. ${notes}` : `Duration: ${duration} minutes.`,
      status: 'pending'
    })

  if (error) {
    console.error('Booking error:', error)
    return { error: 'Failed to create booking. Please try again.' }
  }

  revalidatePath('/student/schedule')
  revalidatePath('/tutor/requests')
  
  return { success: true }
}
