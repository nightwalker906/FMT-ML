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
  BookOpen,
  TrendingUp,
  Sparkles,
  FolderOpen,
  Video,
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
  onLinkClick?: (link: SidebarLink) => void;
  userName?: string;
  userInitials?: string;
  userAvatar?: string;
}

// Student sidebar links
export const studentLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: <Home size={20} /> },
  { label: 'Find a Tutor', href: '/student/search', icon: <Search size={20} /> },
  { label: 'Group Classes', href: '/student/courses', icon: <GraduationCap size={20} /> },
  { label: 'My Courses', href: '/student/my-courses', icon: <FolderOpen size={20} /> },
  { label: 'Live Classroom', href: '/student/live-classroom', icon: <Video size={20} /> },
  { label: 'Study Planner', href: '/student/study-planner', icon: <BookOpen size={20} /> },
  { label: 'Quick Tutor AI', href: '/student/quick-tutor', icon: <Sparkles size={20} /> },
  { label: 'My Schedule', href: '/student/schedule', icon: <Calendar size={20} /> },
  { label: 'My Learning', href: '/student/progress', icon: <TrendingUp size={20} /> },
  { label: 'Messages', href: '/student/messages', icon: <MessageSquare size={20} /> },
  { label: 'Settings', href: '/student/settings', icon: <Settings size={20} /> },
];

// Tutor sidebar links
export const tutorLinks: SidebarLink[] = [
  { label: 'Dashboard', href: '/tutor/dashboard', icon: <Gauge size={20} /> },
  { label: 'Requests', href: '/tutor/requests', icon: <Inbox size={20} /> },
  { label: 'My Students', href: '/tutor/students', icon: <Users size={20} /> },
  { label: 'My Courses', href: '/tutor/courses', icon: <GraduationCap size={20} /> },
  { label: 'Live Classroom', href: '/tutor/live-classroom', icon: <Video size={20} /> },
  { label: 'Messages', href: '/tutor/messages', icon: <MessageSquare size={20} /> },
  { label: 'Earnings', href: '/tutor/earnings', icon: <DollarSign size={20} /> },
  { label: 'Smart Pricing', href: '/tutor/smart-pricing', icon: <DollarSign size={20} /> },
  { label: 'Settings', href: '/tutor/settings', icon: <Settings size={20} /> },
];

export function Sidebar({ links, userType, onSignOut, onLinkClick, userName, userInitials, userAvatar }: SidebarProps) {
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
  
  // Theme colors - premium glassmorphism design
  const theme = {
    bg: 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl',
    bgHover: 'bg-slate-50/80 dark:bg-slate-800/80',
    border: 'border-slate-200/50 dark:border-slate-800/50',
    text: 'text-slate-600 dark:text-slate-400',
    textMuted: 'text-slate-400 dark:text-slate-500',
    textBrand: 'text-slate-900 dark:text-white',
    hover: 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white',
    active: 'bg-gradient-to-r from-primary-50 dark:from-primary-600/20 to-transparent text-primary-700 dark:text-primary-400',
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
          'bg-gradient-to-br from-primary-500 to-primary-600',
          'text-white shadow-lg shadow-primary-500/25'
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
              onClick={(e) => { if (typeof onLinkClick === 'function') { e.preventDefault(); onLinkClick(link); } }}
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
                isActive ? 'bg-primary-500 opacity-100' : 'opacity-0'
              )} />

              {/* Icon */}
              <span className={cn(
                'flex items-center justify-center flex-shrink-0',
                'transition-all duration-200',
                isCollapsed && 'w-10 h-10 rounded-xl',
                isCollapsed && isActive && 'bg-primary-100 dark:bg-primary-600/30',
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
      <div className={cn('border-t p-3', theme.border)}>
        {/* Sign Out Button */}
        <div>
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
  onLinkClick,
  userName,
  userInitials,
  userAvatar 
}: SidebarProps & { isOpen: boolean; onClose: () => void; onLinkClick?: (link: SidebarLink) => void }) {
  const pathname = usePathname();

  const isStudent = userType === 'student';
  
  // Theme colors - premium glassmorphism design
  const theme = {
    bg: 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl',
    border: 'border-slate-200/50 dark:border-slate-800/50',
    text: 'text-slate-600 dark:text-slate-400',
    textMuted: 'text-slate-400 dark:text-slate-500',
    textBrand: 'text-slate-900 dark:text-white',
    hover: 'hover:bg-slate-100 dark:hover:bg-slate-800',
    active: 'bg-gradient-to-r from-primary-50 dark:from-primary-600/20 to-transparent text-primary-700 dark:text-primary-400',
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
          'fixed left-0 top-0 z-50 h-screen w-[min(20rem,88vw)] lg:hidden',
          'transition-transform duration-300 ease-out',
          'flex flex-col',
          theme.bg,
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className={cn('flex h-16 items-center justify-between border-b px-4 sm:px-5', theme.border)}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center',
              'w-10 h-10 rounded-xl',
              'bg-gradient-to-br from-primary-500 to-primary-600',
              'text-white shadow-lg shadow-primary-500/25'
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
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              theme.text,
              theme.hover
            )}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Label */}
        <div className="px-5 pt-6 pb-2 sm:px-6">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', theme.textMuted)}>
            Menu
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => { onClose(); if (typeof onLinkClick === 'function') { e.preventDefault(); onLinkClick(link); } }}
                className={cn(
                  'relative flex min-h-[52px] items-center justify-between gap-3 rounded-xl px-3 py-3 sm:px-4',
                  'transition-all duration-200',
                  isActive ? theme.active : cn(theme.text, theme.hover)
                )}
              >
                {/* Active indicator */}
                <div className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2',
                  'w-1 h-6 rounded-r-full bg-primary-500',
                  'transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0'
                )} />
                
                <span
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                    isActive && 'bg-primary-100 text-primary-600 dark:bg-primary-600/20'
                  )}
                >
                  {link.icon}
                </span>
                <span className={cn('min-w-0 flex-1 text-sm font-medium sm:text-[15px]', isActive && 'font-semibold')}>
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
        <div className={cn('border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]', theme.border)}>
          <button
            onClick={onSignOut}
            className={cn(
              'flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 py-3',
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
