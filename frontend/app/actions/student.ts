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

  // Get upcoming bookings
  const { data: upcoming, error: upcomingError } = await supabase
    .from('bookings')
    .select(`
      *,
      tutor:tutor_id (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
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
    .select(`
      *,
      tutor:tutor_id (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('student_id', user.id)
    .or(`scheduled_at.lt.${now},status.eq.completed`)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  if (pastError) {
    console.error('Error fetching past bookings:', pastError)
  }

  // Check which past bookings have reviews
  const pastWithReviewStatus = await Promise.all(
    (past || []).map(async (booking) => {
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
    upcoming: upcoming || [],
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

  let query = supabase
    .from('tutors')
    .select(`
      *,
      profile:profiles!tutors_profile_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        is_online
      )
    `)

  // Apply filters
  if (filters?.minPrice) {
    query = query.gte('hourly_rate', filters.minPrice)
  }
  if (filters?.maxPrice) {
    query = query.lte('hourly_rate', filters.maxPrice)
  }

  const { data: tutors, error } = await query.order('average_rating', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error searching tutors:', error)
    return { tutors: [], error: error.message }
  }

  // Filter by subject if provided (subjects is stored in qualifications JSON)
  let filteredTutors = tutors || []
  
  if (filters?.subject) {
    filteredTutors = filteredTutors.filter(tutor => {
      const qualifications = tutor.qualifications || []
      return qualifications.some((q: string) => 
        q.toLowerCase().includes(filters.subject!.toLowerCase())
      )
    })
  }

  // Filter by online status if specified
  if (filters?.isOnline) {
    filteredTutors = filteredTutors.filter(tutor => tutor.profile?.is_online)
  }

  return { tutors: filteredTutors }
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
    return { error: 'Not authenticated' }
  }

  const tutorId = formData.get('tutorId') as string
  const subject = formData.get('subject') as string
  const scheduledAt = formData.get('scheduledAt') as string
  const notes = formData.get('notes') as string

  if (!tutorId || !subject || !scheduledAt) {
    return { error: 'Missing required fields' }
  }

  const { error } = await supabase
    .from('bookings')
    .insert({
      student_id: user.id,
      tutor_id: tutorId,
      subject,
      scheduled_at: scheduledAt,
      notes,
      status: 'pending'
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/student/schedule')
  revalidatePath('/tutor/requests')
  
  return { success: true }
}
