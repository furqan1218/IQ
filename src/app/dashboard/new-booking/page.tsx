'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'


type EidDay = { id: string; dayNumber: number; remainingShares: number }
type SubCategory = { id: string; name: string; pricePerShare: string; eidDays: EidDay[] }
type Category = {
  id: string
  name: string
  sharesPerAnimal: number
  subCategories: SubCategory[]
}

type Option = {
  id: string // eidDay id
  label: string
  price: number
  sharesPerAnimal: number
  remaining: number
}

type LineItem = { eidDayId: string; shares: string; names: string[] }

type CreatedOrder = {
  orderNumber: number
  QurbaniCustomer: { name: string }
  OrderLine: {
    id: number
    totalPrice: string
    EidDay: {
      dayNumber: number
      AnimalSubCategory: { name: string; AnimalCategory: { name: string } }
    }
    OrderLineAllocation: {
      Animal: { animalNumber: number }
      Share: { shareNumber: number; name: string }[]
    }[]
  }[]
}

const emptyLine = (): LineItem => ({ eidDayId: '', shares: '', names: [] })

export default function NewBookingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<CreatedOrder | null>(null)

  useEffect(() => {
    fetch('/api/qurbani/categories')
      .then((res) => res.json())
      .then((data) => {
        setCategories(Array.isArray(data) ? data : [])
        setLoaded(true)
      })
  }, [])

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/role')
      .then((res) => res.json())
      .then((data) => {
        // Agar role USER nahi hai (misal ke taur par ADMIN hai) toh true kar dein
        if (data?.role && data.role !== 'USER') {
          setIsAdmin(true)
        }
      })
      .catch(() => {})
  }, [])
 const options: Option[] = categories.flatMap((c) =>
    c.subCategories.flatMap((sc) =>
      sc.eidDays
        .filter((d) => d.remainingShares > 0)
        .map((d) => ({
          id: String(d.id), // ID ko safely string bana diya
          label: `${c.name} — ${sc.name} — Day ${d.dayNumber}`,
          price: Number(sc.pricePerShare),
          sharesPerAnimal: c.sharesPerAnimal,
          remaining: d.remainingShares,
        }))
    )
  )

 const optionOf = (id: string) => {
    if (!id) return undefined
    return options.find((o) => String(o.id) === String(id))
  }

  const setEidDay = (index: number, value: string) =>
    setLines(lines.map((l, i) => (i === index ? { ...l, eidDayId: value } : l)))

  const setShareCount = (index: number, value: string) => {
    const count = parseInt(value, 10)
    const validCount = isNaN(count) ? 0 : Math.max(0, Math.min(500, count))
    
    setLines(
      lines.map((l, i) =>
        i === index
          ? {
              ...l,
              shares: value,
              names: Array.from({ length: validCount }, (_, k) => l.names[k] ?? ''),
            }
          : l
      )
    )
  }

  const setName = (lineIndex: number, nameIndex: number, value: string) =>
    setLines(
      lines.map((l, i) =>
        i === lineIndex
          ? {
              ...l,
              names: l.names.map((n, k) => (k === nameIndex ? value : n)),
            }
          : l
      )
    )

  const addLine = () => setLines([...lines, emptyLine()])
  const removeLine = (index: number) =>
    setLines(lines.filter((_, i) => i !== index))

  // ✅ Fixed line total based directly on shares input
 
  // Safe line total calculation
  const lineTotal = (line: LineItem) => {
    
    const opt = optionOf(line.eidDayId)
    const count = parseInt(line.shares, 10) || 0

    console.log('Line EidDayId:', line.eidDayId, 'Found Opt:', opt, 'Shares:', count)
    return opt ? opt.price * count : 0
    
  }
  

  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  const resetForm = () => {
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setLines([emptyLine()])
    setError('')
    setCreated(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validLines = lines.filter((l) => l.eidDayId && parseInt(l.shares, 10) > 0)

    if (validLines.length === 0) {
      setError('Select atlease One Category and share ....')
      return
    }

    if (validLines.some((l) => l.names.some((n) => !n.trim()))) {
      setError('Must Enter Share Holder Name')
      return
    }

    for (const l of validLines) {
      const opt = optionOf(l.eidDayId)
      const count = parseInt(l.shares, 10) || 0
      if (opt && count > opt.remaining) {
        setError(`${opt.label} mein sirf ${opt.remaining} share(s) baki hain.`)
        return
      }
    }

    setLoading(true)

    const res = await fetch('/api/qurbani/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerPhone,
        customerAddress,
        lines: validLines.map((l) => ({
          eidDayId: l.eidDayId,
          names: l.names,
        })),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Something Wents Wrong !!')
      return
    }

    setCreated(await res.json())
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center p-8 text-sm">
        Loading ....
      </div>
    )
  }

  if (options.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight mb-1">New Booking</h1>
        <Link
          href="/dashboard/qurbani/categories"
          className="inline-block mt-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 transition-colors shadow-lg"
        >
          Add Category first 
        </Link>
      </div>
    )
  }

  if (created) {
    const total = created.OrderLine.reduce((s, l) => s + Number(l.totalPrice), 0)

    return (
      <div className="min-h-screen bg-sky-900 my-2 text-white p-8 max-w-5xl rounded-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-100">
          Booking #{created.orderNumber} Successful!
        </h1>
        <p className="text-sm text-white mt-1">
          {created.QurbaniCustomer?.name} — On hold until payment confirmation.
        </p>

        {created.OrderLine.map((l) => (
          <div key={l.id} className="mt-6 bg-sky-950 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
              <p className="text-lg font-semibold text-slate-200">
                {l.EidDay.AnimalSubCategory.AnimalCategory.name} — {l.EidDay.AnimalSubCategory.name} · Day {l.EidDay.dayNumber}
              </p>
              <p className="font-mono text-sm text-emerald-400 font-bold">
                Rs. {Number(l.totalPrice).toLocaleString()}
              </p>
            </div>
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-center border-all border-white text-white text-s uppercase tracking-wider border-b border-slate-800">
                  <th className="py-2 font-medium w-24">Animal</th>
                  <th className="py-2 font-medium w-24">Share #</th>
                  <th className="py-2 font-medium">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y  divide-white text-slate-300 text-center">
                {l.OrderLineAllocation.flatMap((a) =>
                  a.Share.map((s) => (
                    <tr key={`${a.Animal.animalNumber}-${s.shareNumber}`}>
                      <td className="py-2.5 font-mono text-sky-400">
                        #{a.Animal.animalNumber}
                      </td>
                      <td className="py-2.5 font-mono divide-x divide-white">{s.shareNumber}</td>
                      <td className="py-2.5 font-mono">{s.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-6 bg-sky-700 border border-slate-800 p-4 rounded-xl flex justify-between items-center font-semibold">
          <span className="text-slate-300">Total Due</span>
          <span className="font-mono text-sky-100 text-lg">Rs. {total.toLocaleString()}</span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {isAdmin && (
              <Link
                href="/dashboard/orders"
                className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 transition-colors shadow-lg"
              >
                Payment Received
              </Link>
            )}
          <button
            onClick={resetForm}
            className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 transition-colors shadow-lg"
          >
            Create New Booking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-sky-900 p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-1 text-sky-900">New Booking</h1>
      
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="bg-sky-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-2">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-s font-medium text-white mb-1">Name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="Booking Person Name"
                className="w-full rounded-lg bg-white border border-slate-800 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-s font-medium text-white mb-1">Phone</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="0300-1234567"
                className="w-full rounded-lg bg-white border border-slate-800 px-3 py-2.5 text-sm text-black font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-s font-medium text-white mb-1">Address (Optional)</label>
            <input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Full Address"
              className="w-full rounded-lg bg-white border border-slate-800 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="bg-sky-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Booking Details</h2>

          <div className="space-y-6">
            {lines.map((line, i) => {
              const opt = optionOf(line.eidDayId)
              return (
                <div key={i} className="p-4 rounded-xl bg-sky-950 border border-slate-800 space-y-4">
                  <div className="flex gap-3 items-center">
                    <select
                      value={line.eidDayId}
                      onChange={(e) => setEidDay(i, e.target.value)}
                      required
                      className="flex-1 rounded-lg bg-white border border-slate-800 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select Category and Day </option>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label} 
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Shares"
                      value={line.shares}
                      onChange={(e) => setShareCount(i, e.target.value)}
                      required
                      min={1}
                      step={1}
                      className="w-24 rounded-lg bg-white border border-slate-800 px-3 py-2.5 text-sm font-mono text-right text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="w-28 text-right font-mono text-sm text-emerald-400 font-semibold">
                      {lineTotal(line) > 0 ? `Rs. ${lineTotal(line).toLocaleString()}` : ''}
                    </div>
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        aria-label="Remove this line"
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-950/50 text-rose-400 hover:bg-rose-900/60 transition-colors"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="w-8" />
                    )}
                  </div>

                  {opt && (
                    <p className="text-xs text-slate-400">
                      {opt.sharesPerAnimal > 1
                        ? `${opt.sharesPerAnimal} shares ka aik animal banta hai. Zaid shares agle animal par chale jayenge.`
                        : ''}
                    </p>
                  )}

                  {line.names.length > 0 && (
                    <div className="pl-4 border-l-2 border-sky-500/50 space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Share Holder Name
                        </h4>
                      </div>
                      {line.names.map((n, k) => (
                        <div key={k} className="flex items-center gap-3">
                          <span className="w-20 text-xs text-white font-mono">
                            Share Holder Name # {k + 1}
                          </span>
                          <input
                            value={n}
                            onChange={(e) => setName(i, k, e.target.value)}
                            required
                            placeholder={`Share Holder ${k + 1} Name`}
                            className="flex-1 rounded-lg bg-white border border-slate-800 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="mt-4 text-sm text-sky-400 hover:text-sky-300 font-medium"
          >
            + Add More Category
          </button>
        </div>

        <div className="bg-sky-800 border border-slate-800 p-6 rounded-2xl shadow-xl flex justify-between items-center">
          <span className="text-lg font-bold text-white">Grand Total</span>
          <span className="font-mono text-2xl font-bold text-emerald-400">
            Rs. {grandTotal.toLocaleString()}
          </span>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold py-3 transition-colors shadow-lg disabled:opacity-50"
        >
          {loading ? 'Booking ...' : 'Create Booking'}
        </button>
      </form>
    </div>
  )
}