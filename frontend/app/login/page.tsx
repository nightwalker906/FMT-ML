'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { GraduationCap, Loader2, CheckCircle } from 'lucide-react'

type UserRole = 'student' | 'tutor'
type AuthMode = 'login' | 'signup'
type SuccessState = 'signup' | 'login' | null

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
  
  // New state for our beautiful full-card success animations
  const [successOverlay, setSuccessOverlay] = useState<SuccessState>(null)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (data.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type, first_name')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          console.error('[login] Profile fetch error:', profileError)
          throw new Error('Could not load user profile data.')
        }

        const userType = profile.user_type || 'student'
        const isProfileComplete = !!profile.first_name

        let redirectPath: string
        if (!isProfileComplete) {
          redirectPath = userType === 'tutor' ? '/tutor/complete-profile' : '/student/complete-profile'
        } else {
          redirectPath = userType === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'
        }

        // Trigger the success animation overlay
        setSuccessOverlay('login')

        // Wait 1.5 seconds so the user can see the animation before the page redirects
        setTimeout(() => {
          router.replace(redirectPath)
          router.refresh()
        }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: role, 
          },
        },
      })

      if (signUpError) throw signUpError

      // If Supabase auto-logged them in (Email confirmations off), 
      // but we explicitly want them to log in manually, we sign them out silently here.
      if (data.session) {
        await supabase.auth.signOut()
      }

      // Trigger the gorgeous success animation overlay
      setSuccessOverlay('signup')

      // Wait 2.5 seconds, then reset the form and switch to login mode
      setTimeout(() => {
        setSuccessOverlay(null)
        setMode('login')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setLoading(false)
      }, 2500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup')
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

        {/* Card (Added relative and overflow-hidden for the overlay) */}
        <div className="card relative overflow-hidden">
          
          {/* THE SUCCESS ANIMATION OVERLAY */}
          <AnimatePresence>
            {successOverlay && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 rounded-2xl"
              >
                {successOverlay === 'signup' ? (
                  <motion.div 
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="flex flex-col items-center text-center px-6"
                  >
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                      <CheckCircle size={40} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Created!</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Successfully created your account.<br/>Moving you to login...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="flex flex-col items-center text-center px-6"
                  >
                    <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
                      <Loader2 size={40} strokeWidth={2.5} className="animate-spin" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Login Successful</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Preparing your dashboard...
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode Toggle */}
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
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
              className="btn-primary w-full py-3 mt-6 relative overflow-hidden"
            >
              {loading && !successOverlay ? (
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