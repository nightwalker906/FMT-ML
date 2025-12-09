# Quick Start Guide - Find My Tutor Frontend

## ⚡ 30-Second Setup

1. **Dependencies already installed** ✅
2. **Environment variables already configured** ✅
3. **Dev server ready to go** ✅

## 🚀 Start Development

```bash
cd frontend
npm run dev
```

Then open: **http://localhost:3000**

## 📋 What's Ready

| Feature | Status | URL |
|---------|--------|-----|
| Home Page | ✅ Live | http://localhost:3000 |
| Login Page | ✅ Live | http://localhost:3000/login |
| Signup with Role Selection | ✅ Live | http://localhost:3000/login |
| Dashboard (Protected) | ✅ Ready | http://localhost:3000/dashboard |
| Auth Context | ✅ Working | See `context/auth-context.tsx` |

## 🧪 Test It Out

### Try Signup
1. Go to http://localhost:3000/login
2. Click **"Sign Up"**
3. Select **"Student"** or **"Tutor"**
4. Enter email and password
5. Click **"Create Account"**
6. Check your email for confirmation link
7. Come back and login

### Try Login
1. Go to http://localhost:3000/login
2. Enter your email and password
3. Click **"Sign In"**
4. You'll be redirected to dashboard

### Try Protected Route
1. After login, navigate to http://localhost:3000/dashboard
2. You'll see your email and logout button
3. Click logout to test signout

## 🔑 How It Works

### Three Key Components:

**1. Supabase Client** (`utils/supabase/client.ts`)
```typescript
const supabase = createClient()
await supabase.auth.signUp({ email, password })
```

**2. Auth Context** (`context/auth-context.tsx`)
```typescript
const { user, session, isLoading, signOut } = useAuth()
```

**3. Login Page** (`app/login/page.tsx`)
- Beautiful UI with role selection
- Form validation
- Error messages
- Loading indicators

## 🔐 Security Notes

- ✅ Using Anon Key (safe for browser)
- ✅ Service Key hidden (reserved for backend)
- ✅ JWT tokens handled automatically
- ✅ RLS ready (configure in Supabase)

## 📁 Main Files

```
frontend/
├── app/login/page.tsx          ← Login/Signup UI
├── context/auth-context.tsx    ← Auth management
├── utils/supabase/client.ts    ← Supabase config
├── .env.local                  ← Your credentials
└── README.md                   ← Full documentation
```

## 🛠️ Common Tasks

### Using Auth in Any Component
```typescript
'use client'

import { useAuth } from '@/context/auth-context'

function MyComponent() {
  const { user, signOut } = useAuth()
  
  if (!user) return <div>Not logged in</div>
  
  return (
    <div>
      <p>Welcome {user.email}!</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  )
}
```

### Protecting a Page
```typescript
'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'

export default function MyPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  if (isLoading) return <div>Loading...</div>
  if (!user) router.push('/login')
  
  return <div>Protected content</div>
}
```

### Calling Supabase in Component
```typescript
'use client'

import { createClient } from '@/utils/supabase/client'

export function MyComponent() {
  const supabase = createClient()
  
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
    
    if (error) console.error(error)
    console.log(data)
  }
  
  return <button onClick={fetchData}>Fetch</button>
}
```

## 🐛 Troubleshooting

**Dev server won't start?**
```bash
npm install
npm run dev
```

**Env variables not working?**
- Check `.env.local` exists in `frontend/` folder
- Make sure variables start with `NEXT_PUBLIC_`
- Restart dev server

**Login not working?**
- Check browser console (F12) for errors
- Verify email is correct
- Check Supabase dashboard → Auth → Users

**Can't access dashboard after login?**
- Make sure you're in `app/dashboard/page.tsx`
- Check that `AuthProvider` wraps your app in layout
- Verify user is actually logged in

## 📚 Full Documentation

For detailed setup, architecture, and advanced topics:
- See `README.md` for comprehensive docs
- See `SETUP.md` for detailed implementation details
- See `.env.example` for all environment variables

## 🎯 Next Phase

Ready to connect to Django backend? Create:
- API client utility for Django calls
- Data fetching hooks with error handling
- Integration between frontend auth and backend

---

**Everything is ready to go!** 🚀

Start with: `npm run dev`
