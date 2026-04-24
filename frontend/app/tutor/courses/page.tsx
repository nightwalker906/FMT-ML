'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Plus,
  Users,
  Calendar,
  BookOpen,
  DollarSign,
  Clock,
  Video,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Trash2,
  Link as LinkIcon,
  GraduationCap,
  Eye,
  ToggleLeft,
  ToggleRight,
  Copy,
  Hash,
  Upload,
  Download,
  ClipboardCheck,
  CalendarClock,
  ArrowUpFromLine,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { API_BASE } from '@/lib/api-config'
import { formatCurrency } from '@/lib/currency'

// ─── Types ───────────────────────────────────────────────────────────────────

type Subject = {
  id: string
  name: string
  category: string
}

type EnrolledStudent = {
  id: string
  first_name: string
  last_name: string
  avatar: string | null
  enrolled_at: string
  status: string
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
  resource_type: 'material' | 'assignment' | 'quiz' | 'recording'
  due_date: string | null
}

type StudentSubmission = {
  id: string
  resource_id: string
  student_id: string
  file_url: string
  file_name: string | null
  submitted_at: string
  grade: number | null
  feedback: string | null
  status: string
  student_name?: string
  student_avatar?: string | null
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
  subject_id: string | null
  subject_name: string | null
  subject_category: string | null
  enrolled_count: number
  sessions: CourseSession[]
  resources: CourseResource[]
  enrolled_students: EnrolledStudent[]
}

type Tab = 'courses' | 'create'

// ─── Component ───────────────────────────────────────────────────────────────

export default function TutorCoursesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Core state
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('courses')
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Create course form
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formMaxStudents, setFormMaxStudents] = useState('30')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Add session modal
  const [showSessionModal, setShowSessionModal] = useState<string | null>(null) // course_id or null
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState('')
  const [sessionEndTime, setSessionEndTime] = useState('')
  const [sessionMeetingUrl, setSessionMeetingUrl] = useState('')
  const [addingSession, setAddingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Toasts / action states
  const [togglingCourse, setTogglingCourse] = useState<string | null>(null)
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Upload material modal
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null) // course_id or null
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<'material' | 'assignment'>('material')
  const [uploadDueDate, setUploadDueDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingResource, setDeletingResource] = useState<string | null>(null)

  // Submissions viewer
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null) // resource_id
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeValue, setGradeValue] = useState('')
  const [feedbackValue, setFeedbackValue] = useState('')

  // AI quiz publish modal (opened after approving draft quiz)
  const [showQuizPublishModal, setShowQuizPublishModal] = useState(false)
  const [quizPublishId, setQuizPublishId] = useState<string | null>(null)
  const [quizPublishCourseId, setQuizPublishCourseId] = useState<string | null>(null)
  const [quizPublishTitle, setQuizPublishTitle] = useState('AI Quiz')
  const [quizDueDate, setQuizDueDate] = useState('')
  const [quizPublishError, setQuizPublishError] = useState<string | null>(null)
  const [quizPublishing, setQuizPublishing] = useState(false)

  // ── Load data on mount ──
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const quizId = searchParams.get('quizId')
    const courseId = searchParams.get('courseId')
    const quizTitle = searchParams.get('quizTitle')
    if (quizId && courseId) {
      setQuizPublishId(quizId)
      setQuizPublishCourseId(courseId)
      setQuizPublishTitle(quizTitle || 'AI Quiz')
      setShowQuizPublishModal(true)
    }
  }, [searchParams])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Fetch subjects for the dropdown
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('id, name, category')
        .order('name')

      if (subjectData) setSubjects(subjectData)

      // Fetch this tutor's courses
      await loadCourses(user.id)
    } catch (err) {
      console.error('Failed to load course data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadCourses(tutorId: string) {
    // Get courses (flat columns only)
    const { data: coursesData, error } = await supabase
      .from('courses')
      .select('id, title, description, class_code, price, max_students, is_active, created_at, subject_id')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading courses:', error)
      return
    }

    if (!coursesData || coursesData.length === 0) {
      setCourses([])
      return
    }

    const courseIds = coursesData.map(c => c.id)

    // Build subject map from already-loaded subjects
    const subjectMap: Record<string, any> = {}
    subjects.forEach(s => { subjectMap[s.id] = s })

    // Fetch enrollments, sessions, resources in parallel
    const [enrollmentsRes, sessionsRes, resourcesRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, course_id, student_id, status, enrolled_at')
        .in('course_id', courseIds)
        .eq('status', 'enrolled'),
      supabase
        .from('course_sessions')
        .select('id, course_id, title, scheduled_start, scheduled_end, meeting_url, status')
        .in('course_id', courseIds)
        .order('scheduled_start', { ascending: true }),
      supabase
        .from('course_resources')
        .select('id, course_id, title, file_url, uploaded_at, resource_type, due_date')
        .in('course_id', courseIds)
        .order('uploaded_at', { ascending: false }),
    ])

    const enrollments = enrollmentsRes.data || []
    const sessions = sessionsRes.data || []
    const resources = resourcesRes.data || []

    // Fetch student profiles separately
    const studentIds = [...new Set(enrollments.map(e => e.student_id).filter(Boolean))]
    let profileMap: Record<string, any> = {}
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar')
        .in('id', studentIds)
      if (profiles) {
        profiles.forEach(p => { profileMap[p.id] = p })
      }
    }

    // Build the full course objects
    const fullCourses: Course[] = coursesData.map(c => {
      const subj = subjectMap[c.subject_id] || null
      const courseEnrollments = enrollments.filter(e => e.course_id === c.id)
      const courseSessions = sessions.filter(s => s.course_id === c.id)
      const courseResources = resources.filter(r => r.course_id === c.id)

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        class_code: c.class_code || null,
        price: c.price,
        max_students: c.max_students,
        is_active: c.is_active,
        created_at: c.created_at,
        subject_id: c.subject_id,
        subject_name: subj?.name || null,
        subject_category: subj?.category || null,
        enrolled_count: courseEnrollments.length,
        sessions: courseSessions,
        resources: courseResources,
        enrolled_students: courseEnrollments.map(e => {
          const profile = profileMap[e.student_id]
          return {
            id: profile?.id || e.student_id,
            first_name: profile?.first_name || 'Student',
            last_name: profile?.last_name || '',
            avatar: profile?.avatar || null,
            enrolled_at: e.enrolled_at,
            status: e.status,
          }
        }),
      }
    })

    setCourses(fullCourses)
  }

  // ── Create Course ──
  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setFormError(null)
    setFormSuccess(null)

    if (!formTitle.trim()) {
      setFormError('Please enter a course title.')
      return
    }

    const price = parseFloat(formPrice)
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price (0 or more).')
      return
    }

    const maxStudents = parseInt(formMaxStudents)
    if (isNaN(maxStudents) || maxStudents < 1) {
      setFormError('Max students must be at least 1.')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          tutor_id: userId,
          subject_id: formSubject || null,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          price,
          max_students: maxStudents,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      const classCode = data?.class_code || ''
      setFormSuccess(classCode
        ? `"${formTitle}" created! Class Code: ${classCode} — share this code with your students so they can join directly.`
        : `"${formTitle}" created successfully!`
      )
      setFormTitle('')
      setFormDescription('')
      setFormSubject('')
      setFormPrice('')
      setFormMaxStudents('30')

      // Refresh course list
      await loadCourses(userId)

      // Auto-switch to courses tab after 3s (longer so they can see the code)
      setTimeout(() => {
        setActiveTab('courses')
        setFormSuccess(null)
      }, 4000)
    } catch (err: any) {
      setFormError(err.message || 'Failed to create course.')
    } finally {
      setCreating(false)
    }
  }

  // ── Toggle Active Status ──
  async function handleToggleActive(courseId: string, currentlyActive: boolean) {
    setTogglingCourse(courseId)
    try {
      await supabase
        .from('courses')
        .update({ is_active: !currentlyActive })
        .eq('id', courseId)

      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_active: !currentlyActive } : c)
      )
    } catch (err) {
      console.error('Toggle error:', err)
    } finally {
      setTogglingCourse(null)
    }
  }

  // ── Add Session ──
  function resetSessionModal() {
    setShowSessionModal(null)
    setSessionTitle('')
    setSessionDate('')
    setSessionStartTime('')
    setSessionEndTime('')
    setSessionMeetingUrl('')
    setSessionError(null)
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    if (!showSessionModal) return

    setSessionError(null)

    if (!sessionTitle.trim() || !sessionDate || !sessionStartTime || !sessionEndTime) {
      setSessionError('Please complete title, date, start time, and end time.')
      return
    }

    const scheduledStart = new Date(`${sessionDate}T${sessionStartTime}:00`)
    const scheduledEnd = new Date(`${sessionDate}T${sessionEndTime}:00`)

    if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
      setSessionError('Invalid date/time selected.')
      return
    }

    if (scheduledEnd <= scheduledStart) {
      setSessionError('End time must be after start time.')
      return
    }

    setAddingSession(true)
    try {
      const res = await fetch('/api/live/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: showSessionModal,
          title: sessionTitle.trim(),
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          meeting_url: sessionMeetingUrl.trim() || null,
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to schedule session.')
      }

      if (userId) await loadCourses(userId)
      resetSessionModal()
    } catch (err: any) {
      console.error('Add session error:', err)
      setSessionError(err?.message || 'Failed to schedule session.')
    } finally {
      setAddingSession(false)
    }
  }

  // ── Delete Session ──
  async function handleDeleteSession(sessionId: string) {
    setDeletingSession(sessionId)
    try {
      await supabase
        .from('course_sessions')
        .delete()
        .eq('id', sessionId)

      setCourses(prev =>
        prev.map(c => ({
          ...c,
          sessions: c.sessions.filter(s => s.id !== sessionId),
        }))
      )
    } catch (err) {
      console.error('Delete session error:', err)
    } finally {
      setDeletingSession(null)
    }
  }

  // ── Upload Material ──
  async function handleUploadMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!showUploadModal || !uploadFile) return

    setUploading(true)
    setUploadError(null)

    try {
      // Build a unique file path: courseId/timestamp_filename
      const timestamp = Date.now()
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${showUploadModal}/${timestamp}_${safeName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('Class materials')
        .upload(filePath, uploadFile)

      if (uploadErr) throw uploadErr

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('Class materials')
        .getPublicUrl(filePath)

      const fileUrl = urlData.publicUrl

      // Insert record into course_resources table
      const materialTitle = uploadTitle.trim() || uploadFile.name
      const insertData: any = {
        course_id: showUploadModal,
        title: materialTitle,
        file_url: fileUrl,
        resource_type: uploadType,
      }
      if (uploadType === 'assignment' && uploadDueDate) {
        insertData.due_date = new Date(uploadDueDate).toISOString()
      }

      const { data: resourceData, error: insertErr } = await supabase
        .from('course_resources')
        .insert(insertData)
        .select()
        .single()

      if (insertErr) throw insertErr

      // Update local state
      setCourses(prev =>
        prev.map(c => {
          if (c.id !== showUploadModal) return c
          return {
            ...c,
            resources: [
              {
                id: resourceData.id,
                title: materialTitle,
                file_url: fileUrl,
                uploaded_at: resourceData.uploaded_at || new Date().toISOString(),
                resource_type: uploadType,
                due_date: insertData.due_date || null,
              },
              ...c.resources,
            ],
          }
        })
      )

      // Reset & close
      setUploadTitle('')
      setUploadFile(null)
      setUploadType('material')
      setUploadDueDate('')
      setShowUploadModal(null)
    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Failed to upload material.')
    } finally {
      setUploading(false)
    }
  }

  // ── Delete Resource ──
  async function handleDeleteResource(resourceId: string, fileUrl: string) {
    setDeletingResource(resourceId)
    try {
      // Extract the storage path from the URL
      const bucketName = 'Class materials'
      const urlParts = fileUrl.split(`/storage/v1/object/public/${encodeURIComponent(bucketName)}/`)
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1])
        await supabase.storage.from(bucketName).remove([storagePath])
      }

      // Delete from database
      await supabase
        .from('course_resources')
        .delete()
        .eq('id', resourceId)

      // Update local state
      setCourses(prev =>
        prev.map(c => ({
          ...c,
          resources: c.resources.filter(r => r.id !== resourceId),
        }))
      )
    } catch (err) {
      console.error('Delete resource error:', err)
    } finally {
      setDeletingResource(null)
    }
  }

  // ── Publish AI Quiz as Assignment ──
  function resetQuizPublishModal() {
    setShowQuizPublishModal(false)
    setQuizPublishError(null)
    setQuizDueDate('')
    setQuizPublishId(null)
    setQuizPublishCourseId(null)
    router.replace('/tutor/courses')
  }

  async function handlePublishQuizAssignment() {
    if (!quizPublishId || !quizPublishCourseId) {
      setQuizPublishError('Missing quiz details. Please regenerate the quiz.')
      return
    }
    if (!quizDueDate) {
      setQuizPublishError('Please select a due date.')
      return
    }

    setQuizPublishing(true)
    setQuizPublishError(null)
    try {
      const isoDueDate = new Date(quizDueDate).toISOString()
      const res = await fetch(`${API_BASE}/ai/quiz/publish/${quizPublishId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: quizPublishCourseId,
          due_date: isoDueDate,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to publish quiz.')
      }

      if (userId) await loadCourses(userId)
      resetQuizPublishModal()
    } catch (err: any) {
      setQuizPublishError(err?.message || 'Failed to publish quiz.')
    } finally {
      setQuizPublishing(false)
    }
  }

  // ── Load Submissions for an assignment ──
  async function loadSubmissions(resourceId: string) {
    setViewingSubmissions(resourceId)
    setLoadingSubmissions(true)
    setSubmissions([])

    try {
      const { data: subsData, error } = await supabase
        .from('student_submissions')
        .select('id, resource_id, student_id, file_url, file_name, submitted_at, grade, feedback, status')
        .eq('resource_id', resourceId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      // Fetch student profiles
      const studentIds = [...new Set((subsData || []).map(s => s.student_id))]
      let profileMap: Record<string, any> = {}
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar')
          .in('id', studentIds)
        if (profiles) {
          profiles.forEach(p => { profileMap[p.id] = p })
        }
      }

      const enriched: StudentSubmission[] = (subsData || []).map(s => {
        const profile = profileMap[s.student_id]
        return {
          ...s,
          student_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Student',
          student_avatar: profile?.avatar || null,
        }
      })
      setSubmissions(enriched)
    } catch (err) {
      console.error('Failed to load submissions:', err)
    } finally {
      setLoadingSubmissions(false)
    }
  }

  // ── Grade a submission ──
  async function handleGradeSubmission(submissionId: string) {
    try {
      const updates: any = {}
      if (gradeValue) updates.grade = parseFloat(gradeValue)
      if (feedbackValue.trim()) updates.feedback = feedbackValue.trim()
      updates.status = 'graded'

      const { error } = await supabase
        .from('student_submissions')
        .update(updates)
        .eq('id', submissionId)

      if (error) throw error

      // Update local state
      setSubmissions(prev =>
        prev.map(s => s.id === submissionId ? { ...s, ...updates } : s)
      )
      setGradingId(null)
      setGradeValue('')
      setFeedbackValue('')
    } catch (err) {
      console.error('Failed to grade submission:', err)
    }
  }

  // ── Helpers ──
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  function formatDuration(start: string, end: string) {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const mins = Math.round(ms / 60000)
    if (mins < 60) return `${mins}min`
    const hrs = Math.floor(mins / 60)
    const rem = mins % 60
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
  }

  function getSessionStatusColor(status: string) {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'cancelled': return 'bg-slate-100 text-slate-500 dark:bg-slate-700/30 dark:text-slate-400'
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400'
    }
  }

  // ── Stats ──
  const totalCourses = courses.length
  const activeCourses = courses.filter(c => c.is_active).length
  const totalStudents = courses.reduce((sum, c) => sum + c.enrolled_count, 0)
  const totalSessions = courses.reduce((sum, c) => sum + c.sessions.length, 0)

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12 animate-fade-in sm:space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            <GraduationCap className="h-6 w-6 text-primary-600 dark:text-primary-400 sm:h-7 sm:w-7" />
            Virtual Classrooms
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create and manage group courses, schedule live sessions, and track enrollments
          </p>
        </div>
        <button
          onClick={() => setActiveTab('create')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-primary-700 hover:to-emerald-700 hover:shadow-lg sm:w-auto"
        >
          <Plus size={18} />
          Create New Class
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
        {[
          { label: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-teal-900/30' },
          { label: 'Active', value: activeCourses, icon: Check, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Sessions', value: totalSessions, icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200/60 bg-white p-3 dark:border-slate-700/40 dark:bg-slate-800/80 sm:p-4">
            <div className="flex items-start gap-2.5 sm:items-center sm:gap-3">
              <div className={`rounded-xl p-2 ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{stat.value}</p>
                <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Selector ── */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 scrollbar-hide dark:bg-slate-800/60 sm:w-fit">
        {[
          { key: 'courses' as Tab, label: 'My Courses', icon: BookOpen },
          { key: 'create' as Tab, label: 'Create New', icon: Plus },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CREATE NEW COURSE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200/60 bg-white p-4 dark:border-slate-700/40 dark:bg-slate-800/80 sm:p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Plus size={20} className="text-primary-600 dark:text-primary-400" />
            Create a New Class
          </h2>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
              <Check size={16} />
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateCourse} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Course Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Calculus Masterclass: From Basics to Advanced"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                maxLength={255}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe what students will learn, prerequisites, and course structure..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Subject, Price, Max Students (3-col grid) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject
                </label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Price (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Max Students
                </label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={formMaxStudents}
                    onChange={(e) => setFormMaxStudents(e.target.value)}
                    min="1"
                    max="500"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-stretch pt-2 sm:justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 px-6 py-2.5 font-medium text-white shadow-md transition-all hover:from-primary-700 hover:to-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {creating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {creating ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MY COURSES LIST
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-slate-200/60 bg-white p-8 text-center dark:border-slate-700/40 dark:bg-slate-800/80 sm:p-12"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <GraduationCap className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Courses Yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                Create your first virtual classroom and start teaching groups of students with live sessions.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 px-5 py-2.5 font-medium text-white shadow-md transition-all hover:shadow-lg sm:w-auto"
              >
                <Plus size={18} />
                Create Your First Class
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/40 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* ── Course Header ── */}
                  <div
                    className="cursor-pointer p-4 sm:p-5"
                    onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
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

                        {/* Class Code Badge */}
                        {course.class_code && (
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700/40">
                              <Hash size={13} className="text-indigo-500" />
                              <span className="text-sm font-mono font-semibold text-indigo-700 dark:text-indigo-300 tracking-wider">
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
                              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                              title="Copy class code"
                            >
                              {copiedCode === course.id ? (
                                <Check size={14} className="text-green-500" />
                              ) : (
                                <Copy size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              )}
                            </button>
                          </div>
                        )}

                        {course.subject_name && (
                          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">
                            {course.subject_name}
                            {course.subject_category && (
                              <span className="text-slate-400 dark:text-slate-500"> · {course.subject_category}</span>
                            )}
                          </p>
                        )}

                        {course.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                            {course.description}
                          </p>
                        )}

                        {/* Quick stats row */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Users size={14} className="text-blue-500" />
                            {course.enrolled_count}/{course.max_students} students
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Video size={14} className="text-purple-500" />
                            {course.sessions.length} sessions
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign size={14} className="text-emerald-500" />
                            {formatCurrency(course.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-500" />
                            {course.resources.length} resources
                          </span>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <div className="flex items-center gap-2 self-end flex-shrink-0 sm:self-start">
                        {/* Active toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleActive(course.id, course.is_active)
                          }}
                          disabled={togglingCourse === course.id}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                          title={course.is_active ? 'Deactivate course' : 'Activate course'}
                        >
                          {togglingCourse === course.id ? (
                            <Loader2 size={18} className="animate-spin text-slate-400" />
                          ) : course.is_active ? (
                            <ToggleRight size={22} className="text-green-500" />
                          ) : (
                            <ToggleLeft size={22} className="text-slate-400" />
                          )}
                        </button>

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
                        <div className="space-y-6 border-t border-slate-200/60 p-4 dark:border-slate-700/40 sm:p-5">
                          {/* ── Sessions Section ── */}
                          <div>
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Video size={16} className="text-purple-500" />
                                Scheduled Sessions
                              </h4>
                              <button
                                onClick={() => {
                                  setSessionError(null)
                                  setSessionTitle('')
                                  setSessionDate('')
                                  setSessionStartTime('')
                                  setSessionEndTime('')
                                  setSessionMeetingUrl('')
                                  setShowSessionModal(course.id)
                                }}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-teal-900/20 dark:text-primary-400 dark:hover:bg-teal-900/40 sm:w-auto"
                              >
                                <Plus size={14} />
                                Add Session
                              </button>
                            </div>

                            {course.sessions.length === 0 ? (
                              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                                No sessions scheduled yet. Add one to get started.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {course.sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-600/30 dark:bg-slate-700/30 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                        <Calendar size={14} className="text-purple-600 dark:text-purple-400" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                          {session.title}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          {formatDate(session.scheduled_start)} · {formatTime(session.scheduled_start)} – {formatTime(session.scheduled_end)}
                                          <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
                                          {formatDuration(session.scheduled_start, session.scheduled_end)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                                      {session.meeting_url && (
                                        <a
                                          href={session.meeting_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                          title="Open meeting link"
                                        >
                                          <LinkIcon size={14} className="text-blue-500" />
                                        </a>
                                      )}
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSessionStatusColor(session.status)}`}>
                                        {session.status}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteSession(session.id)
                                        }}
                                        disabled={deletingSession === session.id}
                                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                        title="Delete session"
                                      >
                                        {deletingSession === session.id ? (
                                          <Loader2 size={14} className="animate-spin text-slate-400" />
                                        ) : (
                                          <Trash2 size={14} className="text-slate-400 hover:text-red-500 transition-colors" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ── Enrolled Students Section ── */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                              <Users size={16} className="text-blue-500" />
                              Enrolled Students ({course.enrolled_count})
                            </h4>

                            {course.enrolled_students.length === 0 ? (
                              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                                No students enrolled yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {course.enrolled_students.map((student) => (
                                  <div
                                    key={student.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-600/30"
                                  >
                                    <img
                                      src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.first_name + ' ' + student.last_name)}&background=0d9488&color=fff`}
                                      alt={`${student.first_name} ${student.last_name}`}
                                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {student.first_name} {student.last_name}
                                      </p>
                                      <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Enrolled {formatDate(student.enrolled_at)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ── Resources / Materials Section ── */}
                          <div>
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText size={16} className="text-amber-500" />
                                Materials & Assignments ({course.resources.length})
                              </h4>
                              <button
                                onClick={() => setShowUploadModal(course.id)}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 sm:w-auto"
                              >
                                <Upload size={14} />
                                Upload
                              </button>
                            </div>

                            {course.resources.length === 0 ? (
                              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                                No materials or assignments uploaded yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {course.resources.map((resource) => {
                                  const isAssignment = resource.resource_type === 'assignment'
                                  const isQuiz = resource.resource_type === 'quiz'
                                  const isRecording = resource.resource_type === 'recording'
                                  const isTask = isAssignment || isQuiz
                                  const isPastDue = resource.due_date && new Date(resource.due_date) < new Date()
                                  const badgeLabel = isQuiz
                                    ? 'Quiz'
                                    : isAssignment
                                      ? 'Assignment'
                                      : isRecording
                                        ? 'Recording'
                                        : 'Material'

                                  return (
                                    <div
                                      key={resource.id}
                                      className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center ${
                                        isTask
                                          ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/60 dark:border-indigo-700/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                          : isRecording
                                            ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200/60 dark:border-purple-700/30 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                            : 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-600/30 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                      }`}
                                    >
                                      {isTask ? (
                                        <ClipboardCheck size={16} className="text-indigo-500 flex-shrink-0" />
                                      ) : isRecording ? (
                                        <Video size={16} className="text-purple-500 flex-shrink-0" />
                                      ) : (
                                        <FileText size={16} className="text-amber-500 flex-shrink-0" />
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{resource.title}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                            isTask
                                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                                              : isRecording
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                          }`}>
                                            {badgeLabel}
                                          </span>
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                          <span className="text-xs text-slate-400 dark:text-slate-500">
                                            {formatDate(resource.uploaded_at)}
                                          </span>
                                          {resource.due_date && (
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                              isPastDue
                                                ? 'text-red-500 dark:text-red-400'
                                                : 'text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                              <CalendarClock size={11} />
                                              Due: {formatDate(resource.due_date)}
                                              {isPastDue && ' (Past due)'}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                                        {isAssignment && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              loadSubmissions(resource.id)
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                            title="View student submissions"
                                          >
                                            <ArrowUpFromLine size={12} />
                                            Submissions
                                          </button>
                                        )}

                                        <a
                                          href={resource.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                          title="Download / View"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download size={14} className="text-blue-500" />
                                        </a>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteResource(resource.id, resource.file_url)
                                          }}
                                          disabled={deletingResource === resource.id}
                                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                          title="Delete"
                                        >
                                          {deletingResource === resource.id ? (
                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                          ) : (
                                            <Trash2 size={14} className="text-slate-400 hover:text-red-500 transition-colors" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* MODAL: PUBLISH AI QUIZ */}

      <AnimatePresence>
        {showQuizPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={resetQuizPublishModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-xl dark:border-slate-700/40 dark:bg-slate-800 max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-4 dark:border-slate-700/40 sm:px-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-indigo-500" />
                  Publish AI Quiz
                </h3>
                <button
                  onClick={resetQuizPublishModal}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                {quizPublishError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{quizPublishError}</p>
                  </div>
                )}

                <div className="rounded-lg border border-slate-200/60 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-700/30 p-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{quizPublishTitle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">AI quiz draft ready to publish.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={quizDueDate}
                      onChange={(e) => setQuizDueDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Students will see this deadline in their assignments list.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetQuizPublishModal}
                    className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishQuizAssignment}
                    disabled={quizPublishing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {quizPublishing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ClipboardCheck size={16} />
                    )}
                    {quizPublishing ? 'Publishing...' : 'Publish Assignment'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* MODAL: ADD SESSION */}
      <AnimatePresence>
        {showSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={resetSessionModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-xl dark:border-slate-700/40 dark:bg-slate-800 max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-4 dark:border-slate-700/40 sm:px-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={20} className="text-purple-500" />
                  Schedule a Live Session
                </h3>
                <button
                  onClick={resetSessionModal}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleAddSession} className="space-y-4 p-4 sm:p-6">
                {sessionError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{sessionError}</p>
                  </div>
                )}

                {/* Session Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Session Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="e.g. Week 1: Introduction to Derivatives"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Start / End Time */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={sessionStartTime}
                      onChange={(e) => setSessionStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={sessionEndTime}
                      onChange={(e) => setSessionEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Meeting URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Meeting URL <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={sessionMeetingUrl}
                      onChange={(e) => setSessionMeetingUrl(e.target.value)}
                      placeholder="Leave blank to auto-create the FMT live room link"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetSessionModal}
                    className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingSession}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {addingSession ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Calendar size={16} />
                    )}
                    {addingSession ? 'Scheduling...' : 'Schedule Session'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: UPLOAD MATERIAL / ASSIGNMENT
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowUploadModal(null); setUploadError(null); setUploadType('material'); setUploadDueDate('') }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-xl dark:border-slate-700/40 dark:bg-slate-800 max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-4 dark:border-slate-700/40 sm:px-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload size={20} className="text-amber-500" />
                  Upload {uploadType === 'assignment' ? 'Assignment' : 'Material'}
                </h3>
                <button
                  onClick={() => { setShowUploadModal(null); setUploadError(null); setUploadType('material'); setUploadDueDate('') }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleUploadMaterial} className="space-y-4 p-4 sm:p-6">
                {uploadError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{uploadError}</p>
                  </div>
                )}

                {/* Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => { setUploadType('material'); setUploadDueDate('') }}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        uploadType === 'material'
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700/30'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <FileText size={18} />
                      Material
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType('assignment')}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        uploadType === 'assignment'
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-700/30'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <ClipboardCheck size={18} />
                      Assignment
                    </button>
                  </div>
                </div>

                {/* Material Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Title <span className="text-slate-400 font-normal">(optional — defaults to file name)</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder={uploadType === 'assignment' ? 'e.g. Week 3 Homework, Final Project' : 'e.g. Chapter 3 Notes, Exam Prep'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Due Date (only for assignments) */}
                {uploadType === 'assignment' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Due Date <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="datetime-local"
                        value={uploadDueDate}
                        onChange={(e) => setUploadDueDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Students will see this deadline and can submit before it
                    </p>
                  </div>
                )}

                {/* File Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    File <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.zip,.mp4,.mp3"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 dark:file:bg-amber-900/30 dark:file:text-amber-400 hover:file:bg-amber-100 dark:hover:file:bg-amber-900/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    PDF, Word, PowerPoint, Excel, Images, ZIP, Video, Audio — max 50MB
                  </p>
                </div>

                {/* Submit */}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(null); setUploadError(null); setUploadType('material'); setUploadDueDate('') }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                      uploadType === 'assignment'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    }`}
                  >
                    {uploading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    {uploading ? 'Uploading...' : `Upload ${uploadType === 'assignment' ? 'Assignment' : 'Material'}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: VIEW SUBMISSIONS
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {viewingSubmissions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setViewingSubmissions(null); setGradingId(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl dark:border-slate-700/40 dark:bg-slate-800 sm:max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-4 dark:border-slate-700/40 sm:px-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowUpFromLine size={20} className="text-indigo-500" />
                  Student Submissions ({submissions.length})
                </h3>
                <button
                  onClick={() => { setViewingSubmissions(null); setGradingId(null) }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowUpFromLine size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No submissions yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Students haven&apos;t submitted anything for this assignment</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-700/20 overflow-hidden"
                      >
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                          <img
                            src={sub.student_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.student_name || 'S')}&background=6366f1&color=fff`}
                            alt={sub.student_name || 'Student'}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{sub.student_name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Submitted {formatDate(sub.submitted_at)} · {formatTime(sub.submitted_at)}
                            </p>
                          </div>

                          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                            {sub.grade !== null && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                {sub.grade}%
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              sub.status === 'graded'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {sub.status}
                            </span>
                            <a
                              href={sub.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title="Download submission"
                            >
                              <Download size={14} className="text-blue-500" />
                            </a>
                            <button
                              onClick={() => {
                                setGradingId(gradingId === sub.id ? null : sub.id)
                                setGradeValue(sub.grade !== null ? String(sub.grade) : '')
                                setFeedbackValue(sub.feedback || '')
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                            >
                              <GraduationCap size={12} />
                              Grade
                            </button>
                          </div>
                        </div>

                        {/* Existing feedback */}
                        {sub.feedback && gradingId !== sub.id && (
                          <div className="px-4 pb-3">
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-100 dark:border-indigo-800/30">
                              <MessageSquare size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-indigo-700 dark:text-indigo-300">{sub.feedback}</p>
                            </div>
                          </div>
                        )}

                        {/* Grading form */}
                        {gradingId === sub.id && (
                          <div className="space-y-3 border-t border-slate-200/60 px-4 pb-4 pt-3 dark:border-slate-700/30">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Grade (%)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={gradeValue}
                                  onChange={(e) => setGradeValue(e.target.value)}
                                  placeholder="0-100"
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Feedback</label>
                              <textarea
                                value={feedbackValue}
                                onChange={(e) => setFeedbackValue(e.target.value)}
                                placeholder="Write feedback for the student..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                              />
                            </div>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={() => setGradingId(null)}
                                className="w-full px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-white sm:w-auto"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGradeSubmission(sub.id)}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 sm:w-auto"
                              >
                                <Check size={13} />
                                Save Grade
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
