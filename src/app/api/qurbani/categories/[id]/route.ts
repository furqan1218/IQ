import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const numericId = parseInt(id, 10)

    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid Category ID format' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { name, sharesPerAnimal } = body

    if (!name?.trim() || !sharesPerAnimal) {
      return NextResponse.json(
        { error: 'Name and shares per animal are required' },
        { status: 400 }
      )
    }

    const category = await prisma.animalCategory.findUnique({
      where: { id: numericId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updated = await prisma.animalCategory.update({
      where: { id: numericId },
      data: {
        name: name.trim(),
        sharesPerAnimal: Number(sharesPerAnimal),
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      )
    }
    console.error('Update category error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 })
  }
}