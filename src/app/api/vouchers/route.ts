import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Saare Vouchers fetch karne ke liye (Line items aur accounts ke sath)
export async function GET() {
  try {
    const vouchers = await prisma.journalVoucher.findMany({
      include: {
        JournalItem: {
          include: {
            ChartOfAccount: {
              select: { code: true, name: true, level: true, type: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(vouchers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Naya Voucher (Double-Entry check ke sath) banane ke liye
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { voucherNo, date, description, items } = body

    // 1. Basic validation
    if (!voucherNo || !items || !Array.isArray(items) || items.length < 2) {
      return NextResponse.json(
        { error: "Voucher mein kam az kam 2 line items (Debit aur Credit) honi chahiyein." },
        { status: 400 }
      )
    }

    // 2. Double-Entry Balance Check (Total Debit must equal Total Credit)
    let totalDebit = 0
    let totalCredit = 0

    for (const item of items) {
      totalDebit += Number(item.debit) || 0
      totalCredit += Number(item.credit) || 0
    }

    // Floating-point precision issues se bachne ke liye rounding
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Balance ghalat hai! Total Debit (${totalDebit}) aur Total Credit (${totalCredit}) barabar honay chahiyein.` },
        { status: 400 }
      )
    }

    // 3. Prisma Transaction ke zariye Voucher aur uski items save karna
    const newVoucher = await prisma.$transaction(async (tx) => {
      return await tx.journalVoucher.create({
        data: {
          voucherNo,
          date: date ? new Date(date) : new Date(),
          description: description || null,
          updatedAt: new Date(),
          JournalItem: {
            create: items.map((item: any) => ({
              accountId: Number(item.accountId),
              debit: Number(item.debit) || 0,
              credit: Number(item.credit) || 0,
              description: item.description || null,
            })),
          },
        },
        include: {
          JournalItem: {
            include: {
              ChartOfAccount: true
            }
          }
        }
      })
    })

    return NextResponse.json(newVoucher, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}