'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HoldOrder {
  id: string
  orderNumber: number
  status: string
  createdAt: string
  QurbaniCustomer?: {
    name: string
    phone: string
  }
  OrderLine: Array<{
    id: string
    sharesRequested: number
    totalPrice: number
    EidDay: {
      dayNumber: number
      AnimalSubCategory: {
        name: string
        AnimalCategory: {
          name: string
        }
      }
    }
    OrderLineAllocation: Array<{
      Animal: {
        animalNumber: number
        Share: Array<{
          shareNumber: number
          name: string
        }>
      }
    }>
  }>
}

export default function ViewHoldsPage() {
  const [orders, setOrders] = useState<HoldOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingOrder, setEditingOrder] = useState<HoldOrder | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
const fetchHolds = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/qurbani/hold')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Holds load karne mein masla hai')
      
      // ✅ Filter: Sirf 'HOLD' status wale orders rakhein
      const holdOrders = Array.isArray(json) 
        ? json.filter((o: HoldOrder) => o.status === 'HOLD') 
        : []

      setOrders(holdOrders)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolds()
  }, [])

  const handleDelete = async (orderId: string) => {
    if (!confirm('Kya aap waqai is hold ko khatam (delete) karna chahte hain?')) return

    try {
      const res = await fetch(`/api/qurbani/hold?orderId=${orderId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Delete karne mein masla aaya')
      
      setOrders(orders.filter((o) => o.id !== orderId))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return

    try {
      const res = await fetch('/api/qurbani/hold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: editingOrder.id,
          reservedFor: editName,
          phone: editPhone,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update karne mein masla aaya')

      setEditingOrder(null)
      fetchHolds()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-sky-900">Hold Animals</h1>
          </div>
          <Link
            href="/dashboard/hold/new"
            className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg"
          >
            + Add Hold
          </Link>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400 text-sm">
            Loading Hold List ... 
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400 text-sm">
            No Data Found..
          </div>
        ) : (
          <div className="bg-sky-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-sky-950 text-white text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Order #</th>
                    <th className="py-3.5 px-4 font-semibold">Category / Details</th>
                    <th className="py-3.5 px-4 font-semibold">Reserved For</th>
                    <th className="py-3.5 px-4 font-semibold">Animal #</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  {orders.map((order) => {
                    const line = order.OrderLine[0]
                    const allocation = line?.OrderLineAllocation[0]
                    const animal = allocation?.Animal
                    const category = line?.EidDay?.AnimalSubCategory?.AnimalCategory?.name
                    const subCategory = line?.EidDay?.AnimalSubCategory?.name
                    const dayNum = line?.EidDay?.dayNumber

                    return (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 font-mono font-medium">
                          <span className="bg-amber-950/80 border border-amber-700 text-amber-300 text-xs px-2.5 py-1 rounded-md font-bold">
                            #{order.orderNumber}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-200">
                            {category} — {subCategory}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Day {dayNum} ({line?.sharesRequested} shares)
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-200">
                            {order.QurbaniCustomer?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {order.QurbaniCustomer?.phone || '-'}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-sky-400">
                          Animal #{animal?.animalNumber || 'Pending'}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-emerald-400 font-semibold">
                          {line?.totalPrice.toFixed(2)} PKR
                        </td>
                        <td className="py-4 px-4 text-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingOrder(order)
                              setEditName(order.QurbaniCustomer?.name || '')
                              setEditPhone(order.QurbaniCustomer?.phone || '')
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
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
          </div>
        )}

        {/* Edit Modal */}
        {editingOrder && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold text-slate-100 mb-4">Edit Hold Details</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Reserved For</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}