'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Search,
  Calendar,
  MessageSquare,
  Settings,
  Gauge,
  Inbox,
  Users,
  DollarSign,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Bell,
} from 'lucide-react';

export interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  links: SidebarLink[];
  userType: 'student' | 'tutor';
  onSignOut?: () => void;
  userName?: string;
  userInitials?: string;
  userAvatar?: string;
}

// Student sidebar links
export const studentLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: <Home size={20} /> },
  { label: 'Find a Tutor', href: '/student/search', icon: <Search size={20} /> },
  { label: 'My Schedule', href: '/student/schedule', icon: <Calendar size={20} /> },
  { label: 'Messages', href: '/student/messages', icon: <MessageSquare size={20} /> },
  { label: 'Notifications', href: '/student/notifications', icon: <Bell size={20} /> },
  { label: 'Settings', href: '/student/settings', icon: <Settings size={20} /> },
];

// Tutor sidebar links
export const tutorLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/tutor/dashboard', icon: <Gauge size={20} /> },
  { label: 'Requests', href: '/tutor/requests', icon: <Inbox size={20} /> },
  { label: 'My Students', href: '/tutor/students', icon: <Users size={20} /> },
  { label: 'Earnings', href: '/tutor/earnings', icon: <DollarSign size={20} /> },
  { label: 'Notifications', href: '/tutor/notifications', icon: <Bell size={20} /> },
  { label: 'Settings', href: '/tutor/settings', icon: <Settings size={20} /> },
];

export function Sidebar({ links, userType, onSignOut, userName, userInitials, userAvatar }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const isStudent = userType === 'student';
  
  // Theme colors - now supports dark mode via Tailwind classes
  const theme = {
    bg: 'bg-white dark:bg-slate-900',
    bgHover: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700/50',
    text: 'text-slate-600 dark:text-slate-400',
    textMuted: 'text-slate-400 dark:text-slate-500',
    textBrand: 'text-slate-900 dark:text-white',
    hover: 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
    active: 'bg-gradient-to-r from-teal-50 dark:from-teal-600/20 to-transparent text-teal-700 dark:text-teal-400',
    activeIcon: 'text-teal-600 dark:text-teal-400',
  };

  if (!mounted) {
    return (
      <aside className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-screen border-r z-40 w-64',
        theme.bg, theme.border
      )} />
    );
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-screen border-r z-40',
        'transition-all duration-300 ease-in-out',
        theme.bg,
        theme.border,
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        'flex items-center h-16 border-b',
        theme.border,
        isCollapsed ? 'px-4 justify-center' : 'px-5 gap-3'
      )}>
        <div className={cn(
          'flex items-center justify-center flex-shrink-0',
          'w-10 h-10 rounded-xl',
          'bg-gradient-to-br from-teal-500 to-teal-600',
          'text-white shadow-lg shadow-teal-500/20'
        )}>
          <GraduationCap size={22} />
        </div>
        <span className={cn(
          'font-bold text-lg whitespace-nowrap overflow-hidden',
          'transition-all duration-300',
          theme.textBrand,
          isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
        )}>
          Find My Tutor
        </span>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className={cn(
          'absolute -right-3 top-[72px]',
          'w-6 h-6 rounded-full',
          'border-2 shadow-md',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-110',
          theme.bg,
          theme.border
        )}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight size={12} className={theme.text} />
        ) : (
          <ChevronLeft size={12} className={theme.text} />
        )}
      </button>

      {/* Navigation Section Label */}
      <div className={cn(
        'px-5 pt-6 pb-2 overflow-hidden',
        'transition-all duration-300',
        isCollapsed ? 'h-0 opacity-0 pt-0 pb-0' : 'h-auto opacity-100'
      )}>
        <span className={cn('text-xs font-semibold uppercase tracking-wider', theme.textMuted)}>
          Menu
        </span>
      </div>

      {/* Navigation Links */}
      <nav className={cn(
        'flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden',
        isCollapsed ? 'pt-6' : 'pt-2'
      )}>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'group relative flex items-center rounded-xl',
                'transition-all duration-200',
                isCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3 gap-3',
                isActive ? theme.active : cn(theme.text, theme.hover)
              )}
            >
              {/* Active indicator bar */}
              <div className={cn(
                'absolute left-0 top-1/2 -translate-y-1/2',
                'w-1 h-6 rounded-r-full',
                'transition-all duration-200',
                isActive ? 'bg-teal-500 opacity-100' : 'opacity-0'
              )} />

              {/* Icon */}
              <span className={cn(
                'flex items-center justify-center flex-shrink-0',
                'transition-all duration-200',
                isCollapsed && 'w-10 h-10 rounded-xl',
                isCollapsed && isActive && 'bg-teal-100 dark:bg-teal-600/30',
                isCollapsed && !isActive && 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800',
                isActive && theme.activeIcon
              )}>
                {link.icon}
              </span>
              
              {/* Label */}
              <span className={cn(
                'font-medium whitespace-nowrap overflow-hidden',
                'transition-all duration-300',
                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                isActive && 'font-semibold'
              )}>
                {link.label}
              </span>

              {/* Badge */}
              {link.badge && link.badge > 0 && (
                <span className={cn(
                  'flex items-center justify-center',
                  'text-xs font-bold text-white bg-red-500 rounded-full',
                  'transition-all duration-200',
                  isCollapsed 
                    ? 'absolute top-1 right-1 min-w-[16px] h-[16px] px-1 text-[10px]' 
                    : 'ml-auto min-w-[20px] h-[20px] px-1.5'
                )}>
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className={cn(
                  'absolute left-full ml-3',
                  'px-3 py-2 rounded-lg',
                  'bg-slate-900 text-white text-sm font-medium',
                  'shadow-lg shadow-slate-900/20',
                  'opacity-0 invisible translate-x-1',
                  'group-hover:opacity-100 group-hover:visible group-hover:translate-x-0',
                  'transition-all duration-200',
                  'whitespace-nowrap z-50 pointer-events-none'
                )}>
                  {link.label}
                  {/* Arrow */}
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={cn('border-t', theme.border)}>
        {/* User Profile Mini */}
        {(userName || userInitials) && (
          <Link
            href={isStudent ? '/student/settings' : '/tutor/settings'}
            className={cn(
              'flex items-center p-4',
              'transition-all duration-200',
              theme.hover,
              isCollapsed ? 'justify-center' : 'gap-3'
            )}
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName || 'User'} 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-teal-500/30 flex-shrink-0"
              />
            ) : (
              <div className={cn(
                'w-9 h-9 rounded-full flex-shrink-0',
                'flex items-center justify-center',
                'text-sm font-semibold text-white',
                'bg-gradient-to-br from-teal-500 to-teal-600',
                'ring-2 ring-teal-500/30'
              )}>
                {userInitials || 'U'}
              </div>
            )}
            <div className={cn(
              'flex-1 min-w-0 overflow-hidden',
              'transition-all duration-300',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            )}>
              <p className={cn('text-sm font-medium truncate', theme.textBrand)}>
                {userName || 'User'}
              </p>
              <p className={cn('text-xs truncate', theme.textMuted)}>
                {isStudent ? 'Student' : 'Tutor'}
              </p>
            </div>
          </Link>
        )}

        {/* Sign Out Button */}
        <div className="p-3">
          <button
            onClick={onSignOut}
            className={cn(
              'group relative flex items-center w-full rounded-xl',
              'text-red-500 transition-all duration-200',
              'hover:bg-red-50 dark:hover:bg-red-500/10',
              isCollapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3 gap-3'
            )}
          >
            <span className={cn(
              'flex items-center justify-center flex-shrink-0',
              isCollapsed && 'w-10 h-10 rounded-xl'
            )}>
              <LogOut size={20} />
            </span>
            <span className={cn(
              'font-medium whitespace-nowrap overflow-hidden',
              'transition-all duration-300',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            )}>
              Sign Out
            </span>

            {/* Tooltip */}
            {isCollapsed && (
              <div className={cn(
                'absolute left-full ml-3',
                'px-3 py-2 rounded-lg',
                'bg-slate-900 text-white text-sm font-medium',
                'shadow-lg',
                'opacity-0 invisible translate-x-1',
                'group-hover:opacity-100 group-hover:visible group-hover:translate-x-0',
                'transition-all duration-200',
                'whitespace-nowrap z-50 pointer-events-none'
              )}>
                Sign Out
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

// Mobile Sidebar (Drawer)
export function MobileSidebar({ 
  links, 
  userType, 
  isOpen, 
  onClose, 
  onSignOut,
  userName,
  userInitials,
  userAvatar 
}: SidebarProps & { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const isStudent = userType === 'student';
  
  // Theme colors - now supports dark mode via Tailwind classes
  const theme = {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700/50',
    text: 'text-slate-600 dark:text-slate-400',
    textMuted: 'text-slate-400 dark:text-slate-500',
    textBrand: 'text-slate-900 dark:text-white',
    hover: 'hover:bg-slate-100 dark:hover:bg-slate-800',
    active: 'bg-gradient-to-r from-teal-50 dark:from-teal-600/20 to-transparent text-teal-700 dark:text-teal-400',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden',
          'transition-all duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-72 z-50 lg:hidden',
          'transition-transform duration-300 ease-out',
          'flex flex-col',
          theme.bg,
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between h-16 px-5 border-b', theme.border)}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-xl',
              'bg-gradient-to-br from-teal-500 to-teal-600',
              'text-white shadow-lg shadow-teal-500/20'
            )}>
              <GraduationCap size={22} />
            </div>
            <h1 className={cn('font-bold text-lg', theme.textBrand)}>
              Find My Tutor
            </h1>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              theme.text,
              theme.hover
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile */}
        {(userName || userInitials) && (
          <Link
            href={isStudent ? '/student/settings' : '/tutor/settings'}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 mx-4 mt-4 p-3 rounded-xl',
              'transition-colors',
              theme.hover
            )}
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName || 'User'} 
                className="w-11 h-11 rounded-full object-cover ring-2 ring-teal-500/30"
              />
            ) : (
              <div className={cn(
                'w-11 h-11 rounded-full',
                'flex items-center justify-center',
                'text-sm font-semibold text-white',
                'bg-gradient-to-br from-teal-500 to-teal-600',
                'ring-2 ring-teal-500/30'
              )}>
                {userInitials || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold truncate', theme.textBrand)}>
                {userName || 'User'}
              </p>
              <p className={cn('text-xs truncate', theme.textMuted)}>
                {isStudent ? 'Student Account' : 'Tutor Account'}
              </p>
            </div>
          </Link>
        )}

        {/* Navigation Label */}
        <div className="px-6 pt-6 pb-2">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', theme.textMuted)}>
            Menu
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-3 rounded-xl',
                  'transition-all duration-200',
                  isActive ? theme.active : cn(theme.text, theme.hover)
                )}
              >
                {/* Active indicator */}
                <div className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2',
                  'w-1 h-6 rounded-r-full bg-teal-500',
                  'transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0'
                )} />
                
                <span className={cn(isActive && 'text-teal-600')}>{link.icon}</span>
                <span className={cn('font-medium', isActive && 'font-semibold')}>
                  {link.label}
                </span>
                
                {link.badge && link.badge > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className={cn('p-4 border-t', theme.border)}>
          <button
            onClick={onSignOut}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl w-full',
              'text-red-500 transition-all duration-200',
              'hover:bg-red-50 dark:hover:bg-red-500/10'
            )}
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
