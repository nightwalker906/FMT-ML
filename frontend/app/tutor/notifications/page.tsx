'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Trash2, Loader2, Calendar, MessageSquare, Star, AlertCircle, Info, X, DollarSign, Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url: string | null
  metadata: Record<string, any>
  created_at: string
}

const notificationIcons: Record<string, React.ReactNode> = {
  booking_request: <Calendar className="h-5 w-5 text-blue-500" />,
  booking_accepted: <Check className="h-5 w-5 text-green-500" />,
  booking_rejected: <X className="h-5 w-5 text-red-500" />,
  booking_cancelled: <AlertCircle className="h-5 w-5 text-orange-500" />,
  booking_completed: <Check className="h-5 w-5 text-teal-500" />,
  message: <MessageSquare className="h-5 w-5 text-teal-500" />,
  review: <Star className="h-5 w-5 text-yellow-500" />,
  payment: <DollarSign className="h-5 w-5 text-green-500" />,
  new_student: <Users className="h-5 w-5 text-purple-500" />,
  system: <Info className="h-5 w-5 text-slate-500" />,
}

const notificationColors: Record<string, string> = {
  booking_request: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  booking_accepted: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  booking_rejected: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  booking_cancelled: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  booking_completed: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
  message: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
  review: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  payment: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  new_student: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  system: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
}

export default function TutorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading notifications:', error)
      } else {
        setNotifications(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    }
  }

  async function markAllAsRead() {
    setMarkingAllRead(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      }
    } finally {
      setMarkingAllRead(false)
    }
  }

  async function deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    }
  }

  async function clearAllNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (!error) {
      setNotifications([])
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-slate-400">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            filter === 'all'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          )}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            filter === 'unread'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500 dark:text-slate-400">
              {filter === 'unread'
                ? 'You\'re all caught up!'
                : 'When you get notifications, they\'ll show up here'}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-xl border transition-all',
                notification.is_read
                  ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                  : notificationColors[notification.type] || notificationColors.system,
                !notification.is_read && 'shadow-sm'
              )}
            >
              {/* Unread indicator */}
              {!notification.is_read && (
                <div className="absolute top-4 left-0 w-1 h-8 bg-teal-500 rounded-r-full" />
              )}

              {/* Icon */}
              <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                notification.is_read ? 'bg-gray-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-800'
              )}>
                {notificationIcons[notification.type] || notificationIcons.system}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className={cn(
                      'font-medium',
                      notification.is_read
                        ? 'text-gray-700 dark:text-slate-300'
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {notification.title}
                    </h4>
                    <p className={cn(
                      'text-sm mt-0.5',
                      notification.is_read
                        ? 'text-gray-500 dark:text-slate-400'
                        : 'text-gray-600 dark:text-slate-300'
                    )}>
                      {notification.message}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                    {formatTime(notification.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {notification.action_url && (
                    <a
                      href={notification.action_url}
                      onClick={() => markAsRead(notification.id)}
                      className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                    >
                      View details →
                    </a>
                  )}
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-sm text-red-500 hover:text-red-700 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
