'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { GraduationCap, Loader2 } from 'lucide-react'

type UserRole = 'student' | 'tutor'
type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<AuthMode>('login')
  const [role, setRole] = useState<UserRole>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Query profiles table to get the definitive user_type and check if complete
      let userType = 'student' // default fallback
      let isProfileComplete = false
      
      if (data.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type, first_name')
          .eq('id', data.user.id)
          .single()

        console.log('[login] Profile query result:', { profile, profileError })

        if (!profileError && profile) {
          userType = profile.user_type
          console.log('[login] User type from profile:', userType)
          
          // Check if profile has first_name (basic completion check)
          if (profile.first_name) {
            // Also check if role-specific record exists
            const roleTable = userType === 'tutor' ? 'tutors' : 'students'
            const { data: roleData } = await supabase
              .from(roleTable)
              .select('profile_id')
              .eq('profile_id', data.user.id)
              .single()
            
            isProfileComplete = !!roleData
            console.log('[login] Role table check:', { roleTable, isProfileComplete })
          }
        } else {
          // Profile doesn't exist - try to create it from auth metadata
          console.warn('[login] Profile not found, attempting to create from auth metadata')
          userType = data.user?.user_metadata?.user_type || 'student'
          
          // Try to create the profile
          try {
            const createRes = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
                userType: userType,
              }),
            })
            
            if (createRes.ok) {
              console.log('[login] Profile created during login')
            } else {
              console.error('[login] Failed to create profile during login:', await createRes.json())
            }
          } catch (err) {
            console.error('[login] Error creating profile during login:', err)
          }
        }
      }

      // Determine redirect path based on profile completion
      let redirectPath: string
      if (!isProfileComplete) {
        redirectPath = userType === 'tutor' ? '/tutor/complete-profile' : '/student/complete-profile'
      } else {
        redirectPath = userType === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'
      }

      setSuccessMessage('Login successful! Redirecting...')
      setTimeout(() => router.push(redirectPath), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      console.log('[signup] Starting signup with role:', role)

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: role, // Pass role to metadata
          },
        },
      })

      console.log('[signup] Signup response:', { userId: data.user?.id, signUpError })

      if (signUpError) throw signUpError

      // Create profile record server-side after successful signup
      if (data.user?.id) {
        console.log('[signup] Creating profile with role:', role)
        
        let profileCreated = false
        let retries = 3
         
        while (!profileCreated && retries > 0) {
          const profileRes = await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email,
              userType: role,
            }),
          })

          console.log('[signup] Profile creation attempt:', { status: profileRes.status, retries })

          if (profileRes.ok) {
            const profileData = await profileRes.json()
            console.log('[signup] Profile created successfully:', profileData)
            profileCreated = true
          } else {
            const errorData = await profileRes.json()
            console.error('[signup] Profile creation failed:', { status: profileRes.status, error: errorData })
            retries--
            if (retries > 0) {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        }

        if (!profileCreated) {
          console.error('[signup] Failed to create profile after retries')
          setError('Profile creation failed. Please try logging in and contact support if the issue persists.')
          setLoading(false)
          return
        }
      }

      setSuccessMessage(
        'Signup successful! Check your email to confirm your account.'
      )
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => setMode('login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (mode === 'login') {
      handleLogin(e)
    } else {
      handleSignup(e)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-primary-100/30 via-transparent to-transparent dark:from-primary-900/15 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-secondary-100/20 via-transparent to-transparent dark:from-secondary-900/10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 mb-5"
          >
            <GraduationCap size={28} />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Find My Tutor
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {mode === 'login'
              ? 'Welcome back! Sign in to your account'
              : 'Join our community of learners and educators'}
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Mode Toggle */}
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
                setSuccessMessage(null)
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
                setSuccessMessage(null)
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Role Selection (Signup only) */}
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 font-medium ${
                      role === 'student'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50 text-primary-900 dark:text-primary-300 shadow-md shadow-primary-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl">🎓</div>
                    <div className="mt-1">Student</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('tutor')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 font-medium ${
                      role === 'tutor'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50 text-primary-900 dark:text-primary-300 shadow-md shadow-primary-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl">👨‍🏫</div>
                    <div className="mt-1">Tutor</div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50"
              >
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50"
              >
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{successMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password (Signup only) */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="divider" />
          <div>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setError(null)
                  setSuccessMessage(null)
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="btn-text"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Link to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
