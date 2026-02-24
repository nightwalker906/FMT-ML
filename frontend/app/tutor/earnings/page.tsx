'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Calendar, Clock, Loader2, BarChart3, Wallet } from 'lucide-react'
import { getTutorEarnings } from '@/app/actions/tutor'

type CompletedSession = {
  id: string
  studentName: string
  subject: string
  completedAt: string
  amount: number
}

type MonthlyEarning = {
  month: string
  amount: number
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function TutorEarningsPage() {
  const [loading, setLoading] = useState(true)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [monthlyEarnings, setMonthlyEarnings] = useState(0)
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([])
  const [earningsByMonth, setEarningsByMonth] = useState<MonthlyEarning[]>([])

  useEffect(() => {
    loadEarnings()
  }, [])

  async function loadEarnings() {
    const result = await getTutorEarnings()
    if (result.success && result.data) {
      setTotalEarnings(result.data.totalEarnings)
      setMonthlyEarnings(result.data.monthlyEarnings)
      setCompletedSessions(result.data.completedSessions)
      setEarningsByMonth(result.data.earningsByMonth)
    }
    setLoading(false)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatCurrency(amount: number) {
    return `R${amount.toLocaleString()}`
  }

  // Calculate max earnings for chart scaling
  const maxMonthlyEarning = Math.max(...earningsByMonth.map(e => e.amount), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Earnings</h1>
        <p className="text-slate-500 dark:text-slate-400">Track your income from tutoring sessions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Earnings', value: formatCurrency(totalEarnings), sub: 'Lifetime earnings', iconBg: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30', icon: <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> },
          { label: 'This Month', value: formatCurrency(monthlyEarnings), sub: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), iconBg: 'from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/30', icon: <TrendingUp className="h-6 w-6 text-primary-600 dark:text-primary-400" /> },
          { label: 'Sessions Completed', value: completedSessions.length, sub: 'Total sessions', iconBg: 'from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30', icon: <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" /> },
        ].map((card, i) => (
          <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="card-stat group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Earnings Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          <h2 className="section-title !mb-0">Earnings Over Time</h2>
        </div>

        <div className="h-64">
          <div className="flex items-end justify-between h-48 gap-2">
            {earningsByMonth.map((item, index) => (
              <motion.div
                key={item.month}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((item.amount / maxMonthlyEarning) * 100, 4)}%` }}
                transition={{ delay: 0.4 + index * 0.05, duration: 0.6, ease: 'easeOut' }}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className="w-full bg-gradient-to-t from-primary-600 to-primary-400 dark:from-primary-500 dark:to-primary-300 rounded-t-xl transition-all hover:from-primary-700 hover:to-primary-500 cursor-pointer h-full"
                  style={{ minHeight: item.amount > 0 ? '20px' : '4px' }}
                />
              </motion.div>
            ))}
          </div>

          <div className="flex justify-between mt-3">
            {earningsByMonth.map((item) => (
              <div key={item.month} className="flex-1 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.month.split(' ')[0]}</p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Completed Sessions Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card overflow-hidden">
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/40">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <h2 className="section-title !mb-0">Completed Sessions</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your recent completed tutoring sessions</p>
        </div>

        {completedSessions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">No completed sessions yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Complete sessions to start earning!</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {completedSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900 dark:text-white">{session.studentName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-600 dark:text-slate-400">{session.subject}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">{formatDate(session.completedAt)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(session.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {completedSessions.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/30 border-t border-slate-200/60 dark:border-slate-700/40 flex justify-between items-center">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Showing {completedSessions.length} sessions
            </span>
            <div className="text-right">
              <span className="text-sm text-slate-500 dark:text-slate-400">Total: </span>
              <span className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(totalEarnings)}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}