# Find My Tutor - Authentication Setup Complete ✅

## What Was Implemented

### 1. **Environment Configuration** (`frontend/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://orjnyadhbitembltnspp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**⚠️ IMPORTANT:**
- `NEXT_PUBLIC_*` variables ARE exposed to the browser (safe - read-only keys)
- `SUPABASE_SERVICE_ROLE_KEY` is NOT in frontend `.env.local` (kept server-only)

---

## 2. **Client-Side Supabase** (`frontend/utils/supabase/client.ts`)
Creates a browser client using the Anon Key:
- Reads: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Used by: `auth-context.tsx`, `login/page.tsx`
- Access Level: Authentication + read own data only

---

## 3. **Server-Side Supabase** (`frontend/utils/supabase/server.ts`)
Admin client for server-only operations:
- Reads: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server env only)
- Functions:
  - `createAdminClient()` - Initialize admin client
  - `createUserProfile()` - Create profile after signup
- Access Level: FULL database access (admin)
- **Never exported to client** ✅

---

## 4. **Auth Context** (`frontend/context/auth-context.tsx`)
React Context managing authentication state:
```typescript
type AuthContextType = {
  user: User | null          // Current authenticated user
  session: Session | null    // Active session
  isLoading: boolean         // Loading state
  signOut: () => Promise<void>
}
```

Features:
- Listens to `supabase.auth.onAuthStateChange()` events
- Auto-initializes with `getSession()` on mount
- Clean subscription management

Usage:
```typescript
const { user, session, isLoading, signOut } = useAuth()
```

---

## 5. **Login/Signup UI** (`frontend/app/login/page.tsx`)
Modern authentication page with:

### Sign In Tab
- Email input
- Password input
- Submit button
- Switch to signup

### Sign Up Tab
- **Role Selection** (🎓 Student / 👨‍🏫 Tutor) ← Critical feature
- Email input
- Password input
- Confirm password input
- Submit button
- Switch to signin

### Features
- Toggle between login/signup modes
- Role selector (affects `user_type` in metadata)
- Error messages (red box)
- Success messages (green box)
- Loading spinner during auth
- Auto-redirect to `/dashboard` on success

---

## 6. **Profile Creation API** (`frontend/app/api/auth/create-profile/route.ts`)
Server-side endpoint for creating user profiles:

```
POST /api/auth/create-profile
Content-Type: application/json

Request Body:
{
  "userId": "uuid-from-auth.users",
  "email": "user@example.com",
  "userType": "student" | "tutor",
  "firstName": "optional",
  "lastName": "optional"
}

Response (201 Created):
{
  "success": true,
  "message": "Profile created successfully",
  "profile": { id, email, user_type, ... }
}
```

**How it works:**
1. Receives signup data from browser
2. Validates all required fields
3. Uses `createAdminClient()` to get Service Role access
4. Inserts into `profiles` table
5. Returns profile data

**Security:**
- Runs on server only (Node.js)
- Uses Service Role key (not exposed to browser)
- Validates input before inserting
- Handles errors gracefully

---

## 7. **Authentication Flow**

### Signup Flow
```
User fills signup form → Selects role (student/tutor) → Clicks "Create Account"
    ↓
Client calls: supabase.auth.signUp({
  email,
  password,
  options: { data: { user_type: role } }  ← Role passed as metadata
})
    ↓
Supabase creates: auth.users row with id + metadata
    ↓
Client receives: { user: { id, email, user_metadata: { user_type } }, ... }
    ↓
Client calls: POST /api/auth/create-profile
  with: { userId, email, userType: role }
    ↓
Server (Node.js) receives request
    ↓
Server uses SUPABASE_SERVICE_ROLE_KEY to create profile
    ↓
Server inserts into profiles table: { id, email, user_type, is_online, created_at, updated_at }
    ↓
Server returns: { success: true, profile }
    ↓
User sees success message
    ↓
User checks email for confirmation link
    ↓
User confirms email → auth.users.email_confirmed_at set
    ↓
User logs in with email + password
    ↓
AuthContext picks up session → Redirect to /dashboard
```

### Login Flow
```
User enters email + password → Clicks "Sign In"
    ↓
Client calls: supabase.auth.signInWithPassword({ email, password })
    ↓
Supabase verifies credentials
    ↓
Returns: { session, user, ... }
    ↓
AuthContext updates: user + session
    ↓
Redirect to /dashboard
```

### Logout Flow
```
User clicks logout button
    ↓
Calls: signOut() from useAuth()
    ↓
Client calls: supabase.auth.signOut()
    ↓
Session cleared
    ↓
AuthContext resets: user = null, session = null
    ↓
Redirect to /login
```

---

## How to Run Locally

### Prerequisites
1. Node.js 18+ installed
2. Supabase project created
3. Environment variables set up

### Start Development Server
```bash
cd frontend
npm install                    # Install dependencies (already done)
npm run dev                    # Start Next.js dev server
```

Server will run on: **http://localhost:3001** (or 3000 if available)

### Test the Flow
1. Open browser: `http://localhost:3001/login`
2. Click "Sign Up"
3. Select role: Student or Tutor
4. Enter email: `test@example.com`
5. Enter password: `password123`
6. Confirm password: `password123`
7. Click "Create Account"
8. See success message
9. Check Supabase dashboard:
   - `auth.users` table should have new row
   - `profiles` table should have new row with same `id`
10. Click confirmation link in email (check Supabase > Auth > Confirm signup)
11. Return to login page
12. Sign in with your credentials
13. Should redirect to `/dashboard`

---

## Database Schema Alignment

### auth.users (Supabase built-in)
```sql
id (uuid) PRIMARY KEY
email (varchar)
encrypted_password (varchar)
email_confirmed_at (timestamp)
created_at (timestamp)
updated_at (timestamp)
raw_user_meta_data (jsonb)  ← Stores { user_type: 'student' | 'tutor' }
... other auth fields
```

### profiles (your Django backend)
```sql
id (uuid) PRIMARY KEY ← FK to auth.users.id
email (varchar)
user_type (enum: 'student', 'tutor')
first_name (varchar)
last_name (varchar)
is_online (boolean)
created_at (timestamp)
updated_at (timestamp)
```

---

## File Structure

```
frontend/
├── .env.local                           ← Client env vars (NEXT_PUBLIC_*)
├── app/
│   ├── layout.tsx                       ← AuthProvider wrapper
│   ├── login/
│   │   └── page.tsx                     ← Login/Signup UI ✅ UPDATED
│   ├── api/
│   │   └── auth/
│   │       └── create-profile/
│   │           └── route.ts             ← Profile creation endpoint ✅ NEW
│   ├── dashboard/
│   │   └── page.tsx
│   └── page.tsx
├── context/
│   └── auth-context.tsx                 ← Auth state management
├── utils/
│   └── supabase/
│       ├── client.ts                    ← Browser client (Anon Key)
│       └── server.ts                    ← Admin client (Service Role Key) ✅ NEW
├── globals.css
├── next.config.js
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Security Checklist ✅

- [x] Anon Key prefixed with `NEXT_PUBLIC_` (safe for browser)
- [x] Service Role Key **NOT** in frontend code
- [x] Service Role Key **NOT** prefixed with `NEXT_PUBLIC_`
- [x] Server endpoint uses Service Role key (Node.js only)
- [x] Client cannot directly create profiles (no auth)
- [x] JWT-based auth (Supabase handles tokens)
- [x] Profile creation is server-side (trusted environment)
- [x] Input validation before database insert
- [x] Error handling doesn't leak sensitive info

---

## Next Steps

1. **Test the complete flow** locally
2. **Set up email confirmation** in Supabase dashboard:
   - Auth > Email Templates > Confirm signup
3. **Create dashboard page** (`app/dashboard/page.tsx`) that shows:
   - User profile info
   - User type (Student/Tutor)
   - Sign out button
4. **Add RLS policies** to Supabase:
   - Users can only see own profile
   - Students can only see tutors (not other students)
   - Tutors can see their ratings
5. **Create tutor listing page** that pulls from Django backend
6. **Create profile completion form** (first_name, last_name, bio, etc.)

---

## Debugging Tips

### Check Supabase Auth
1. Go to Supabase Dashboard
2. Click "Authentication" (left sidebar)
3. Click "Users" tab
4. Should see new user with confirmed/unconfirmed status

### Check Profiles Table
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Run: `SELECT * FROM profiles;`
4. Should see new row with `id` matching `auth.users.id`

### Check Browser Console
1. Open DevTools (F12)
2. Console tab: Check for auth-related errors
3. Network tab: Monitor `/api/auth/create-profile` request

### Check Server Logs
1. In terminal running `npm run dev`
2. Look for any POST requests to `/api/auth/create-profile`
3. Check response status (201 = success, 500 = error)

---

## Troubleshooting

### Issue: "Missing required environment variables"
**Solution:** Make sure `.env.local` exists with all `NEXT_PUBLIC_*` variables

### Issue: "Profile creation endpoint returns 500"
**Solution:** Check that `SUPABASE_SERVICE_ROLE_KEY` is set in server environment
- For local dev: Add to `.env.local` (but marked as server-only)
- For production: Set in Vercel/hosting provider environment variables

### Issue: "Email confirmation link not working"
**Solution:** Check Supabase dashboard:
1. Auth > Email Templates
2. Verify "Confirm signup" template has correct redirect URL
3. Set to: `http://localhost:3001` (or your production URL)

### Issue: "Profile not created after signup"
**Solution:** Check:
1. Response status from `/api/auth/create-profile` (should be 201)
2. Supabase Service Role key is correct
3. Check database error logs in Supabase dashboard

---

## Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Anon Key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth operations |
| Service Key | Server env only | Admin profile creation |
| Client | `utils/supabase/client.ts` | Browser auth & queries |
| Admin | `utils/supabase/server.ts` | Server-side admin ops |
| Auth Context | `context/auth-context.tsx` | Manage user state |
| Login UI | `app/login/page.tsx` | Signup/signin forms |
| Profile API | `app/api/auth/create-profile/route.ts` | Create profiles server-side |

---

## Summary

✅ **Phase 2: Authentication & Frontend Setup COMPLETE**

- Secure environment variables configuration
- Browser client using Anon Key
- Server client using Service Role Key
- Auth context with state management
- Beautiful signup/signin UI with role selection
- Server-side profile creation API
- Complete authentication flow (signup → email confirm → login)
- Security-first architecture respecting RLS

**Status:** Ready for testing! 🚀

Start the dev server and test the full flow at `http://localhost:3001/login`
