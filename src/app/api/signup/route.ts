
console.log("🔥 SIGNUP API ROUTE HIT SUCCESSFULLY!");


import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  console.log("🔥 SIGNUP API ROUTE HIT SUCCESSFULLY!");
  try {
    const body = await req.json();
    console.log("📦 Received Form Data:", body);

    // Yahan dobara req.json() nahi likhna, sirf 'body' se values leni hain:
    const { name, email, phone, password } = body;
    
    if (!email || !phone || !password) {
      return NextResponse.json(
        { error: "Email, Phone number aur Password sab lazmi hain!" },
        { status: 400 }
      )
    }

    // const existingUser = await prisma.user.findFirst({
    //   where: {
    //     OR: [{ email }, { phone }],
    //   },
    // })

    // if (existingUser) {
    //   return NextResponse.json(
    //     { error: "Is Email ya Phone number ke sath user pehle se mojood hai!" },
    //     { status: 400 }
    //   )
    // }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "USER", // Public signup se hamesha default 'USER' banega
      },
    })

    return NextResponse.json(
      { message: "User kamyabi se register ho gaya hai!", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}