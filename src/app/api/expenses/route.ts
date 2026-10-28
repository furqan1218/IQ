import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Saare expenses fetch karne ke liye
export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ChartOfAccount_Expense_expenseAccountIdToChartOfAccount: true,
        ChartOfAccount_Expense_paymentAccountIdToChartOfAccount: true,
      },
    });

    const formattedExpenses = expenses.map((exp: any) => ({
      id: exp.id,
      description: exp.description,
      amount: exp.amount,
      date: exp.date,
      expenseAccount: exp.ChartOfAccount_Expense_expenseAccountIdToChartOfAccount,
      paymentAccount: exp.ChartOfAccount_Expense_paymentAccountIdToChartOfAccount,
    }));

    return NextResponse.json({ success: true, data: formattedExpenses });
  } catch (error) {
    console.error("Fetch Expenses Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST: Naya expense add karein + Sath hi Financial Journal Voucher bhi create ho
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description, amount, date, expenseAccountId, paymentAccountId } = body;

    if (!description || !amount || !expenseAccountId || !paymentAccountId) {
      return NextResponse.json(
        { success: false, error: 'Tamam fields lazmi hain!' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    const expAccId = Number(expenseAccountId);
    const payAccId = Number(paymentAccountId);
    const expenseDate = date ? new Date(date) : new Date();
    const voucherNo = `EXP-${Date.now()}`;

    // Prisma Transaction: Expense aur Financial Journal Entry aik sath save hon gi
    const result = await prisma.$transaction(async (tx) => {
      // 1. Expense Table mein entry
      const expense = await tx.expense.create({
        data: {
          description,
          amount: numAmount,
          date: expenseDate,
          expenseAccountId: expAccId,
          paymentAccountId: payAccId,
        },
      });

      // 2. Journal Voucher & Items create karein taake Ledger mein show ho
      await tx.journalVoucher.create({
        data: {
          voucherNo,
          date: expenseDate,
          description: `Expense: ${description}`,
          updatedAt: new Date(),
          JournalItem: {
            create: [
              {
                accountId: expAccId, // Expense Account (Debit)
                debit: numAmount,
                credit: 0,
                description: description,
              },
              {
                accountId: payAccId, // Payment/Cash/Bank Account (Credit)
                debit: 0,
                credit: numAmount,
                description: description,
              },
            ],
          },
        },
      });

      return expense;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Create Expense Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to create expense' }, { status: 500 });
  }
}