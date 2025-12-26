'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import { Sidebar, MobileSidebar, tutorLinks } from '@/components/layout/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Bell, Menu, Loader2 } from 'lucide-react';

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, signOut, isLoading } = useAuth();
  const supabase = createClient();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hourlyRate, setHourlyRate] = useState(0);

  // Fetch user profile and notifications
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch profile including avatar_url
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile?.first_name) {
        setDisplayName(`${profile.first_name} ${profile.last_name || ''}`.trim());
        // Get first letter of first name and last name for initials
        const firstInitial = profile.first_name.charAt(0).toUpperCase();
        const lastInitial = profile.last_name ? profile.last_name.charAt(0).toUpperCase() : '';
        setInitials(`${firstInitial}${lastInitial}`);
        // Use avatar_url from database if available
        setAvatarUrl(profile.avatar_url || '');
      } else {
        const emailName = user.email?.split('@')[0] || 'Tutor';
        setDisplayName(emailName);
        setInitials(emailName.substring(0, 2).toUpperCase());
        setAvatarUrl('');
      }

      // Fetch tutor data
      const { data: tutor } = await supabase
        .from('tutors')
        .select('hourly_rate')
        .eq('profile_id', user.id)
        .single();

      if (tutor) {
        setHourlyRate(tutor.hourly_rate || 0);
      }

      // Fetch notification count (unread)
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotificationCount(count || 0);
    };

    fetchData();
  }, [user, supabase]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <Sidebar 
        links={tutorLinks} 
        userType="tutor" 
        onSignOut={handleSignOut}
        userName={displayName}
        userInitials={initials}
        userAvatar={avatarUrl}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        links={tutorLinks}
        userType="tutor"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onSignOut={handleSignOut}
        userName={displayName}
        userInitials={initials}
        userAvatar={avatarUrl}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <Menu size={24} />
            </button>

            {/* Welcome Message */}
            <div className="hidden sm:flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Tutor Portal
              </h1>
              {hourlyRate > 0 && (
                <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full text-sm font-medium">
                  ${hourlyRate}/hr
                </span>
              )}
            </div>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="font-bold text-slate-900 dark:text-white">FMT</span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notification Bell */}
              <Link href="/tutor/notifications" className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Link>

              {/* User Avatar - Clickable to Settings */}
              <Link href="/tutor/settings" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-9 h-9 rounded-full border-2 border-teal-500 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-teal-500 bg-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                    {initials || 'TU'}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tutor</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
