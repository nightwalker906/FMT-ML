'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';
import { MessageSquare, Settings, Users, BookOpen, LogOut, Sun, Moon } from 'lucide-react';

interface UserProfile {
  displayName: string;
  bio: string;
  learningGoals: string;
  avatarUrl: string;
  userType: string;
  email: string;
}

export default function DashboardPage() {
  const { user, signOut, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPageLoading(false);
      return;
    }

    const metadata = user.user_metadata || {};
    setProfile({
      displayName: metadata.display_name || user.email?.split('@')[0] || 'Student',
      bio: metadata.bio || '',
      learningGoals: metadata.learning_goals || '',
      avatarUrl:
        metadata.avatar_url ||
        `https://ui-avatars.com/api/?name=${metadata.display_name || user.email}`,
      userType: metadata.user_type || 'student',
      email: user.email || '',
    });

    setPageLoading(false);
  }, [user]);

  if (isLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-teal-900 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 dark:border-teal-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-teal-200">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-teal-900 dark:to-slate-900">
        <div className="text-center text-slate-900 dark:text-white">
          <p className="mb-4">Please log in to access your dashboard</p>
          <Link
            href="/login"
            className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-teal-900 dark:to-slate-900">
      <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-teal-500/20 sticky top-0 z-50 shadow-sm dark:shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">🎓</div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Find My Tutor</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-yellow-500" />
              ) : (
                <Moon size={20} className="text-slate-600" />
              )}
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-500/10 dark:to-teal-600/10 border border-teal-200 dark:border-teal-500/30 rounded-lg p-8 mb-8">
          <div className="flex items-start gap-6">
            <img
              src={profile?.avatarUrl}
              alt={profile?.displayName}
              className="w-20 h-20 rounded-full border-2 border-teal-500 dark:border-teal-400"
            />
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome back, {profile?.displayName}! 👋
              </h2>
              <p className="text-teal-700 dark:text-teal-200 mb-4">
                You are successfully logged in. Explore your dashboard and start learning!
              </p>
              <div className="flex gap-4">
                <div className="bg-white/50 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/30 rounded-lg px-4 py-2">
                  <p className="text-sm text-teal-700 dark:text-teal-300">Account Type</p>
                  <p className="text-lg font-semibold text-teal-900 dark:text-teal-100 capitalize">
                    {profile?.userType}
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/30 rounded-lg px-4 py-2">
                  <p className="text-sm text-teal-700 dark:text-teal-300">Email Status</p>
                  <p className="text-lg font-semibold text-teal-900 dark:text-teal-100">✓ Verified</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/student/messages"
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 hover:border-teal-500 dark:hover:border-teal-500/50 hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm dark:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <MessageSquare
                size={28}
                className="text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors"
              />
              <span className="bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full text-sm font-semibold">
                New
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Messages</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Chat with your tutors in real-time</p>
          </Link>

          <Link
            href="/student/settings"
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 hover:border-teal-500 dark:hover:border-teal-500/50 hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm dark:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <Settings
                size={28}
                className="text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors"
              />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Settings</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Manage your profile and preferences</p>
          </Link>

          <Link
            href="/tutors"
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 hover:border-teal-500 dark:hover:border-teal-500/50 hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm dark:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <Users
                size={28}
                className="text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors"
              />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Find Tutors</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Browse and book tutors</p>
          </Link>

          <Link
            href="/student/sessions"
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 hover:border-teal-500 dark:hover:border-teal-500/50 hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group shadow-sm dark:shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <BookOpen
                size={28}
                className="text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors"
              />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">My Sessions</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">View upcoming and past sessions</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 shadow-sm dark:shadow-md">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Your Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400">Email Address</label>
                <p className="text-slate-900 dark:text-white font-medium">{profile?.email}</p>
              </div>
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400">Display Name</label>
                <p className="text-slate-900 dark:text-white font-medium">{profile?.displayName}</p>
              </div>
              {profile?.bio && (
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400">Bio</label>
                  <p className="text-slate-800 dark:text-slate-200 text-sm">{profile.bio}</p>
                </div>
              )}
              {profile?.learningGoals && (
                <div>
                  <label className="text-sm text-slate-600 dark:text-slate-400">Learning Goals</label>
                  <p className="text-slate-800 dark:text-slate-200 text-sm">{profile.learningGoals}</p>
                </div>
              )}
              <Link
                href="/student/settings"
                className="inline-block mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 shadow-sm dark:shadow-md">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Email Verified</p>
                  <p className="text-slate-900 dark:text-white font-medium">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Account Type</p>
                  <p className="text-slate-900 dark:text-white font-medium capitalize">{profile?.userType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Ready to Learn</p>
                  <p className="text-slate-900 dark:text-white font-medium">Active</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 shadow-sm dark:shadow-md">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-slate-600 dark:text-slate-400">Messages</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">0</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-slate-600 dark:text-slate-400">Active Sessions</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">0</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-slate-600 dark:text-slate-400">Tutors Contacted</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">0</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-slate-600 dark:text-slate-400">Hours Learned</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-teal-500/20 rounded-lg p-6 shadow-sm dark:shadow-md">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Getting Started</h3>
          <ol className="space-y-3 text-slate-700 dark:text-slate-300">
            <li className="flex gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                1
              </span>
              <span>
                Complete your profile with your learning goals in{' '}
                <Link href="/student/settings" className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300">
                  Settings
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                2
              </span>
              <span>
                Browse available tutors in{' '}
                <Link href="/tutors" className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300">
                  Find Tutors
                </Link>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                3
              </span>
              <span>Book a session and start learning</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                4
              </span>
              <span>
                Chat with your tutor using{' '}
                <Link href="/student/messages" className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300">
                  Messages
                </Link>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
