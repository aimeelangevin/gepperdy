import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GameStateModel from "@/models/GameState";

// GET all game states
export async function GET() {
  try {
    await connectDB();
    const gameStates = await GameStateModel.find({}).lean();

    return NextResponse.json({
      success: true,
      data: gameStates,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch game states",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new game state
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      gameId,
      teams,
      currentTeamIndex,
      currentRoundIndex,
      completedQuestionIds,
    } = body;

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: "Game ID is required" },
        { status: 400 }
      );
    }

    const newGameState = await GameStateModel.create({
      gameId,
      teams: teams || [],
      currentTeamIndex: currentTeamIndex ?? 0,
      currentRoundIndex: currentRoundIndex ?? 0,
      completedQuestionIds: completedQuestionIds || [],
    });

    return NextResponse.json(
      {
        success: true,
        data: newGameState.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create game state",
      },
      { status: 400 }
    );
  }
}
