import { NextResponse } from 'next/server';
import type { Question } from '@/types/question';

// In-memory storage (replace with a real database in production)
let questions: Question[] = [];

// GET all questions
export async function GET() {
  return NextResponse.json({
    success: true,
    data: questions,
  });
}

// POST - Create a new question
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, imageUrl, audioUrl, answer, isDailyDouble, points } = body;

    if (!answer || points === undefined) {
      return NextResponse.json(
        { success: false, error: 'Answer and points are required' },
        { status: 400 }
      );
    }

    const newQuestion: Question = {
      _id: crypto.randomUUID(),
      text,
      imageUrl,
      audioUrl,
      answer,
      isDailyDouble: isDailyDouble || false,
      points,
    };

    questions.push(newQuestion);

    return NextResponse.json(
      { success: true, data: newQuestion },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

