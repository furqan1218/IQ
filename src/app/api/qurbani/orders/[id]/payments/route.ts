import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postPaymentEntry, postRevenueEntry } from '@/lib/qurbani-accounting'
import { allocateSharesToAnimals } from '@/lib/qurbani'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const numericOrderId = parseInt(id, 10)

    if (isNaN(numericOrderId)) {
      return NextResponse.json({ error: 'Invalid Order ID format' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { amount, method } = body
    const value = Number(amount)

    if (!value || value <= 0) {
      return NextResponse.json(
        { error: 'Enter an amount greater than zero' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: numericOrderId },
      include: {
        OrderLine: {
          include: {
            EidDay: {
              include: {
                AnimalSubCategory: {
                  include: { AnimalCategory: true },
                },
              },
            },
            OrderLineAllocation: true,
          },
        },
        Payment: true,
        QurbaniCustomer: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'This order is cancelled' },
        { status: 400 }
      )
    }

    const total = order.OrderLine.reduce((s, l) => s + Number(l.totalPrice), 0)
    const paid = order.Payment.reduce((s, p) => s + Number(p.amount), 0)
    const due = total - paid

    if (value > due + 0.005) {
      return NextResponse.json(
        { error: `Amount is more than due balance (Rs. ${due.toLocaleString()})` },
        { status: 400 }
      )
    }

    const ctx = {
      orderNumber: order.orderNumber,
      customerName: order.QurbaniCustomer?.name || 'Customer',
    }

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Payment Journal Voucher (Q-PAY) Entry
      await postPaymentEntry(tx, ctx, value, method || null)

      // 2. Payment Record Create
      const createdPayment = await tx.payment.create({
        data: {
          orderId: numericOrderId,
          amount: value,
          method: method || null,
        },
      })

      // 3. Agar Payment Complete ho gayi hai toh Status CONFIRMED karein aur Revenue Voucher (Q-REV) generate karein
      const newPaidTotal = paid + value
      if (newPaidTotal >= total) {
        const linesToPost = order.OrderLine.map((l) => ({
          subCategoryId: l.EidDay.AnimalSubCategory.id,
          subCategoryName: l.EidDay.AnimalSubCategory.name,
          totalPrice: l.totalPrice,
        }))

        // Generate Revenue Entry (Q-REV)
        await postRevenueEntry(tx, ctx, linesToPost)

        await tx.order.update({
          where: { id: numericOrderId },
          data: { status: 'CONFIRMED' },
        })
      }

      return createdPayment
    })

    // 4. Animal Shares Allocation logic
    for (const line of order.OrderLine) {
      if (!line.OrderLineAllocation || line.OrderLineAllocation.length === 0) {
        const shareNames =
          (line as any).names ||
          Array(line.sharesRequested).fill(order.QurbaniCustomer?.name || 'Share Holder')

        await allocateSharesToAnimals(
          line.eidDayId,
          line.EidDay.capacity,
          line.sharesRequested,
          line.EidDay.AnimalSubCategory.AnimalCategory.sharesPerAnimal,
          line.id,
          shareNames
        )
      }
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error: any) {
    console.error('Payment Error:', error)
    return NextResponse.json(
      { error: error.message || 'Payment process karte waqt masla aaya hai' },
      { status: 500 }
    )
  }
}