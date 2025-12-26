'use client'

import { useState, useEffect } from 'react'
import { Users, Calendar, Star, Loader2, MessageSquare, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Student = {
  id: string
  name: string
  avatar: string
  totalSessions: number
  lastSession: string | null
}

export default function TutorStudentsPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Get all bookings for this tutor (accepted or completed)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('student_id, scheduled_at, status')
      .eq('tutor_id', user.id)
      .in('status', ['accepted', 'completed'])
      .order('scheduled_at', { ascending: false })

    if (!bookings || bookings.length === 0) {
      setLoading(false)
      return
    }

    // Group by student
    const studentMap: Record<string, { count: number; lastSession: string | null }> = {}
    bookings.forEach(b => {
      if (!studentMap[b.student_id]) {
        studentMap[b.student_id] = { count: 0, lastSession: null }
      }
      studentMap[b.student_id].count++
      if (!studentMap[b.student_id].lastSession) {
        studentMap[b.student_id].lastSession = b.scheduled_at
      }
    })

    // Get student profiles
    const studentIds = Object.keys(studentMap)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', studentIds)

    const formattedStudents: Student[] = (profiles || []).map(p => ({
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Student',
      avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.first_name || ''} ${p.last_name || ''}`)}`,
      totalSessions: studentMap[p.id]?.count || 0,
      lastSession: studentMap[p.id]?.lastSession || null
    }))

    // Sort by total sessions (most active first)
    formattedStudents.sort((a, b) => b.totalSessions - a.totalSessions)
    
    setStudents(formattedStudents)
    setLoading(false)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
        <p className="text-gray-600">Students you've worked with</p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-100 rounded-xl">
            <Users className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Yet</h3>
          <p className="text-gray-500">
            Once you accept booking requests, your students will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <img
                    src={student.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{student.totalSessions} session{student.totalSessions !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Last: {formatDate(student.lastSession)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
