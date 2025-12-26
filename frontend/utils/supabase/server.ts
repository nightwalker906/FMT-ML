import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client with user authentication (reads cookies)
 * Use this in Server Components and Server Actions to get the current user
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

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

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
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
