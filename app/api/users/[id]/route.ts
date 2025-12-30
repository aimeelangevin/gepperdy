import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";

// GET single user by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await UserModel.findById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      },
      { status: 500 }
    );
  }
}

// PUT - Update user by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { name, email, passwordHash } = body;

    const user = await UserModel.findByIdAndUpdate(
      id,
      {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(passwordHash !== undefined && { passwordHash }),
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
      },
    });
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
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 400 }
    );
  }
}

// DELETE user by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedUser = await UserModel.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: deletedUser._id.toString(),
        name: deletedUser.name,
        email: deletedUser.email,
        passwordHash: deletedUser.passwordHash,
      },
      message: "User deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete user",
      },
      { status: 500 }
    );
  }
}
