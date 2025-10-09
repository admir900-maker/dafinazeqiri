import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/models/Category';
import Event from '@/models/Event';
import { validateAndSanitize } from '@/lib/validation';
import { logError, logApiError } from '@/lib/errorLogger';

// Validation function for category data
const validateCategory = (data: any) => {
  const errors: Array<{ field: string; message: string }> = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({ field: 'name', message: 'Category name is required' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Category name must be less than 100 characters' });
  }

  if (data.description && data.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
  }

  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push({ field: 'slug', message: 'Slug can only contain lowercase letters, numbers, and hyphens' });
  }

  if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    errors.push({ field: 'color', message: 'Color must be a valid hex color code' });
  }

  if (data.sortOrder !== undefined && (isNaN(data.sortOrder) || data.sortOrder < 0)) {
    errors.push({ field: 'sortOrder', message: 'Sort order must be a non-negative number' });
  }

  return { isValid: errors.length === 0, errors };
};

// GET /api/categories - Get all categories
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const updateCounts = searchParams.get('updateCounts') === 'true';

    // Build query
    const query = includeInactive ? {} : { isActive: true };

    // Get categories
    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Update event counts if requested (useful for admin)
    if (updateCounts) {
      for (const category of categories) {
        const eventCount = await Event.countDocuments({
          category: category._id,
          date: { $gte: new Date() }
        });

        if (eventCount !== category.eventCount) {
          await Category.findByIdAndUpdate(category._id, { eventCount });
          category.eventCount = eventCount;
        }
      }
    }

    return NextResponse.json(categories);
  } catch (error: any) {
    logApiError('Error fetching categories', error, '/api/categories', undefined, 'get-categories');
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories - Create new category (Admin only)
export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    userId = authUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check
    // For now, allowing any authenticated user

    await connectToDatabase();
    const body = await request.json();

    // Validate category data
    const { data: sanitizedData, validation } = validateAndSanitize(body, validateCategory);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors.map(err => `${err.field}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    if (sanitizedData.slug) {
      const existingCategory = await Category.findOne({ slug: sanitizedData.slug });
      if (existingCategory) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Create category
    const category = new Category(sanitizedData);
    await category.save();

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    logApiError('Error creating category', error, '/api/categories', userId || undefined, 'create-category');
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}