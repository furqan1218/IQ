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

export default function HoldAnimalPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loaded, setLoaded] = useState(false)

  const [eidDayId, setEidDayId] = useState('')
  const [animalNumber, setAnimalNumber] = useState('')
  const [reservedFor, setReservedFor] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{
    orderNumber: number
    animalNumber: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/qurbani/categories')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data)
        setLoaded(true)
      })
  }, [])

  const options: Option[] = categories.flatMap((c) =>
    c.subCategories.flatMap((sc) =>
      sc.eidDays
        .filter((d) => d.remainingShares > 0)
        .map((d) => ({
          id: d.id,
          label: `${c.name} — ${sc.name} — Day ${d.dayNumber}`,
          price: Number(sc.pricePerShare),
          sharesPerAnimal: c.sharesPerAnimal,
          remaining: d.remainingShares,
        }))
    )
  )

  const selected = options.find((o) => o.id === eidDayId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/qurbani/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eidDayId: eidDayId ? Number(eidDayId) : undefined,
        animalNumber: animalNumber ? Number(animalNumber) : undefined,
        reservedFor,
        phone,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Something went wrong')
      return
    }

    setSuccess(await res.json())
    setEidDayId('')
    setAnimalNumber('')
    setReservedFor('')
    setPhone('')
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center p-8 text-sm">
        Load ho raha hai...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-100 p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-sky-900">Hold an Animal</h1>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-4 rounded-xl shadow-lg">
            <p className="font-semibold text-sm">
              ✔ Animal #{success.animalNumber} successfully hold ho gaya hai (Order #{success.orderNumber}).
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Isko baad mein confirm ya cancel karne ke liye Orders page par jayen.
            </p>
          </div>
        )}

        {options.length === 0 && loaded && (
          <div className="mb-6 bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-400 text-sm italic">
            Koi bhi aisi day dastyab nahi hai jahan capacity available ho. Pehle category, sub-category aur day add karein.
          </div>
        )}

        <div className="bg-sky-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider">
                Category, Sub-Category aur Day
              </label>
              <select
                value={eidDayId}
                onChange={(e) => setEidDayId(e.target.value)}
                required
                className="w-full bg-white rounded-lg border border-slate-800 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select Sub Category & Day</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.remaining} shares baki hain)
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-sky-400 mt-1.5 font-medium">
                  Yeh aik animal ke tamam {selected.sharesPerAnimal} share{selected.sharesPerAnimal > 1 ? 's' : ''} block kar dega.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider">
                Animal Number (Optional)
              </label>
              <input
                type="number"
                min={1}
                value={animalNumber}
                onChange={(e) => setAnimalNumber(e.target.value)}
                placeholder="Automatic select karne ke liye khali chhor dein"
                className="w-full bg-white rounded-lg border border-slate-800 px-3 py-2.5 text-sm text-black font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider">
                Reserved For (Optional)
              </label>
              <input
                type="text"
                value={reservedFor}
                onChange={(e) => setReservedFor(e.target.value)}
                placeholder="misal ke tor par: Office hold"
                className="w-full bg-white rounded-lg border border-slate-800 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider">
                Phone (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0300-1234567"
                className="w-full bg-white rounded-lg border border-slate-800 px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {error && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || options.length === 0}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-5 py-3 rounded-xl disabled:opacity-50 transition-colors shadow-lg"
            >
              {loading ? 'Hold ho raha hai...' : 'Hold Animal'}
            </button>
          </form>
        </div>

       
      </div>
    </div>
  )
}