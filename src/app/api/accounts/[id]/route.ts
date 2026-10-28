import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// UPDATE (PUT)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)
    const body = await request.json()
    const { code, name, level, type, parentId } = body

    const updatedAccount = await prisma.chartOfAccount.update({
      where: { id },
      data: {
        code,
        name,
        level,
        type,
        parentId: parentId || null,
      },
    })

    return NextResponse.json(updatedAccount)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// DELETE
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = parseInt(params.id)

    // Check karein ke kahin is account ke child accounts toh mojood nahi
    const childrenCount = await prisma.chartOfAccount.count({
      where: { parentId: id },
    })

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: "Pehle iske andar ke child accounts delete karein!" },
        { status: 400 }
      )
    }

    await prisma.chartOfAccount.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Account successfully deleted" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}