import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Tx = Prisma.TransactionClient

const STATIC_ACCOUNTS = {
  cash: { code: '1111', name: 'Cash In Hand', type: 'ASSET' as const, level: 4 },
  bank: { code: '1121', name: 'Faysal Bank', type: 'ASSET' as const, level: 4 },
  advances: { code: '2110', name: 'Customer Advances - Qurbani General', type: 'LIABILITY' as const, level: 4 },
  defaultRevenue: { code: '4200', name: 'Qurbani Revenue - General', type: 'REVENUE' as const, level: 2 },
} as const

type AccountKey = keyof typeof STATIC_ACCOUNTS

export type Ctx = {
  orderNumber: number
  customerName: string
}

// Helper: Account search or auto-create with proper level & parent link
async function getOrCreateAccount(
  tx: Tx,
  code: string,
  name: string,
  type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE' | 'EQUITY',
  level: number,
  parentId?: number
): Promise<number> {
  let account = await tx.chartOfAccount.findUnique({
    where: { code },
  })

  if (!account) {
    account = await tx.chartOfAccount.create({
      data: {
        code,
        name,
        type,
        level,
        parentId: parentId || null,
        updatedAt: new Date(),
      },
    })
  }

  return account.id
}

// Sub-Category Revenue Account Getter (Level 4 Account directly from Database / COA)
export async function getSubCategoryRevenueAccountId(
  tx: Tx,
  categoryName?: any,
  subCategoryId?: number,
  subCategoryName?: any
): Promise<number> {
  const catStr = typeof categoryName === 'string' ? categoryName : (categoryName?.name || String(categoryName || ''))
  const subStr = typeof subCategoryName === 'string' ? subCategoryName : (subCategoryName?.name || String(subCategoryName || ''))
  
  const cat = catStr.toLowerCase().trim()
  const sub = subStr.toLowerCase().trim()

  console.log('--- ACCOUNT MATCHING DEBUG ---')
  console.log('Category Received:', catStr, '-> Lower:', cat)
  console.log('SubCategory Received:', subStr, '-> Lower:', sub)

  let targetCode = '4201' // Default / Fallback: General Category - Ijtimai

  // Smart Detection: Chahe category name blank ho, agar sub-category mein "premium", "cow" ya "asaan" hai toh match karega
  const combinedText = `${cat} ${sub}`

  if (combinedText.includes('cow') || sub.includes('premium') || sub.includes('asaan')|| sub.includes('ijtimai')) {
    if (sub.includes('premium')) {
      targetCode = '4111' // Cow -> Premium[cite: 2]
    } else if (sub.includes('ijtimai')) {
      targetCode = '4112' // Cow -> Ijtimai[cite: 2]
    } else if (sub.includes('asaan')) {
      targetCode = '4113' // Cow -> Asaan[cite: 2]
    } else {
      targetCode = '4111' // Default Cow Premium
    }
  } 
  else if (combinedText.includes('goat') || combinedText.includes('bakra')) {
    targetCode = '4221' // Goat L4 Account
  }

  console.log('Resolved Target Account Code:', targetCode)

  let account = await tx.chartOfAccount.findUnique({
    where: { code: targetCode },
  })

  if (!account) {
    account = await tx.chartOfAccount.findUnique({
      where: { code: '4200' },
    })
  }

  if (!account) {
    throw new Error(`Chart of Account not found for Code ${targetCode} or 4200`)
  }

  return account.id
}

// Static accounts lookup
async function staticAccountId(tx: Tx, key: AccountKey): Promise<number> {
  const def = STATIC_ACCOUNTS[key]
  return getOrCreateAccount(tx, def.code, def.name, def.type, def.level)
}

const moneyKey = (method: string | null): AccountKey =>
  method && method !== 'Cash' ? 'bank' : 'cash'

// Unique voucher number generator
async function generateVoucherNo(tx: Tx, prefix: string): Promise<string> {
  const count = await tx.journalVoucher.count()
  return `${prefix}-${Date.now().toString().slice(-6)}-${count + 1}`
}

// 📌 1. Payment Entry (Cash/Bank Debit, Customer Advances Credit)
export async function postPaymentEntry(
  tx: Tx,
  ctx: Ctx,
  amount: number,
  method: string | null
): Promise<number> {
  const moneyAccountId = await staticAccountId(tx, moneyKey(method))
  const advancesAccountId = await staticAccountId(tx, 'advances')
  const voucherNo = await generateVoucherNo(tx, 'Q-PAY')

  const voucher = await tx.journalVoucher.create({
    data: {
      voucherNo,
      date: new Date(),
      description: `Qurbani order #${ctx.orderNumber}: payment received from ${ctx.customerName}`,
      updatedAt: new Date(),
      JournalItem: {
        create: [
          {
            accountId: moneyAccountId,
            debit: amount,
            credit: 0,
            description: `Payment received via ${method || 'Cash'}`,
          },
          {
            accountId: advancesAccountId,
            debit: 0,
            credit: amount,
            description: `Advance received for order #${ctx.orderNumber}`,
          },
        ],
      },
    },
  })

  return voucher.id
}

// 📌 2. Ensure Payment Entries for existing un-journaled payments
export async function ensurePaymentEntries(
  tx: Tx,
  ctx: Ctx,
  payments: {
    id: number
    amount: unknown
    method: string | null
    journalEntryId?: number | null
  }[]
) {
  for (const p of payments) {
    if (p.journalEntryId) continue
    await postPaymentEntry(
      tx,
      ctx,
      Number(p.amount),
      p.method
    )
  }
}

// 📌 3. Revenue Entry on Booking Confirmation (Hierarchy Level 4 Account mapping)
export async function postRevenueEntry(
  tx: Tx,
  ctx: Ctx,
  lines: {
    categoryName?: string
    subCategoryId?: number
    subCategoryName?: string
    totalPrice: number
  }[]
): Promise<number> {
  const advancesAccountId = await staticAccountId(tx, 'advances')
  const totalAmount = lines.reduce((sum, l) => sum + Number(l.totalPrice), 0)
  const voucherNo = await generateVoucherNo(tx, 'Q-REV')

  // Customer Advance Debit (2110)
  const journalItems: { accountId: number; debit: number; credit: number; description: string }[] = [
    {
      accountId: advancesAccountId,
      debit: totalAmount,
      credit: 0,
      description: `Clearing advance for confirmed order #${ctx.orderNumber}`,
    },
  ]

  // Level 4 Specific Sub-Category Revenue Account Credits (e.g., 4211 Cow - Premium)
  for (const line of lines) {
    const revenueAccountId = await getSubCategoryRevenueAccountId(
      tx,
      line.categoryName,
      line.subCategoryId,
      line.subCategoryName
    )

    journalItems.push({
      accountId: revenueAccountId,
      debit: 0,
      credit: Number(line.totalPrice),
      description: `Revenue for ${line.categoryName || ''} ${line.subCategoryName || ''} (Order #${ctx.orderNumber})`,
    })
  }

  const voucher = await tx.journalVoucher.create({
    data: {
      voucherNo,
      date: new Date(),
      description: `Qurbani order #${ctx.orderNumber}: booking confirmed for ${ctx.customerName}`,
      updatedAt: new Date(),
      JournalItem: {
        create: journalItems,
      },
    },
  })

  return voucher.id
}

// 📌 4. Refund Entry on Cancellation
export async function postRefundEntry(
  tx: Tx,
  ctx: Ctx,
  payments: { amount: unknown; method: string | null }[]
): Promise<number | null> {
  const byKey = new Map<AccountKey, number>()
  for (const p of payments) {
    const key = moneyKey(p.method)
    byKey.set(key, (byKey.get(key) || 0) + Number(p.amount))
  }

  const total = Array.from(byKey.values()).reduce((s, v) => s + v, 0)
  if (total <= 0) return null

  const advancesAccountId = await staticAccountId(tx, 'advances')
  const voucherNo = await generateVoucherNo(tx, 'Q-REF')

  const items: { accountId: number; debit: number; credit: number; description: string }[] = [
    {
      accountId: advancesAccountId,
      debit: total,
      credit: 0,
      description: `Refund advance adjustment for order #${ctx.orderNumber}`,
    },
  ]

  for (const [key, amount] of byKey) {
    const accId = await staticAccountId(tx, key)
    items.push({
      accountId: accId,
      debit: 0,
      credit: amount,
      description: `Refund paid via ${key}`,
    })
  }

  const voucher = await tx.journalVoucher.create({
    data: {
      voucherNo,
      date: new Date(),
      description: `Qurbani order #${ctx.orderNumber}: cancelled, refund issued to ${ctx.customerName}`,
      updatedAt: new Date(),
      JournalItem: {
        create: items,
      },
    },
  })

  return voucher.id
}