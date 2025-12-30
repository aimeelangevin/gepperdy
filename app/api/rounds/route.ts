import { NextResponse } from 'next/server';
import type { Round } from '@/types/round';

// In-memory storage (replace with a real database in production)
let rounds: Round[] = [];

// GET all rounds
export async function GET() {
  return NextResponse.json({
    success: true,
    data: rounds,
  });
}

// POST - Create a new round
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoryIds } = body;

    const newRound: Round = {
      _id: crypto.randomUUID(),
      categoryIds: categoryIds || [],
    };

    rounds.push(newRound);

    return NextResponse.json(
      { success: true, data: newRound },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

