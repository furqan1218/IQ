import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { categoryId, name, pricePerShare } = await req.json()

    if (!categoryId || !name || !pricePerShare) {
      return NextResponse.json(
        { error: 'Category, name and price per share are required' },
        { status: 400 }
      )
    }

    const category = await prisma.animalCategory.findFirst({
      where: { id: categoryId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const subCategory = await prisma.animalSubCategory.create({
      data: {
        categoryId,
        name,
        pricePerShare: Number(pricePerShare),
      },
    })

    return NextResponse.json(subCategory, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A sub-category with this name already exists for this category' },
        { status: 409 }
      )
    }
    console.error('Create sub-category error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}