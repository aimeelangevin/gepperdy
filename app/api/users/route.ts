import { NextResponse } from 'next/server';

// In-memory storage (replace with a real database in production)
let users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
];

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
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const newUser = {
      id: users.length + 1,
      name,
      email,
    };

    users.push(newUser);

    return NextResponse.json(
      { success: true, data: newUser },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
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

