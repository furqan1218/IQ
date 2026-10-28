'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface YearContextType {
  selectedYear: string
  setSelectedYear: (year: string) => void
  years: string[]
}

const YearContext = createContext<YearContextType | undefined>(undefined)

export const YearProvider = ({ children }: { children: ReactNode }) => {
  const currentYearStr = new Date().getFullYear().toString()
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr)

  const years = [
    currentYearStr,
    (Number(currentYearStr) - 1).toString(),
    (Number(currentYearStr) - 2).toString(),
    (Number(currentYearStr) - 3).toString(),
  ]

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, years }}>
      {children}
    </YearContext.Provider>
  )
}

export const useYear = () => {
  const context = useContext(YearContext)
  if (!context) {
    throw new Error('useYear must be used within a YearProvider')
  }
  return context
}