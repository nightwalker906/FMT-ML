/**
 * Custom React Hooks for API Data Fetching
 * Provides convenient hooks for common API operations with loading/error states
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  fetchTutors,
  fetchTutor,
  fetchTutorRating,
  fetchStudents,
  fetchStudent,
  fetchProfiles,
  fetchProfile,
  fetchProfileByRole,
  fetchSessions,
  fetchSession,
  fetchSessionsByStatus,
  fetchMySessionsStatus,
  fetchSubjects,
  fetchSubject,
  fetchRatings,
  fetchRating,
  fetchRatingsByTutor,
  createSession,
  createRating,
  updateSession,
  updateProfile,
  type ApiResponse,
  type Tutor,
  type Student,
  type Profile,
  type Session,
  type Subject,
  type Rating,
} from './client';

// ============================================================================
// Generic Data Fetching Hook
// ============================================================================

interface UseQueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseQueryOptions {
  enabled?: boolean;
}

export function useQuery<T>(
  queryFn: (token?: string) => Promise<ApiResponse<T>>,
  options: UseQueryOptions = {}
): UseQueryState<T> {
  const { session } = useAuth();
  const { enabled = true } = options;
  const [state, setState] = useState<UseQueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await queryFn(session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch data' });
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [queryFn, session?.access_token, enabled]);

  return state;
}

// ============================================================================
// Tutors Hooks
// ============================================================================

export function useTutors() {
  return useQuery<Tutor[]>(fetchTutors);
}

export function useTutor(id: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Tutor>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchTutor(id, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch tutor' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [id, session?.access_token]);

  return state;
}

export function useTutorRating(tutorId: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<{ average_rating: number }>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchTutorRating(tutorId, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch rating' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [tutorId, session?.access_token]);

  return state;
}

// ============================================================================
// Students Hooks
// ============================================================================

export function useStudents() {
  return useQuery<Student[]>(fetchStudents);
}

export function useStudent(id: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Student>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchStudent(id, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch student' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [id, session?.access_token]);

  return state;
}

// ============================================================================
// Profiles Hooks
// ============================================================================

export function useProfiles() {
  return useQuery<Profile[]>(fetchProfiles);
}

export function useProfile(id: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Profile>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchProfile(id, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch profile' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [id, session?.access_token]);

  return state;
}

// ============================================================================
// Sessions Hooks
// ============================================================================

export function useSessions() {
  return useQuery<Session[]>(fetchSessions);
}

export function useSession(id: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Session>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchSession(id, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch session' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [id, session?.access_token]);

  return state;
}

export function useSessionsByStatus(status: string) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Session[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchSessionsByStatus(status, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch sessions' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [status, session?.access_token]);

  return state;
}

export function useMySessionsStatus() {
  return useQuery<Session[]>(fetchMySessionsStatus);
}

// ============================================================================
// Subjects Hooks
// ============================================================================

export function useSubjects() {
  return useQuery<Subject[]>(fetchSubjects);
}

export function useSubject(id: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Subject>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchSubject(id, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch subject' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [id, session?.access_token]);

  return state;
}

// ============================================================================
// Ratings Hooks
// ============================================================================

export function useRatings() {
  return useQuery<Rating[]>(fetchRatings);
}

export function useRating(id: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Rating>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchRating(id, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch rating' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [id, session?.access_token]);

  return state;
}

export function useRatingsByTutor(tutorId: number) {
  const { session } = useAuth();
  const [state, setState] = useState<UseQueryState<Rating[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setState({ data: null, loading: true, error: null });
      const result = await fetchRatingsByTutor(tutorId, session?.access_token);

      if (mounted) {
        if (result.success && result.data) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error || 'Failed to fetch ratings' });
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [tutorId, session?.access_token]);

  return state;
}

// ============================================================================
// Mutation Hooks (Create/Update Operations)
// ============================================================================

export function useCreateSession() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (data: Partial<Session>) => {
      setLoading(true);
      setError(null);

      const result = await createSession(data, session?.access_token);

      if (!result.success) {
        setError(result.error || 'Failed to create session');
        setLoading(false);
        return null;
      }

      setLoading(false);
      return result.data || null;
    },
    [session?.access_token]
  );

  return { mutate, loading, error };
}

export function useCreateRating() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (data: Partial<Rating>) => {
      setLoading(true);
      setError(null);

      const result = await createRating(data, session?.access_token);

      if (!result.success) {
        setError(result.error || 'Failed to create rating');
        setLoading(false);
        return null;
      }

      setLoading(false);
      return result.data || null;
    },
    [session?.access_token]
  );

  return { mutate, loading, error };
}

export function useUpdateSession() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (id: number, data: Partial<Session>) => {
      setLoading(true);
      setError(null);

      const result = await updateSession(id, data, session?.access_token);

      if (!result.success) {
        setError(result.error || 'Failed to update session');
        setLoading(false);
        return null;
      }

      setLoading(false);
      return result.data || null;
    },
    [session?.access_token]
  );

  return { mutate, loading, error };
}

export function useUpdateProfile() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (id: number, data: Partial<Profile>) => {
      setLoading(true);
      setError(null);

      const result = await updateProfile(id, data, session?.access_token);

      if (!result.success) {
        setError(result.error || 'Failed to update profile');
        setLoading(false);
        return null;
      }

      setLoading(false);
      return result.data || null;
    },
    [session?.access_token]
  );

  return { mutate, loading, error };
}
