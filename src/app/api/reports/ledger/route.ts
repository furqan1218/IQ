import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID lazmi hai!' },
        { status: 400 }
      );
    }

    const accountIdNum = Number(accountId);

    // 1. Account ki details fetch karein (Type pata karne ke liye)
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountIdNum },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account nahi mila!' },
        { status: 404 }
      );
    }

    // 2. Date filter build karein via JournalVoucher relation
    const voucherFilter: any = {};
    if (startDate) {
      voucherFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      voucherFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    // 3. JournalItems fetch karein with related JournalVoucher & ChartOfAccount
    const journalItems = await prisma.journalItem.findMany({
      where: {
        accountId: accountIdNum,
        ...(Object.keys(voucherFilter).length > 0 && {
          JournalVoucher: {
            date: voucherFilter,
          },
        }),
      },
      include: {
        JournalVoucher: true,
        ChartOfAccount: true,
      },
      orderBy: {
        JournalVoucher: {
          date: 'asc',
        },
      },
    });

    return NextResponse.json({
      success: true,
      account,
      data: journalItems,
    });
  } catch (error) {
    console.error('Fetch Ledger Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}