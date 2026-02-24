'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  BookOpen,
  Users,
  Video,
  Calendar,
  Clock,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Star,
  Hash,
  Copy,
  Check,
  GraduationCap,
  DollarSign,
  Sparkles,
  Search,
  X,
  Upload,
  ClipboardCheck,
  CalendarClock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { OnlineDot } from '@/components/OnlineStatusIndicator'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

type CourseTutor = {
  id: string
  first_name: string
  last_name: string
  avatar: string | null
  is_online: boolean
}

type CourseSession = {
  id: string
  title: string
  scheduled_start: string
  scheduled_end: string
  meeting_url: string | null
  status: string
}

type CourseResource = {
  id: string
  title: string
  file_url: string
  uploaded_at: string
  resource_type: 'material' | 'assignment'
  due_date: string | null
}

type MySubmission = {
  id: string
  resource_id: string
  file_url: string
  file_name: string | null
  submitted_at: string
  grade: number | null
  feedback: string | null
  status: string
}

type EnrolledCourse = {
  id: string
  title: string
  description: string | null
  class_code: string | null
  price: number
  max_students: number
  is_active: boolean
  created_at: string
  enrolled_at: string
  subject_name: string | null
  subject_category: string | null
  tutor: CourseTutor
  enrolled_count: number
  sessions: CourseSession[]
  resources: CourseResource[]
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

function getFileIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['ppt', 'pptx'].includes(ext)) return '📊'
  if (['xls', 'xlsx'].includes(ext)) return '📈'
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return '🖼️'
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎬'
  if (['mp3', 'wav'].includes(ext)) return '🎵'
  if (['zip', 'rar'].includes(ext)) return '📦'
  return '📎'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StudentMyCoursesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<EnrolledCourse[]>([])
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Submission state
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null) // resource_id
  const [submitFile, setSubmitFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mySubmissions, setMySubmissions] = useState<Record<string, MySubmission>>({})

  useEffect(() => {
    loadEnrolledCourses()
  }, [])

  async function loadEnrolledCourses() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Get enrollments for this student
      const { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'enrolled')

      if (enrollErr) {
        setCourses([])
        setLoading(false)
        return
      }

      if (!enrollments || enrollments.length === 0) {
        setCourses([])
        setLoading(false)
        return
      }

      const courseIds = enrollments.map(e => e.course_id)
      const enrollDateMap: Record<string, string> = {}
      enrollments.forEach(e => {
        enrollDateMap[e.course_id] = e.enrolled_at || e.created_at || new Date().toISOString()
      })

      // Fetch course details (flat columns only — no embedded relations to avoid PostgREST 400)
      const { data: coursesData, error: coursesErr } = await supabase
        .from('courses')
        .select('id, title, description, class_code, price, max_students, is_active, created_at, subject_id, tutor_id')
        .in('id', courseIds)

      if (coursesErr || !coursesData) {
        setCourses([])
        setLoading(false)
        return
      }

      // Fetch tutor profiles and subjects separately
      const tutorIds = [...new Set(coursesData.map(c => c.tutor_id).filter(Boolean))]
      const subjectIds = [...new Set(coursesData.map(c => c.subject_id).filter(Boolean))]

      const [tutorRes, subjectRes] = await Promise.all([
        tutorIds.length > 0
          ? supabase.from('profiles').select('id, first_name, last_name, avatar, is_online').in('id', tutorIds)
          : Promise.resolve({ data: [], error: null }),
        subjectIds.length > 0
          ? supabase.from('subjects').select('id, name, category').in('id', subjectIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      const tutorMap: Record<string, any> = {}
      ;(tutorRes.data || []).forEach((t: any) => { tutorMap[t.id] = t })

      const subjectMap: Record<string, any> = {}
      ;(subjectRes.data || []).forEach((s: any) => { subjectMap[s.id] = s })

      // Fetch enrollment counts, sessions, and resources
      const enrollCountRes = await supabase
        .from('enrollments')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'enrolled')

      const sessionsRes = await supabase
        .from('course_sessions')
        .select('id, course_id, title, scheduled_start, scheduled_end, meeting_url, status')
        .in('course_id', courseIds)
        .order('scheduled_start', { ascending: true })

      let resourcesRes: any = { data: [], error: null }
      try {
        resourcesRes = await supabase
          .from('course_resources')
          .select('id, course_id, title, file_url, uploaded_at, resource_type, due_date')
          .in('course_id', courseIds)
          .order('uploaded_at', { ascending: false })
      } catch (e) {
        console.warn('course_resources table may not exist yet:', e)
      }

      const enrollCounts = enrollCountRes.data || []
      const sessions = sessionsRes.data || []
      const resources = resourcesRes.data || []

      // Build maps
      const enrollCountMap: Record<string, number> = {}
      enrollCounts.forEach(e => {
        enrollCountMap[e.course_id] = (enrollCountMap[e.course_id] || 0) + 1
      })

      const sessionMap: Record<string, CourseSession[]> = {}
      sessions.forEach(s => {
        if (!sessionMap[s.course_id]) sessionMap[s.course_id] = []
        sessionMap[s.course_id].push(s)
      })

      const resourceMap: Record<string, CourseResource[]> = {}
      resources.forEach((r: any) => {
        if (!resourceMap[r.course_id]) resourceMap[r.course_id] = []
        resourceMap[r.course_id].push(r)
      })

      // Assemble full course objects
      const fullCourses: EnrolledCourse[] = coursesData.map(c => {
        const subj = subjectMap[c.subject_id] || null
        const profile = tutorMap[c.tutor_id] || null

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          class_code: c.class_code || null,
          price: c.price,
          max_students: c.max_students,
          is_active: c.is_active,
          created_at: c.created_at,
          enrolled_at: enrollDateMap[c.id] || c.created_at,
          subject_name: subj?.name || null,
          subject_category: subj?.category || null,
          tutor: {
            id: profile?.id || '',
            first_name: profile?.first_name || 'Tutor',
            last_name: profile?.last_name || '',
            avatar: profile?.avatar || null,
            is_online: profile?.is_online || false,
          },
          enrolled_count: enrollCountMap[c.id] || 0,
          sessions: sessionMap[c.id] || [],
          resources: resourceMap[c.id] || [],
        }
      })

      // Sort by enrollment date (newest first)
      fullCourses.sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime())

      setCourses(fullCourses)

      // Load my submissions for all assignment resources
      const allResourceIds = fullCourses.flatMap(c =>
        c.resources.filter(r => r.resource_type === 'assignment').map(r => r.id)
      )
      if (allResourceIds.length > 0 && user.id) {
        const { data: subsData } = await supabase
          .from('student_submissions')
          .select('id, resource_id, file_url, file_name, submitted_at, grade, feedback, status')
          .eq('student_id', user.id)
          .in('resource_id', allResourceIds)

        if (subsData) {
          const subsMap: Record<string, MySubmission> = {}
          subsData.forEach((s: any) => { subsMap[s.resource_id] = s })
          setMySubmissions(subsMap)
        }
      }
    } catch (err) {
      console.error('Failed to load enrolled courses:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Submit assignment ──
  async function handleSubmitAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!showSubmitModal || !submitFile || !userId) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const timestamp = Date.now()
      const safeName = submitFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${userId}/${showSubmitModal}/${timestamp}_${safeName}`

      // Upload to "student material" bucket
      const { error: uploadErr } = await supabase.storage
        .from('student material')
        .upload(filePath, submitFile)

      if (uploadErr) throw uploadErr

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('student material')
        .getPublicUrl(filePath)

      const fileUrl = urlData.publicUrl

      // Check if there's an existing submission (re-submit)
      const existing = mySubmissions[showSubmitModal]
      if (existing) {
        // Update existing submission
        const { data: updatedSub, error: updateErr } = await supabase
          .from('student_submissions')
          .update({
            file_url: fileUrl,
            file_name: submitFile.name,
            submitted_at: new Date().toISOString(),
            status: 'submitted',
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateErr) throw updateErr

        setMySubmissions(prev => ({
          ...prev,
          [showSubmitModal]: {
            ...updatedSub,
            resource_id: showSubmitModal,
          },
        }))
      } else {
        // Insert new submission
        const { data: newSub, error: insertErr } = await supabase
          .from('student_submissions')
          .insert({
            resource_id: showSubmitModal,
            student_id: userId,
            file_url: fileUrl,
            file_name: submitFile.name,
          })
          .select()
          .single()

        if (insertErr) throw insertErr

        setMySubmissions(prev => ({
          ...prev,
          [showSubmitModal]: newSub,
        }))
      }

      setSubmitFile(null)
      setShowSubmitModal(null)
    } catch (err: any) {
      console.error('Submission error:', err)
      setSubmitError(err.message || 'Failed to submit.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filter ──
  const filteredCourses = courses.filter(course => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      course.title.toLowerCase().includes(q) ||
      course.subject_name?.toLowerCase().includes(q) ||
      course.class_code?.toLowerCase().includes(q) ||
      `${course.tutor.first_name} ${course.tutor.last_name}`.toLowerCase().includes(q)
    )
  })

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            My Courses
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Your enrolled classes — access materials, sessions, and more
          </p>
        </div>
        <Link
          href="/student/courses"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors shadow-sm"
        >
          <Sparkles size={16} />
          Browse More Classes
        </Link>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Classes', value: courses.length, icon: BookOpen, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-teal-900/30' },
          { label: 'Assignments', value: courses.reduce((s, c) => s + c.resources.filter(r => r.resource_type === 'assignment').length, 0), icon: ClipboardCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
          { label: 'Upcoming Sessions', value: courses.reduce((s, c) => s + c.sessions.filter(ses => new Date(ses.scheduled_start) > new Date() && ses.status === 'scheduled').length, 0), icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          { label: 'Materials', value: courses.reduce((s, c) => s + c.resources.filter(r => r.resource_type !== 'assignment').length, 0), icon: FileText, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
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

      {/* ── Search ── */}
      {courses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your courses..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none transition-all"
          />
        </div>
      )}

      {/* ── Course List ── */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {courses.length === 0 ? "You haven't enrolled in any courses yet" : 'No matching courses'}
          </p>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {courses.length === 0
              ? 'Browse available group classes and join one to get started.'
              : 'Try a different search term.'}
          </p>
          {courses.length === 0 && (
            <Link
              href="/student/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors shadow-sm"
            >
              <Sparkles size={16} />
              Browse Classes
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredCourses.map((course, index) => {
              const upcomingSessions = course.sessions.filter(
                s => new Date(s.scheduled_start) > new Date() && s.status === 'scheduled'
              )
              const nextSession = upcomingSessions[0] || null

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* ── Course Header (clickable) ── */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title + Status */}
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                            {course.title}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            course.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400'
                          }`}>
                            {course.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* Class Code */}
                        {course.class_code && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/40">
                              <Hash size={12} className="text-indigo-500" />
                              <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 tracking-wider">
                                {course.class_code}
                              </span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(course.class_code!)
                                setCopiedCode(course.id)
                                setTimeout(() => setCopiedCode(null), 2000)
                              }}
                              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                              title="Copy class code"
                            >
                              {copiedCode === course.id ? (
                                <Check size={12} className="text-green-500" />
                              ) : (
                                <Copy size={12} className="text-slate-400" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Subject */}
                        {course.subject_name && (
                          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">
                            {course.subject_name}
                            {course.subject_category && (
                              <span className="text-slate-400 dark:text-slate-500"> · {course.subject_category}</span>
                            )}
                          </p>
                        )}

                        {/* Quick Stats Row */}
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {/* Tutor */}
                          <Link
                            href={`/student/tutors/${course.tutor.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            <div className="relative">
                              <img
                                src={getAvatarUrl(course.tutor)}
                                alt={`${course.tutor.first_name} ${course.tutor.last_name}`}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                              <OnlineDot isOnline={course.tutor.is_online} size="sm" />
                            </div>
                            <span className="text-sm">{course.tutor.first_name} {course.tutor.last_name}</span>
                          </Link>
                          <span className="flex items-center gap-1">
                            <Users size={14} className="text-blue-500" />
                            {course.enrolled_count}/{course.max_students}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText size={14} className="text-amber-500" />
                            {course.resources.length} material{course.resources.length !== 1 ? 's' : ''}
                          </span>
                          {nextSession && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} className="text-purple-500" />
                              Next {timeUntil(nextSession.scheduled_start)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <div className="flex-shrink-0 mt-1">
                        {expandedCourse === course.id ? (
                          <ChevronUp size={20} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={20} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded Detail ── */}
                  <AnimatePresence>
                    {expandedCourse === course.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-200/60 dark:border-slate-700/40 p-5 space-y-6">
                          {/* Description */}
                          {course.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                              {course.description}
                            </p>
                          )}

                          {/* ── Materials & Assignments Section ── */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                              <FileText size={16} className="text-amber-500" />
                              Materials & Assignments ({course.resources.length})
                            </h4>

                            {course.resources.length === 0 ? (
                              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                                Your tutor hasn&apos;t uploaded any materials yet. Check back later.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {course.resources.map((resource) => {
                                  const isAssignment = resource.resource_type === 'assignment'
                                  const isPastDue = resource.due_date && new Date(resource.due_date) < new Date()
                                  const submission = mySubmissions[resource.id]
                                  const daysLeft = resource.due_date
                                    ? Math.ceil((new Date(resource.due_date).getTime() - Date.now()) / 86400000)
                                    : null

                                  return (
                                    <div
                                      key={resource.id}
                                      className={`rounded-xl border transition-colors overflow-hidden ${
                                        isAssignment
                                          ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/60 dark:border-indigo-700/30'
                                          : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-600/30 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 p-3">
                                        {isAssignment ? (
                                          <ClipboardCheck size={16} className="text-indigo-500 flex-shrink-0" />
                                        ) : (
                                          <span className="text-lg flex-shrink-0">{getFileIcon(resource.file_url)}</span>
                                        )}

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                              {resource.title}
                                            </p>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${
                                              isAssignment
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                            }`}>
                                              {isAssignment ? 'Assignment' : 'Material'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                              {formatDate(resource.uploaded_at)}
                                            </span>
                                            {resource.due_date && (
                                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                                isPastDue
                                                  ? 'text-red-500 dark:text-red-400'
                                                  : daysLeft !== null && daysLeft <= 2
                                                    ? 'text-orange-500 dark:text-orange-400'
                                                    : 'text-indigo-600 dark:text-indigo-400'
                                              }`}>
                                                <CalendarClock size={11} />
                                                Due: {formatDate(resource.due_date)}
                                                {isPastDue
                                                  ? ' (Past due)'
                                                  : daysLeft !== null && daysLeft <= 2
                                                    ? ` (${daysLeft <= 0 ? 'Today' : `${daysLeft}d left`})`
                                                    : ''}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          {isAssignment && submission && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                              submission.status === 'graded'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                              {submission.status === 'graded' ? `${submission.grade}%` : 'Submitted'}
                                            </span>
                                          )}

                                          {isAssignment && (
                                            <button
                                              onClick={() => setShowSubmitModal(resource.id)}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                submission
                                                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                                                  : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                                              }`}
                                            >
                                              <Upload size={12} />
                                              {submission ? 'Re-submit' : 'Submit'}
                                            </button>
                                          )}

                                          <a
                                            href={resource.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                            title="Download"
                                          >
                                            <Download size={14} className="text-blue-500" />
                                          </a>
                                        </div>
                                      </div>

                                      {/* Feedback from tutor */}
                                      {submission?.feedback && (
                                        <div className="px-3 pb-3">
                                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/15 border border-green-100 dark:border-green-800/30">
                                            <MessageSquare size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                                            <div>
                                              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">Tutor Feedback</p>
                                              <p className="text-xs text-green-600 dark:text-green-300">{submission.feedback}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* ── Sessions Section ── */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                              <Video size={16} className="text-purple-500" />
                              Sessions ({course.sessions.length})
                            </h4>

                            {course.sessions.length === 0 ? (
                              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                                No sessions scheduled yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {course.sessions.map((session) => {
                                  const isPast = new Date(session.scheduled_end) < new Date()
                                  const isUpcoming = new Date(session.scheduled_start) > new Date() && session.status === 'scheduled'

                                  return (
                                    <div
                                      key={session.id}
                                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        isUpcoming
                                          ? 'bg-purple-50 dark:bg-purple-900/15 border-purple-200 dark:border-purple-700/30'
                                          : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-600/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-1.5 rounded-lg ${
                                          isUpcoming
                                            ? 'bg-purple-100 dark:bg-purple-900/30'
                                            : 'bg-slate-100 dark:bg-slate-600/30'
                                        }`}>
                                          <Calendar size={14} className={isUpcoming ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                            {session.title}
                                          </p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {formatDate(session.scheduled_start)} · {formatTime(session.scheduled_start)} – {formatTime(session.scheduled_end)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        {session.meeting_url && isUpcoming && (
                                          <a
                                            href={session.meeting_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                                          >
                                            <Video size={12} />
                                            Join
                                          </a>
                                        )}
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          session.status === 'scheduled'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : session.status === 'completed'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : session.status === 'live'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400'
                                        }`}>
                                          {session.status}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* ── Enrollment Info ── */}
                          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700/30">
                            <span>Enrolled {formatDate(course.enrolled_at)}</span>
                            <span>·</span>
                            <span>Price: R{Number(course.price).toFixed(0)}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: SUBMIT ASSIGNMENT
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowSubmitModal(null); setSubmitError(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/40 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/40">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload size={20} className="text-indigo-500" />
                  {mySubmissions[showSubmitModal] ? 'Re-submit Assignment' : 'Submit Assignment'}
                </h3>
                <button
                  onClick={() => { setShowSubmitModal(null); setSubmitError(null) }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmitAssignment} className="p-6 space-y-4">
                {submitError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                  </div>
                )}

                {mySubmissions[showSubmitModal] && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40">
                    <AlertCircle size={16} className="text-yellow-500 flex-shrink-0" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      You already submitted this assignment. Uploading a new file will replace your previous submission.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Solution File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.zip,.py,.js,.ts,.java,.cpp,.c,.html,.css"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    Upload your completed work — PDF, Word, code files, images, or ZIP
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowSubmitModal(null); setSubmitError(null) }}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !submitFile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {submitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
