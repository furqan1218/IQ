"use client"

import { useState, useEffect } from "react"

interface TrialBalanceRow {
  id: number
  code: string
  name: string
  type: string
  debit: number
  credit: number
}

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [isBalanced, setIsBalanced] = useState(true)
  
  // Year & Date States
  const [selectedYear, setSelectedYear] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchTrialBalance = (year: string) => {
    setLoading(true)
    setError("")

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    fetch(`/api/reports/trial-balance?startDate=${startDate}&endDate=${endDate}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Trial Balance load karne mein masla hai")
        setRows(data.rows || [])
        setTotalDebit(data.totalDebit || 0)
        setTotalCredit(data.totalCredit || 0)
        setIsBalanced(data.isBalanced ?? true)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  // Listen to global Year changes from TopBar
  useEffect(() => {
    const savedYear = localStorage.getItem('selectedFinancialYear')
    const initialYear = savedYear || '2026'
    setSelectedYear(initialYear)
    fetchTrialBalance(initialYear)

    const handleYearChange = () => {
      const updatedYear = localStorage.getItem('selectedFinancialYear')
      if (updatedYear) {
        setSelectedYear(updatedYear)
        fetchTrialBalance(updatedYear)
      }
    }

    window.addEventListener('yearChanged', handleYearChange)
    return () => {
      window.removeEventListener('yearChanged', handleYearChange)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-sky-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Trial Balance ({selectedYear})</h1>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isBalanced 
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400" 
                  : "bg-red-950/60 border-red-800 text-red-400"
              }`}>
                {isBalanced ? "✔ Trial Balance Balanced Hai" : "✖ Imbalanced!"}
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="print:hidden bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 transition flex items-center gap-2"
            >
              🖨 Print / PDF
            </button>
          </div>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-4 rounded-lg mb-6 text-sm">{error}</div>}

        <div className="bg-sky-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          {loading ? (
            <p className="text-white text-sm py-8 text-center">Loading..........</p>
          ) : rows.length === 0 ? (
            <p className="text-white text-sm py-8 text-center">{selectedYear} -- No Record Found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-sky-950 text-white uppercase text-xs border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-32">Account Code</th>
                    <th className="p-3">Account Name</th>
                    <th className="p-3 w-32">Type</th>
                    <th className="p-3 text-right w-40">Debit (PKR)</th>
                    <th className="p-3 text-right w-40">Credit (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-slate-200">{row.code}</td>
                      <td className="p-3 font-medium text-slate-100">{row.name}</td>
                      <td className="p-3 text-xs text-slate-400">{row.type}</td>
                      <td className="p-3 text-right font-mono text-slate-200">
                        {row.debit > 0 ? row.debit.toFixed(2) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-200">
                        {row.credit > 0 ? row.credit.toFixed(2) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-sky-950 border-t border-slate-800 font-mono text-sm">
                  <tr>
                    <td colSpan={3} className="p-3 text-right font-sans font-bold text-slate-300">Grand Total ({selectedYear}):</td>
                    <td className={`p-3 text-right font-bold ${Math.abs(totalDebit - totalCredit) > 0.01 ? "text-red-400" : "text-emerald-400"}`}>
                      {totalDebit.toFixed(2)}
                    </td>
                    <td className={`p-3 text-right font-bold ${Math.abs(totalDebit - totalCredit) > 0.01 ? "text-red-400" : "text-emerald-400"}`}>
                      {totalCredit.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}