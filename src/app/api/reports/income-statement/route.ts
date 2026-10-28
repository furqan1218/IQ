import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const startYear = startDate ? startDate.substring(0, 4) : "2025"

    // Safe query: Saare accounts uthayein bina strict level/type filter ke taake data miss na ho
    const accounts = await prisma.chartOfAccount.findMany({
      include: {
        JournalItem: {
          include: {
            JournalVoucher: true,
          },
        },
      },
    })

    let totalRevenue = 0
    let totalExpense = 0

    const revenueList: { code: string; name: string; amount: number }[] = []
    const expenseList: { code: string; name: string; amount: number }[] = []

    accounts.forEach((acc) => {
      // Account type ko uppercase kar ke check karein (REVENUE ya EXPENSE)
      const accType = acc.type ? acc.type.toUpperCase() : ""
      if (accType !== "REVENUE" && accType !== "EXPENSE") return

      let debitSum = 0
      let creditSum = 0

      acc.JournalItem.forEach((item) => {
        const voucherDateRaw = item.JournalVoucher?.date || item.createdAt
        if (!voucherDateRaw) return

        const voucherDateObj = new Date(voucherDateRaw)
        const voucherYear = voucherDateObj.getFullYear().toString()

        // Saal match karein
        if (startYear && voucherYear !== startYear) {
          return
        }

        debitSum += item.debit
        creditSum += item.credit
      })

      if (accType === "REVENUE") {
        const netRevenue = creditSum - debitSum
        if (netRevenue !== 0) {
          revenueList.push({ code: acc.code, name: acc.name, amount: netRevenue })
          totalRevenue += netRevenue
        }
      } else if (accType === "EXPENSE") {
        const netExpense = debitSum - creditSum
        if (netExpense !== 0) {
          expenseList.push({ code: acc.code, name: acc.name, amount: netExpense })
          totalExpense += netExpense
        }
      }
    })

    const netProfitOrLoss = totalRevenue - totalExpense

    return NextResponse.json({
      revenues: revenueList,
      totalRevenue,
      expenses: expenseList,
      totalExpense,
      netProfitOrLoss,
    })
  } catch (error: any) {
    console.error("Income Statement API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}