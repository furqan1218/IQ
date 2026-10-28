import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { allocateSharesToAnimals, dayRemainingShares } from '@/lib/qurbani'

const orderInclude = {
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
          Animal: true,
          Share: { orderBy: { shareNumber: 'asc' as const } },
        },
      },
    },
  },
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
    include: { ...orderInclude, Payment: true },
    orderBy: { orderNumber: 'desc' },
  })

  return NextResponse.json(orders)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { customerName, customerPhone, customerAddress, lines } = body

    if (
      !customerName?.trim() ||
      !customerPhone?.trim() ||
      !Array.isArray(lines) ||
      lines.length === 0
    ) {
      return NextResponse.json(
        { error: 'Customer details and at least one line are required' },
        { status: 400 }
      )
    }

    const prepared = []
    for (const line of lines) {
      const names: string[] = Array.isArray(line.names)
        ? line.names.map((n: unknown) => String(n).trim())
        : []

      if (names.length === 0 || names.some((n) => !n)) {
        return NextResponse.json(
          { error: 'Enter a name for every share' },
          { status: 400 }
        )
      }

      const numericEidDayId = Number(line.eidDayId)
      if (isNaN(numericEidDayId)) {
        return NextResponse.json(
          { error: 'Invalid Day ID format provided' },
          { status: 400 }
        )
      }

      const eidDay = await prisma.eidDay.findFirst({
        where: {
          id: numericEidDayId,
        },
        include: {
          AnimalSubCategory: {
            include: {
              AnimalCategory: true,
            },
          },
        },
      })

      if (!eidDay) {
        return NextResponse.json(
          { error: 'One of the selected days no longer exists' },
          { status: 400 }
        )
      }

      const sharesPerAnimal = eidDay.AnimalSubCategory.AnimalCategory.sharesPerAnimal
      const remaining = await dayRemainingShares(
        eidDay.id,
        eidDay.capacity,
        sharesPerAnimal
      )
      if (names.length > remaining) {
        return NextResponse.json(
          {
            error: `${eidDay.AnimalSubCategory.name} — Day ${eidDay.dayNumber} only has ${remaining} share(s) left`,
          },
          { status: 400 }
        )
      }

      prepared.push({ eidDay, names, sharesPerAnimal })
    }

    let customer = await prisma.qurbaniCustomer.findFirst({
      where: { phone: customerPhone.trim() },
    })

    if (!customer) {
      customer = await prisma.qurbaniCustomer.create({
        data: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress?.trim() || null,
        },
      })
    }

    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
    })
    const orderNumber = (lastOrder?.orderNumber || 0) + 1

    const order = await prisma.order.create({
      data: { customerId: customer.id, orderNumber, status: 'PENDING' },
    })

    for (const { eidDay, names, sharesPerAnimal } of prepared) {
      const pricePerShare = Number(eidDay.AnimalSubCategory.pricePerShare)

      const orderLine = await prisma.orderLine.create({
        data: {
          orderId: order.id,
          eidDayId: eidDay.id,
          sharesRequested: names.length,
          pricePerShare,
          totalPrice: pricePerShare * names.length,
        },
      })

      // Allocate shares to animals automatically
      await allocateSharesToAnimals(
        eidDay.id,
        eidDay.capacity,
        names.length,
        sharesPerAnimal,
        String(orderLine.id),
        names
      )
    }

    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: orderInclude,
    })

    return NextResponse.json(fullOrder, { status: 201 })
  } catch (error: any) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}