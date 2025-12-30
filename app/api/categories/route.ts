import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import CategoryModel from "@/models/Category";
import type { CreateCategoryRequest } from "@/types/api";

// GET all categories
export async function GET() {
  try {
    await connectDB();
    const categories = await CategoryModel.find({}).lean();

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch categories",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: CreateCategoryRequest = await request.json();
    const { name, questionIds } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const newCategory = await CategoryModel.create({
      name,
      questionIds: questionIds || [],
    });

    return NextResponse.json(
      {
        success: true,
        data: newCategory.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create category",
      },
      { status: 400 }
    );
  }
}
