'use client'

import { useState, useEffect, FormEvent } from 'react'

type EidDay = { id: string; dayNumber: number; capacity: number; remainingShares: number }
type SubCategory = { id: string; name: string; pricePerShare: number | string; eidDays: EidDay[] }
type Category = {
  id: string
  name: string
  sharesPerAnimal: number
  subCategories: SubCategory[]
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])

  // Add category
  const [catName, setCatName] = useState('')
  const [shares, setShares] = useState('7')
  const [catError, setCatError] = useState('')

  // Edit category
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatShares, setEditCatShares] = useState('')
  const [editCatError, setEditCatError] = useState('')

  // Add sub-category
  const [subCategoryFor, setSubCategoryFor] = useState<string | null>(null)
  const [subName, setSubName] = useState('')
  const [price, setPrice] = useState('')
  const [subError, setSubError] = useState('')

  // Edit sub-category
  const [editSubId, setEditSubId] = useState<string | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [editSubPrice, setEditSubPrice] = useState('')
  const [editSubError, setEditSubError] = useState('')

  // Add day
  const [dayFor, setDayFor] = useState<string | null>(null)
  const [dayNumber, setDayNumber] = useState('')
  const [dayCapacity, setDayCapacity] = useState('')
  const [dayError, setDayError] = useState('')

  // Edit day
  const [editDayId, setEditDayId] = useState<string | null>(null)
  const [editDayNumber, setEditDayNumber] = useState('')
  const [editDayCapacity, setEditDayCapacity] = useState('')
  const [editDayError, setEditDayError] = useState('')

  const fetchData = async () => {
    try {
      const res = await fetch('/api/qurbani/categories')
      if (res.ok) {
        setCategories(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch categories', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // --- Category ---
  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault()
    setCatError('')

    const res = await fetch('/api/qurbani/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName, sharesPerAnimal: Number(shares) }),
    })

    if (!res.ok) {
      const data = await res.json()
      setCatError(data.error || 'Something went wrong')
      return
    }

    setCatName('')
    setShares('7')
    fetchData()
  }

  const startEditCategory = (cat: Category) => {
    setEditCatId(cat.id)
    setEditCatName(cat.name)
    setEditCatShares(String(cat.sharesPerAnimal))
    setEditCatError('')
  }

  const saveEditCategory = async (e: FormEvent, id: string) => {
    e.preventDefault()
    setEditCatError('')

    const res = await fetch(`/api/qurbani/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editCatName,
        sharesPerAnimal: Number(editCatShares),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setEditCatError(data.error || 'Something went wrong')
      return
    }

    setEditCatId(null)
    fetchData()
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    const res = await fetch(`/api/qurbani/categories/${id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      fetchData()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to delete category')
    }
  }

  // --- Sub-category ---
  const handleAddSubCategory = async (e: FormEvent, categoryId: string) => {
    e.preventDefault()
    setSubError('')

    const res = await fetch('/api/qurbani/sub-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId,
        name: subName,
        pricePerShare: Number(price),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setSubError(data.error || 'Something went wrong')
      return
    }

    setSubName('')
    setPrice('')
    setSubCategoryFor(null)
    fetchData()
  }

  const startEditSub = (sub: SubCategory) => {
    setEditSubId(sub.id)
    setEditSubName(sub.name)
    setEditSubPrice(String(sub.pricePerShare))
    setEditSubError('')
  }

  const saveEditSub = async (e: FormEvent, id: string) => {
    e.preventDefault()
    setEditSubError('')

    try {
      const res = await fetch(`/api/qurbani/sub-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSubName, pricePerShare: Number(editSubPrice) }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setEditSubError(data.error || `Error: ${res.statusText}`)
        return
      }

      setEditSubId(null)
      fetchData()
    } catch (err) {
      setEditSubError('Network or server error occurred')
    }
  }

  const handleDeleteSub = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sub-category?')) return

    const res = await fetch(`/api/qurbani/sub-categories/${id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      fetchData()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to delete sub-category')
    }
  }

  // --- Day ---
  const handleAddDay = async (e: FormEvent, subCategoryId: string) => {
    e.preventDefault()
    setDayError('')

    const res = await fetch(`/api/qurbani/sub-categories/${subCategoryId}/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayNumber: Number(dayNumber), capacity: Number(dayCapacity) }),
    })

    if (!res.ok) {
      const data = await res.json()
      setDayError(data.error || 'Something went wrong')
      return
    }

    setDayNumber('')
    setDayCapacity('')
    setDayFor(null)
    fetchData()
  }

  const startEditDay = (day: EidDay) => {
    setEditDayId(day.id)
    setEditDayNumber(String(day.dayNumber))
    setEditDayCapacity(String(day.capacity))
    setEditDayError('')
  }

  const saveEditDay = async (e: FormEvent, id: string) => {
    e.preventDefault()
    setEditDayError('')

    const res = await fetch(`/api/qurbani/days/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayNumber: Number(editDayNumber),
        capacity: Number(editDayCapacity),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setEditDayError(data.error || 'Something went wrong')
      return
    }

    setEditDayId(null)
    fetchData()
  }

  const handleDeleteDay = async (id: string) => {
    if (!confirm('Are you sure you want to delete this day?')) return

    const res = await fetch(`/api/qurbani/days/${id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      fetchData()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to delete day')
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-sky-900">Animal Categories</h1>
        </div>
      </div>

      {/* Add Category Card */}
      <div className="mt-6 bg-sky-800 p-5 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">Add New Category</h2>
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-white mb-1">Category Name</label>
            <input
              placeholder="e.g. Cow, Goat"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
              className="w-full rounded-lg border bg-white text-black border-gray-300 px-3.5 py-2 text-sm  focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-white mb-1">Shares Per Animal</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              required
              className="w-full rounded-lg bg-white text-black border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-blue-600 text-white text-sm px-5 py-2 hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            + Add Category
          </button>
        </form>
        {catError && <p className="text-xs text-red-600 mt-2 font-medium">{catError}</p>}
      </div>

      {/* Categories Table Container */}
      <div className="mt-8 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-sky-950 text-xs text-white text-center border-b border-gray-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Category / Sub-category</th>
                <th className="py-3.5 px-5">Shares</th>
                <th className="py-3.5 px-5" colSpan={2}>Sub-Categories, Pricing &amp; Eid Days</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-sky-800">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center text-gray-400 italic">
                    No categories added yet. Get started by adding a category above.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-900/50 transition-colors">
                    {/* Category Info */}
                    <td className="py-5 px-5 align-top">
                      {editCatId === cat.id ? (
                        <form onSubmit={(e) => saveEditCategory(e, cat.id)} className="flex gap-2 items-center">
                          <input
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            required
                            className="rounded-lg border border-black px-2.5 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                          />
                          <button type="submit" className="text-xs text-blue-600 p-2  font-semibold hover:underline">Save</button>
                          <button type="button" onClick={() => setEditCatId(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                        </form>
                      ) : (
                        <div>
                          <span className="font-bold text-base text-white">{cat.name}</span>
                          {editCatError && editCatId === cat.id && <p className="text-xs text-red-600 mt-1">{editCatError}</p>}
                        </div>
                      )}
                    </td>

                    {/* Shares per animal */}
                    <td className="py-5 px-5 align-top font-mono text-gray-900">
                      {editCatId === cat.id ? (
                        <input
                          type="number"
                          value={editCatShares}
                          onChange={(e) => setEditCatShares(e.target.value)}
                          required
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm bg-white font-mono"
                        />
                      ) : (
                        <span className=" items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white">
                          {cat.sharesPerAnimal} shares
                        </span>
                      )}
                    </td>

                    {/* Sub-categories & Prices */}
                    <td className="py-5 px-5 align-top" colSpan={2}>
                      <div className="space-y-4">
                        {cat.subCategories.map((sub) => (
                          <div key={sub.id} className="border-b border-gray-100 pb-3.5 last:border-none last:pb-0">
                            {editSubId === sub.id ? (
                              <form onSubmit={(e) => saveEditSub(e, sub.id)} className="flex gap-2 items-center mb-2">
                                <input
                                  value={editSubName}
                                  onChange={(e) => setEditSubName(e.target.value)}
                                  required
                                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-s bg-white"
                                />
                                <input
                                  type="number"
                                  value={editSubPrice}
                                  onChange={(e) => setEditSubPrice(e.target.value)}
                                  required
                                  className="w-28 rounded-lg border border-gray-300 px-2.5 py-1 text-s bg-white font-mono"
                                />
                                <button type="submit" className="text-xs text-blue-600 font-semibold">Save</button>
                                <button type="button" onClick={() => setEditSubId(null)} className="text-xs text-gray-500">Cancel</button>
                              </form>
                            ) : (
                              <div className="flex items-center justify-between text-white mb-2 p-2.5 rounded-lg border border-gray-100">
                                <span className="font-semibold">{sub.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    Rs. {Number(sub.pricePerShare).toLocaleString()}
                                  </span>
                                  <button
                                    onClick={() => startEditSub(sub)}
                                    className="text-s text-white hover:text-blue-600 font-medium"
                                  > 
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSub(sub.id)}
                                    className="text-s text-gray-400 hover:text-red-600 font-medium"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                            {editSubError && editSubId === sub.id && (
                              <p className="text-xs text-red-600 mt-1">{editSubError}</p>
                            )}

                            {/* Eid Days breakdown */}
                            <div className="flex flex-wrap gap-2 mt-2 items-center">
                              {sub.eidDays.map((d) =>
                                editDayId === d.id ? (
                                  <form
                                    key={d.id}
                                    onSubmit={(e) => saveEditDay(e, d.id)}
                                    className="flex gap-1.5 items-center bg-white p-1.5 rounded-lg border border-blue-200 shadow-sm"
                                  >
                                    <input
                                      type="number"
                                      value={editDayNumber}
                                      onChange={(e) => setEditDayNumber(e.target.value)}
                                      required
                                      min={1}
                                      placeholder="Day #"
                                      className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-s bg-white font-mono"
                                    />
                                    <input
                                      type="number"
                                      value={editDayCapacity}
                                      onChange={(e) => setEditDayCapacity(e.target.value)}
                                      required
                                      min={1}
                                      placeholder="Capacity"
                                      className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-s bg-white font-mono"
                                    />
                                    <button type="submit" className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-semibold">Save</button>
                                    <button type="button" onClick={() => setEditDayId(null)} className="text-xs text-gray-500 px-1">✕</button>
                                  </form>
                                ) : (
                                  <div
                                    key={d.id}
                                    className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-2 font-medium ${
                                      d.remainingShares <= 0
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-white border-gray-200 text-gray-700 shadow-2xs'
                                    }`}
                                  >
                                    <span>
                                      Day {d.dayNumber}: <strong className="font-mono">{d.capacity}</strong> animals (<strong className="font-mono">{d.remainingShares}</strong> left)
                                    </span>
                                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2">
                                      <button
                                        onClick={() => startEditDay(d)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Edit Day"
                                      >
                                        ✎
                                      </button>
                                      <button
                                        onClick={() => handleDeleteDay(d.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors font-bold"
                                        title="Delete Day"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}

                              {dayFor === sub.id ? (
                                <form
                                  onSubmit={(e) => handleAddDay(e, sub.id)}
                                  className="flex gap-1.5 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-200 mt-1"
                                >
                                  <input
                                    type="number"
                                    placeholder="Day #"
                                    value={dayNumber}
                                    onChange={(e) => setDayNumber(e.target.value)}
                                    required
                                    min={1}
                                    className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-s bg-gray-500 font-mono"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Capacity"
                                    value={dayCapacity}
                                    onChange={(e) => setDayCapacity(e.target.value)}
                                    required
                                    min={1}
                                    className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-s bg-gray-500 font-mono"
                                  />
                                  <button type="submit" className="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded font-medium">Add</button>
                                  <button type="button" onClick={() => setDayFor(null)} className="text-xs text-gray-500 px-1">✕</button>
                                </form>
                              ) : (
                                <button
                                  onClick={() => {
                                    setDayFor(sub.id)
                                    setDayError('')
                                  }}
                                  className="text-xs text-blue-600 hover:bg-blue-50 font-medium px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                                >
                                  + Add Day
                                </button>
                              )}
                            </div>
                            {dayError && dayFor === sub.id && (
                              <p className="text-xs text-red-600 mt-1">{dayError}</p>
                            )}
                          </div>
                        ))}

                        {/* Add Sub Category Form or Button */}
                        {subCategoryFor === cat.id ? (
                          <form onSubmit={(e) => handleAddSubCategory(e, cat.id)} className="flex gap-2 items-center mt-3 pt-3 border-t border-gray-100">
                            <input
                              placeholder="Sub-category name (e.g. Standard)"
                              value={subName}
                              onChange={(e) => setSubName(e.target.value)}
                              required
                              className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-s text-gray-900"
                            />
                            <input
                              type="number"
                              placeholder="Price / share"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              required
                              className="w-28 rounded-lg border border-gray-300 px-2.5 py-1.5 text-s text-gray-900 font-mono"
                            />
                            <button type="submit" className="rounded-lg bg-blue-600 text-white text-xs px-3.5 py-1.5 font-medium">Save</button>
                            <button type="button" onClick={() => setSubCategoryFor(null)} className="text-xs text-gray-500">Cancel</button>
                          </form>
                        ) : (
                          <button
                            onClick={() => setSubCategoryFor(cat.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 mt-2"
                          >
                            + Add Sub-category
                          </button>
                        )}
                        {subError && subCategoryFor === cat.id && (
                          <p className="text-xs text-red-600 mt-1">{subError}</p>
                        )}
                      </div>
                    </td>

                    {/* Actions column */}
                    <td className="py-5 px-5 align-top text-right">
                      {editCatId !== cat.id && (
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors"
                          >
                            Edit Category
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            Delete Category
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}