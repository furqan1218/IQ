import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// 1. Get All Accounts
export async function GET() {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      orderBy: { code: "asc" },
      // 'parent: true' yahan se hata diya gaya hai taake error na aaye
    })
    return NextResponse.json(accounts, { status: 200 })
  } catch (error) {
    console.error("Fetch Accounts Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// 2. Create New Account
export async function POST(req: Request) {
  try {
    const { code, name, level, type, parentId } = await req.json()

    if (!code || !name || !level || !type) {
      return NextResponse.json(
        { error: "Code, Name, Level aur Type sab lazmi hain!" },
        { status: 400 }
      )
    }

    const existing = await prisma.chartOfAccount.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Is Account Code ke sath account pehle se mojood hai!" },
        { status: 400 }
      )
    }

    const newAccount = await prisma.chartOfAccount.create({
      data: {
        code,
        name,
        level: Number(level),
        type: type,
        parentId: parentId ? Number(parentId) : null,
        updatedAt: new Date(), // updatedAt requirement handle karne ke liye
      },
    })

    return NextResponse.json(
      { message: "Account kamyabi se create ho gaya hai!", account: newAccount },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create Account Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}