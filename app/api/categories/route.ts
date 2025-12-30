import { NextResponse } from 'next/server';
import type { Category } from '@/types/category';

// In-memory storage (replace with a real database in production)
let categories: Category[] = [];

// GET all categories
export async function GET() {
  return NextResponse.json({
    success: true,
    data: categories,
  });
}

// POST - Create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, questionIds } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const newCategory: Category = {
      _id: crypto.randomUUID(),
      name,
      questionIds: questionIds || [],
    };

    categories.push(newCategory);

    return NextResponse.json(
      { success: true, data: newCategory },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

