import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ subId: string }> } // Match folder name [subId]
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  console.log(resolvedParams);
  
  const subCategoryId = Number(resolvedParams.subId) // Use subId here
  if (isNaN(subCategoryId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const { dayNumber, capacity } = await req.json()

    const day = await prisma.eidDay.create({
      data: {
        subCategoryId: subCategoryId,
        dayNumber: Number(dayNumber),
        capacity: Number(capacity),
      },
    })

    return NextResponse.json(day, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create day:', error)
    return NextResponse.json({ error: error.message || 'Failed to create day' }, { status: 500 })
  }
}