"use client"

import { useState, useEffect } from "react"

interface Account {
  id: number
  code: string
  name: string
  level: number
  type: string
}

interface VoucherItem {
  accountId: string
  debit: string
  credit: string
}

interface Voucher {
  id: number
  voucherNo: string
  date: string
  description: string | null
  JournalItem: {
    id: number
    debit: number
    credit: number
    ChartOfAccount: {
      code: string
      name: string
    }
  }[]
}

export default function VouchersPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  // Form States
  const [voucherNo, setVoucherNo] = useState("JV-2026-001")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [narration, setNarration] = useState("")
  
  // Dynamic Line Items (Kam az kam 2 rows honi chahiyein double entry ke liye)
  const [items, setItems] = useState<VoucherItem[]>([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ])

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Accounts aur Vouchers fetch karna
  const fetchData = async () => {
    try {
      const [accRes, vouRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/vouchers")
      ])
      
      const accData = await accRes.json()
      const vouData = await vouRes.json()

      if (accRes.ok) {
        setAccounts(Array.isArray(accData) ? accData : [])
      }
      if (vouRes.ok) {
        setVouchers(Array.isArray(vouData) ? vouData : [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Nayi row add karna
  const handleAddItem = () => {
    setItems([...items, { accountId: "", debit: "", credit: "" }])
  }

  // Row remove karna
  const handleRemoveItem = (index: number) => {
    if (items.length <= 2) {
      setError("Voucher mein kam az kam 2 line items honi zaroori hain.")
      return
    }
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
  }

  // Row data change handle karna
  const handleItemChange = (index: number, field: keyof VoucherItem, value: string) => {
    const updated = [...items]
    updated[index][field] = value

    if (field === "debit" && value) {
      updated[index].credit = ""
    } else if (field === "credit" && value) {
      updated[index].debit = ""
    }

    setItems(updated)
  }

  // Totals calculate karna
  const totalDebit = items.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0)
  const totalCredit = items.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!isBalanced) {
      setError("Debit aur Credit ka total barabar hona chahiye!")
      return
    }

    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherNo,
          date,
          description: narration,
          items,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Voucher save karne mein masla hai")
      }

      setSuccess("Journal Voucher kamyabi se record ho gaya!")
      setNarration("")
      setItems([
        { accountId: "", debit: "", credit: "" },
        { accountId: "", debit: "", credit: "" },
      ])
      fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Journal Vouchers (Transactions)</h1>
        <p className="text-slate-400 mb-8">Double-entry bookkeeping ke mutabiq financial transactions record karein.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Create Voucher Form */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Naya Journal Voucher Banayein</h2>
            
            {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            {success && <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-3 rounded-lg mb-4 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Voucher Number</label>
                  <input 
                    type="text" 
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Narration / Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Office rent paid for the month"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              {/* Line Items Dynamic Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Voucher Line Items (Debit & Credit)</label>
                  <button 
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded transition font-medium"
                  >
                    + Row Add Karein
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Account</th>
                        <th className="p-3 w-40">Debit (PKR)</th>
                        <th className="p-3 w-40">Credit (PKR)</th>
                        <th className="p-3 w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-800/30">
                          <td className="p-2.5">
                            <select
                              value={item.accountId}
                              onChange={(e) => handleItemChange(index, "accountId", e.target.value)}
                              required
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
                            >
                              <option value="">-- Account Select Karein --</option>
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} — {acc.name} (L{acc.level})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.debit}
                              onChange={(e) => handleItemChange(index, "debit", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.credit}
                              onChange={(e) => handleItemChange(index, "credit", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-red-950/40 rounded border border-red-900/50"
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-950/60 border-t border-slate-800 text-xs font-mono">
                      <tr>
                        <td className="p-3 text-right font-sans font-semibold text-slate-400">Totals:</td>
                        <td className={`p-3 font-bold ${totalDebit !== totalCredit ? "text-red-400" : "text-emerald-400"}`}>
                          {totalDebit.toFixed(2)}
                        </td>
                        <td className={`p-3 font-bold ${totalDebit !== totalCredit ? "text-red-400" : "text-emerald-400"}`}>
                          {totalCredit.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs">
                    {isBalanced ? (
                      <span className="text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                        ✔ Voucher Balanced (Debit & Credit Equal)
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
                        ✖ Unbalanced! Debit aur Credit ka barabar hona lazmi hai.
                      </span>
                    )}
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={!isBalanced}
                    className="bg-slate-100 text-slate-950 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Voucher Save Karein
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Vouchers History List */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Recorded Vouchers History</h2>
            
            {loading ? (
              <p className="text-slate-500 text-sm">Load ho raha hai...</p>
            ) : vouchers.length === 0 ? (
              <p className="text-slate-500 text-sm">Abhi tak koi voucher record nahi kiya gaya.</p>
            ) : (
              <div className="space-y-4">
                {vouchers.map((v) => (
                  <div key={v.id} className="border border-slate-800 bg-slate-950/60 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3 pb-2 border-b border-slate-800/80 gap-2">
                      <div>
                        <span className="font-mono font-bold text-slate-100 bg-slate-800 px-2.5 py-1 rounded text-xs mr-3">
                          {v.voucherNo}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(v.date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-slate-300 italic">
                        {v.description || "No description provided"}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-slate-300">
                        <thead className="text-slate-500 uppercase border-b border-slate-900">
                          <tr>
                            <th className="p-2 text-left">Account</th>
                            <th className="p-2 text-right w-32">Debit</th>
                            <th className="p-2 text-right w-32">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/50">
                          {v.JournalItem?.map((item) => (
                            <tr key={item.id}>
                              <td className="p-2 font-medium">
                                <span className="font-mono text-slate-400 mr-2">{item.ChartOfAccount?.code}</span>
                                {item.ChartOfAccount?.name}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-200">
                                {item.debit > 0 ? item.debit.toFixed(2) : "-"}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-200">
                                {item.credit > 0 ? item.credit.toFixed(2) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}