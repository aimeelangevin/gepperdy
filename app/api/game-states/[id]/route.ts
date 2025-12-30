import { NextResponse } from 'next/server';
import type { GameState } from '@/types/gameState';

// In-memory storage (should match the one in ../route.ts in production)
let gameStates: GameState[] = [];

// GET single game state by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameState = gameStates.find((gs) => gs._id === id);

  if (!gameState) {
    return NextResponse.json(
      { success: false, error: 'Game state not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: gameState,
  });
}

// PUT - Update game state by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { gameId, teams, currentTeamIndex, currentRoundIndex, completedQuestionIds } = body;

    const gameStateIndex = gameStates.findIndex((gs) => gs._id === id);

    if (gameStateIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Game state not found' },
        { status: 404 }
      );
    }

    if (gameId !== undefined) gameStates[gameStateIndex].gameId = gameId;
    if (teams !== undefined) gameStates[gameStateIndex].teams = teams;
    if (currentTeamIndex !== undefined)
      gameStates[gameStateIndex].currentTeamIndex = currentTeamIndex;
    if (currentRoundIndex !== undefined)
      gameStates[gameStateIndex].currentRoundIndex = currentRoundIndex;
    if (completedQuestionIds !== undefined)
      gameStates[gameStateIndex].completedQuestionIds = completedQuestionIds;

    return NextResponse.json({
      success: true,
      data: gameStates[gameStateIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE game state by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameStateIndex = gameStates.findIndex((gs) => gs._id === id);

  if (gameStateIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Game state not found' },
      { status: 404 }
    );
  }

  const deletedGameState = gameStates.splice(gameStateIndex, 1)[0];

  return NextResponse.json({
    success: true,
    data: deletedGameState,
    message: 'Game state deleted successfully',
  });
}

