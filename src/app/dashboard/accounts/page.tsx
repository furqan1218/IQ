"use client"

import { useState, useEffect } from "react"

interface Account {
  id: number
  code: string
  name: string
  level: number
  type: string
  parentId: number | null
  parent?: { name: string }
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Form States
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [level, setLevel] = useState("1")
  const [type, setType] = useState("ASSET")
  const [parentId, setParentId] = useState("")
  
  // Edit & Status States
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Collapse / Expand state
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({})

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/accounts');
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setAccounts(data);
      } else if (data && Array.isArray(data.data)) {
        setAccounts(data.data);
      } else if (data && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Fetch Accounts Error:', error);
      setAccounts([]);
    } finally {
      setLoading(false) // Yahan loading ko false karna zaroori hai
    }
  };

  useEffect(() => {
    fetchAccounts()
  }, [])

  // Parent select hone par automatic code, level, aur type generate karne ki logic
  useEffect(() => {
    if (editingId) return

    if (!parentId) {
      setLevel("1")
      setType("ASSET")
      setCode("")
      return
    }

    const selectedParent = accounts.find((acc) => acc.id === Number(parentId))
    if (!selectedParent) return

    const childAccounts = accounts.filter((acc) => acc.parentId === Number(parentId))

    let nextCode = ""
    const parentCodeNum = parseInt(selectedParent.code)

    if (selectedParent.level === 1) {
      const existingSubCodes = childAccounts.map((acc) => parseInt(acc.code))
      let base = parentCodeNum + 100
      while (existingSubCodes.includes(base)) {
        base += 100
      }
      nextCode = base.toString()
    } else if (selectedParent.level === 2) {
      const existingSubCodes = childAccounts.map((acc) => parseInt(acc.code))
      let base = parentCodeNum + 10
      while (existingSubCodes.includes(base)) {
        base += 10
      }
      nextCode = base.toString()
    } else if (selectedParent.level === 3) {
      const existingSubCodes = childAccounts.map((acc) => parseInt(acc.code))
      let base = parentCodeNum + 1
      while (existingSubCodes.includes(base)) {
        base += 1
      }
      nextCode = base.toString()
    }

    if (nextCode) {
      setCode(nextCode)
      setLevel(Math.min(selectedParent.level + 1, 4).toString())
      setType(selectedParent.type)
    }
  }, [parentId, accounts, editingId])

  // Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      const url = editingId ? `/api/accounts/${editingId}` : "/api/accounts"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          level: parseInt(level),
          type,
          parentId: parentId ? parseInt(parentId) : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Kuch ghalat ho gaya")
      }

      setSuccess(editingId ? "Account kamyabi se update ho gaya!" : "Account kamyabi se ban gaya!")
      resetForm()
      fetchAccounts()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Edit Button Handler
  const handleEdit = (account: Account) => {
    setEditingId(account.id)
    setCode(account.code)
    setName(account.name)
    setLevel(account.level.toString())
    setType(account.type)
    setParentId(account.parentId ? account.parentId.toString() : "")
    setError("")
    setSuccess("")
  }

  // Delete Button Handler
  const handleDelete = async (id: number) => {
    if (!confirm("Kya aap waqai is account ko delete karna chahtay hain?")) return

    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Delete karne mein masla hai")
      }

      setSuccess("Account delete ho gaya!")
      fetchAccounts()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Reset Form
  const resetForm = () => {
    setEditingId(null)
    setCode("")
    setName("")
    setLevel("1")
    setType("ASSET")
    setParentId("")
  }

  // Toggle Collapse / Expand
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Ordered Accounts for Tree View
  const getOrderedAccounts = () => {
    const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code))
    const rootAccounts = sorted.filter((acc) => acc.parentId === null)
    
    const result: { account: Account; depth: number; hasChildren: boolean }[] = []

    const traverse = (parentId: number | null, depth: number) => {
      const children = sorted.filter((acc) => acc.parentId === parentId)
      children.forEach((child) => {
        const grandChildren = sorted.filter((acc) => acc.parentId === child.id)
        const hasChildren = grandChildren.length > 0

        result.push({ account: child, depth, hasChildren })

        if (expandedIds[child.id]) {
          traverse(child.id, depth + 1)
        }
      })
    }

    rootAccounts.forEach((root) => {
      const children = sorted.filter((acc) => acc.parentId === root.id)
      const hasChildren = children.length > 0
      result.push({ account: root, depth: 0, hasChildren })

      if (expandedIds[root.id]) {
        traverse(root.id, 1)
      }
    })

    return result
  }

  const hierarchicalAccounts = getOrderedAccounts()
  const sortedAccountsForDropdown = [...accounts].sort((a, b) => a.code.localeCompare(b.code))

  return (
    <div className="min-h-screen text-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Chart of Accounts (COC)</h1>
        <p className="text-slate-400 mb-4">4-Level hierarchical accounting structure manage karein.</p>

        {/* Grid Layout: Form & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create / Edit Account Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-200">
                {editingId ? "Account Edit Karein" : "Naya Account Banayein"}
              </h2>
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            
            {error && <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            {success && <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-3 rounded-lg mb-4 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Parent Account</label>
                <select 
                  value={parentId} 
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
                >
                  <option value="">-- Koi Parent Nahi (Root / Level 1) --</option>
                  {sortedAccountsForDropdown
                    .filter((acc) => acc.id !== editingId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} (L{acc.level})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  disabled={!!parentId && !editingId}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600 disabled:opacity-50"
                >
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="REVENUE">REVENUE</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Level (1 - 4)</label>
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={!!parentId && !editingId}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600 disabled:opacity-50"
                >
                  <option value="1">Level 1 (Class)</option>
                  <option value="2">Level 2 (Control Group)</option>
                  <option value="3">Level 3 (Sub-Control)</option>
                  <option value="4">Level 4 (Transactional Ledger)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Code</label>
                <input 
                  type="text" 
                  placeholder="e.g., 1000" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Account Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Current Assets" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-100 text-slate-950 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-200 transition"
              >
                {editingId ? "Account Update Karein" : "Account Add Karein"}
              </button>
            </form>
          </div>

          {/* Accounts Collapsible Ladder Tree View with Actions */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Registered Accounts (Tree & Actions)</h2>
            
            {loading ? (
              <p className="text-slate-500 text-sm">Load ho raha hai...</p>
            ) : accounts.length === 0 ? (
              <p className="text-slate-500 text-sm">Abhi tak koi account add nahi kiya gaya.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Level</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {hierarchicalAccounts.map(({ account, depth, hasChildren }) => {
                      const isExpanded = !!expandedIds[account.id]
                      const paddingLeftClass = 
                        depth === 0 ? "pl-2 font-bold text-slate-100" :
                        depth === 1 ? "pl-8 text-slate-200" :
                        depth === 2 ? "pl-14 text-slate-300" : "pl-20 text-slate-400"

                      return (
                        <tr key={account.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-mono text-slate-200">{account.code}</td>
                          <td className={`p-3 font-medium ${paddingLeftClass}`}>
                            <div className="flex items-center space-x-2">
                              {depth > 0 && <span className="text-slate-600 font-normal">└─</span>}
                              
                              {hasChildren ? (
                                <button 
                                  onClick={() => toggleExpand(account.id)}
                                  className="flex items-center space-x-1.5 text-left focus:outline-none group"
                                >
                                  <span className="w-5 h-5 flex items-center justify-center bg-slate-800 group-hover:bg-slate-700 text-slate-300 rounded text-xs font-mono">
                                    {isExpanded ? "−" : "+"}
                                  </span>
                                  <span className="group-hover:underline">{account.name}</span>
                                </button>
                              ) : (
                                <span>{account.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                              L{account.level}
                            </span>
                          </td>
                          <td className="p-3 text-xs font-semibold text-slate-400">{account.type}</td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => handleEdit(account)}
                              className="px-2.5 py-1 bg-blue-950/60 border border-blue-800/60 text-blue-300 hover:bg-blue-900/60 rounded text-xs transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(account.id)}
                              className="px-2.5 py-1 bg-red-950/60 border border-red-800/60 text-red-300 hover:bg-red-900/60 rounded text-xs transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}