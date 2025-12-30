import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameModel from "@/models/Game";
import type { UpdateGameRequest } from "@/types/api";

// GET single game by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const game = await GameModel.findById(id).lean();

    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: game,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch game",
      },
      { status: 500 }
    );
  }
}

// PUT - Update game by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body: UpdateGameRequest = await request.json();
    const { name, theme, roundIds } = body;

    const game = await GameModel.findByIdAndUpdate(
      id,
      {
        ...(name !== undefined && { name }),
        ...(theme !== undefined && { theme }),
        ...(roundIds !== undefined && { roundIds }),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: game,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update game",
      },
      { status: 400 }
    );
  }
}

// DELETE game by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedGame = await GameModel.findByIdAndDelete(id).lean();

    if (!deletedGame) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedGame,
      message: "Game deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete game",
      },
      { status: 500 }
    );
  }
}
