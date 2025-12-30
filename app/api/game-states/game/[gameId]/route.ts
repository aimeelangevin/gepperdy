import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";

// GET game state by game ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    await connectDB();
    const { gameId } = await params;
    const gameState = await GameStateModel.findOne({ gameId }).lean();

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
