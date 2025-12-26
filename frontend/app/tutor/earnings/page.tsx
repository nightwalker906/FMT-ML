'use client'

import { useState, useEffect } from 'react'
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate max earnings for chart scaling
  const maxMonthlyEarning = Math.max(...earningsByMonth.map(e => e.amount), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-600">Track your income from tutoring sessions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Earnings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</p>
          <p className="text-xs text-gray-400 mt-2">Lifetime earnings</p>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">This Month</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(monthlyEarnings)}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Sessions Completed */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Sessions Completed</p>
          <p className="text-3xl font-bold text-gray-900">{completedSessions.length}</p>
          <p className="text-xs text-gray-400 mt-2">Total sessions</p>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Earnings Over Time</h2>
        </div>

        {/* Simple Bar Chart */}
        <div className="h-64">
          <div className="flex items-end justify-between h-48 gap-2">
            {earningsByMonth.map((item, index) => (
              <div key={item.month} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-teal-500 rounded-t-lg transition-all hover:bg-teal-600"
                  style={{
                    height: `${Math.max((item.amount / maxMonthlyEarning) * 100, 4)}%`,
                    minHeight: item.amount > 0 ? '20px' : '4px'
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-3">
            {earningsByMonth.map((item) => (
              <div key={item.month} className="flex-1 text-center">
                <p className="text-xs text-gray-500">{item.month.split(' ')[0]}</p>
                <p className="text-xs font-medium text-gray-700">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Completed Sessions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Completed Sessions</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">Your recent completed tutoring sessions</p>
        </div>

        {completedSessions.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No completed sessions yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Complete sessions to start earning!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {completedSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{session.studentName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{session.subject}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500 text-sm">{formatDate(session.completedAt)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-semibold text-green-600">{formatCurrency(session.amount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Footer */}
        {completedSessions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Showing {completedSessions.length} sessions
            </span>
            <div className="text-right">
              <span className="text-sm text-gray-500">Total: </span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(totalEarnings)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
