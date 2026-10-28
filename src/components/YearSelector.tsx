'use client'

import { useYear } from '@/context/YearContext'

export default function YearSelector() {
  const { selectedYear, setSelectedYear, years } = useYear()

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
      <span className="text-xs font-medium text-slate-400">Financial Year:</span>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none focus:border-slate-600"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}