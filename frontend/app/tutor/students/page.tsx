'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  BookOpen,
  Send,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';

// Database enum: 'pending', 'accepted', 'rejected', 'completed', 'cancelled'
type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

type StudentBooking = {
  id: string;
  student_id: string;
  student_name: string;
  student_avatar: string;
  subject: string;
  scheduled_at: string;
  duration: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  total_sessions: number;
};

type TabType = 'all' | 'pending' | 'accepted' | 'completed';

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <XCircle className="h-4 w-4" />,
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: <XCircle className="h-4 w-4" />,
  },
};

export default function TutorStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBooking[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // bookings table uses auth.users id directly (not tutors.id)
    // So we query using user.id as tutor_id
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, student_id, subject, scheduled_at, status, notes, created_at')
      .eq('tutor_id', user.id)
      .order('created_at', { ascending: false });

    console.log('Bookings query result:', { bookings, bookingsError, tutorId: user.id });
    
    // Log detailed error if present
    if (bookingsError) {
      console.error('Bookings error details:', {
        message: bookingsError.message,
        code: bookingsError.code,
        details: bookingsError.details,
        hint: bookingsError.hint
      });
    }

    if (!bookings || bookings.length === 0) {
      setLoading(false);
      return;
    }

    // Get unique student IDs (these are auth.users ids / profile ids)
    const studentIds = [...new Set(bookings.map((b) => b.student_id))];

    // Get profiles directly since student_id in bookings = profile.id = auth.users.id
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', studentIds);

    // Create a map of student_id -> profile
    const studentProfileMap: Record<string, { name: string; avatar: string }> = {};
    profiles?.forEach((profile) => {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Student';
      studentProfileMap[profile.id] = {
        name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=14b8a6&color=fff`,
      };
    });

    // Get subjects if there's a subject_id field, otherwise use the subject text field
    // Based on schema, 'subject' is TEXT not a foreign key
    
    // Count total sessions per student
    const sessionCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.status === 'accepted' || b.status === 'completed') {
        sessionCounts[b.student_id] = (sessionCounts[b.student_id] || 0) + 1;
      }
    });

    // Format bookings
    const formattedStudents: StudentBooking[] = bookings.map((b) => ({
      id: b.id,
      student_id: b.student_id,
      student_name: studentProfileMap[b.student_id]?.name || 'Student',
      student_avatar: studentProfileMap[b.student_id]?.avatar || `https://ui-avatars.com/api/?name=Student&background=14b8a6&color=fff`,
      subject: b.subject || 'General Tutoring',
      scheduled_at: b.scheduled_at,
      duration: 60, // Duration stored in notes field
      status: b.status as BookingStatus,
      notes: b.notes,
      created_at: b.created_at,
      total_sessions: sessionCounts[b.student_id] || 0,
    }));

    setStudents(formattedStudents);
    setLoading(false);
  }

  async function handleBookingAction(bookingId: string, action: 'accept' | 'reject') {
    setRespondingTo(bookingId);

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      setStudents((prev) =>
        prev.map((s) => (s.id === bookingId ? { ...s, status: newStatus as BookingStatus } : s))
      );
    }

    setRespondingTo(null);
  }

  // Filter students based on active tab and search
  const filteredStudents = students.filter((student) => {
    // Tab filter
    if (activeTab === 'pending' && student.status !== 'pending') return false;
    if (activeTab === 'accepted' && student.status !== 'accepted') return false;
    if (activeTab === 'completed' && student.status !== 'completed') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        student.student_name.toLowerCase().includes(query) ||
        student.subject.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Get unique students count
  const uniqueStudents = new Set(
    students.filter((s) => s.status === 'accepted' || s.status === 'completed').map((s) => s.student_id)
  ).size;

  // Count by status
  const pendingCount = students.filter((s) => s.status === 'pending').length;
  const acceptedCount = students.filter((s) => s.status === 'accepted').length;
  const completedCount = students.filter((s) => s.status === 'completed').length;

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Students</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your student bookings and sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uniqueStudents}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{acceptedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Accepted</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
          {[
            { key: 'all', label: 'All', count: students.length },
            { key: 'pending', label: 'Pending', count: pendingCount },
            { key: 'accepted', label: 'Accepted', count: acceptedCount },
            { key: 'completed', label: 'Completed', count: completedCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery ? 'No students found' : 'No bookings yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'When students book sessions with you, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Student Info */}
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={student.student_avatar}
                    alt={student.student_name}
                    className="h-12 w-12 rounded-full flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {student.student_name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusConfig[student.status].color
                        }`}
                      >
                        {statusConfig[student.status].icon}
                        {statusConfig[student.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {student.subject}
                    </p>
                    {student.total_sessions > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {student.total_sessions} completed session{student.total_sessions !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Session Details */}
                <div className="flex flex-col sm:items-end gap-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(student.scheduled_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      {formatTime(student.scheduled_at)} · {student.duration} min
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Requested {formatDistanceToNow(new Date(student.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {student.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    "{student.notes}"
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-wrap gap-2">
                {student.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleBookingAction(student.id, 'accept')}
                      disabled={respondingTo === student.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {respondingTo === student.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => handleBookingAction(student.id, 'reject')}
                      disabled={respondingTo === student.id}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  </>
                )}
                <Link
                  href={`/tutor/messages?chat=${student.student_id}`}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
