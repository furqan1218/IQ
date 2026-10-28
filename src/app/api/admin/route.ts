import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.animalCategory.findMany({
      include: {
        AnimalSubCategory: {
          include: {
            EidDay: {
              where: {
                dayNumber: { lte: 3 }, // Max 3 days limit
              },
              include: {
                Animal: {
                  include: {
                    OrderLineAllocation: true, // Updated from allocations to OrderLineAllocation
                  },
                },
              },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Day numbers extract karein (Max 3 days tak restricted)
    const dayNumbersSet = new Set<number>()
    categories.forEach((cat: any) => {
      const subCategories = cat.AnimalSubCategory || []
      subCategories.forEach((sub: any) => {
        const eidDays = sub.EidDay || sub.eidDays || []
        eidDays.forEach((d: any) => {
          if (d.dayNumber <= 3) {
            dayNumbersSet.add(d.dayNumber)
          }
        })
      })
    })
    const days = [...dayNumbersSet].sort((a, b) => a - b).slice(0, 3)

    // Expenses fetch karna (Max 3 days limit ke sath)
    const expensesByDay: Record<number, number> = {}
    let totalExpense = 0
    try {
      // @ts-ignore
      if (prisma.expense) {
        // @ts-ignore
        const expenses = await prisma.expense.findMany()
        expenses.forEach((exp: any) => {
          const dNum = exp.dayNumber || 1
          if (dNum <= 3) {
            expensesByDay[dNum] = (expensesByDay[dNum] || 0) + Number(exp.amount || 0)
            totalExpense += Number(exp.amount || 0)
          }
        })
      }
    } catch (err) {
      console.log('Expense table not found or error fetching expenses:', err)
    }

    const rows: any[] = []
    const openAnimals: any[] = []
    let grandTotalBookedValue = 0
    let grandTotalMaxValue = 0
    let grandTotalAnimals = 0
    let grandTotalCapacity = 0

    for (const cat of categories) {
      const subCategories = (cat as any).AnimalSubCategory || []
      for (const sub of subCategories) {
        const price = Number(sub.pricePerShare || 0)
        const sharesPerAnimal = cat.sharesPerAnimal

        const dayAnimals: Record<number, any> = {}
        let totalAnimals = 0
        let totalCapacity = 0
        let totalBookedValue = 0
        let totalMaxValue = 0

        const subEidDays = sub.EidDay || sub.eidDays || []

        for (const dayNum of days) {
          const foundDay = subEidDays.find((d: any) => d.dayNumber === dayNum)
          const animals = foundDay ? (foundDay.Animal || foundDay.animals || []) : []
          const animalsCount = animals.length
          const capacity = foundDay ? foundDay.capacity : 0

          let sharesBooked = 0
          animals.forEach((animal: any) => {
            // Supporting OrderLineAllocation or allocations interchangeably
            const allocs = animal.OrderLineAllocation || animal.allocations || []
            const animalAllocated = allocs.reduce(
              (s: number, al: any) => s + (al.sharesAllocated || al.shares || 1),
              0
            )
            sharesBooked += animalAllocated

            // Check if animal is open (shares remaining)
            const remainingShares = sharesPerAnimal - animalAllocated
            if (remainingShares > 0) {
              openAnimals.push({
                id: animal.id,
                tagNumber: animal.tagNumber || animal.animalNumber || animal.name || 'N/A',
                categoryName: cat.name,
                subCategoryName: sub.name,
                dayNumber: dayNum,
                sharesPerAnimal,
                sharesAllocated: animalAllocated,
                sharesRemaining: remainingShares,
              })
            }
          })

          const totalCapacityShares = capacity * sharesPerAnimal
          const bookedValue = sharesBooked * price
          const maxValue = totalCapacityShares * price

          dayAnimals[dayNum] = {
            animalsCount,
            capacity,
            sharesBooked,
            bookedValue,
            maxValue,
          }

          totalAnimals += animalsCount
          totalCapacity += capacity
          totalBookedValue += bookedValue
          totalMaxValue += maxValue
        }

        grandTotalBookedValue += totalBookedValue
        grandTotalMaxValue += totalMaxValue
        grandTotalAnimals += totalAnimals
        grandTotalCapacity += totalCapacity

        rows.push({
          categoryId: cat.id,
          categoryName: cat.name,
          subCategoryId: sub.id,
          subCategoryName: sub.name,
          dayAnimals,
          totalAnimals,
          totalCapacity,
          totalBookedValue,
          totalMaxValue,
        })
      }
    }

    const netProfit = grandTotalBookedValue - totalExpense

    return NextResponse.json({
      days,
      rows,
      openAnimals,
      expensesByDay,
      summary: {
        totalRevenue: grandTotalBookedValue,
        totalPotentialRevenue: grandTotalMaxValue,
        totalExpense,
        netProfit,
        totalAnimals: grandTotalAnimals,
        totalCapacity: grandTotalCapacity,
      },
    })
  } catch (error: any) {
    console.error('API Error in dashboard:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}