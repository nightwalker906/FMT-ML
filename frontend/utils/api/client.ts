/**
 * API Client for Django REST Framework Backend
 * Handles all communication with the FMT backend API at http://localhost:8000/api/
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

/**
 * Makes an API request to the Django backend
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, token } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization token if provided
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: data?.detail || data?.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage,
      status: 0,
    };
  }
}

// ============================================================================
// Tutors API
// ============================================================================

export interface Tutor {
  id: number;
  profile: Profile;
  bio: string;
  subjects: number[];
  hourly_rate: number;
  average_rating?: number;
  created_at: string;
  updated_at: string;
}

export async function fetchTutors(token?: string): Promise<ApiResponse<Tutor[]>> {
  return apiRequest<Tutor[]>('/tutors/', { token });
}

export async function fetchTutor(id: number, token?: string): Promise<ApiResponse<Tutor>> {
  return apiRequest<Tutor>(`/tutors/${id}/`, { token });
}

export async function fetchTutorRating(id: number, token?: string): Promise<ApiResponse<{ average_rating: number }>> {
  return apiRequest<{ average_rating: number }>(`/tutors/${id}/rating/`, { token });
}

export async function createTutor(data: Partial<Tutor>, token?: string): Promise<ApiResponse<Tutor>> {
  return apiRequest<Tutor>('/tutors/', {
    method: 'POST',
    body: data,
    token,
  });
}

// ============================================================================
// Students API
// ============================================================================

export interface Student {
  id: number;
  profile: Profile;
  grade_level: string;
  subjects_learning: number[];
  created_at: string;
  updated_at: string;
}

export async function fetchStudents(token?: string): Promise<ApiResponse<Student[]>> {
  return apiRequest<Student[]>('/students/', { token });
}

export async function fetchStudent(id: number, token?: string): Promise<ApiResponse<Student>> {
  return apiRequest<Student>(`/students/${id}/`, { token });
}

export async function createStudent(data: Partial<Student>, token?: string): Promise<ApiResponse<Student>> {
  return apiRequest<Student>('/students/', {
    method: 'POST',
    body: data,
    token,
  });
}

// ============================================================================
// Profiles API
// ============================================================================

export interface Profile {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'student' | 'tutor';
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchProfiles(token?: string): Promise<ApiResponse<Profile[]>> {
  return apiRequest<Profile[]>('/profiles/', { token });
}

export async function fetchProfile(id: number, token?: string): Promise<ApiResponse<Profile>> {
  return apiRequest<Profile>(`/profiles/${id}/`, { token });
}

export async function fetchProfileByRole(role: 'tutors' | 'students', token?: string): Promise<ApiResponse<Profile[]>> {
  return apiRequest<Profile[]>(`/profiles/${role}/`, { token });
}

export async function createProfile(data: Partial<Profile>, token?: string): Promise<ApiResponse<Profile>> {
  return apiRequest<Profile>('/profiles/', {
    method: 'POST',
    body: data,
    token,
  });
}

export async function updateProfile(id: number, data: Partial<Profile>, token?: string): Promise<ApiResponse<Profile>> {
  return apiRequest<Profile>(`/profiles/${id}/`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

// ============================================================================
// Sessions API
// ============================================================================

export interface Session {
  id: number;
  tutor: number;
  student: number;
  subject: number;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSessions(token?: string): Promise<ApiResponse<Session[]>> {
  return apiRequest<Session[]>('/sessions/', { token });
}

export async function fetchSession(id: number, token?: string): Promise<ApiResponse<Session>> {
  return apiRequest<Session>(`/sessions/${id}/`, { token });
}

export async function fetchSessionsByStatus(status: string, token?: string): Promise<ApiResponse<Session[]>> {
  return apiRequest<Session[]>(`/sessions/by_status/?status=${status}`, { token });
}

export async function fetchMySessionsStatus(token?: string): Promise<ApiResponse<Session[]>> {
  return apiRequest<Session[]>('/sessions/my_sessions/', { token });
}

export async function createSession(data: Partial<Session>, token?: string): Promise<ApiResponse<Session>> {
  return apiRequest<Session>('/sessions/', {
    method: 'POST',
    body: data,
    token,
  });
}

export async function updateSession(id: number, data: Partial<Session>, token?: string): Promise<ApiResponse<Session>> {
  return apiRequest<Session>(`/sessions/${id}/`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

// ============================================================================
// Subjects API
// ============================================================================

export interface Subject {
  id: number;
  name: string;
  category: 'STEM' | 'Languages' | 'Arts' | 'Humanities' | 'Other';
  description?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSubjects(token?: string): Promise<ApiResponse<Subject[]>> {
  return apiRequest<Subject[]>('/subjects/', { token });
}

export async function fetchSubject(id: number, token?: string): Promise<ApiResponse<Subject>> {
  return apiRequest<Subject>(`/subjects/${id}/`, { token });
}

// ============================================================================
// Ratings API
// ============================================================================

export interface Rating {
  id: number;
  session: number;
  rating: number; // 1-5 stars
  comment?: string;
  created_by: number; // Student who created the rating
  created_at: string;
  updated_at: string;
}

export async function fetchRatings(token?: string): Promise<ApiResponse<Rating[]>> {
  return apiRequest<Rating[]>('/ratings/', { token });
}

export async function fetchRating(id: number, token?: string): Promise<ApiResponse<Rating>> {
  return apiRequest<Rating>(`/ratings/${id}/`, { token });
}

export async function fetchRatingsByTutor(tutorId: number, token?: string): Promise<ApiResponse<Rating[]>> {
  return apiRequest<Rating[]>(`/ratings/by_tutor/?tutor_id=${tutorId}`, { token });
}

export async function createRating(data: Partial<Rating>, token?: string): Promise<ApiResponse<Rating>> {
  return apiRequest<Rating>('/ratings/', {
    method: 'POST',
    body: data,
    token,
  });
}
