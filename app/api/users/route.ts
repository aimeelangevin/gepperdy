import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";

// GET all users
export async function GET() {
  try {
    await connectDB();
    const users = await UserModel.find({}).lean();

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new user
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, email, passwordHash } = body;

    if (!name || !email || !passwordHash) {
      return NextResponse.json(
        { success: false, error: "Name, email, and passwordHash are required" },
        { status: 400 }
      );
    }

    const newUser = await UserModel.create({
      name,
      email,
      passwordHash,
    });

    return NextResponse.json(
      {
        success: true,
        data: newUser.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create user",
      },
      { status: 400 }
    );
  }
}

// DELETE all users (for testing)
export async function DELETE() {
  try {
    await connectDB();
    await UserModel.deleteMany({});
    return NextResponse.json({
      success: true,
      message: "All users deleted",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete users",
      },
      { status: 500 }
    );
  }
}
