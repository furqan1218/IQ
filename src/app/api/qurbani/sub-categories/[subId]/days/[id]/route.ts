import { NextResponse } from 'next/server'
import { auth } from '../../../../../../../lib/auth'
import { prisma } from '../../../../../../../lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const subCatId = Number(resolvedParams.id)
  const body = await req.json()
  const dayNumber = Number(body.dayNumber)
  const capacity = Number(body.capacity)

  if (isNaN(subCatId)) {
    return NextResponse.json(
      { error: 'Invalid sub-category ID' },
      { status: 400 }
    )
  }

  if (!dayNumber || !capacity) {
    return NextResponse.json(
      { error: 'Day number and capacity are required' },
      { status: 400 }
    )
  }

  // Check if sub-category exists using numeric ID
  const subCategory = await prisma.animalSubCategory.findFirst({
    where: { id: subCatId },
  })
  
  if (!subCategory) {
    return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
  }

  try {
    const day = await prisma.eidDay.create({
      data: {
        subCategoryId: subCatId,
        dayNumber,
        capacity,
      },
    })
    return NextResponse.json(day, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: `Day ${dayNumber} already exists for this sub-category` },
        { status: 409 }
      )
    }
    console.error('Create day error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}