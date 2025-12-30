import { NextResponse } from 'next/server';
import type { User } from "@/types/user";

// In-memory storage (replace with a real database in production)
let users: User[] = [];

// GET all users
export async function GET() {
  return NextResponse.json({
    success: true,
    data: users,
  });
}

// POST - Create a new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, passwordHash } = body;

    if (!name || !email || !passwordHash) {
      return NextResponse.json(
        { success: false, error: "Name, email, and passwordHash are required" },
        { status: 400 }
      );
    }

    const newUser: User = {
      _id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
    };

    users.push(newUser);

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE all users (for testing)
export async function DELETE() {
  users = [];
  return NextResponse.json({
    success: true,
    message: 'All users deleted',
  });
}

