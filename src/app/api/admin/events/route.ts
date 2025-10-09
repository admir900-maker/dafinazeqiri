import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Category from '@/models/Category';
import { validateAndSanitize } from '@/lib/validation';

// Validation function for event data
const validateEvent = (data: any) => {
  const errors: Array<{ field: string; message: string }> = [];

  if (!data.title || data.title.trim() === '') {
    errors.push({ field: 'title', message: 'Event title is required' });
  }

  if (!data.description || data.description.trim() === '') {
    errors.push({ field: 'description', message: 'Event description is required' });
  }

  if (!data.date) {
    errors.push({ field: 'date', message: 'Event date is required' });
  }

  if (!data.location || data.location.trim() === '') {
    errors.push({ field: 'location', message: 'Event location is required' });
  }

  if (!data.category) {
    errors.push({ field: 'category', message: 'Event category is required' });
  }

  return { isValid: errors.length === 0, errors };
};

// GET /api/admin/events - Get all events for admin
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');

    // Build query
    let query: any = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [events, totalEvents] = await Promise.all([
      Event.find(query)
        .populate('category', 'name slug icon color')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total: totalEvents,
        pages: Math.ceil(totalEvents / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch events'
    }, { status: 500 });
  }
}

// POST /api/admin/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();

    // Validate event data
    const { data: sanitizedData, validation } = validateAndSanitize(body, validateEvent);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors.map(err => `${err.field}: ${err.message}`)
      }, { status: 400 });
    }

    // Verify category exists
    const category = await Category.findById(sanitizedData.category);
    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category'
      }, { status: 400 });
    }

    // Create event
    const event = new Event({
      ...sanitizedData,
      createdBy: userId,
      isActive: sanitizedData.isActive !== false // Default to true
    });

    await event.save();

    // Update category event count
    await Category.findByIdAndUpdate(category._id, {
      $inc: { eventCount: 1 }
    });

    // Populate category for response
    await event.populate('category', 'name slug icon color');

    return NextResponse.json({
      success: true,
      event
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create event'
    }, { status: 500 });
  }
}