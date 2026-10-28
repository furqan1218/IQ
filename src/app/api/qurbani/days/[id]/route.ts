import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH: Update an existing day
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const dayId = Number(resolvedParams.id)

  if (isNaN(dayId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { dayNumber, capacity } = body

    const updatedDay = await prisma.eidDay.update({
      where: { id: dayId },
      data: {
        ...(dayNumber !== undefined && { dayNumber: Number(dayNumber) }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
      },
    })

    return NextResponse.json(updatedDay, { status: 200 })
  } catch (error: any) {
    console.error('Failed to update day:', error)
    return NextResponse.json({ error: error.message || 'Failed to update day' }, { status: 500 })
  }
}

// DELETE: Delete a specific day
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const dayId = Number(resolvedParams.id)

  if (isNaN(dayId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    await prisma.eidDay.delete({
      where: { id: dayId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Failed to delete day:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete day' }, { status: 500 })
  }
}