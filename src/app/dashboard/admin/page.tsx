'use client'

import { useState, useEffect } from 'react'

type Summary = {
  totalRevenue: number
  totalPotentialRevenue: number
  totalExpense: number
  netProfit: number
  totalAnimals: number
  totalCapacity: number
}

type Row = {
  categoryId: string
  categoryName: string
  subCategoryId: string
  subCategoryName: string
  dayAnimals: Record<number, { animalsCount: number; capacity: number }>
  totalAnimals: number
  totalCapacity: number
}

const money = (n: number) => `Rs. ${n.toLocaleString()}`

export default function DashboardPage() {
  const [days, setDays] = useState<number[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/admin')
      .then((res) => res.json())
      .then((data) => {
        setDays(data.days || [])
        setRows(data.rows || [])
        setSummary(data.summary || null)
        setLoaded(true)
      })
  }, [])

  if (!loaded) return <div className="px-10 py-10 text-ink-soft">Loading…</div>

  if (days.length === 0 || rows.length === 0) {
    return (
      <div className="px-10 py-10 max-w-xl">
        <h1 className="font-serif text-2xl">Dashboard</h1>
        <p className="text-sm text-ink-soft mt-3">
          No data available. Add categories, sub-categories and Eid days first.
        </p>
      </div>
    )
  }

  return (
    <div className="px-10 text-gray-900 py-10 max-w-6xl">
      <h1 className="font-serif text-gray-100 text-2xl">Eid Days Animal Booking &amp; Financial Dashboard</h1>
      <p className="text-sm tex-gray-100 mt-1">
        Overview of revenue, expenses, net profit, and animal booking matrix.
      </p>

      {/* Financial Summary Cards */}
      {summary && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 border border-rule rounded-lg bg-white shadow-sm">
            <div className="text-xs text-ink-soft uppercase tracking-wider">Total Revenue</div>
            <div className="text-xl font-mono font-bold text-ink mt-1">
              {money(summary.totalRevenue)}
            </div>
          </div>

          <div className="p-4 border border-rule rounded-lg bg-white shadow-sm">
            <div className="text-xs text-ink-soft uppercase tracking-wider">Total Expense</div>
            <div className="text-xl font-mono font-bold text-credit mt-1">
              {money(summary.totalExpense)}
            </div>
          </div>

          <div className="p-4 border border-rule rounded-lg bg-white shadow-sm">
            <div className="text-xs text-ink-soft uppercase tracking-wider">Net Profit (Rev - Exp)</div>
            <div className={`text-xl font-mono font-bold mt-1 ${summary.netProfit >= 0 ? 'text-accent' : 'text-credit'}`}>
              {money(summary.netProfit)}
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="mt-6 border border-rule rounded-lg bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-subtle text-xs text-ink-soft border-b border-rule font-medium uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Sub-category</th>
              {days.map((d) => (
                <th key={d} className="py-3 px-4 text-center">
                  Day {d}
                </th>
              ))}
              <th className="py-3 px-4 text-center font-bold text-ink">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((row) => (
              <tr key={row.subCategoryId} className="hover:bg-paper-subtle/30 transition-colors">
                <td className="py-3 px-4 font-serif font-medium text-ink">
                  {row.categoryName}
                </td>
                <td className="py-3 px-4 text-ink-soft">
                  {row.subCategoryName}
                </td>
                {days.map((d) => {
                  const dayData = row.dayAnimals[d] || { animalsCount: 0, capacity: 0 }
                  return (
                    <td key={d} className="py-3 px-4 text-center font-mono">
                      <span className="font-semibold text-ink">{dayData.animalsCount}</span>
                      <span className="text-xs text-ink-soft"> / {dayData.capacity}</span>
                    </td>
                  )
                })}
                <td className="py-3 px-4 text-center font-mono font-bold bg-paper-subtle/50 text-accent">
                  {row.totalAnimals} / {row.totalCapacity}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Footer Totals */}
          <tfoot className="bg-paper-subtle border-t-2 border-rule font-mono font-bold">
            <tr>
              <td colSpan={2} className="py-3 px-4 text-right uppercase text-xs text-ink-soft">
                Total Animals (Booked / Capacity):
              </td>
              {days.map((d) => {
                const dayTotalBooked = rows.reduce(
                  (sum, r) => sum + (r.dayAnimals[d]?.animalsCount || 0),
                  0
                )
                const dayTotalCap = rows.reduce(
                  (sum, r) => sum + (r.dayAnimals[d]?.capacity || 0),
                  0
                )
                return (
                  <td key={d} className="py-3 px-4 text-center text-xs">
                    {dayTotalBooked} / {dayTotalCap}
                  </td>
                )
              })}
              <td className="py-3 px-4 text-center text-xs text-accent">
                {summary?.totalAnimals} / {summary?.totalCapacity}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}