import type { Metadata } from 'next'
import { AuthProvider } from '@/context/auth-context'
import { ThemeProvider } from '@/context/theme-context'
import { ToastProvider } from '@/components/ui/toast'
import { AchievementToastProvider } from '@/components/achievements/AchievementUnlockedToast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Find My Tutor',
  description: 'Connect with expert tutors for personalized learning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-white text-slate-900 antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        <ThemeProvider>
          <ToastProvider>
            <AchievementToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </AchievementToastProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
