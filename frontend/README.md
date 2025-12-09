# Find My Tutor - Frontend

Modern EdTech platform connecting students with expert tutors, built with Next.js 14 and Supabase.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth (JWT)
- **Backend:** Supabase (PostgreSQL + REST API)

## Features

✨ **Authentication**
- Email/Password signup with role selection (Student/Tutor)
- JWT-based authentication
- Email confirmation flow
- Session management with `onAuthStateChange`

🎨 **Modern UI**
- Clean, professional EdTech design
- Responsive Tailwind CSS components
- Dark mode ready
- Accessible form controls

🔐 **Security**
- Client Key (Anon) for browser operations
- Row Level Security (RLS) for data protection
- Service Key reserved for server-side admin tasks
- Environment variables properly configured

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout with metadata
│   ├── globals.css        # Tailwind styles
│   └── login/
│       └── page.tsx       # Login/Signup page
├── context/
│   └── auth-context.tsx   # Auth provider with useAuth hook
├── utils/
│   └── supabase/
│       └── client.ts      # Browser-safe Supabase client
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind config
├── postcss.config.js      # PostCSS config
├── next.config.js         # Next.js config
└── .env.example           # Environment variables template
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account with a project created

### Installation

1. **Clone and install dependencies:**
```bash
cd frontend
npm install
```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase Anon key

   See `.env.example` for detailed instructions.

3. **Start the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

### Sign Up
1. User selects role (Student/Tutor)
2. User provides email and password
3. Role is passed to Supabase via `options.data.user_type`
4. Confirmation email is sent
5. User confirms email and can log in

### Login
1. User enters email and password
2. Supabase returns JWT in session
3. `AuthProvider` updates context with user/session
4. App redirects to dashboard

### Logout
1. User clicks logout
2. `signOut()` clears session in Supabase
3. Context state is cleared
4. User is redirected to login

## Using the Auth Context

The `AuthProvider` wraps your app and provides the `useAuth()` hook:

```tsx
'use client'

import { useAuth } from '@/context/auth-context'

export function MyComponent() {
  const { user, session, isLoading, signOut } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  )
}
```

## Creating Protected Routes

Wrap components with `useAuth()` to check authentication:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

export default function ProtectedPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  if (isLoading) return <div>Loading...</div>
  
  if (!user) {
    router.push('/login')
    return null
  }

  return <div>Protected content for {user.email}</div>
}
```

## Environment Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL | Yes | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | String | Yes | Supabase Anon key (browser-safe) |

**Important:** Only use the **Anon Key** in client-side code. Never expose the Service Role Key.

See `.env.example` for setup instructions.

## Security Best Practices

1. **Use the Anon Key in frontend** (`utils/supabase/client.ts`)
2. **Reserve Service Key for server-side only** (admin tasks, migrations)
3. **Implement RLS policies** on Supabase tables
4. **Validate all user input** on both client and server
5. **Never commit `.env.local`** (add to `.gitignore`)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

1. **Set up Supabase database:**
   - Configure RLS policies
   - Create database triggers for profile creation
   - Set up storage buckets if needed

2. **Implement Dashboard:**
   - Create `/dashboard` page with protected routes
   - Display user profile and preferences

3. **Build Feature Pages:**
   - Tutor discovery and search
   - Session booking
   - Ratings and reviews

4. **Add Backend Integration:**
   - Connect to Django REST API on port 8000
   - Implement API client utilities

## Deployment

### Vercel (Recommended)
```bash
vercel
```

### Other Platforms
1. Build the app: `npm run build`
2. Deploy the `.next` folder to your hosting
3. Set environment variables in your platform's dashboard

## Troubleshooting

### "Cannot find module '@supabase/ssr'"
```bash
npm install @supabase/ssr
```

### CORS errors when calling Django API
Add your frontend URL to Django's CORS_ALLOWED_ORIGINS in `settings.py`

### Environment variables not loading
- Ensure `.env.local` exists in the project root
- Restart dev server after changing env vars
- Use `NEXT_PUBLIC_` prefix for browser-accessible vars

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For issues or questions:
1. Check the documentation links above
2. Review the code comments in the project
3. Check Supabase logs and error messages
4. Verify environment variables are set correctly
