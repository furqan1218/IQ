import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  // ID ko Number mein convert kar rahe hain kyunke database mein Int hai
  const subCatId = Number(resolvedParams.subId)

  if (isNaN(subCatId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { name, pricePerShare } = body

    const updatedSubCategory = await prisma.animalSubCategory.update({
      where: { id: subCatId },
      data: {
        ...(name !== undefined && { name }),
        ...(pricePerShare !== undefined && { pricePerShare: Number(pricePerShare) }),
      },
    })

    return NextResponse.json(updatedSubCategory, { status: 200 })
  } catch (error: any) {
    console.error('Failed to update sub-category:', error)
    return NextResponse.json({ error: error.message || 'Failed to update sub-category' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedParams = await params
  const subCatId = Number(resolvedParams.id)

  if (isNaN(subCatId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    await prisma.animalSubCategory.delete({
      where: { id: subCatId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Failed to delete sub-category:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete sub-category' }, { status: 500 })
  }
}