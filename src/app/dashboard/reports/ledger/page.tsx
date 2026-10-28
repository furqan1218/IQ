"use client"

import { useState, useEffect } from "react"

interface Account {
  id: number
  code: string
  name: string
  level: number
  type: string
}

interface LedgerRow {
  id: number
  date: string
  voucherNo: string
  narration: string | null
  debit: number
  credit: number
  balance: number
}

export default function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  
  // Year & Date States
  const [selectedYear, setSelectedYear] = useState('2026')
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  const [ledgerData, setLedgerData] = useState<LedgerRow[]>([])
  const [accountDetails, setAccountDetails] = useState<Account | null>(null)
  const [closingBalance, setClosingBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Level 4 transactional accounts fetch karne ke liye
  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        const accList = Array.isArray(data) ? data : data.data || []
        const transAccounts = accList.filter((acc: Account) => acc.level === 4)
        setAccounts(transAccounts.length > 0 ? transAccounts : accList)
      })
      .catch((err) => console.error("Fetch Accounts Error:", err))
  }, [])

  // Listen to global Year changes from TopBar
  useEffect(() => {
    const updateYearFromStorage = () => {
      const savedYear = localStorage.getItem('selectedFinancialYear')
      if (savedYear) {
        setSelectedYear(savedYear)
        // Agar user ne manual date select nahi ki, toh saal ke start/end set kardein
        setStartDate(`${savedYear}-01-01`)
        setEndDate(`${savedYear}-12-31`)
      }
    }

    updateYearFromStorage()

    const handleYearChange = () => {
      updateYearFromStorage()
    }

    window.addEventListener('yearChanged', handleYearChange)
    return () => {
      window.removeEventListener('yearChanged', handleYearChange)
    }
  }, [])

  // Fetch Ledger Data based on selected filters
  const fetchLedger = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedAccount) {
      setError("Pehle koi account muntakhib (select) karein.")
      return
    }

    setError("")
    setLoading(true)

    try {
      let url = `/api/reports/ledger?accountId=${selectedAccount}`
      const activeStart = startDate || `${selectedYear}-01-01`
      const activeEnd = endDate || `${selectedYear}-12-31`

      url += `&startDate=${activeStart}&endDate=${activeEnd}`

      const res = await fetch(url)
      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || "Ledger fetch karne mein masla hai")
      }

      // Find selected account details
      const currentAcc = accounts.find((a) => a.id.toString() === selectedAccount) || null
      setAccountDetails(currentAcc)

      // Format items and compute running balance
      let runningBal = 0
      const rows: LedgerRow[] = (result.data || []).map((item: any) => {
        const debit = Number(item.debit) || 0
        const credit = Number(item.credit) || 0

        // Account type ke hisab se balance logic (Asset/Expense debit normal, Liability/Equity/Revenue credit normal)
        if (currentAcc && ["ASSET", "EXPENSE"].includes(currentAcc.type)) {
          runningBal += debit - credit
        } else {
          runningBal += credit - debit
        }

        return {
          id: item.id,
          date: item.JournalVoucher?.date || item.createdAt || new Date(),
          voucherNo: item.JournalVoucher?.voucherNo || `JV-${item.journalVoucherId}`,
          narration: item.description || item.JournalVoucher?.description,
          debit,
          credit,
          balance: runningBal,
        }
      })

      setLedgerData(rows)
      setClosingBalance(rows.length > 0 ? rows[rows.length - 1].balance : 0)
    } catch (err: any) {
      setError(err.message)
      setLedgerData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-sky-900">General Ledger Report</h1>
          <div className="bg-sky-900 border border-sky-700 px-4 py-2 rounded-lg text-white text-sm font-semibold">
            Active Year: <span className="text-sky-300">{selectedYear}</span>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-sky-900 border border-slate-800 p-6 rounded-xl shadow-lg mb-8">
          <form onSubmit={fetchLedger} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-white mb-1">Select Account (Level 4)</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                required
                className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} — {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
              />
            </div>

            <div className="md:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-sky-600 transition disabled:opacity-50"
              >
                {loading ? "Load ho raha hai..." : "Ledger Generate Karein"}
              </button>
            </div>
          </form>
          {error && <div className="mt-4 bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
        </div>

        {/* Ledger Output Section */}
        {accountDetails && (
          <div className="bg-sky-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 mb-4 border-b border-slate-800 gap-2">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {accountDetails.code} — {accountDetails.name}
                </h2>
                <p className="text-xs text-slate-300 mt-1">Account Type: <span className="text-white font-medium">{accountDetails.type}</span></p>
              </div>
              <div className="bg-sky-950 border border-sky-700 px-4 py-2 rounded-lg text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-300">Closing Balance ({selectedYear})</p>
                <p className={`text-lg font-mono font-bold ${closingBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {closingBalance.toFixed(2)} PKR
                </p>
              </div>
            </div>

            {ledgerData.length === 0 ? (
              <p className="text-white text-sm py-8 text-center">Is account ki {selectedYear} ki duration mein koi transaction nahi mili.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-sky-950 text-white uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Voucher #</th>
                      <th className="p-3">Narration</th>
                      <th className="p-3 text-right">Debit</th>
                      <th className="p-3 text-right">Credit</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ledgerData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/50">
                        <td className="p-3 text-xs text-white">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="p-3 font-mono text-xs font-bold text-white">{row.voucherNo}</td>
                        <td className="p-3 text-xs text-slate-200">{row.narration || "-"}</td>
                        <td className="p-3 text-right font-mono text-white">{row.debit > 0 ? row.debit.toFixed(2) : "-"}</td>
                        <td className="p-3 text-right font-mono text-white">{row.credit > 0 ? row.credit.toFixed(2) : "-"}</td>
                        <td className="p-3 text-right font-mono font-semibold text-sky-400">{row.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}