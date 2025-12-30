import { NextResponse } from 'next/server';
import type { GameState } from '@/types/gameState';

// In-memory storage (should match the one in ../../route.ts in production)
let gameStates: GameState[] = [];

// GET game state by game ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const gameState = gameStates.find((gs) => gs.gameId === gameId);

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

