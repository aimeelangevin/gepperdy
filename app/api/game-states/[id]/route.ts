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
    const gameState = await GameStateModel.findById(id);

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: gameState._id.toString(),
        gameId: gameState.gameId,
        teams: gameState.teams.map((team: any) => ({
          _id: team._id.toString(),
          name: team.name,
          score: team.score,
        })),
        currentTeamIndex: gameState.currentTeamIndex,
        currentRoundIndex: gameState.currentRoundIndex,
        completedQuestionIds: gameState.completedQuestionIds,
      },
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
    );

    if (!gameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: gameState._id.toString(),
        gameId: gameState.gameId,
        teams: gameState.teams.map((team: any) => ({
          _id: team._id.toString(),
          name: team.name,
          score: team.score,
        })),
        currentTeamIndex: gameState.currentTeamIndex,
        currentRoundIndex: gameState.currentRoundIndex,
        completedQuestionIds: gameState.completedQuestionIds,
      },
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
    const deletedGameState = await GameStateModel.findByIdAndDelete(id);

    if (!deletedGameState) {
      return NextResponse.json(
        { success: false, error: "Game state not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: deletedGameState._id.toString(),
        gameId: deletedGameState.gameId,
        teams: deletedGameState.teams.map((team: any) => ({
          _id: team._id.toString(),
          name: team.name,
          score: team.score,
        })),
        currentTeamIndex: deletedGameState.currentTeamIndex,
        currentRoundIndex: deletedGameState.currentRoundIndex,
        completedQuestionIds: deletedGameState.completedQuestionIds,
      },
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
