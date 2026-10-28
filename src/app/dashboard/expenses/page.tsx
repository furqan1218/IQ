'use client'

import { useState, useEffect, FormEvent } from 'react'

type Account = { id: string; code: string; name: string; type: string }
type Expense = {
  id: string
  description: string
  amount: string
  date: string
  expenseAccount: Account
  paymentAccount: Account
}

export default function ExpensesPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loaded, setLoaded] = useState(false)

  // Global Year Filter State
  const [selectedYear, setSelectedYear] = useState('2026')

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const expenseAccounts = accounts.filter((a) => a.type === 'EXPENSE')
  const paymentAccounts = accounts.filter((a) => a.type === 'ASSET')

  const fetchData = async () => {
    try {
      const [accRes, expRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/expenses'),
      ])
      const accData = await accRes.json()
      const expData = await expRes.json()

      if (Array.isArray(accData)) {
        setAccounts(accData)
      } else if (accData && Array.isArray(accData.data)) {
        setAccounts(accData.data)
      } else {
        setAccounts([])
      }

      if (Array.isArray(expData)) {
        setExpenses(expData)
      } else if (expData && Array.isArray(expData.data)) {
        setExpenses(expData.data)
      } else {
        setExpenses([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setAccounts([])
      setExpenses([])
    } finally {
      setLoaded(true)
    }
  }

  // Listen to global Year changes from TopBar
  useEffect(() => {
    const savedYear = localStorage.getItem('selectedFinancialYear')
    if (savedYear) {
      setSelectedYear(savedYear)
    }

    const handleYearChange = () => {
      const updatedYear = localStorage.getItem('selectedFinancialYear')
      if (updatedYear) {
        setSelectedYear(updatedYear)
      }
    }

    window.addEventListener('yearChanged', handleYearChange)
    fetchData()

    return () => {
      window.removeEventListener('yearChanged', handleYearChange)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount,
          date: date || undefined,
          expenseAccountId,
          paymentAccountId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Something went wrong')
      }

      setDescription('')
      setAmount('')
      setDate('')
      setExpenseAccountId('')
      setPaymentAccountId('')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter expenses based on selected year
  const filteredExpenses = expenses.filter((e) => {
    const expenseYear = new Date(e.date).getFullYear().toString()
    return expenseYear === selectedYear
  })

  const total = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)

  if (!loaded) return <div className="min-h-screen p-8 text-white">Loading…</div>

  return (
    <div className="min-h-screen text-black p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-sky-900">Expenses Management</h1>
          <div className="bg-sky-900 border border-sky-700 px-4 py-2 rounded-lg text-white text-sm font-semibold">
            Active Year: <span className="text-sky-300">{selectedYear}</span>
          </div>
        </div>

        {expenseAccounts.length === 0 || paymentAccounts.length === 0 ? (
          <div className="bg-amber-950/35 border border-amber-800/50 p-4 rounded-xl text-amber-300 text-sm mb-8">
            Pehle Chart of Accounts mein kam az kam aik <span className="font-semibold">Expense</span> aur aik <span className="font-semibold">Asset (Cash/Bank)</span> account add karein.
          </div>
        ) : (
          <div className="bg-sky-900 border border-slate-800 p-6 rounded-xl shadow-lg mb-8">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Create New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Description / Narration</label>
                <input
                  placeholder="For example: Office Rent ya Tea & Biscuits"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min={1}
                    className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm font-mono text-black focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Expense Account</label>
                  <select
                    value={expenseAccountId}
                    onChange={(e) => setExpenseAccountId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
                  >
                    <option value="">Select Expense Account</option>
                    {expenseAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Paid From (Cash / Bank)</label>
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-800 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-slate-600"
                  >
                    <option value="">Select Payment Source</option>
                    {paymentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm">{error}</div>}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {loading ? 'Save ho raha hai...' : 'Expense Record Karein'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenses List Table */}
        <div className="bg-sky-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Recorded Expenses List ({selectedYear})</h2>
            <div className="text-xs bg-white border border-black px-3 py-1.5 rounded-lg">
              Total Records: <span className="font-bold text-black">{filteredExpenses.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-sky-950 text-white uppercase text-xs border-b border-slate-800">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Expense Account</th>
                  <th className="p-4">Paid From</th>
                  <th className="p-4 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white italic">
                      {selectedYear} ke liye koi expense record nahi mila.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 text-xs text-white">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-medium text-slate-200">{e.description}</td>
                      <td className="p-4 text-white">{e.expenseAccount?.name || '-'}</td>
                      <td className="p-4 text-white">{e.paymentAccount?.name || '-'}</td>
                      <td className="p-4 text-right font-mono font-semibold text-sky-400">
                        {Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot className="bg-slate-950/50 border-t border-slate-800 font-semibold">
                  <tr>
                    <td className="p-4" colSpan={4}>Total Expenses ({selectedYear})</td>
                    <td className="p-4 text-right font-mono text-white text-base">
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} PKR
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}