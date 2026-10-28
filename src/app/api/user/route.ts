import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Fetch all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST: Create new user
export async function POST(req: Request) {
  try {
    const { name, email, phone, role, password } = await req.json();

    if (!name || !role || !password) {
      return NextResponse.json(
        { error: "Name, role, and password are required." },
        { status: 400 }
      );
    }

    // Check if email already exists (if email is provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email is already in use." },
          { status: 400 }
        );
      }
    }

    // Check if phone number already exists (if phone is provided)
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number is already registered." },
          { status: 400 }
        );
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        role,
        password: hashedPassword,
      },
    });

    // Exclude password from the response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      { message: "User created successfully!", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    // Graceful fallback for Prisma unique constraint violations (P2002)
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target[0] : 'Field';
      return NextResponse.json(
        { error: `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use.` },
        { status: 400 }
      );
    }

    console.error("Create User Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove user by ID
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

// PUT: Update existing user
export async function PUT(req: Request) {
  try {
    const { id, name, email, phone, role, password } = await req.json();

    if (!id || !name || !role) {
      return NextResponse.json(
        { error: "ID, name, and role are required." },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      name,
      email: email || null,
      phone: phone || null,
      role,
    };

    // Hash and update password only if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json(
      { message: "User updated successfully!", user: userWithoutPassword },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}