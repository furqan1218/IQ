import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Date filter object build karein via JournalVoucher relation
    const voucherDateFilter: any = {}
    if (startDate) {
      voucherDateFilter.gte = new Date(`${startDate}T00:00:00.000Z`)
    }
    if (endDate) {
      voucherDateFilter.lte = new Date(`${endDate}T23:59:59.999Z`)
    }

    // 1. Accounts fetch karein with date-filtered JournalItems
    const accounts = await prisma.chartOfAccount.findMany({
      where: { level: 4 },
      include: {
        JournalItem: {
          where: {
            ...(Object.keys(voucherDateFilter).length > 0 && {
              JournalVoucher: {
                date: voucherDateFilter,
              },
            }),
          },
          include: {
            JournalVoucher: true,
          },
        },
      },
    })

    let totalDebitSum = 0
    let totalCreditSum = 0

    const trialBalanceRows = accounts.map((acc) => {
      let totalDebit = 0
      let totalCredit = 0

      acc.JournalItem.forEach((item) => {
        totalDebit += item.debit
        totalCredit += item.credit
      })

      // Account type ke mutabiq net balance nikalna
      let netDebit = 0
      let netCredit = 0
      const isDebitNormal = ["ASSET", "EXPENSE"].includes(acc.type)

      const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit

      if (balance > 0) {
        if (isDebitNormal) {
          netDebit = balance
        } else {
          netCredit = balance
        }
      } else if (balance < 0) {
        if (isDebitNormal) {
          netCredit = Math.abs(balance)
        } else {
          netDebit = Math.abs(balance)
        }
      }

      totalDebitSum += netDebit
      totalCreditSum += netCredit

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: netDebit,
        credit: netCredit,
      }
    })

    // Sirf woh accounts dikhayein jin par us saal transactions hui hain
    const filteredRows = trialBalanceRows.filter((row) => row.debit > 0 || row.credit > 0)

    return NextResponse.json({
      rows: filteredRows,
      totalDebit: totalDebitSum,
      totalCredit: totalCreditSum,
      isBalanced: Math.abs(totalDebitSum - totalCreditSum) < 0.01,
    })
  } catch (error: any) {
    console.error("Trial Balance API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}