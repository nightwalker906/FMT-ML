'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Profile Actions
// ============================================================================

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const bio = formData.get('bio') as string
  const phone = formData.get('phone') as string

  // Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone_number: phone
    })
    .eq('id', user.id)

  if (profileError) {
    return { error: profileError.message }
  }

  // Check user type and update bio in the right table
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type === 'tutor') {
    await supabase
      .from('tutors')
      .update({ bio_text: bio })
      .eq('profile_id', user.id)
  } else if (profile?.user_type === 'student') {
    // Students don't have a bio field, but we can add it to learning_goals or skip
  }

  revalidatePath('/student/settings')
  revalidatePath('/tutor/settings')
  
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { error: 'File must be an image' }
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File must be less than 5MB' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/avatar.${fileExt}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Update profile with avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: publicUrl
    })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/student/settings')
  revalidatePath('/tutor/settings')
  
  return { success: true, url: publicUrl }
}

// ============================================================================
// Security Actions
// ============================================================================

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// ============================================================================
// Preferences Actions
// ============================================================================

export async function updatePreferences(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const emailNotifications = formData.get('emailNotifications') === 'true'

  // Try to update existing settings, or create new ones
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update({
        notify_email_bookings: emailNotifications,
        notify_email_messages: emailNotifications
      })
      .eq('id', user.id)

    if (error) {
      return { error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({
        id: user.id,
        notify_email_bookings: emailNotifications,
        notify_email_messages: emailNotifications
      })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/student/settings')
  revalidatePath('/tutor/settings')
  
  return { success: true }
}

// ============================================================================
// Get User Settings Data
// ============================================================================

export async function getUserSettings() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get tutor-specific data if applicable
  let tutorData = null
  if (profile?.user_type === 'tutor') {
    const { data } = await supabase
      .from('tutors')
      .select('bio_text')
      .eq('profile_id', user.id)
      .single()
    tutorData = data
  }

  // Get user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    profile,
    tutorData,
    settings,
    email: user.email
  }
}
