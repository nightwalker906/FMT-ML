'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@/utils/supabase/client';
import { Sidebar, MobileSidebar, studentLinks, SidebarLink } from '@/components/layout/sidebar';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { ThemeToggle } from '@/components/theme-toggle';
import { Bell, Menu, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, isLoading } = useAuth();
  const supabase = createClient();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // ── Track online presence (heartbeat + auto-offline) ──
  const { goOffline } = useOnlinePresence(user?.id);

  // Fetch user profile and notifications
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch profile (including avatar for real profile pictures)
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar')
        .eq('id', user.id)
        .single();

      if (profile?.first_name) {
        setDisplayName(`${profile.first_name} ${profile.last_name || ''}`.trim());
        const firstInitial = profile.first_name.charAt(0).toUpperCase();
        const lastInitial = profile.last_name ? profile.last_name.charAt(0).toUpperCase() : '';
        setInitials(`${firstInitial}${lastInitial}`);
        // Use stored profile picture if available, otherwise generate placeholder
        if (profile.avatar) {
          setAvatarUrl(profile.avatar);
        } else {
          const fullName = `${profile.first_name} ${profile.last_name || ''}`;
          setAvatarUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=14b8a6&color=fff`);
        }
      } else {
        const emailName = user.email?.split('@')[0] || 'Student';
        setDisplayName(emailName);
        setInitials(emailName.substring(0, 2).toUpperCase());
        setAvatarUrl('');
      }

      // Fetch notification count (unread)
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotificationCount(count || 0);

      // Fetch unread messages count
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      setUnreadMessagesCount(messagesCount || 0);
    };

    fetchData();

    // Subscribe to new messages for real-time badge updates
    const messagesSubscription = supabase
      .channel(`messages-badge:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Increment unread count on new message
          setUnreadMessagesCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Decrement if message marked as read
          if (payload.new && (payload.new as { is_read: boolean }).is_read) {
            setUnreadMessagesCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user, supabase]);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await goOffline();
    await signOut();
    router.push('/login');
  };

  // Create links with dynamic message badge
  const linksWithBadges: SidebarLink[] = useMemo(() => {
    return studentLinks.map(link => {
      if (link.href === '/student/messages') {
        return { ...link, badge: unreadMessagesCount };
      }
      return link;
    });
  }, [unreadMessagesCount]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
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
        links={linksWithBadges} 
        userType="student" 
        onSignOut={handleSignOut}
        userName={displayName}
        userInitials={initials}
        userAvatar={avatarUrl}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        links={linksWithBadges}
        userType="student"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onSignOut={handleSignOut}
        userName={displayName}
        userInitials={initials}
        userAvatar={avatarUrl}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header — Glass effect */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
            >
              <Menu size={22} />
            </button>

            {/* Welcome Message */}
            <div className="hidden sm:flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Student Portal
              </h1>
            </div>

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <span className="font-bold text-slate-900 dark:text-white">FMT</span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notification Bell */}
              <Link href="/student/notifications" className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-95">
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 ring-2 ring-white dark:ring-slate-900">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Link>

              {/* User Avatar - Clickable to Settings */}
              <Link href="/student/settings" className="flex items-center gap-3 cursor-pointer group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-200/50 dark:ring-primary-700/30 group-hover:ring-primary-300 dark:group-hover:ring-primary-600 transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-primary-200/50 dark:ring-primary-700/30 group-hover:ring-primary-300 dark:group-hover:ring-primary-600 transition-all">
                    {initials || 'ST'}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
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
