import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import RoundModel from "@/models/Round";
import type { UpdateRoundRequest } from "@/types/api";

// GET single round by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const round = await RoundModel.findById(id).lean();

    if (!round) {
      return NextResponse.json(
        { success: false, error: "Round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: round,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch round",
      },
      { status: 500 }
    );
  }
}

// PUT - Update round by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body: UpdateRoundRequest = await request.json();
    const { categoryIds } = body;

    const round = await RoundModel.findByIdAndUpdate(
      id,
      {
        ...(categoryIds !== undefined && { categoryIds }),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!round) {
      return NextResponse.json(
        { success: false, error: "Round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: round,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update round",
      },
      { status: 400 }
    );
  }
}

// DELETE round by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedRound = await RoundModel.findByIdAndDelete(id).lean();

    if (!deletedRound) {
      return NextResponse.json(
        { success: false, error: "Round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedRound,
      message: "Round deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete round",
      },
      { status: 500 }
    );
  }
}

