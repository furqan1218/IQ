import { prisma } from '@/lib/prisma'

/** Kisi Day ki abhi kitni shares khali hain */
export async function dayRemainingShares(
  eidDayId: number,
  capacity: number,
  sharesPerAnimal: number
) {
  const animals = await prisma.animal.findMany({
    where: { eidDayId: Number(eidDayId) },
    include: {
      OrderLineAllocation: {
        include: {
          OrderLine: {
            include: {
              Order: true,
            },
          },
        },
      },
    },
  })

  let freeFromExisting = 0
  for (const a of animals) {
    const hasHold = a.OrderLineAllocation.some(
      (al) => al.OrderLine.Order.status === 'HOLD'
    )
    if (hasHold) continue
    const used = a.OrderLineAllocation.reduce((s, al) => s + al.sharesAllocated, 0)
    freeFromExisting += Math.max(0, a.totalShares - used)
  }

  const newAnimalsAllowed = Math.max(0, capacity - animals.length)
  return freeFromExisting + newAnimalsAllowed * sharesPerAnimal
}

/**
 * Shares ko us Day ke animals mein allocate karta hai.
 */
export async function allocateSharesToAnimals(
  eidDayId: number,
  capacity: number,
  sharesNeeded: number,
  totalSharesPerAnimal: number,
  orderLineId: number | string,
  shareNames: string[]
) {
  const names = [...shareNames]
  let remaining = sharesNeeded
  const numericOrderLineId = Number(orderLineId) // ✅ Ensure it is an Integer

  const animals = await prisma.animal.findMany({
    where: { eidDayId: Number(eidDayId) },
    include: {
      Share: true,
      OrderLineAllocation: {
        include: {
          OrderLine: {
            include: {
              Order: true,
            },
          },
        },
      },
    },
    orderBy: { animalNumber: 'asc' },
  })

  type AnimalData = (typeof animals)[number]

  const usedOf = (animal: AnimalData) =>
    animal.OrderLineAllocation.reduce((sum, a) => sum + a.sharesAllocated, 0)

  const isEligible = (animal: AnimalData) => {
    const hasHold = animal.OrderLineAllocation.some(
      (a) => a.OrderLine.Order.status === 'HOLD'
    )
    if (hasHold) return false
    return usedOf(animal) < animal.totalShares
  }

  let maxAnimalNumber = animals.reduce(
    (max, a) => Math.max(max, a.animalNumber),
    0
  )

  while (remaining > 0) {
    let target: AnimalData | undefined = animals
      .filter(isEligible)
      .sort((a, b) => a.animalNumber - b.animalNumber)[0]

    if (!target) {
      if (animals.length >= capacity) {
        throw new Error('This day no longer has room for more animals')
      }
      maxAnimalNumber += 1
      const created = await prisma.animal.create({
        data: {
          eidDayId: Number(eidDayId),
          animalNumber: maxAnimalNumber,
          totalShares: totalSharesPerAnimal,
        },
      })
      target = { ...created, Share: [], OrderLineAllocation: [] } as AnimalData
      animals.push(target)
    }

    const freeSpace = target.totalShares - usedOf(target)
    const allocateNow = Math.min(freeSpace, remaining)

    const allocation = await prisma.orderLineAllocation.create({
      data: {
        orderLineId: numericOrderLineId, // ✅ INTEGER pass ho raha hai
        animalId: target.id,
        sharesAllocated: allocateNow,
      },
    })

    const takenNumbers = new Set(target.Share.map((s) => s.shareNumber))
    const batch = names.splice(0, allocateNow)

    for (const name of batch) {
      let number = 1
      while (takenNumbers.has(number)) number++
      takenNumbers.add(number)

      const share = await prisma.share.create({
        data: {
          allocationId: allocation.id,
          animalId: target.id,
          shareNumber: number,
          name,
        },
      })
      target.Share.push(share)
    }

    target.OrderLineAllocation.push({
      ...allocation,
      OrderLine: { Order: { status: 'CONFIRMED' } },
    } as any)

    remaining -= allocateNow
  }
}

/** Poore animal ko hold karta hai (uske sab shares ek sath) us Day ke andar. */
export async function holdWholeAnimal(
  eidDayId: number,
  capacity: number,
  totalSharesPerAnimal: number,
  orderLineId: number | string,
  reservedFor: string,
  animalNumber?: number
) {
  const numericOrderLineId = Number(orderLineId) // ✅ Ensure Integer
  const animals = await prisma.animal.findMany({
    where: { eidDayId: Number(eidDayId) },
    include: { OrderLineAllocation: true },
    orderBy: { animalNumber: 'asc' },
  })

  let target = animals.find((a) => a.animalNumber === animalNumber)

  if (animalNumber) {
    if (target && target.OrderLineAllocation.length > 0) {
      throw new Error(`Animal #${animalNumber} is already in use`)
    }
    if (!target) {
      if (animals.length >= capacity) {
        throw new Error('This day no longer has room for more animals')
      }
      target = await prisma.animal.create({
        data: { eidDayId: Number(eidDayId), animalNumber, totalShares: totalSharesPerAnimal },
        include: { OrderLineAllocation: true },
      })
    }
  } else {
    target = animals.find((a) => a.OrderLineAllocation.length === 0)
    if (!target) {
      if (animals.length >= capacity) {
        throw new Error('This day no longer has room for more animals')
      }
      const maxNumber = animals.reduce(
        (max, a) => Math.max(max, a.animalNumber),
        0
      )
      target = await prisma.animal.create({
        data: {
          eidDayId: Number(eidDayId),
          animalNumber: maxNumber + 1,
          totalShares: totalSharesPerAnimal,
        },
        include: { OrderLineAllocation: true },
      })
    }
  }

  const allocation = await prisma.orderLineAllocation.create({
    data: {
      orderLineId: numericOrderLineId, // ✅ INTEGER pass ho raha hai
      animalId: target!.id,
      sharesAllocated: totalSharesPerAnimal,
    },
  })

  for (let i = 1; i <= totalSharesPerAnimal; i++) {
    await prisma.share.create({
      data: {
        allocationId: allocation.id,
        animalId: target!.id,
        shareNumber: i,
        name: reservedFor,
      },
    })
  }

  return target!.animalNumber
}