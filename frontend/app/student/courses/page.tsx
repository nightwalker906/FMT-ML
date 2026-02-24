'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Clock,
  Video,
  Star,
  BookOpen,
  DollarSign,
  GraduationCap,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Hash,
  Copy,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { OnlineDot, OnlineStatusText } from '@/components/OnlineStatusIndicator'
import { API_BASE } from '@/lib/api-config'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

type CourseSubject = {
  id: string
  name: string
  category: string
}

type CourseTutor = {
  id: string
  first_name: string
  last_name: string
  avatar: string | null
  is_online: boolean
  average_rating: number | null
  experience_years: number | null
}

type NextSession = {
  id: string
  title: string
  scheduled_start: string
  scheduled_end: string
  status: string
}

type Course = {
  id: string
  title: string
  description: string | null
  class_code: string | null
  price: number
  max_students: number
  is_active: boolean
  created_at: string
  subject_name: string | null
  subject_category: string | null
  tutor: CourseTutor
  enrolled_count: number
  spots_remaining: number
  next_session: NextSession | null
  total_sessions: number
}

type SubjectOption = {
  id: string
  name: string
  category: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAvatarUrl(tutor: CourseTutor) {
  if (tutor.avatar) return tutor.avatar
  const name = `${tutor.first_name} ${tutor.last_name}`
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0d9488&color=fff`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function timeUntil(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diffMs = target.getTime() - now.getTime()
  if (diffMs < 0) return 'Started'
  const diffDays = Math.floor(diffMs / 86400000)
  const diffHours = Math.floor((diffMs % 86400000) / 3600000)
  if (diffDays > 0) return `in ${diffDays}d`
  if (diffHours > 0) return `in ${diffHours}h`
  return 'Soon'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudentCourseBrowserPage() {
  const supabase = createClient()

  // Core state
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'popular'>('newest')
  const [minRating, setMinRating] = useState('')
  const [spotsAvailableOnly, setSpotsAvailableOnly] = useState(false)

  // Enrollment state
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null)
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  // Join by code
  const [joinCode, setJoinCode] = useState('')
  const [joiningByCode, setJoiningByCode] = useState(false)
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null)
  const [joinCodeSuccess, setJoinCodeSuccess] = useState<string | null>(null)

  // Detail modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  // ── Load Data ──
  useEffect(() => {
    loadData()
  }, [])

  // Clear success/error messages after 4 seconds
  useEffect(() => {
    if (enrollSuccess) {
      const t = setTimeout(() => setEnrollSuccess(null), 4000)
      return () => clearTimeout(t)
    }
  }, [enrollSuccess])

  useEffect(() => {
    if (enrollError) {
      const t = setTimeout(() => setEnrollError(null), 4000)
      return () => clearTimeout(t)
    }
  }, [enrollError])

  useEffect(() => {
    if (joinCodeSuccess) {
      const t = setTimeout(() => setJoinCodeSuccess(null), 5000)
      return () => clearTimeout(t)
    }
  }, [joinCodeSuccess])

  useEffect(() => {
    if (joinCodeError) {
      const t = setTimeout(() => setJoinCodeError(null), 5000)
      return () => clearTimeout(t)
    }
  }, [joinCodeError])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      // Fetch subjects for filter dropdown
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name, category')
        .order('name')

      if (subjectData) setSubjects(subjectData)

      // Fetch active courses (flat columns — no embedded relations)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, description, class_code, price, max_students, is_active, created_at, subject_id, tutor_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (coursesError) {
        console.error('Error loading courses:', coursesError)
        setLoading(false)
        return
      }

      if (!coursesData || coursesData.length === 0) {
        setCourses([])
        setLoading(false)
        return
      }

      const courseIds = coursesData.map(c => c.id)

      // Fetch tutor profiles separately
      const tutorIds = [...new Set(coursesData.map(c => c.tutor_id).filter(Boolean))]
      let profileMap: Record<string, any> = {}
      if (tutorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar, is_online')
          .in('id', tutorIds)
        if (profilesData) {
          profilesData.forEach(p => { profileMap[p.id] = p })
        }
      }

      // Build subject lookup from already-fetched subjects
      const subjectLookup: Record<string, { name: string; category: string }> = {}
      if (subjectData) {
        subjectData.forEach(s => { subjectLookup[s.id] = { name: s.name, category: s.category } })
      }

      // Fetch enrollment counts, sessions, and tutor ratings in parallel
      const [enrollmentsRes, sessionsRes] = await Promise.all([
        supabase
          .from('enrollments')
          .select('course_id, student_id')
          .in('course_id', courseIds)
          .eq('status', 'enrolled'),
        supabase
          .from('course_sessions')
          .select('id, course_id, title, scheduled_start, scheduled_end, status')
          .in('course_id', courseIds)
          .gte('scheduled_start', new Date().toISOString())
          .eq('status', 'scheduled')
          .order('scheduled_start', { ascending: true }),
      ])

      const enrollments = enrollmentsRes.data || []
      const sessions = sessionsRes.data || []

      // Fetch tutor details (ratings, experience)
      const uniqueTutorIds = [...new Set(tutorIds)]
      let tutorDetails: Record<string, { average_rating: number | null; experience_years: number | null }> = {}

      if (uniqueTutorIds.length > 0) {
        const { data: tutorsData } = await supabase
          .from('tutors')
          .select('profile_id, average_rating, experience_years')
          .in('profile_id', uniqueTutorIds)

        if (tutorsData) {
          tutorDetails = tutorsData.reduce((acc, t) => {
            acc[t.profile_id] = {
              average_rating: t.average_rating,
              experience_years: t.experience_years,
            }
            return acc
          }, {} as typeof tutorDetails)
        }
      }

      // Build enrollment count map + track which courses user is enrolled in
      const enrollCountMap: Record<string, number> = {}
      const userEnrolled = new Set<string>()
      for (const e of enrollments) {
        enrollCountMap[e.course_id] = (enrollCountMap[e.course_id] || 0) + 1
        if (user && e.student_id === user.id) {
          userEnrolled.add(e.course_id)
        }
      }
      setEnrolledCourseIds(userEnrolled)

      // Build next-session map
      const nextSessionMap: Record<string, NextSession> = {}
      const sessionCountMap: Record<string, number> = {}
      for (const s of sessions) {
        sessionCountMap[s.course_id] = (sessionCountMap[s.course_id] || 0) + 1
        if (!nextSessionMap[s.course_id]) {
          nextSessionMap[s.course_id] = s
        }
      }

      // Assemble full course objects
      const fullCourses: Course[] = coursesData.map(c => {
        const subj = subjectLookup[c.subject_id] || null
        const profile = profileMap[c.tutor_id] || null
        const tutorId = c.tutor_id || ''
        const details = tutorDetails[tutorId] || {}
        const enrolledCount = enrollCountMap[c.id] || 0

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          class_code: c.class_code || null,
          price: c.price,
          max_students: c.max_students,
          is_active: c.is_active,
          created_at: c.created_at,
          subject_name: subj?.name || null,
          subject_category: subj?.category || null,
          tutor: {
            id: tutorId,
            first_name: profile?.first_name || 'Tutor',
            last_name: profile?.last_name || '',
            avatar: profile?.avatar || null,
            is_online: profile?.is_online || false,
            average_rating: details.average_rating || null,
            experience_years: details.experience_years || null,
          },
          enrolled_count: enrolledCount,
          spots_remaining: Math.max(0, c.max_students - enrolledCount),
          next_session: nextSessionMap[c.id] || null,
          total_sessions: sessionCountMap[c.id] || 0,
        }
      })

      setCourses(fullCourses)
    } catch (err) {
      console.error('Failed to load courses:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Enroll ──
  async function handleEnroll(courseId: string) {
    if (!userId) {
      setEnrollError('Please sign in to enroll in a course.')
      return
    }

    setEnrollingCourse(courseId)
    setEnrollError(null)
    setEnrollSuccess(null)

    try {
      const res = await fetch(`${API_BASE}/courses/enroll/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: userId,
          course_id: courseId,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.status === 'error') {
        setEnrollError(data.error || data.details?.detail || 'Failed to enroll.')
        return
      }

      // Success
      const course = courses.find(c => c.id === courseId)
      setEnrollSuccess(data.message || `Enrolled in ${course?.title}!`)
      setEnrolledCourseIds(prev => new Set([...prev, courseId]))

      // Update local course stats
      setCourses(prev =>
        prev.map(c =>
          c.id === courseId
            ? {
                ...c,
                enrolled_count: data.course_stats?.enrolled_count ?? c.enrolled_count + 1,
                spots_remaining: data.course_stats?.spots_remaining ?? c.spots_remaining - 1,
              }
            : c
        )
      )

      // Close modal if open
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(prev => prev ? {
          ...prev,
          enrolled_count: data.course_stats?.enrolled_count ?? prev.enrolled_count + 1,
          spots_remaining: data.course_stats?.spots_remaining ?? prev.spots_remaining - 1,
        } : null)
      }
    } catch (err: any) {
      setEnrollError(err.message || 'Network error. Please try again.')
    } finally {
      setEnrollingCourse(null)
    }
  }

  // ── Join by Code ──
  async function handleJoinByCode() {
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinCodeError('Please enter a class code.')
      return
    }
    if (!userId) {
      setJoinCodeError('Please sign in to join a class.')
      return
    }

    setJoiningByCode(true)
    setJoinCodeError(null)
    setJoinCodeSuccess(null)

    try {
      const res = await fetch(`${API_BASE}/courses/join-by-code/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: userId,
          class_code: code,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.status === 'error') {
        setJoinCodeError(data.error || 'Failed to join. Check the code and try again.')
        return
      }

      setJoinCodeSuccess(data.message || `Successfully joined the class!`)
      setJoinCode('')

      // Add to enrolled set
      if (data.course?.id) {
        setEnrolledCourseIds(prev => new Set([...prev, data.course.id]))
      }

      // Refresh course list to reflect updated enrollment
      await loadData()
    } catch (err: any) {
      setJoinCodeError(err.message || 'Network error. Please try again.')
    } finally {
      setJoiningByCode(false)
    }
  }

  // ── Filter & Sort ──
  const filteredCourses = courses.filter(course => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesTitle = course.title.toLowerCase().includes(q)
      const matchesDesc = course.description?.toLowerCase().includes(q) || false
      const matchesTutor = `${course.tutor.first_name} ${course.tutor.last_name}`.toLowerCase().includes(q)
      const matchesSubject = course.subject_name?.toLowerCase().includes(q) || false
      const matchesCode = course.class_code?.toLowerCase().includes(q) || false
      if (!matchesTitle && !matchesDesc && !matchesTutor && !matchesSubject && !matchesCode) return false
    }

    // Subject filter
    if (selectedSubject) {
      if (course.subject_name !== selectedSubject) return false
    }

    // Price filter
    if (maxPrice) {
      const limit = parseFloat(maxPrice)
      if (!isNaN(limit) && course.price > limit) return false
    }

    // Rating filter
    if (minRating) {
      const ratingLimit = parseFloat(minRating)
      if (!isNaN(ratingLimit)) {
        const tutorRating = course.tutor.average_rating ? Number(course.tutor.average_rating) : 0
        if (tutorRating < ratingLimit) return false
      }
    }

    // Spots available filter
    if (spotsAvailableOnly && course.spots_remaining <= 0) return false

    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price_low': return a.price - b.price
      case 'price_high': return b.price - a.price
      case 'popular': return b.enrolled_count - a.enrolled_count
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const activeFilters = [
    ...(selectedSubject ? [{ key: 'subject', label: selectedSubject }] : []),
    ...(maxPrice ? [{ key: 'price', label: `Max R${maxPrice}` }] : []),
    ...(minRating ? [{ key: 'rating', label: `${minRating}+ Stars` }] : []),
    ...(spotsAvailableOnly ? [{ key: 'spots', label: 'Has Spots' }] : []),
  ]

  function clearFilter(key: string) {
    if (key === 'subject') setSelectedSubject('')
    if (key === 'price') setMaxPrice('')
    if (key === 'rating') setMinRating('')
    if (key === 'spots') setSpotsAvailableOnly(false)
  }

  function clearAllFilters() {
    setSearchQuery('')
    setSelectedSubject('')
    setMaxPrice('')
    setMinRating('')
    setSpotsAvailableOnly(false)
    setSortBy('newest')
  }

  // ── Unique subject names for filter dropdown ──
  const subjectNames = [...new Set(courses.map(c => c.subject_name).filter(Boolean))] as string[]

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* ── Toast Notifications ── */}
      <AnimatePresence>
        {enrollSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/40 rounded-xl shadow-lg"
          >
            <div className="p-1 bg-green-500 rounded-full">
              <Check size={14} className="text-white" />
            </div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{enrollSuccess}</p>
          </motion.div>
        )}
        {enrollError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 rounded-xl shadow-lg"
          >
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{enrollError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          Group Classes
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Browse virtual classrooms, join live sessions, and learn together
        </p>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Available Classes', value: courses.length, icon: BookOpen, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-teal-900/30' },
          { label: 'Total Students', value: courses.reduce((s, c) => s + c.enrolled_count, 0), icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Upcoming Sessions', value: courses.filter(c => c.next_session).length, icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { label: 'My Enrollments', value: enrolledCourseIds.size, icon: Check, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Join by Class Code ── */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200/60 dark:border-indigo-700/30 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-800/40 rounded-xl">
              <Hash size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Have a Class Code?</h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">Enter the code from your tutor to join directly</p>
            </div>
          </div>
          <div className="flex-1 flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
              placeholder="e.g. AB3X7K"
              maxLength={8}
              className="flex-1 sm:max-w-[200px] px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-600/50 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-indigo-300 dark:placeholder-indigo-500 font-mono text-center text-lg tracking-widest uppercase focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none transition-all"
            />
            <button
              onClick={handleJoinByCode}
              disabled={joiningByCode || !joinCode.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              {joiningByCode ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              Join
            </button>
          </div>
        </div>
        {/* Join code feedback */}
        <AnimatePresence>
          {joinCodeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400"
            >
              <Check size={14} className="text-green-500" />
              {joinCodeSuccess}
            </motion.div>
          )}
          {joinCodeError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <AlertCircle size={14} className="text-red-500" />
              {joinCodeError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by class name, subject, tutor, or class code..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none transition-all"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none transition-all text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="price_low">Price: Low → High</option>
          <option value="price_high">Price: High → Low</option>
          <option value="popular">Most Popular</option>
        </select>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-medium transition-colors ${
            showFilters || activeFilters.length > 0
              ? 'bg-primary-50 dark:bg-teal-900/20 border-primary-200 dark:border-teal-700/40 text-primary-700 dark:text-primary-400'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilters.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-primary-500 text-white text-xs rounded-full">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Filters Panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  >
                    <option value="">All Subjects</option>
                    {subjectNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Max Price (R)</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Any price"
                      min="0"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Min Tutor Rating */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Min Tutor Rating</label>
                  <div className="relative">
                    <Star size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 fill-yellow-400" />
                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="">Any Rating</option>
                      <option value="3">3+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                      <option value="4">4+ Stars</option>
                      <option value="4.5">4.5+ Stars</option>
                    </select>
                  </div>
                </div>

                {/* Spots Available */}
                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 w-full hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={spotsAvailableOnly}
                      onChange={(e) => setSpotsAvailableOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Only show classes with available spots
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Filter Pills ── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-teal-900/20 border border-primary-200 dark:border-teal-700/40 text-primary-700 dark:text-primary-400 text-sm rounded-full"
            >
              {f.label}
              <button onClick={() => clearFilter(f.key)} className="hover:text-primary-900 dark:hover:text-primary-300 transition-colors">
                <X size={14} />
              </button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* ── Results Count ── */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {filteredCourses.length} class{filteredCourses.length !== 1 ? 'es' : ''} available
      </p>

      {/* ══════════════════════════════════════════════════════════════════════
          COURSE GRID
      ══════════════════════════════════════════════════════════════════════ */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-12 text-center">
          <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No classes found</p>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchQuery || activeFilters.length > 0
              ? 'Try adjusting your search or filters.'
              : 'No group classes are available right now. Check back soon!'}
          </p>
          {(searchQuery || activeFilters.length > 0) && (
            <button
              onClick={clearAllFilters}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => {
            const isEnrolled = enrolledCourseIds.has(course.id)
            const isFull = course.spots_remaining <= 0

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 overflow-hidden hover:shadow-lg hover:border-primary-200/60 dark:hover:border-primary-700/40 transition-all duration-300 flex flex-col group"
              >
                {/* ── Card Header: Subject Tag + Seats ── */}
                <div className="px-5 pt-5 pb-0 flex items-center justify-between">
                  {course.subject_name ? (
                    <span className="px-2.5 py-0.5 bg-primary-50 dark:bg-teal-900/25 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full border border-primary-100 dark:border-teal-700/30">
                      {course.subject_name}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isFull
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : course.spots_remaining <= 5
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {isFull ? 'Full' : `${course.spots_remaining} spot${course.spots_remaining !== 1 ? 's' : ''} left`}
                  </span>
                </div>

                {/* ── Card Body ── */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Title */}
                  <h3
                    className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2 mb-3 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    onClick={() => setSelectedCourse(course)}
                  >
                    {course.title}
                  </h3>

                  {/* Tutor Row */}
                  <Link href={`/student/tutors/${course.tutor.id}`} className="flex items-center gap-3 mb-4 group/tutor">
                    <div className="relative flex-shrink-0">
                      <img
                        src={getAvatarUrl(course.tutor)}
                        alt={`${course.tutor.first_name} ${course.tutor.last_name}`}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 group-hover/tutor:ring-primary-300 dark:group-hover/tutor:ring-primary-600 transition-all"
                      />
                      <OnlineDot isOnline={course.tutor.is_online} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover/tutor:text-primary-600 dark:group-hover/tutor:text-primary-400 transition-colors">
                        {course.tutor.first_name} {course.tutor.last_name}
                        <ArrowRight size={12} className="inline ml-1 opacity-0 group-hover/tutor:opacity-100 transition-opacity" />
                      </p>
                      <div className="flex items-center gap-2">
                        {course.tutor.average_rating && (
                          <span className="flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                            {Number(course.tutor.average_rating).toFixed(1)}
                          </span>
                        )}
                        {course.tutor.experience_years && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            · {course.tutor.experience_years}yr exp
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Description */}
                  {course.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                      {course.description}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-auto mb-4">
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-blue-500" />
                      {course.enrolled_count}/{course.max_students}
                    </span>
                    {course.total_sessions > 0 && (
                      <span className="flex items-center gap-1">
                        <Video size={13} className="text-purple-500" />
                        {course.total_sessions} session{course.total_sessions !== 1 ? 's' : ''}
                      </span>
                    )}
                    {course.next_session && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-amber-500" />
                        Next {timeUntil(course.next_session.scheduled_start)}
                      </span>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="mb-1">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-red-500'
                            : course.spots_remaining <= 5
                              ? 'bg-amber-500'
                              : 'bg-primary-500'
                        }`}
                        style={{ width: `${Math.min(100, (course.enrolled_count / course.max_students) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Card Footer ── */}
                <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-3">
                  {/* Price */}
                  <div>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      R{Number(course.price).toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">/ course</span>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Details
                    </button>
                    {isEnrolled ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium rounded-xl border border-green-200 dark:border-green-800/40">
                        <Check size={14} />
                        Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={isFull || enrollingCourse === course.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {enrollingCourse === course.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        {isFull ? 'Full' : enrollingCourse === course.id ? 'Enrolling...' : 'Enroll Now'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: COURSE DETAIL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedCourse(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/40"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/40 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCourse.title}
                  </h2>
                  {selectedCourse.subject_name && (
                    <span className="inline-flex items-center mt-1 px-2.5 py-0.5 bg-primary-50 dark:bg-teal-900/25 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full border border-primary-100 dark:border-teal-700/30">
                      {selectedCourse.subject_name}
                      {selectedCourse.subject_category && ` · ${selectedCourse.subject_category}`}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex-shrink-0"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Tutor Section */}
                <Link
                  href={`/student/tutors/${selectedCourse.tutor.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-600/30 hover:border-primary-200 dark:hover:border-primary-700/40 hover:bg-primary-50/50 dark:hover:bg-teal-900/10 transition-all group/tutor"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(selectedCourse.tutor)}
                      alt={`${selectedCourse.tutor.first_name} ${selectedCourse.tutor.last_name}`}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 group-hover/tutor:ring-primary-300 dark:group-hover/tutor:ring-primary-600 transition-all"
                    />
                    <OnlineDot isOnline={selectedCourse.tutor.is_online} size="md" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white group-hover/tutor:text-primary-600 dark:group-hover/tutor:text-primary-400 transition-colors">
                      {selectedCourse.tutor.first_name} {selectedCourse.tutor.last_name}
                      <ArrowRight size={14} className="inline ml-1.5 opacity-0 group-hover/tutor:opacity-100 transition-opacity" />
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <OnlineStatusText isOnline={selectedCourse.tutor.is_online} />
                      {selectedCourse.tutor.average_rating && (
                        <span className="flex items-center gap-0.5 text-sm text-slate-500 dark:text-slate-400">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          {Number(selectedCourse.tutor.average_rating).toFixed(1)}
                        </span>
                      )}
                      {selectedCourse.tutor.experience_years && (
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                          {selectedCourse.tutor.experience_years} years exp
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 opacity-0 group-hover/tutor:opacity-100 transition-opacity">
                      View full profile & more classes →
                    </p>
                  </div>
                </Link>

                {/* Description */}
                {selectedCourse.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">About This Class</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {selectedCourse.description}
                    </p>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Price', value: `R${Number(selectedCourse.price).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                    { label: 'Students', value: `${selectedCourse.enrolled_count}/${selectedCourse.max_students}`, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Spots Left', value: selectedCourse.spots_remaining, icon: Check, color: selectedCourse.spots_remaining > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: selectedCourse.spots_remaining > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30' },
                    { label: 'Sessions', value: selectedCourse.total_sessions, icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/20 text-center">
                      <div className={`inline-flex p-1.5 rounded-lg ${stat.bg} mb-1`}>
                        <stat.icon size={14} className={stat.color} />
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Next Session */}
                {selectedCourse.next_session && (
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30">
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2 mb-2">
                      <Calendar size={16} />
                      Next Live Session
                    </h3>
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      {selectedCourse.next_session.title}
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      {formatDate(selectedCourse.next_session.scheduled_start)} · {formatTime(selectedCourse.next_session.scheduled_start)} – {formatTime(selectedCourse.next_session.scheduled_end)}
                    </p>
                  </div>
                )}

                {/* Capacity Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>Enrollment Progress</span>
                    <span>{selectedCourse.enrolled_count} of {selectedCourse.max_students} students</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedCourse.spots_remaining <= 0
                          ? 'bg-red-500'
                          : selectedCourse.spots_remaining <= 5
                            ? 'bg-amber-500'
                            : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min(100, (selectedCourse.enrolled_count / selectedCourse.max_students) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-800 px-6 py-4 border-t border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between gap-4">
                <div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    R{Number(selectedCourse.price).toFixed(0)}
                  </span>
                  <span className="text-sm text-slate-400 dark:text-slate-500 ml-1">/ course</span>
                </div>

                {enrolledCourseIds.has(selectedCourse.id) ? (
                  <span className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium rounded-xl border border-green-200 dark:border-green-800/40">
                    <Check size={18} />
                    Already Enrolled
                  </span>
                ) : (
                  <button
                    onClick={() => handleEnroll(selectedCourse.id)}
                    disabled={selectedCourse.spots_remaining <= 0 || enrollingCourse === selectedCourse.id}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {enrollingCourse === selectedCourse.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {selectedCourse.spots_remaining <= 0
                      ? 'Class is Full'
                      : enrollingCourse === selectedCourse.id
                        ? 'Enrolling...'
                        : 'Enroll Now'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
