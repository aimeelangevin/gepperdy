import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";

// POST - Handle team buzz-in
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Team ID is required" },
        { status: 400 }
      );
    }

    const gameState = await GameStateModel.findById(id);

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    // Only allow buzz-in if game is in question_active state and no one has buzzed yet
    if (gameState.state !== "question_active") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot buzz in - question is not active",
        },
        { status: 400 }
      );
    }

    if (gameState.buzzedTeamId) {
      return NextResponse.json(
        {
          success: false,
          error: "Someone already buzzed in",
        },
        { status: 400 }
      );
    }

    // Verify team exists in the game
    const team = gameState.teams.find((t) => t.id === teamId);
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found in game" },
        { status: 404 }
      );
    }

    // Set buzzed team and change state to answering
    gameState.buzzedTeamId = teamId;
    gameState.state = "answering";
    await gameState.save();

    return NextResponse.json({
      success: true,
      data: gameState.toObject(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process buzz-in",
      },
      { status: 500 }
    );
  }
}

