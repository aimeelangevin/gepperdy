import { NextResponse } from 'next/server';
import type { Question } from '@/types/question';

// In-memory storage (should match the one in ../route.ts in production)
let questions: Question[] = [];

// GET single question by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = questions.find((q) => q._id === id);

  if (!question) {
    return NextResponse.json(
      { success: false, error: 'Question not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: question,
  });
}

// PUT - Update question by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, imageUrl, audioUrl, answer, isDailyDouble, points } = body;

    const questionIndex = questions.findIndex((q) => q._id === id);

    if (questionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    if (text !== undefined) questions[questionIndex].text = text;
    if (imageUrl !== undefined) questions[questionIndex].imageUrl = imageUrl;
    if (audioUrl !== undefined) questions[questionIndex].audioUrl = audioUrl;
    if (answer !== undefined) questions[questionIndex].answer = answer;
    if (isDailyDouble !== undefined)
      questions[questionIndex].isDailyDouble = isDailyDouble;
    if (points !== undefined) questions[questionIndex].points = points;

    return NextResponse.json({
      success: true,
      data: questions[questionIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE question by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const questionIndex = questions.findIndex((q) => q._id === id);

  if (questionIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Question not found' },
      { status: 404 }
    );
  }

  const deletedQuestion = questions.splice(questionIndex, 1)[0];

  return NextResponse.json({
    success: true,
    data: deletedQuestion,
    message: 'Question deleted successfully',
  });
}

