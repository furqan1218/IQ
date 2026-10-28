"use client"

import { useState, useEffect } from "react"

interface PnLItem {
  code: string
  name: string
  amount: number
}

interface PnLData {
  revenues: PnLItem[]
  totalRevenue: number
  expenses: PnLItem[]
  totalExpense: number
  netProfitOrLoss: number
}

export default function IncomeStatementPage() {
  const [data, setData] = useState<PnLData | null>(null)
  const [selectedYear, setSelectedYear] = useState("2026")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchIncomeStatement = (year: string) => {
    setLoading(true)
    setError("")

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    fetch(`/api/reports/income-statement?startDate=${startDate}&endDate=${endDate}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Income Statement load karne mein masla hai")
        setData(json)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  // Listen to global Year changes from TopBar
  useEffect(() => {
    const savedYear = localStorage.getItem("selectedFinancialYear")
    const initialYear = savedYear || "2026"
    setSelectedYear(initialYear)
    fetchIncomeStatement(initialYear)

    const handleYearChange = () => {
      const updatedYear = localStorage.getItem("selectedFinancialYear")
      if (updatedYear) {
        setSelectedYear(updatedYear)
        fetchIncomeStatement(updatedYear)
      }
    }

    window.addEventListener("yearChanged", handleYearChange)
    return () => {
      window.removeEventListener("yearChanged", handleYearChange)
    }
  }, [])

  return (
    <div className="min-h-screen text-sky-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Income Statement ({selectedYear})</h1>
          </div>
          <div className="bg-sky-900 border border-sky-700 px-4 py-2 rounded-lg text-white text-sm font-semibold">
            Active Year: <span className="text-sky-300">{selectedYear}</span>
          </div>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-4 rounded-lg mb-6 text-sm">{error}</div>}

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg text-center text-slate-500 text-sm">
            Loading ......
          </div>
        ) : !data ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg text-center text-slate-500 text-sm">
            {selectedYear} No Record Found..
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Revenues Section */}
            <div className="bg-sky-800 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-800 pb-2">Revenues</h2>
              {data.revenues.length === 0 ? (
                <p className="text-white text-xs">No Record Found ... </p>
              ) : (
                <div className="space-y-2">
                  {data.revenues.map((rev) => (
                    <div key={rev.code} className="flex justify-between items-center text-sm py-1 border-b border-slate-900">
                      <div>
                        <span className="font-mono text-slate-400 mr-3">{rev.code}</span>
                        <span className="text-slate-200">{rev.name}</span>
                      </div>
                      <span className="font-mono text-emerald-300 font-medium">{rev.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 font-semibold text-sm border-t border-slate-800 mt-2">
                    <span className="text-slate-300">Total Revenue ({selectedYear}):</span>
                    <span className="font-mono text-emerald-400">{data.totalRevenue.toFixed(2)} PKR</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expenses Section */}
            <div className="bg-sky-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-lg font-semibold text-sky-500 mb-4 border-b border-slate-800 pb-2">Expenses</h2>
              {data.expenses.length === 0 ? (
                <p className="text-white text-xs">No Record Found ....</p>
              ) : (
                <div className="space-y-2">
                  {data.expenses.map((exp) => (
                    <div key={exp.code} className="flex justify-between items-center text-sm py-1 border-b border-slate-900">
                      <div>
                        <span className="font-mono text-slate-400 mr-3">{exp.code}</span>
                        <span className="text-slate-200">{exp.name}</span>
                      </div>
                      <span className="font-mono text-rose-300 font-medium">{exp.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 font-semibold text-sm border-t border-slate-800 mt-2">
                    <span className="text-slate-300">Total Expenses ({selectedYear}):</span>
                    <span className="font-mono text-blood-400">{data.totalExpense.toFixed(2)} PKR</span>
                  </div>
                </div>
              )}
            </div>

            {/* Net Profit / Loss Summary Card */}
            <div className="bg-sky-950 border border-slate-800 p-6 rounded-xl shadow-lg flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Net Result ({selectedYear})</p>
                <h3 className="text-xl font-bold text-slate-100 mt-0.5">
                  {data.netProfitOrLoss >= 0 ? "Net Profit" : "Net Loss"}
                </h3>
              </div>
              <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-lg border ${
                data.netProfitOrLoss >= 0 
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400" 
                  : "bg-white border-blood-900 text-red-700"
              }`}>
                {data.netProfitOrLoss.toFixed(2)} PKR
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}