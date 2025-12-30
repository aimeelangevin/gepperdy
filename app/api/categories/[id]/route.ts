import { NextResponse } from 'next/server';
import type { Category } from '@/types/category';

// In-memory storage (should match the one in ../route.ts in production)
let categories: Category[] = [];

// GET single category by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const category = categories.find((c) => c._id === id);

  if (!category) {
    return NextResponse.json(
      { success: false, error: 'Category not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: category,
  });
}

// PUT - Update category by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, questionIds } = body;

    const categoryIndex = categories.findIndex((c) => c._id === id);

    if (categoryIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    if (name !== undefined) categories[categoryIndex].name = name;
    if (questionIds !== undefined)
      categories[categoryIndex].questionIds = questionIds;

    return NextResponse.json({
      success: true,
      data: categories[categoryIndex],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE category by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryIndex = categories.findIndex((c) => c._id === id);

  if (categoryIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Category not found' },
      { status: 404 }
    );
  }

  const deletedCategory = categories.splice(categoryIndex, 1)[0];

  return NextResponse.json({
    success: true,
    data: deletedCategory,
    message: 'Category deleted successfully',
  });
}

