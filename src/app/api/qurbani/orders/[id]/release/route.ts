import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { customerName, customerPhone, customerAddress, shares } = body

    if (
      !customerName?.trim() ||
      !customerPhone?.trim() ||
      !Array.isArray(shares) ||
      shares.length === 0
    ) {
      return NextResponse.json(
        { error: 'Customer details and at least one selected share are required' },
        { status: 400 }
      )
    }

    if (shares.some((s: any) => !s.shareId || !String(s.name || '').trim())) {
      return NextResponse.json(
        { error: 'Enter a name for every selected share' },
        { status: 400 }
      )
    }

    // 1. Hold Order find karein (Payment relation ke sath)
    const holdOrder = await prisma.order.findUnique({
      where: { id: numericOrderId },
      include: { Payment: true },
    })

    if (!holdOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (holdOrder.status !== 'HOLD') {
      return NextResponse.json(
        { error: 'Only an order on hold can release shares' },
        { status: 400 }
      )
    }

    if (holdOrder.Payment && holdOrder.Payment.length > 0) {
      return NextResponse.json(
        { error: 'Remove or refund existing payments before releasing shares' },
        { status: 400 }
      )
    }

    const shareIds = shares.map((s: any) => Number(s.shareId))
    const nameById = new Map(shares.map((s: any) => [Number(s.shareId), String(s.name).trim()]))

    // 2. Selected shares fetch karein
    const selectedShares = await prisma.share.findMany({
      where: { id: { in: shareIds } },
      include: {
        OrderLineAllocation: {
          include: {
            OrderLine: {
              include: {
                EidDay: {
                  include: { AnimalSubCategory: true }
                }
              }
            }
          },
        },
      },
    })

    if (selectedShares.length !== shareIds.length) {
      return NextResponse.json(
        { error: 'One of the selected shares no longer exists' },
        { status: 400 }
      )
    }

    if (
      selectedShares.some((s) => s.OrderLineAllocation?.OrderLine?.orderId !== numericOrderId)
    ) {
      return NextResponse.json(
        { error: 'Selected shares do not belong to this order' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Customer find ya create karein
      let customer = await tx.qurbaniCustomer.findFirst({
        where: { phone: customerPhone.trim() },
      })

      if (!customer) {
        customer = await tx.qurbaniCustomer.create({
          data: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            address: customerAddress?.trim() || null,
          },
        })
      }

      // Naya Order create karein
      const lastOrder = await tx.order.findFirst({
        orderBy: { orderNumber: 'desc' },
      })

      const newOrder = await tx.order.create({
        data: {
          customerId: customer.id,
          orderNumber: (lastOrder?.orderNumber || 0) + 1,
          status: 'PENDING',
        },
      })

      // Sub-category ke hisab se group karein
      const bySubCategory = new Map<number, typeof selectedShares>()
      for (const share of selectedShares) {
        const eidDay = share.OrderLineAllocation?.OrderLine?.EidDay
        const subCatId = eidDay?.subCategoryId
        if (!subCatId) continue

        bySubCategory.set(subCatId, [...(bySubCategory.get(subCatId) || []), share])
      }

      for (const [subCatId, group] of bySubCategory) {
        const sampleLine = group[0].OrderLineAllocation.OrderLine
        const pricePerShare = Number(sampleLine.pricePerShare)

        // Nayi OrderLine banayein
        const newLine = await tx.orderLine.create({
          data: {
            orderId: newOrder.id,
            eidDayId: sampleLine.eidDayId,
            sharesRequested: group.length,
            pricePerShare,
            totalPrice: pricePerShare * group.length,
          },
        })

        // Animal ke hisab se group karein
        const byAnimal = new Map<number, typeof selectedShares>()
        for (const share of group) {
          const animalId = share.animalId
          byAnimal.set(animalId, [...(byAnimal.get(animalId) || []), share])
        }

        for (const [animalId, animalGroup] of byAnimal) {
          const newAllocation = await tx.orderLineAllocation.create({
            data: {
              orderLineId: newLine.id,
              animalId,
              sharesAllocated: animalGroup.length,
            },
          })

          for (const share of animalGroup) {
            await tx.share.update({
              where: { id: share.id },
              data: {
                allocationId: newAllocation.id,
                name: nameById.get(share.id)!,
              },
            })
          }
        }
      }

      // Purani allocations ko update ya delete karein
      const affectedAllocationIds = [
        ...new Set(selectedShares.map((s) => s.allocationId).filter(Boolean)),
      ] as number[]

      for (const allocationId of affectedAllocationIds) {
        const movedCount = selectedShares.filter(
          (s) => s.allocationId === allocationId
        ).length

        const oldAllocation = await tx.orderLineAllocation.findUnique({
          where: { id: allocationId },
        })
        if (!oldAllocation) continue

        const remaining = oldAllocation.sharesAllocated - movedCount

        if (remaining <= 0) {
          await tx.orderLineAllocation.delete({ where: { id: allocationId } })
        } else {
          await tx.orderLineAllocation.update({
            where: { id: allocationId },
            data: { sharesAllocated: remaining },
          })
        }
      }

      // Purani order lines re-calculate karein, agar khali ho jayein toh delete karein
      const oldLines = await tx.orderLine.findMany({
        where: { orderId: numericOrderId },
        include: { OrderLineAllocation: true },
      })

      for (const line of oldLines) {
        const remainingShares = line.OrderLineAllocation.reduce(
          (sum, a) => sum + a.sharesAllocated,
          0
        )
        if (remainingShares <= 0) {
          await tx.orderLine.delete({ where: { id: line.id } })
        } else {
          await tx.orderLine.update({
            where: { id: line.id },
            data: {
              sharesRequested: remainingShares,
              totalPrice: Number(line.pricePerShare) * remainingShares,
            },
          })
        }
      }

      const remainingLines = await tx.orderLine.count({
        where: { orderId: numericOrderId },
      })

      if (remainingLines === 0) {
        await tx.order.update({
          where: { id: numericOrderId },
          data: { status: 'CANCELLED' },
        })
      }

      return newOrder
    })

    return NextResponse.json(
      { orderNumber: result.orderNumber, orderId: result.id },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Release shares error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 })
  }
}