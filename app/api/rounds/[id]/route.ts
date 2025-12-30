import { NextResponse } from 'next/server';
import type { Round } from '@/types/round';

// In-memory storage (should match the one in ../route.ts in production)
let rounds: Round[] = [];

// GET single round by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const round = rounds.find((r) => r._id === id);

  if (!round) {
    return NextResponse.json(
      { success: false, error: 'Round not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: round,
  });
}

// PUT - Update round by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { categoryIds } = body;

    const roundIndex = rounds.findIndex((r) => r._id === id);

    if (roundIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Round not found' },
        { status: 404 }
      );
    }

    if (categoryIds !== undefined) rounds[roundIndex].categoryIds = categoryIds;

    return NextResponse.json({
      success: true,
      data: rounds[roundIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE round by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roundIndex = rounds.findIndex((r) => r._id === id);

  if (roundIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Round not found' },
      { status: 404 }
    );
  }

  const deletedRound = rounds.splice(roundIndex, 1)[0];

  return NextResponse.json({
    success: true,
    data: deletedRound,
    message: 'Round deleted successfully',
  });
}

