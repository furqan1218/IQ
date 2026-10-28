import { NextResponse } from 'next/server'
import { auth } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

async function dayRemainingShares(dayId: string, capacity: number, sharesPerAnimal: number) {
  try {
    const dayData = await prisma.eidDay.findUnique({
      where: { id: Number(dayId) },
      include: {
        Animal: {
          include: { OrderLineAllocation: true },
        },
      },
    })
    
    const dayAnimals = (dayData as any)?.animals || (dayData as any)?.Animal || []
    if (!dayData) return capacity * sharesPerAnimal

    const bookedShares = dayAnimals.reduce(
      (sum: number, animal: any) =>
        sum + (animal.allocations || []).reduce((s: number, al: any) => s + (al.sharesAllocated || 0), 0),
      0
    )
    const totalCapacityShares = capacity * sharesPerAnimal
    return Math.max(0, totalCapacityShares - bookedShares)
  } catch {
    return capacity * sharesPerAnimal
  }
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const categories = await prisma.animalCategory.findMany({
      include: {
        AnimalSubCategory: {
          include: { 
            EidDay: { 
              orderBy: { dayNumber: 'asc' } 
            } 
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const withAvailability = await Promise.all(
      categories.map(async (cat: any) => {
        const subList = cat.AnimalSubCategory || []
        const subCategoriesWithAvailability = await Promise.all(
          subList.map(async (sub: any) => {
            const daysList = sub.EidDay || sub.eidDays || []
            const eidDaysWithAvailability = await Promise.all(
              daysList.map(async (day: any) => {
                const remainingShares = await dayRemainingShares(
                  day.id,
                  day.capacity,
                  cat.sharesPerAnimal
                )
                return { ...day, remainingShares }
              })
            )
            return { ...sub, eidDays: eidDaysWithAvailability, EidDay: eidDaysWithAvailability }
          })
        )
        return { ...cat, subCategories: subCategoriesWithAvailability }
      })
    )

    return NextResponse.json(withAvailability)
  } catch (error) {
    console.error('Fetch categories error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const sharesPerAnimal = Number(body.sharesPerAnimal)

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    if (isNaN(sharesPerAnimal) || sharesPerAnimal <= 0) {
      return NextResponse.json(
        { error: 'Shares per animal must be a valid positive number' },
        { status: 400 }
      )
    }

    const category = await prisma.animalCategory.create({
      data: {
        name,
        sharesPerAnimal,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      )
    }
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}