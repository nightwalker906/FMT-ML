'use server';

import { createAdminClient } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/client';

// ============================================================================
// MESSAGE SERVER ACTIONS
// ============================================================================

/**
 * Send a message from the authenticated user to another user
 */
export async function sendMessage(receiverId: string, content: string) {
  try {
    if (!receiverId || !content.trim()) {
      return { error: 'Receiver ID and content are required' };
    }

    const supabase = createAdminClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Prevent sending messages to yourself
    if (user.id === receiverId) {
      return { error: 'Cannot send messages to yourself' };
    }

    // Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }

    return { success: true, message: data };
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations() {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Get conversations (unique tutor/student pairs with latest message)
    const { data, error } = await supabase
      .rpc('get_user_conversations', { user_id: user.id });

    if (error) {
      console.error('Error fetching conversations:', error);
      return { error: 'Failed to fetch conversations' };
    }

    return { success: true, conversations: data || [] };
  } catch (error) {
    console.error('Error in getConversations:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get messages with a specific user
 */
export async function getMessageHistory(otherUserId: string, limit = 50) {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Fetch messages between current user and the other user
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return { error: 'Failed to fetch messages' };
    }

    return { success: true, messages: data || [] };
  } catch (error) {
    console.error('Error in getMessageHistory:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(otherUserId: string) {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', otherUserId);

    if (error) {
      console.error('Error marking messages as read:', error);
      return { error: 'Failed to update message status' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// SETTINGS SERVER ACTIONS
// ============================================================================

/**
 * Update user profile (name, bio, learning goals)
 */
export async function updateProfile(
  displayName: string,
  bio: string,
  learningGoals: string
) {
  try {
    if (!displayName.trim()) {
      return { error: 'Display name is required' };
    }

    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Update profile in auth.users metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          display_name: displayName,
          bio: bio.trim(),
          learning_goals: learningGoals.trim(),
        },
      }
    );

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { error: 'Failed to update profile' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { error: 'Password must be at least 8 characters' };
    }

    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      console.error('Error updating password:', error);
      return { error: 'Failed to update password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updatePassword:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Delete user account
 */
export async function deleteAccount() {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Delete user account
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      console.error('Error deleting account:', error);
      return { error: 'Failed to delete account' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  emailOnSessionAccepted: boolean,
  emailOnMessage: boolean,
  marketingEmails: boolean
) {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Upsert notification settings
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        email_on_session_accepted: emailOnSessionAccepted,
        email_on_message: emailOnMessage,
        marketing_emails: marketingEmails,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating notification settings:', error);
      return { error: 'Failed to update notification settings' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateNotificationSettings:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar(file: File) {
  try {
    if (!file) {
      return { error: 'No file provided' };
    }

    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Create file path: avatars/{user_id}/{timestamp}-{filename}
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return { error: 'Failed to upload avatar' };
    }

    // Get public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

    return { success: true, avatarUrl: data.publicUrl };
  } catch (error) {
    console.error('Error in uploadAvatar:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get user's notification settings
 */
export async function getNotificationSettings() {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      console.error('Error fetching notification settings:', error);
      return { error: 'Failed to fetch notification settings' };
    }

    // Return default settings if none exist
    return {
      success: true,
      settings: data || {
        email_on_session_accepted: true,
        email_on_message: true,
        marketing_emails: false,
      },
    };
  } catch (error) {
    console.error('Error in getNotificationSettings:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// BOOKING SERVER ACTIONS
// ============================================================================

/**
 * Create a new booking (student books a session with tutor)
 */
export async function createBooking(
  tutorId: string,
  subject: string,
  scheduledAt: string,
  notes?: string
) {
  try {
    if (!tutorId || !subject.trim() || !scheduledAt) {
      return { error: 'Tutor ID, subject, and scheduled time are required' };
    }

    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Prevent booking with yourself
    if (user.id === tutorId) {
      return { error: 'Cannot book a session with yourself' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        student_id: user.id,
        tutor_id: tutorId,
        subject: subject.trim(),
        scheduled_at: scheduledAt,
        notes: notes?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      return { error: 'Failed to create booking' };
    }

    return { success: true, booking: data };
  } catch (error) {
    console.error('Error in createBooking:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all bookings for the current user (as student or tutor)
 */
export async function getBookings(role: 'student' | 'tutor' = 'student') {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const field = role === 'student' ? 'student_id' : 'tutor_id';

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq(field, user.id)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return { error: 'Failed to fetch bookings' };
    }

    return { success: true, bookings: data || [] };
  } catch (error) {
    console.error('Error in getBookings:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update booking status (accept, reject, complete, cancel)
 */
export async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
) {
  try {
    if (!bookingId || !status) {
      return { error: 'Booking ID and status are required' };
    }

    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking status:', error);
      return { error: 'Failed to update booking' };
    }

    return { success: true, booking: data };
  } catch (error) {
    console.error('Error in updateBookingStatus:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string) {
  return updateBookingStatus(bookingId, 'cancelled');
}

// ============================================================================
// TUTOR REQUEST SERVER ACTIONS
// ============================================================================

/**
 * Create a new tutor request (student drops a request for tutors to see)
 */
export async function createTutorRequest(
  subject: string,
  description: string,
  budgetRange?: string
) {
  try {
    if (!subject.trim() || !description.trim()) {
      return { error: 'Subject and description are required' };
    }

    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('tutor_requests')
      .insert({
        student_id: user.id,
        subject: subject.trim(),
        description: description.trim(),
        budget_range: budgetRange?.trim() || null,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tutor request:', error);
      return { error: 'Failed to create request' };
    }

    return { success: true, request: data };
  } catch (error) {
    console.error('Error in createTutorRequest:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get all open tutor requests
 */
export async function getOpenTutorRequests(limit = 20) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tutor_requests')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching tutor requests:', error);
      return { error: 'Failed to fetch requests' };
    }

    return { success: true, requests: data || [] };
  } catch (error) {
    console.error('Error in getOpenTutorRequests:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get requests created by current user
 */
export async function getMyTutorRequests() {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('tutor_requests')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user requests:', error);
      return { error: 'Failed to fetch your requests' };
    }

    return { success: true, requests: data || [] };
  } catch (error) {
    console.error('Error in getMyTutorRequests:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  requestId: string,
  status: 'open' | 'closed' | 'fulfilled'
) {
  try {
    if (!requestId || !status) {
      return { error: 'Request ID and status are required' };
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tutor_requests')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating request status:', error);
      return { error: 'Failed to update request' };
    }

    return { success: true, request: data };
  } catch (error) {
    console.error('Error in updateRequestStatus:', error);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// USER SETTINGS SERVER ACTIONS
// ============================================================================

/**
 * Update user notification settings
 */
export async function updateUserSettings(
  notifyEmailBookings: boolean,
  notifyEmailMessages: boolean,
  notifyMarketing: boolean
) {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        id: user.id,
        notify_email_bookings: notifyEmailBookings,
        notify_email_messages: notifyEmailMessages,
        notify_marketing: notifyMarketing,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return { error: 'Failed to update settings' };
    }

    return { success: true, settings: data };
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Get current user's notification settings
 */
export async function getUserSettings() {
  try {
    const supabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user settings:', error);
      return { error: 'Failed to fetch settings' };
    }

    // Return default settings if none exist
    return {
      success: true,
      settings: data || {
        id: user.id,
        notify_email_bookings: true,
        notify_email_messages: true,
        notify_marketing: false,
      },
    };
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return { error: 'An unexpected error occurred' };
  }
}
