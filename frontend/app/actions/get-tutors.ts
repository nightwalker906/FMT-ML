'use server'

import { createClient } from '@/utils/supabase/server'

export type TutorWithProfile = {
  profile_id: string
  experience_years: number
  hourly_rate: number
  qualifications: string[]
  teaching_style: string
  bio_text: string
  average_rating: number | null
  availability: Record<string, unknown> | null
  profiles: {
    id: string
    first_name: string
    last_name: string
  } | null
}

/**
 * Fetch all tutors with their profile information
 * @returns Array of tutors with profile data (full_name derived from first_name + last_name)
 */
export async function getTutors(): Promise<TutorWithProfile[]> {
  const supabase = await createClient()

  // First, fetch all tutors
  const { data: tutorsData, error: tutorsError } = await supabase
    .from('tutors')
    .select('*')
    .order('average_rating', { ascending: false, nullsFirst: false })

  if (tutorsError) {
    console.error('Error fetching tutors:', tutorsError)
    return []
  }

  if (!tutorsData || tutorsData.length === 0) {
    return []
  }

  // Fetch profiles for all tutors
  const profileIds = tutorsData.map(t => t.profile_id)
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', profileIds)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
  }

  // Combine tutors with their profiles
  const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
  const tutors = tutorsData.map(tutor => ({
    ...tutor,
    profiles: profilesMap.get(tutor.profile_id) || null
  }))

  return tutors
}
