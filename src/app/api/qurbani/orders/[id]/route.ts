import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  ensurePaymentEntries,
  postRefundEntry,
  postRevenueEntry,
} from '@/lib/qurbani-accounting'

const orderInclude = {
  QurbaniCustomer: true,
  Payment: true,
  OrderLine: {
    include: {
      EidDay: {
        include: {
          AnimalSubCategory: {
            include: { AnimalCategory: true },
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid Order ID format' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: numericId },
    include: orderInclude,
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json(order)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid Order ID format' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const { action } = body

  const order = await prisma.order.findUnique({
    where: { id: numericId },
    include: { OrderLine: true, Payment: true, QurbaniCustomer: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'HOLD') {
    return NextResponse.json(
      { error: 'Only orders on hold can be confirmed or cancelled' },
      { status: 400 }
    )
  }

  const ctx = {
    orderNumber: order.orderNumber,
    customerName: order.QurbaniCustomer?.name || 'Customer',
  }

  if (action === 'confirm') {
    const total = order.OrderLine.reduce((s, l) => s + Number(l.totalPrice), 0)
    const paid = order.Payment.reduce((s, p) => s + Number(p.amount), 0)

    if (paid + 0.005 < total) {
      const due = total - paid
      return NextResponse.json(
        { error: `Rs. ${due.toLocaleString()} is still due` },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await ensurePaymentEntries(tx, ctx, order.Payment)
      const revenueEntryId = await postRevenueEntry(tx, ctx, total)
      await tx.order.update({
        where: { id: numericId },
        data: { status: 'CONFIRMED', revenueEntryId },
      })
    })
  } else if (action === 'cancel') {
    await prisma.$transaction(async (tx) => {
      await ensurePaymentEntries(tx, ctx, order.Payment)
      const refundEntryId = await postRefundEntry(tx, ctx, order.Payment)

      // Allocations delete hone se shares aur animal numbers dubara free ho jate hain
      await tx.orderLineAllocation.deleteMany({
        where: { OrderLine: { orderId: numericId } },
      })

      await tx.order.update({
        where: { id: numericId },
        data: { status: 'CANCELLED', refundEntryId },
      })
    })
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}