"use client"

import { useState, useEffect } from "react"

interface BSItem {
  code: string
  name: string
  amount: number
}

interface BalanceSheetData {
  assets: BSItem[]
  totalAssets: number
  liabilities: BSItem[]
  totalLiabilities: number
  equity: BSItem[]
  totalEquity: number
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
}

export default function BalanceSheetPage() {
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [selectedYear, setSelectedYear] = useState("2026")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchBalanceSheet = (year: string) => {
    setLoading(true)
    setError("")

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    fetch(`/api/reports/balance-sheet?startDate=${startDate}&endDate=${endDate}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Balance Sheet load karne mein masla hai")
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
    fetchBalanceSheet(initialYear)

    const handleYearChange = () => {
      const updatedYear = localStorage.getItem("selectedFinancialYear")
      if (updatedYear) {
        setSelectedYear(updatedYear)
        fetchBalanceSheet(updatedYear)
      }
    }

    window.addEventListener("yearChanged", handleYearChange)
    return () => {
      window.removeEventListener("yearChanged", handleYearChange)
    }
  }, [])

  return (
    <div className="min-h-screen  text-sky-900 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Balance Sheet ({selectedYear})</h1>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                data.isBalanced 
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400" 
                  : "bg-rose-950/60 border-rose-800 text-rose-400"
              }`}>
                {data.isBalanced ? "✔ Balance Sheet Matched" : "✖ Imbalanced!"}
              </span>
            )}
            <div className="bg-sky-900 border border-sky-700 px-4 py-2 rounded-lg text-white text-sm font-semibold">
              Active Year: <span className="text-sky-300">{selectedYear}</span>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-4 rounded-lg mb-6 text-sm">{error}</div>}

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg text-center text-slate-500 text-sm">
            Page Loading ...
          </div>
        ) : !data ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg text-center text-slate-500 text-sm">
            {selectedYear} No data available ..
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Assets Column */}
            <div className="bg-sky-950 border border-slate-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-sky-400 mb-4 border-b border-slate-800 pb-2">Assets</h2>
                {data.assets.length === 0 ? (
                  <p className="text-slate-500 text-xs">{selectedYear} - No Record Found..</p>
                ) : (
                  <div className="space-y-2">
                    {data.assets.map((item) => (
                      <div key={item.code} className="flex justify-between items-center text-sm py-1 border-b border-slate-900">
                        <div>
                          <span className="font-mono text-slate-400 mr-3">{item.code}</span>
                          <span className="text-slate-200">{item.name}</span>
                        </div>
                        <span className="font-mono text-sky-300 font-medium">{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-4 font-semibold text-sm border-t border-slate-800 mt-6 bg-white p-3 rounded-lg">
                <span className="text-slate-900">Total Assets ({selectedYear}):</span>
                <span className="font-mono text-sky-800">{data.totalAssets.toFixed(2)} PKR</span>
              </div>
            </div>

            {/* Liabilities & Equity Column */}
            <div className="space-y-6">
              
              {/* Liabilities */}
              <div className="bg-sky-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold text-amber-400 mb-4 border-b border-slate-800 pb-2">Liabilities</h2>
                {data.liabilities.length === 0 ? (
                  <p className="text-white text-xs">{selectedYear} -- No Record Found.</p>
                ) : (
                  <div className="space-y-2">
                    {data.liabilities.map((item) => (
                      <div key={item.code} className="flex justify-between items-center text-sm py-1 border-b border-slate-900">
                        <div>
                          <span className="font-mono text-slate-400 mr-3">{item.code}</span>
                          <span className="text-slate-200">{item.name}</span>
                        </div>
                        <span className="font-mono text-amber-300 font-medium">{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 font-semibold text-sm border-t border-slate-800 mt-3">
                  <span className="text-slate-300">Total Liabilities:</span>
                  <span className="font-mono text-amber-400">{data.totalLiabilities.toFixed(2)} PKR</span>
                </div>
              </div>

              {/* Equity */}
              <div className="bg-sky-800 border border-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold text-purple-400 mb-4 border-b border-slate-800 pb-2">Equity & Capital (Sarmaya)</h2>
                {data.equity.length === 0 ? (
                  <p className="text-white text-xs">{selectedYear} - No Record Found.</p>
                ) : (
                  <div className="space-y-2">
                    {data.equity.map((item) => (
                      <div key={item.code} className="flex justify-between items-center text-sm py-1 border-b border-slate-900">
                        <div>
                          <span className="font-mono text-slate-400 mr-3">{item.code}</span>
                          <span className="text-slate-200">{item.name}</span>
                        </div>
                        <span className="font-mono text-purple-300 font-medium">{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 font-semibold text-sm border-t border-slate-800 mt-3">
                  <span className="text-slate-300">Total Equity:</span>
                  <span className="font-mono text-purple-400">{data.totalEquity.toFixed(2)} PKR</span>
                </div>
              </div>

              {/* Grand Total Liabilities + Equity */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Liabilities & Equity:</span>
                <span className={`font-mono font-bold text-base ${data.isBalanced ? "text-emerald-400" : "text-rose-400"}`}>
                  {data.totalLiabilitiesAndEquity.toFixed(2)} PKR
                </span>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  )
}