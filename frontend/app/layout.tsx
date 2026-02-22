import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/auth-context'
import { ThemeProvider } from '@/context/theme-context'
import { ToastProvider } from '@/components/ui/toast'
import { AchievementToastProvider } from '@/components/achievements/AchievementUnlockedToast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} bg-white text-slate-900 dark:bg-slate-950 dark:text-white antialiased transition-colors duration-300`}>
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
