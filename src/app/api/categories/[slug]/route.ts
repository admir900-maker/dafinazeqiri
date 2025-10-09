import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/models/Category';
import Event from '@/models/Event';
import { validateAndSanitize } from '@/lib/validation';
import { logApiError } from '@/lib/errorLogger';

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

// GET /api/categories/[slug] - Get single category by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    const category = await Category.findOne({ slug, isActive: true });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get events in this category
    const { searchParams } = new URL(request.url);
    const includeEvents = searchParams.get('includeEvents') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    let events: any[] = [];
    let totalEvents = 0;

    if (includeEvents) {
      const skip = (page - 1) * limit;

      [events, totalEvents] = await Promise.all([
        Event.find({
          category: category._id,
          date: { $gte: new Date() }
        })
          .sort({ date: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Event.countDocuments({
          category: category._id,
          date: { $gte: new Date() }
        })
      ]);
    }

    const result = {
      ...category.toObject(),
      events: includeEvents ? events : undefined,
      pagination: includeEvents ? {
        page,
        limit,
        total: totalEvents,
        pages: Math.ceil(totalEvents / limit)
      } : undefined
    };

    return NextResponse.json(result);
  } catch (error: any) {
    logApiError('Error fetching category', error, `/api/categories/${(await params).slug}`, undefined, 'get-category');
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PUT /api/categories/[slug] - Update category (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let userId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    userId = authUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { slug } = await params;
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

    // Check for duplicate slug if slug is being changed
    if (sanitizedData.slug && sanitizedData.slug !== slug) {
      const existingCategory = await Category.findOne({ slug: sanitizedData.slug });
      if (existingCategory) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const category = await Category.findOneAndUpdate(
      { slug },
      sanitizedData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: any) {
    logApiError('Error updating category', error, `/api/categories/${(await params).slug}`, userId || undefined, 'update-category');
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/categories/[slug] - Delete category (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let userId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    userId = authUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { slug } = await params;

    // Check if category has events
    const category = await Category.findOne({ slug });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const eventCount = await Event.countDocuments({ category: category._id });
    if (eventCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete category with existing events',
          eventCount
        },
        { status: 400 }
      );
    }

    await Category.findOneAndDelete({ slug });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    logApiError('Error deleting category', error, `/api/categories/${(await params).slug}`, userId || undefined, 'delete-category');
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}