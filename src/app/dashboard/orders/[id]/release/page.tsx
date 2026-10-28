'use client'

import { useState, useEffect, use, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Share = { id: number; shareNumber: number; name: string | null }
type Allocation = {
  id: number
  Animal: { animalNumber: number }
  Share: Share[]
}
type OrderLine = {
  id: number
  EidDay: {
    AnimalSubCategory: { name: string; AnimalCategory: { name: string } }
  }
  OrderLineAllocation: Allocation[]
}
type OrderData = {
  id: number
  orderNumber: number
  status: 'HOLD' | 'CONFIRMED' | 'CANCELLED' | 'PENDING'
  Payment: { id: number; amount: number }[]
  OrderLine: OrderLine[]
}

export default function ReleaseSharesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Selected shares map: { [shareId]: stakeholderName }
  const [selectedShares, setSelectedShares] = useState<Record<number, string>>({})

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch order
  useEffect(() => {
    let cancelled = false
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/qurbani/orders/${id}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Failed to load order (${res.status})`)
        }
        const data: OrderData = await res.json()
        if (!cancelled) setOrder(data)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    fetchOrder()
    return () => { cancelled = true }
  }, [id])

  // Toggle individual share selection
  const handleToggleShare = (shareId: number) => {
    setSelectedShares((prev) => {
      const copy = { ...prev }
      if (copy[shareId] !== undefined) {
        delete copy[shareId] // Uncheck kar diya toh hata do
      } else {
        copy[shareId] = '' // Check kiya toh naye customer ka naam dene ke liye empty string rakho
      }
      return copy
    })
  }

  // Update name for a specific selected share
  const handleShareNameNameChange = (shareId: number, name: string) => {
    setSelectedShares((prev) => ({
      ...prev,
      [shareId]: name,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) { setError('New customer name is required.'); return }
    if (!customerPhone.trim()) { setError('New customer phone is required.'); return }

    const shareEntries = Object.entries(selectedShares)
    if (shareEntries.length === 0) {
      setError('Kam az kam aik share select karein jo release karna hai.')
      return
    }

    // Har selected share ke liye naam lazmi check karein
    for (const [shareId, name] of shareEntries) {
      if (!name.trim()) {
        setError('Har selected share ke liye stakeholder ka naam likhna lazmi hai.')
        return
      }
    }

    const payloadShares = shareEntries.map(([shareId, name]) => ({
      shareId: Number(shareId),
      name: name.trim(),
    }))

    setLoading(true)
    try {
      const res = await fetch(`/api/qurbani/orders/${id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim() || undefined,
          shares: payloadShares,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `Request failed (${res.status})`)
        return
      }
      const result = await res.json()
      router.push(`/dashboard/orders?released=${result.orderNumber}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!loaded) return <div className="px-10 py-10 text-slate-400">Loading…</div>
  if (loadError) return <div className="px-10 py-10 text-sm text-rose-400">{loadError}</div>
  if (!order) return <div className="px-10 py-10 text-sm text-rose-400">Order not found.</div>

  if (order.status !== 'HOLD') {
    return (
      <div className="px-10 py-10 text-sm text-slate-400">
        Yeh order hold par nahi hai, isliye shares release nahi ho sakte.
      </div>
    )
  }

  if ((order.Payment ?? []).length > 0) {
    return (
      <div className="px-10 py-10 text-sm text-slate-400">
        Is order par payments mojood hain, isliye shares split nahi ho sakte.
      </div>
    )
  }

  const totalSharesCount = order?.OrderLine?.reduce(
    (acc, l) => acc + (l.OrderLineAllocation ?? []).reduce((sAcc, a) => sAcc + (a.Share ?? []).length, 0),
    0
  ) ?? 0

  const selectedCount = Object.keys(selectedShares).length

  return (
    <div className="px-10 py-10 max-w-3xl mx-auto bg-slate-950 text-white rounded-2xl border border-slate-800">
      <h1 className="font-serif text-2xl font-bold">
        Release Shares — Order #{order.orderNumber}
      </h1>
      <p className="text-sm text-slate-400 mt-1">
        Is order mein total <span className="text-sky-400 font-bold">{totalSharesCount} shares</span> hain. Aap jitne shares select karenge (misaal ke tor par 2 ya 3), woh naye customer ko chale jayenge aur baqi order mein <span className="text-amber-400 font-bold">HOLD</span> rahenge.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Naye Customer ki Details jisko shares transfer karne hain */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <h2 className="font-serif text-lg mb-3 text-sky-300">New Customer Details (Jisko share dene hain)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <input
              placeholder="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              inputMode="tel"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <input
            placeholder="Address (optional)"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm mt-3 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Animal aur Shares ki List jismein se aapko tick karna hai */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-lg">Animal Shares Select Karein</h2>
            <span className="text-xs text-sky-400 font-mono">
              Selected: {selectedCount} / {totalSharesCount}
            </span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {(order?.OrderLine ?? []).map((line) => (
              <div key={line.id} className="border border-slate-800 rounded-lg p-3 bg-slate-950">
                <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
                  {line.EidDay?.AnimalSubCategory?.AnimalCategory?.name} — {line.EidDay?.AnimalSubCategory?.name}
                </p>
                <div className="space-y-3">
                  {(line.OrderLineAllocation ?? []).map((alloc) => (
                    <div key={alloc.id} className="pl-3 border-l-2 border-sky-500/50 space-y-2">
                      <p className="text-xs font-bold text-sky-300 font-mono">
                        Animal #{alloc.Animal?.animalNumber}
                      </p>
                      {(alloc.Share ?? []).map((share) => {
                        const isSelected = selectedShares[share.id] !== undefined
                        return (
                          <div key={share.id} className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleShare(share.id)}
                              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-950 border-slate-700 cursor-pointer"
                            />
                            <span className="text-sm font-mono w-24 text-slate-300">Share #{share.shareNumber}</span>
                            
                            {isSelected ? (
                              <input
                                type="text"
                                placeholder="Is share par kiska naam aayega?"
                                value={selectedShares[share.id] || ''}
                                onChange={(e) => handleShareNameNameChange(share.id, e.target.value)}
                                required
                                className="flex-1 rounded border border-sky-600 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                            ) : (
                              <span className="text-xs text-slate-500 italic">
                                Current Name: {share.name || 'Unassigned'} (Hold rahega)
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-400 border-l-2 border-rose-500 pl-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || selectedCount === 0}
          className="w-full rounded bg-sky-600 text-white text-sm font-semibold px-5 py-3 hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-lg"
        >
          {loading 
            ? 'Processing Release…' 
            : `Release ${selectedCount} Share(s) to New Booking`}
        </button>
      </form>
    </div>
  )
}