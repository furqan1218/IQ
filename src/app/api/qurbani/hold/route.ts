import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { holdWholeAnimal, dayRemainingShares } from '@/lib/qurbani'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const holdOrders = await prisma.order.findMany({
      where: { status: 'HOLD' },
      include: {
        QurbaniCustomer: true,
        OrderLine: {
          include: {
            EidDay: {
              include: {
                AnimalSubCategory: {
                  include: {
                    AnimalCategory: true,
                  },
                },
              },
            },
            OrderLineAllocation: {
              include: {
                Animal: {
                  include: {
                    Share: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(holdOrders, { status: 200 })
  } catch (error: any) {
    console.error('Fetch holds error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { eidDayId, animalNumber, reservedFor, phone } = body

    if (!eidDayId) {
      return NextResponse.json(
        { error: 'Select a category, sub-category and day' },
        { status: 400 }
      )
    }

    const numericEidDayId = Number(eidDayId)
    if (isNaN(numericEidDayId)) {
      return NextResponse.json({ error: 'Invalid Day ID format' }, { status: 400 })
    }

    const eidDay = await prisma.eidDay.findFirst({
      where: { id: numericEidDayId },
      include: { AnimalSubCategory: { include: { AnimalCategory: true } } },
    })

    if (!eidDay) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    const shares = eidDay.AnimalSubCategory.AnimalCategory.sharesPerAnimal
    const remaining = await dayRemainingShares(eidDay.id, eidDay.capacity, shares)
    if (remaining < shares) {
      return NextResponse.json(
        { error: 'This day does not have room for a whole animal' },
        { status: 400 }
      )
    }

    const name = (reservedFor || 'Office hold').trim()
    const holdPhone = (phone || 'OFFICE-HOLD').trim()

    let customer = await prisma.qurbaniCustomer.findFirst({
      where: { phone: holdPhone },
    })
    if (!customer) {
      customer = await prisma.qurbaniCustomer.create({
        data: { name, phone: holdPhone },
      })
    }

    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
    })
    const orderNumber = (lastOrder?.orderNumber || 0) + 1
    const pricePerShare = Number(eidDay.AnimalSubCategory.pricePerShare)

    const order = await prisma.order.create({
      data: { customerId: customer.id, orderNumber, status: 'HOLD' },
    })

    const orderLine = await prisma.orderLine.create({
      data: {
        orderId: order.id,
        eidDayId: eidDay.id,
        sharesRequested: shares,
        pricePerShare,
        totalPrice: pricePerShare * shares,
      },
    })

    const assignedNumber = await holdWholeAnimal(
      eidDay.id,
      eidDay.capacity,
      shares,
      orderLine.id,
      name,
      animalNumber ? Number(animalNumber) : undefined
    )

    return NextResponse.json(
      { orderNumber: order.orderNumber, animalNumber: assignedNumber },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Hold animal error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 400 }
    )
  }
}

// 📌 DELETE: Hold order cancel karna aur allocations/shares release karna
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Order lines aur unki allocations find karein
    const orderLines = await prisma.orderLine.findMany({
      where: { orderId },
      include: { OrderLineAllocation: { include: { Share: true } } },
    })

    for (const line of orderLines) {
      for (const alloc of line.OrderLineAllocation) {
        await prisma.share.deleteMany({ where: { allocationId: alloc.id } })
      }
      await prisma.orderLineAllocation.deleteMany({ where: { orderLineId: line.id } })
    }

    await prisma.orderLine.deleteMany({ where: { orderId } })
    await prisma.order.delete({ where: { id: orderId } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Delete hold error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 400 })
  }
}

// 📌 PUT: Hold details update karna (Reserved For / Phone)
export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, reservedFor, phone } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { QurbaniCustomer: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.customerId) {
      await prisma.qurbaniCustomer.update({
        where: { id: order.customerId },
        data: {
          name: reservedFor ? reservedFor.trim() : order.QurbaniCustomer?.name,
          phone: phone ? phone.trim() : order.QurbaniCustomer?.phone,
        },
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Update hold error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 400 })
  }
}