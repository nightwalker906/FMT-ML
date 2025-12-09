/**
 * API Client for Django Backend
 * Provides functions to interact with the Django REST API
 * Base URL: http://localhost:8000/api
 */

const API_BASE = 'http://localhost:8000/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Tutor {
  id: number;
  user: number;
  email?: string;
  full_name?: string;
  bio?: string;
  hourly_rate?: number;
  created_at?: string;
}

export interface Student {
  id: number;
  user: number;
  email?: string;
  full_name?: string;
  learning_goals?: string;
  created_at?: string;
}

export interface Profile {
  id: number;
  user: number;
  email?: string;
  full_name?: string;
  bio?: string;
  learning_goals?: string;
  hourly_rate?: number;
  role?: 'student' | 'tutor';
  avatar?: string;
  created_at?: string;
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
}

export interface Session {
  id: number;
  student: number;
  tutor: number;
  subject: number | Subject;
  scheduled_time?: string;
  duration_minutes?: number;
  status?: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface Rating {
  id: number;
  rater: number;
  tutor: number;
  score: number;
  comment?: string;
  created_at?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.detail || error.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// TUTOR API ENDPOINTS
// ============================================================================

/**
 * Get all tutors
 */
export async function fetchTutors(): Promise<ApiResponse<Tutor[]>> {
  return apiCall<Tutor[]>('/tutors/');
}

/**
 * Get a specific tutor
 */
export async function fetchTutor(tutorId: number): Promise<ApiResponse<Tutor>> {
  return apiCall<Tutor>(`/tutors/${tutorId}/`);
}

/**
 * Get ratings for a tutor
 */
export async function fetchTutorRating(
  tutorId: number
): Promise<ApiResponse<Rating[]>> {
  return apiCall<Rating[]>(`/tutors/${tutorId}/ratings/`);
}

// ============================================================================
// STUDENT API ENDPOINTS
// ============================================================================

/**
 * Get all students
 */
export async function fetchStudents(): Promise<ApiResponse<Student[]>> {
  return apiCall<Student[]>('/students/');
}

/**
 * Get a specific student
 */
export async function fetchStudent(studentId: number): Promise<ApiResponse<Student>> {
  return apiCall<Student>(`/students/${studentId}/`);
}

// ============================================================================
// PROFILE API ENDPOINTS
// ============================================================================

/**
 * Get all profiles
 */
export async function fetchProfiles(): Promise<ApiResponse<Profile[]>> {
  return apiCall<Profile[]>('/profiles/');
}

/**
 * Get a specific profile
 */
export async function fetchProfile(profileId: number): Promise<ApiResponse<Profile>> {
  return apiCall<Profile>(`/profiles/${profileId}/`);
}

/**
 * Get profiles by role (student or tutor)
 */
export async function fetchProfileByRole(
  role: 'student' | 'tutor'
): Promise<ApiResponse<Profile[]>> {
  return apiCall<Profile[]>(`/profiles/?role=${role}`);
}

/**
 * Update a profile
 */
export async function updateProfile(
  profileId: number,
  data: Partial<Profile>
): Promise<ApiResponse<Profile>> {
  return apiCall<Profile>(`/profiles/${profileId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// SUBJECT API ENDPOINTS
// ============================================================================

/**
 * Get all subjects
 */
export async function fetchSubjects(): Promise<ApiResponse<Subject[]>> {
  return apiCall<Subject[]>('/subjects/');
}

/**
 * Get a specific subject
 */
export async function fetchSubject(subjectId: number): Promise<ApiResponse<Subject>> {
  return apiCall<Subject>(`/subjects/${subjectId}/`);
}

// ============================================================================
// SESSION API ENDPOINTS
// ============================================================================

/**
 * Get all sessions
 */
export async function fetchSessions(): Promise<ApiResponse<Session[]>> {
  return apiCall<Session[]>('/sessions/');
}

/**
 * Get a specific session
 */
export async function fetchSession(sessionId: number): Promise<ApiResponse<Session>> {
  return apiCall<Session>(`/sessions/${sessionId}/`);
}

/**
 * Get sessions by status
 */
export async function fetchSessionsByStatus(
  status: 'scheduled' | 'completed' | 'cancelled'
): Promise<ApiResponse<Session[]>> {
  return apiCall<Session[]>(`/sessions/?status=${status}`);
}

/**
 * Get current user's sessions by status
 */
export async function fetchMySessionsStatus(
  status: 'scheduled' | 'completed' | 'cancelled'
): Promise<ApiResponse<Session[]>> {
  return apiCall<Session[]>(`/sessions/my-sessions/?status=${status}`);
}

/**
 * Create a new session
 */
export async function createSession(
  data: Partial<Session>
): Promise<ApiResponse<Session>> {
  return apiCall<Session>('/sessions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: number,
  data: Partial<Session>
): Promise<ApiResponse<Session>> {
  return apiCall<Session>(`/sessions/${sessionId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// RATING API ENDPOINTS
// ============================================================================

/**
 * Get all ratings
 */
export async function fetchRatings(): Promise<ApiResponse<Rating[]>> {
  return apiCall<Rating[]>('/ratings/');
}

/**
 * Get a specific rating
 */
export async function fetchRating(ratingId: number): Promise<ApiResponse<Rating>> {
  return apiCall<Rating>(`/ratings/${ratingId}/`);
}

/**
 * Get ratings for a specific tutor
 */
export async function fetchRatingsByTutor(
  tutorId: number
): Promise<ApiResponse<Rating[]>> {
  return apiCall<Rating[]>(`/ratings/?tutor=${tutorId}`);
}

/**
 * Create a new rating
 */
export async function createRating(
  data: Partial<Rating>
): Promise<ApiResponse<Rating>> {
  return apiCall<Rating>('/ratings/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// EXPORT TYPE ALIASES
// ============================================================================

export type { Tutor, Student, Profile, Subject, Session, Rating };
