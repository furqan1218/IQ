import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const startYear = startDate ? startDate.substring(0, 4) : null

    // 1. Saare Level 4 accounts fetch karein jo ASSET, LIABILITY, ya EQUITY type ke hain
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        level: 4,
        type: { in: ["ASSET", "LIABILITY", "EQUITY"] },
      },
      include: {
        JournalItem: {
          include: {
            JournalVoucher: true,
          },
        },
      },
    })

    let totalAssets = 0
    let totalLiabilities = 0
    let totalEquity = 0

    const assetList: { code: string; name: string; amount: number }[] = []
    const liabilityList: { code: string; name: string; amount: number }[] = []
    const equityList: { code: string; name: string; amount: number }[] = []

    accounts.forEach((acc) => {
      let debitSum = 0
      let creditSum = 0

      acc.JournalItem.forEach((item) => {
        const voucherDateRaw = item.JournalVoucher?.date || item.createdAt
        if (!voucherDateRaw) return

        const voucherDateObj = new Date(voucherDateRaw)
        const voucherYear = voucherDateObj.getFullYear().toString()

        // Agar startYear diya gaya hai aur saal match nahi karta, toh skip kardein
        if (startYear && voucherYear !== startYear) {
          return
        }

        debitSum += item.debit
        creditSum += item.credit
      })

      // Asset ka normal balance Debit hota hai (Debit - Credit)
      // Liability aur Equity ka normal balance Credit hota hai (Credit - Debit)
      if (acc.type === "ASSET") {
        const netAsset = debitSum - creditSum
        if (netAsset !== 0) {
          assetList.push({ code: acc.code, name: acc.name, amount: netAsset })
          totalAssets += netAsset
        }
      } else if (acc.type === "LIABILITY") {
        const netLiability = creditSum - debitSum
        if (netLiability !== 0) {
          liabilityList.push({ code: acc.code, name: acc.name, amount: netLiability })
          totalLiabilities += netLiability
        }
      } else if (acc.type === "EQUITY") {
        const netEquity = creditSum - debitSum
        if (netEquity !== 0) {
          equityList.push({ code: acc.code, name: acc.name, amount: netEquity })
          totalEquity += netEquity
        }
      }
    })

    // 2. Selected Year ka Net Profit/Loss calculate karein taake usko Equity (Retained Earnings) mein include kiya ja sake
    const pnlAccounts = await prisma.chartOfAccount.findMany({
      where: {
        level: 4,
        type: { in: ["REVENUE", "EXPENSE"] },
      },
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

    pnlAccounts.forEach((acc) => {
      let debit = 0
      let credit = 0
      acc.JournalItem.forEach((item) => {
        const voucherDateRaw = item.JournalVoucher?.date || item.createdAt
        if (!voucherDateRaw) return

        const voucherDateObj = new Date(voucherDateRaw)
        const voucherYear = voucherDateObj.getFullYear().toString()

        if (startYear && voucherYear !== startYear) {
          return
        }

        debit += item.debit
        credit += item.credit
      })
      if (acc.type === "REVENUE") totalRevenue += (credit - debit)
      if (acc.type === "EXPENSE") totalExpense += (debit - credit)
    })

    const netIncome = totalRevenue - totalExpense
    if (netIncome !== 0) {
      equityList.push({ code: "3999", name: "Retained Earnings / Net Income", amount: netIncome })
      totalEquity += netIncome
    }

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01

    return NextResponse.json({
      assets: assetList,
      totalAssets,
      liabilities: liabilityList,
      totalLiabilities,
      equity: equityList,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
    })
  } catch (error: any) {
    console.error("Balance Sheet API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}