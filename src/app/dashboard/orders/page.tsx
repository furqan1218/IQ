'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'

type Share = { shareNumber: number; name: string }
type Allocation = {
  sharesAllocated: number
  Animal: { animalNumber: number }
  Share: Share[]
}
type Line = {
  id: number
  sharesRequested: number
  totalPrice: string
  EidDay: {
    dayNumber: number
    AnimalSubCategory: { name: string; AnimalCategory: { name: string } }
  }
  OrderLineAllocation: Allocation[]
}
type Payment = { id: number; amount: string; method: string | null; date: string }
type Status = 'HOLD' | 'CONFIRMED' | 'PENDING' |'CANCELLED'
type Order = {
  id: number
  orderNumber: number
  status: Status
  createdAt: string
  QurbaniCustomer: { name: string; phone: string }
  OrderLine: Line[]
  Payment: Payment[]
}

const STATUS_STYLE: Record<Status, string> = {
  HOLD: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
  CONFIRMED: 'bg-sky-950/60 text-sky-400 border-sky-800/50',
  CANCELLED: 'bg-rose-950/60 text-rose-400 border-rose-800/50',
  PENDING: 'bg-blue-900 text-white border-blue-800/50',
}

const FILTERS: { value: 'ALL' | Status; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'HOLD', label: 'On hold' },
  { value: 'PENDING', label: 'Payment Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const money = (n: number) => `Rs. ${n.toLocaleString()}`

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<'ALL' | Status>('ALL')
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  const [payingId, setPayingId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null)

  const fetchOrders = async () => {
    const res = await fetch('/api/qurbani/orders')
    const data = await res.json()
    setOrders(Array.isArray(data) ? data : [])
    setLoaded(true)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const openPayment = (order: Order, due: number) => {
    setPayingId(order.id)
    setAmount(String(due))
    setMethod('Cash')
    setMessage(null)
  }

  const submitPayment = async (e: FormEvent, orderId: number) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/qurbani/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method }),
      })

      if (!res.ok) {
        setMessage({
          id: orderId,
          text: (await res.json()).error || 'Something went wrong',
        })
        return
      }

      setPayingId(null)
      setAmount('')
      fetchOrders()
    } finally {
      setSubmitting(false)
    }
  }

  const runAction = async (orderId: number, action: 'confirm' | 'cancel') => {
    if (
      action === 'cancel' &&
      !window.confirm(
        'Cancel this booking? Its animal numbers and shares will be released, and any payments received will be refunded.'
      )
    ) {
      return
    }

    setMessage(null)
    const res = await fetch(`/api/qurbani/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (!res.ok) {
      setMessage({
        id: orderId,
        text: (await res.json()).error || 'Something went wrong',
      })
      return
    }

    fetchOrders()
  }

  const visible = orders.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      o.QurbaniCustomer?.name.toLowerCase().includes(q) ||
      o.QurbaniCustomer?.phone.includes(q) ||
      String(o.orderNumber) === q
    )
  })

  return (
    <div className="min-h-screen text-sky-900 p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-sky-900">Qurbani Bookings</h1>
        </div>
        <Link
          href="/dashboard/new-booking"
          className="shrink-0 rounded-xl bg-sky-900 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2 transition-colors shadow-lg"
        >
          New Booking
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex gap-4">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-sm pb-1 border-b-2 -mb-[13px] transition-colors ${
                filter === f.value
                  ? 'border-sky-500 text-sky-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-sky-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Search name, phone or order no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
        />
      </div>

      {loaded && visible.length === 0 && (
        <p className="text-sm text-slate-500 italic mt-6">
          {orders.length === 0
            ? 'No bookings yet. Create the first one from New Booking.'
            : 'No orders match this filter.'}
        </p>
      )}

      {/* Main Orders Table */}
      {visible.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-md">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-sky-950 text-white uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Order #</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Details & Animals</th>
                <th className="py-3 px-4 font-semibold text-right">Total</th>
                <th className="py-3 px-4 font-semibold text-right">Paid</th>
                <th className="py-3 px-4 font-semibold text-right">Due</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((order) => {
                const total = order.OrderLine.reduce((s, l) => s + Number(l.totalPrice), 0)
                const paid = (order.Payment || []).reduce((s, p) => s + Number(p.amount), 0)
                const due = total - paid
                const isHold = order.status === 'HOLD'

                return (
                  <tr key={order.id} className="hover:bg-sky-50/50 transition-colors">
                    {/* Order Number & Date */}
                    <td className="py-4 px-4 font-mono font-bold text-sky-900 align-top">
                      #{order.orderNumber}
                      <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-semibold text-slate-900">{order.QurbaniCustomer?.name}</div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">{order.QurbaniCustomer?.phone}</div>
                    </td>

                    {/* Order Lines & Animal Allocations */}
                    <td className="py-4 px-4 align-top space-y-2 max-w-xs">
                      {order.OrderLine.map((line) => {
                        const placed = [...line.OrderLineAllocation].sort(
                          (a, b) => a.Animal.animalNumber - b.Animal.animalNumber
                        )
                        return (
                          <div key={line.id} className="text-xs bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="font-medium text-sky-900">
                              {line.EidDay.AnimalSubCategory.AnimalCategory.name} — {line.EidDay.AnimalSubCategory.name} (Day {line.EidDay.dayNumber}) · {line.sharesRequested} share(s)
                            </div>
                            {placed.length > 0 && (
                              <div className="mt-1 text-slate-600 space-y-0.5">
                                {placed.map((a, idx) => (
                                  <div key={idx}>
                                    <span className="font-mono font-semibold text-sky-700">Animal #{a.Animal.animalNumber}</span>:{' '}
                                    {a.Share.map((s) => `${s.shareNumber}. ${s.name}`).join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </td>

                    {/* Total */}
                    <td className="py-4 px-4 align-top text-right font-mono font-semibold text-slate-900">
                      {money(total)}
                    </td>

                    {/* Paid */}
                    <td className="py-4 px-4 align-top text-right font-mono text-sky-600 font-medium">
                      {money(paid)}
                    </td>

                    {/* Due */}
                    <td className={`py-4 px-4 align-top text-right font-mono font-semibold ${due > 0 && order.status !== 'CANCELLED' ? 'text-rose-600' : 'text-slate-700'}`}>
                      {money(due)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 align-top text-center">
                    <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${STATUS_STYLE[order.status]}`}>
                      {order.status === 'HOLD' 
                        ? 'On hold' 
                        : order.status === 'CONFIRMED' 
                        ? 'Confirmed' 
                        : order.status === 'PENDING' 
                        ? 'Pending' 
                        : 'Cancelled'}
                    </span>
                  </td>

                    {/* Actions & Payment Form */}
                    <td className="py-4 px-4 align-top text-center">
                      {message?.id === order.id && (
                        <div className="text-xs text-rose-600 mb-2 font-medium">{message.text}</div>
                      )}

                      {order.status !== 'CANCELLED' && (
                        <div>
                          {payingId === order.id ? (
                            <form onSubmit={(e) => submitPayment(e, order.id)} className="flex flex-col gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <div className="w-full text-left">
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Amount</label>
                                <input
                                  type="number"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  required
                                  min={1}
                                  className="w-full rounded bg-white border border-slate-300 px-2 py-1 text-xs font-mono text-black focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                              <div className="w-full text-left">
                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Method</label>
                                <select
                                  value={method}
                                  onChange={(e) => setMethod(e.target.value)}
                                  className="w-full rounded bg-white border border-slate-300 px-2 py-1 text-xs text-black focus:outline-none focus:ring-1 focus:ring-sky-500"
                                >
                                  <option>Cash</option>
                                  <option>Bank transfer</option>
                                  <option>Cheque</option>
                                </select>
                              </div>
                              <div className="flex gap-2 mt-1 w-full justify-end">
                                <button
                                  type="button"
                                  onClick={() => setPayingId(null)}
                                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="rounded bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1 font-medium transition-colors disabled:opacity-50"
                                >
                                  {submitting ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              {due > 0 && (
                                <button
                                  onClick={() => openPayment(order, due)}
                                  className="w-full rounded bg-sky-900 hover:bg-sky-800 text-white text-xs py-1 px-2 font-medium transition-colors"
                                >
                                  Add Payment
                                </button>
                              )}
                              {isHold && (
                                <Link
                                  href={`/dashboard/orders/${order.id}/release`}
                                  className="w-full text-xs text-sky-700 hover:text-sky-900 font-medium py-0.5"
                                >
                                  Release shares
                                </Link>
                              )}
                              {isHold && (
                                <button
                                  onClick={() => runAction(order.id, 'confirm')}
                                  disabled={due > 0}
                                  title={due > 0 ? 'Collect the full amount before confirming' : ''}
                                  className="w-full rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1 px-2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Confirm
                                </button>
                              )}
                              {isHold && (
                                <button
                                  onClick={() => runAction(order.id, 'cancel')}
                                  className="text-xs text-slate-500 hover:text-rose-600 transition-colors py-0.5"
                                >
                                  Cancel Order
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}