# API Integration Guide

## Overview

The frontend uses two separate authentication and data systems:

1. **Supabase Auth** - User authentication (login/signup)
2. **Django REST API** - Data and business logic

This guide explains how to use the API integration layer.

## Setup

### Environment Variables

Ensure `.env.local` has the required variables:

```env
# Django Backend
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## API Client (`utils/api/client.ts`)

Low-level API communication with error handling.

### Basic Usage

```typescript
import { apiRequest } from '@/utils/api/client';

// GET request (no authentication)
const response = await apiRequest<Tutor[]>('/tutors/');

// GET request (with authentication)
const response = await apiRequest<Tutor[]>('/tutors/', {
  token: session?.access_token
});

// POST request
const response = await apiRequest<Tutor>('/tutors/', {
  method: 'POST',
  body: {
    user_id: userId,
    bio: 'My bio',
    hourly_rate: 50
  },
  token: session?.access_token
});
```

### Available Functions

```typescript
// Tutors
fetchTutors(token?: string)                    // GET all tutors
fetchTutor(id: number, token?: string)         // GET single tutor
fetchTutorRating(id: number, token?: string)   // GET tutor's average rating
createTutor(data, token?: string)              // POST new tutor

// Students
fetchStudents(token?: string)                  // GET all students
fetchStudent(id: number, token?: string)       // GET single student
createStudent(data, token?: string)            // POST new student

// Profiles
fetchProfiles(token?: string)                  // GET all profiles
fetchProfile(id: number, token?: string)       // GET single profile
fetchProfileByRole(role, token?: string)       // GET tutors or students
createProfile(data, token?: string)            // POST new profile
updateProfile(id, data, token?: string)        // PATCH profile

// Sessions
fetchSessions(token?: string)                  // GET all sessions
fetchSession(id: number, token?: string)       // GET single session
fetchSessionsByStatus(status, token?: string)  // GET sessions by status
fetchMySessionsStatus(token?: string)          // GET user's sessions
createSession(data, token?: string)            // POST new session
updateSession(id, data, token?: string)        // PATCH session

// Subjects
fetchSubjects(token?: string)                  // GET all subjects
fetchSubject(id: number, token?: string)       // GET single subject

// Ratings
fetchRatings(token?: string)                   // GET all ratings
fetchRating(id: number, token?: string)        // GET single rating
fetchRatingsByTutor(id, token?: string)        // GET ratings for tutor
createRating(data, token?: string)             // POST new rating
```

## React Hooks (`hooks/useApi.ts`)

High-level hooks for components with automatic loading/error states.

### Query Hooks (Read-Only)

```typescript
'use client';

import { useTutors, useSubjects, useSession } from '@/hooks/useApi';

export default function MyComponent() {
  // Load all tutors
  const { data: tutors, loading, error } = useTutors();
  
  // Load single session
  const { data: session, loading, error } = useSession(123);
  
  // Load subjects
  const { data: subjects, loading, error } = useSubjects();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {tutors?.map((tutor) => (
        <div key={tutor.id}>{tutor.profile.first_name}</div>
      ))}
    </div>
  );
}
```

### Mutation Hooks (Create/Update)

```typescript
'use client';

import { useCreateSession, useCreateRating, useUpdateProfile } from '@/hooks/useApi';

export default function BookingForm() {
  const { mutate: createSession, loading, error } = useCreateSession();
  
  const handleBooking = async () => {
    const newSession = await createSession({
      tutor: 1,
      student: 2,
      subject: 3,
      scheduled_time: '2024-12-20T14:00:00Z',
      duration_minutes: 60,
    });
    
    if (newSession) {
      console.log('Session created:', newSession);
    }
  };
  
  return (
    <div>
      <button onClick={handleBooking} disabled={loading}>
        {loading ? 'Booking...' : 'Book Session'}
      </button>
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}
```

## Available Hooks

### Read Hooks (with auto-refresh)

```typescript
// Tutors
const { data, loading, error } = useTutors();
const { data, loading, error } = useTutor(id);
const { data, loading, error } = useTutorRating(tutorId);

// Students
const { data, loading, error } = useStudents();
const { data, loading, error } = useStudent(id);

// Profiles
const { data, loading, error } = useProfiles();
const { data, loading, error } = useProfile(id);

// Sessions
const { data, loading, error } = useSessions();
const { data, loading, error } = useSession(id);
const { data, loading, error } = useSessionsByStatus('completed');
const { data, loading, error } = useMySessionsStatus();

// Subjects
const { data, loading, error } = useSubjects();
const { data, loading, error } = useSubject(id);

// Ratings
const { data, loading, error } = useRatings();
const { data, loading, error } = useRating(id);
const { data, loading, error } = useRatingsByTutor(tutorId);
```

### Write Hooks (mutations)

```typescript
// Create/Update return: { mutate, loading, error }

const { mutate: createSession, loading, error } = useCreateSession();
const { mutate: createRating, loading, error } = useCreateRating();
const { mutate: updateSession, loading, error } = useUpdateSession();
const { mutate: updateProfile, loading, error } = useUpdateProfile();

// Usage:
const result = await mutate(data);
```

## Complete Example: Tutors Page

```typescript
'use client';

import { useTutors, useSubjects } from '@/hooks/useApi';

export default function TutorsPage() {
  const { data: tutors, loading, error } = useTutors();
  const { data: subjects } = useSubjects();

  if (loading) return <div>Loading tutors...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid gap-4">
      {tutors?.map((tutor) => (
        <div key={tutor.id} className="border rounded p-4">
          <h3>{tutor.profile.first_name} {tutor.profile.last_name}</h3>
          <p>{tutor.bio}</p>
          <p className="font-bold">${tutor.hourly_rate}/hr</p>
          
          {/* Show subjects */}
          <div className="flex gap-2 mt-2">
            {tutor.subjects.map((subjectId: number) => {
              const subject = subjects?.find(s => s.id === subjectId);
              return <span key={subjectId}>{subject?.name}</span>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Authentication Flow

1. **User signs up in Supabase** (email/password)
2. **Supabase returns JWT token** in session
3. **Create profile in Django** after signup:
   ```typescript
   const { session, user } = useAuth();
   
   // After signup, create profile
   const profile = await createProfile({
     user_id: user!.id,
     first_name: 'John',
     last_name: 'Doe',
     email: user!.email!,
     role: 'student' // or 'tutor'
   }, session?.access_token);
   ```

4. **Use token in API calls**: The token is automatically included in all hooks
5. **Logout deletes session**: Token is removed on signout

## Error Handling

All API responses follow this pattern:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

// In client code:
const response = await fetchTutors();

if (!response.success) {
  console.error('Failed to fetch tutors:', response.error);
} else {
  console.log('Tutors:', response.data);
}
```

Hooks automatically handle errors:

```typescript
const { data, loading, error } = useTutors();

if (error) {
  // Error is a string message, ready to display
  return <div className="text-red-600">{error}</div>;
}
```

## CORS Configuration

The Django backend allows requests from any origin by default. If you see CORS errors:

1. Check that `django-cors-headers` is installed
2. Verify `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`

## Best Practices

1. **Use hooks in components** - Handles loading/error automatically
2. **Use client components** - Add `'use client'` at top of files using hooks
3. **Handle loading states** - Show spinners/skeletons while loading
4. **Catch errors** - Display user-friendly error messages
5. **Don't refetch unnecessarily** - Hooks cache data automatically
6. **Use token from useAuth()** - No need to pass token manually to hooks
7. **Validate data** - TypeScript types help but validate at runtime too

## Troubleshooting

### API returns 404
- Check endpoint path matches backend URLs
- Verify Django server is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### API returns 401 (Unauthorized)
- Token is missing or expired
- Check `session?.access_token` exists
- Verify user is logged in

### CORS errors
- Django server needs `CORS_ALLOWED_ORIGINS` configured
- Add `http://localhost:3000` to allowed origins
- Restart Django server after changes

### Data not updating
- Hook caches data for component lifetime
- To refresh: unmount and remount component
- Or create manual fetch function (don't use hooks)

## File Structure

```
utils/api/
├── client.ts          # Low-level API functions
hooks/
├── useApi.ts          # React hooks for data fetching
```

Use `client.ts` for:
- Custom/complex API calls
- Operations outside components
- Manual control over requests

Use hooks for:
- Regular data fetching in components
- Automatic loading/error handling
- Caching and real-time updates
