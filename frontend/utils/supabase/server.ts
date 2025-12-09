import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using Service Role Key
 * ⚠️ NEVER expose this to the client or browser
 * This client has FULL access to the database for admin operations
 * Use only in server-side code (API routes, server actions, backend services)
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create a profile in the database after user signup
 * This links the auth.users record to the profiles table
 * Must be called server-side with Service Role key
 */
export async function createUserProfile(
  userId: string,
  email: string,
  userType: 'student' | 'tutor',
  firstName?: string,
  lastName?: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: userId,
        email,
        user_type: userType,
        first_name: firstName || '',
        last_name: lastName || '',
        is_online: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`)
  }

  return data
}
