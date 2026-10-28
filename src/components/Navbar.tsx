'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'

export default function TopBar() {
  const currentYear = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const years = [
    currentYear,
    (Number(currentYear) - 1).toString(),
    (Number(currentYear) - 2).toString(),
    (Number(currentYear) - 3).toString(),
  ]

  return (
    <header className="w-full bg-sky-900 border-b border-sky-800 shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <span className="text-white font-bold text-lg">IQ Accounts</span>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Year Selector Dropdown */}
        <div className="flex items-center gap-2 bg-sky-950/80 border border-sky-700 px-3 py-1.5 rounded-lg shadow-sm">
          <span className="text-xs font-medium text-sky-200">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value)
              // Yahan aap window event ya localStorage bhi use kar sakte hain baqi pages ke liye
              localStorage.setItem('selectedFinancialYear', e.target.value)
              window.dispatchEvent(new Event('yearChanged'))
            }}
            className="bg-sky-900 border border-sky-700 rounded px-2 py-1 text-xs text-white font-bold focus:outline-none focus:border-white cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-sky-950 text-white">
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-4 py-2 bg-white text-sky-700 text-sm font-medium rounded-lg hover:bg-red-700 hover:text-white transition shadow-sm"
        >
          Logout
        </button>
      </div>
    </header>
  )
}