'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
// Types
// ============================================================================

export interface TutorStats {
  totalEarnings: number;
  activeRequests: number;
  totalHours: number;
  averageRating: number;
  hourlyRate: number;
  isAvailable: boolean;
}

export interface BookingRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  subject: string;
  scheduledAt: string;
  notes: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface UpcomingSession {
  id: string;
  studentName: string;
  studentAvatar: string;
  subject: string;
  scheduledAt: string;
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get tutor statistics including earnings, requests, and hours
 */
export async function getTutorStats(): Promise<{ success: boolean; data?: TutorStats; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get tutor profile
    const { data: tutor, error: tutorError } = await supabase
      .from('tutors')
      .select('hourly_rate, average_rating')
      .eq('profile_id', user.id)
      .single();

    // Get is_online from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_online')
      .eq('id', user.id)
      .single();

    if (tutorError) {
      // If tutor doesn't exist, return default values
      return {
        success: true,
        data: {
          totalEarnings: 0,
          activeRequests: 0,
          totalHours: 0,
          averageRating: 0,
          hourlyRate: 0,
          isAvailable: profile?.is_online ?? false,
        },
      };
    }

    // Get completed bookings count (total hours = completed sessions)
    const { count: completedCount, error: completedError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', user.id)
      .eq('status', 'completed');

    // Get pending bookings count (active requests)
    const { count: pendingCount, error: pendingError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', user.id)
      .eq('status', 'pending');

    const totalHours = completedCount || 0;
    const activeRequests = pendingCount || 0;
    const totalEarnings = totalHours * (tutor?.hourly_rate || 0);

    return {
      success: true,
      data: {
        totalEarnings,
        activeRequests,
        totalHours,
        averageRating: tutor?.average_rating || 0,
        hourlyRate: tutor?.hourly_rate || 0,
        isAvailable: profile?.is_online ?? false,
      },
    };
  } catch (error) {
    console.error('getTutorStats error:', error);
    return { success: false, error: 'Failed to fetch tutor stats' };
  }
}

/**
 * Toggle tutor availability status
 */
export async function updateTutorStatus(
  isAvailable: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update is_online in profiles table (not tutors)
    const { error } = await supabase
      .from('profiles')
      .update({ is_online: isAvailable })
      .eq('id', user.id);

    if (error) {
      console.error('updateTutorStatus error:', error);
      return { success: false, error: 'Failed to update status' };
    }

    revalidatePath('/tutor/dashboard');
    return { success: true };
  } catch (error) {
    console.error('updateTutorStatus error:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

/**
 * Respond to a booking request (accept or reject)
 */
export async function respondToBooking(
  bookingId: string,
  action: 'accept' | 'reject'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify booking belongs to this tutor
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('tutor_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (booking.tutor_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      console.error('respondToBooking error:', error);
      return { success: false, error: 'Failed to update booking' };
    }

    revalidatePath('/tutor/dashboard');
    return { success: true };
  } catch (error) {
    console.error('respondToBooking error:', error);
    return { success: false, error: 'Failed to respond to booking' };
  }
}

/**
 * Get pending booking requests for the tutor
 */
export async function getBookingRequests(): Promise<{
  success: boolean;
  data?: BookingRequest[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get pending bookings with student profile info
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        subject,
        scheduled_at,
        notes,
        status,
        created_at
      `)
      .eq('tutor_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getBookingRequests error:', error);
      return { success: false, error: 'Failed to fetch bookings' };
    }

    // Get student profiles for these bookings
    const studentIds = [...new Set(bookings?.map(b => b.student_id) || [])];
    
    let profilesMap: Record<string, { full_name: string; avatar_url: string }> = {};
    
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.id] = {
            full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.first_name || ''} ${p.last_name || ''}`)}`,
          };
          return acc;
        }, {} as Record<string, { full_name: string; avatar_url: string }>);
      }
    }

    const formattedBookings: BookingRequest[] = (bookings || []).map(b => ({
      id: b.id,
      studentId: b.student_id,
      studentName: profilesMap[b.student_id]?.full_name || 'Student',
      studentAvatar: profilesMap[b.student_id]?.avatar_url || `https://ui-avatars.com/api/?name=Student`,
      subject: b.subject || 'General Tutoring',
      scheduledAt: b.scheduled_at,
      notes: b.notes,
      status: b.status,
      createdAt: b.created_at,
    }));

    return { success: true, data: formattedBookings };
  } catch (error) {
    console.error('getBookingRequests error:', error);
    return { success: false, error: 'Failed to fetch bookings' };
  }
}

/**
 * Get upcoming accepted sessions for the tutor
 */
export async function getUpcomingSessions(): Promise<{
  success: boolean;
  data?: UpcomingSession[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get accepted bookings scheduled for the future
    const { data: sessions, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        subject,
        scheduled_at
      `)
      .eq('tutor_id', user.id)
      .eq('status', 'accepted')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (error) {
      console.error('getUpcomingSessions error:', error);
      return { success: false, error: 'Failed to fetch sessions' };
    }

    // Get student profiles
    const studentIds = [...new Set(sessions?.map(s => s.student_id) || [])];
    
    let profilesMap: Record<string, { full_name: string; avatar_url: string }> = {};
    
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.id] = {
            full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.first_name || ''} ${p.last_name || ''}`)}`,
          };
          return acc;
        }, {} as Record<string, { full_name: string; avatar_url: string }>);
      }
    }

    const formattedSessions: UpcomingSession[] = (sessions || []).map(s => ({
      id: s.id,
      studentName: profilesMap[s.student_id]?.full_name || 'Student',
      studentAvatar: profilesMap[s.student_id]?.avatar_url || `https://ui-avatars.com/api/?name=Student`,
      subject: s.subject || 'General Tutoring',
      scheduledAt: s.scheduled_at,
    }));

    return { success: true, data: formattedSessions };
  } catch (error) {
    console.error('getUpcomingSessions error:', error);
    return { success: false, error: 'Failed to fetch sessions' };
  }
}
/**
 * Get tutor earnings data for the earnings page
 */
export async function getTutorEarnings(): Promise<{
  success: boolean;
  data?: {
    totalEarnings: number;
    monthlyEarnings: number;
    completedSessions: Array<{
      id: string;
      studentName: string;
      subject: string;
      completedAt: string;
      amount: number;
    }>;
    earningsByMonth: Array<{
      month: string;
      amount: number;
    }>;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get tutor hourly rate
    const { data: tutor } = await supabase
      .from('tutors')
      .select('hourly_rate')
      .eq('profile_id', user.id)
      .single();

    const hourlyRate = tutor?.hourly_rate || 0;

    // Get all completed bookings
    const { data: completedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        subject,
        scheduled_at,
        created_at
      `)
      .eq('tutor_id', user.id)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false });

    if (bookingsError) {
      console.error('getTutorEarnings error:', bookingsError);
      return { success: false, error: 'Failed to fetch earnings' };
    }

    // Get student profiles
    const studentIds = [...new Set(completedBookings?.map(b => b.student_id) || [])];
    let profilesMap: Record<string, string> = {};
    
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student';
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Calculate earnings
    const completedSessions = (completedBookings || []).map(b => ({
      id: b.id,
      studentName: profilesMap[b.student_id] || 'Student',
      subject: b.subject || 'General Tutoring',
      completedAt: b.scheduled_at,
      amount: hourlyRate, // Each session = 1 hour at hourly rate
    }));

    const totalEarnings = completedSessions.reduce((sum, s) => sum + s.amount, 0);

    // Calculate monthly earnings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyEarnings = completedSessions
      .filter(s => {
        const date = new Date(s.completedAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, s) => sum + s.amount, 0);

    // Group earnings by month (last 6 months)
    const earningsByMonth: Array<{ month: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthEarnings = completedSessions
        .filter(s => {
          const sDate = new Date(s.completedAt);
          return sDate.getMonth() === date.getMonth() && sDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, s) => sum + s.amount, 0);
      earningsByMonth.push({ month: monthStr, amount: monthEarnings });
    }

    return {
      success: true,
      data: {
        totalEarnings,
        monthlyEarnings,
        completedSessions: completedSessions.slice(0, 20), // Limit to recent 20
        earningsByMonth,
      },
    };
  } catch (error) {
    console.error('getTutorEarnings error:', error);
    return { success: false, error: 'Failed to fetch earnings' };
  }
}

/**
 * Get all pending requests for the requests page (same as getBookingRequests but with more data)
 */
export async function getPendingRequests(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentAvatar: string;
    subject: string;
    scheduledAt: string;
    notes: string | null;
    createdAt: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get pending bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        subject,
        scheduled_at,
        notes,
        created_at
      `)
      .eq('tutor_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getPendingRequests error:', error);
      return { success: false, error: 'Failed to fetch requests' };
    }

    // Get student profiles
    const studentIds = [...new Set(bookings?.map(b => b.student_id) || [])];
    let profilesMap: Record<string, { name: string; avatar: string }> = {};
    
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', studentIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student';
          acc[p.id] = {
            name,
            avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          };
          return acc;
        }, {} as Record<string, { name: string; avatar: string }>);
      }
    }

    const formattedRequests = (bookings || []).map(b => ({
      id: b.id,
      studentId: b.student_id,
      studentName: profilesMap[b.student_id]?.name || 'Student',
      studentAvatar: profilesMap[b.student_id]?.avatar || `https://ui-avatars.com/api/?name=Student`,
      subject: b.subject || 'General Tutoring',
      scheduledAt: b.scheduled_at,
      notes: b.notes,
      createdAt: b.created_at,
    }));

    return { success: true, data: formattedRequests };
  } catch (error) {
    console.error('getPendingRequests error:', error);
    return { success: false, error: 'Failed to fetch requests' };
  }
}