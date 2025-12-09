import { NextRequest, NextResponse } from 'next/server'
import { createUserProfile } from '@/utils/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/auth/create-profile
 * Creates a user profile after successful Supabase auth signup
 * 
 * Body: {
 *   userId: string (from auth.users.id)
 *   email: string
 *   userType: 'student' | 'tutor'
 *   firstName?: string
 *   lastName?: string
 * }
 * 
 * This endpoint runs server-side only and uses the Service Role key
 * to create the profile record linked to the auth user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, userType, firstName, lastName } = body

    // Validate required fields
    if (!userId || !email || !userType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, userType' },
        { status: 400 }
      )
    }

    if (!['student', 'tutor'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid userType: must be "student" or "tutor"' },
        { status: 400 }
      )
    }

    // Create the profile using Service Role key (server-side)
    const profile = await createUserProfile(
      userId,
      email,
      userType,
      firstName,
      lastName
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Profile created successfully',
        profile,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create profile',
      },
      { status: 500 }
    )
  }
}
