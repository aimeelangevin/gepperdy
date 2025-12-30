import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";

// GET single game state by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const gameState = await GameStateModel.findById(id).lean();

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: gameState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch game state",
      },
      { status: 500 }
    );
  }
}

// PUT - Update game state by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const {
      gameId,
      teams,
      currentTeamIndex,
      currentRoundIndex,
      completedQuestionIds,
    } = body;

    const gameState = await GameStateModel.findByIdAndUpdate(
      id,
      {
        ...(gameId !== undefined && { gameId }),
        ...(teams !== undefined && { teams }),
        ...(currentTeamIndex !== undefined && { currentTeamIndex }),
        ...(currentRoundIndex !== undefined && { currentRoundIndex }),
        ...(completedQuestionIds !== undefined && { completedQuestionIds }),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: gameState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update game state",
      },
      { status: 400 }
    );
  }
}

// DELETE game state by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedGameState = await GameStateModel.findByIdAndDelete(id).lean();

    if (!deletedGameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedGameState,
      message: "Game state deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete game state",
      },
      { status: 500 }
    );
  }
}
