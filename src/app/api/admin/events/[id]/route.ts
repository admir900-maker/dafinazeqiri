import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Category from '@/models/Category';
import { validateAndSanitize } from '@/lib/validation';

// Validation function for event updates
const validateEventUpdate = (data: any) => {
  const errors: Array<{ field: string; message: string }> = [];

  if (data.title && data.title.trim() === '') {
    errors.push({ field: 'title', message: 'Event title cannot be empty' });
  }

  if (data.description && data.description.trim() === '') {
    errors.push({ field: 'description', message: 'Event description cannot be empty' });
  }

  if (data.location && data.location.trim() === '') {
    errors.push({ field: 'location', message: 'Event location cannot be empty' });
  }

  return { isValid: errors.length === 0, errors };
};

// GET /api/admin/events/[id] - Get single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const event = await Event.findById(id)
      .populate('category', 'name slug icon color')
      .lean();

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event
    });

  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch event'
    }, { status: 500 });
  }
}

// PUT /api/admin/events/[id] - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    // Find existing event
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    // Validate update data
    const { data: sanitizedData, validation } = validateAndSanitize(body, validateEventUpdate);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.errors.map(err => `${err.field}: ${err.message}`)
      }, { status: 400 });
    }

    // If category is being changed, verify it exists
    if (sanitizedData.category && sanitizedData.category !== existingEvent.category.toString()) {
      const category = await Category.findById(sanitizedData.category);
      if (!category) {
        return NextResponse.json({
          success: false,
          error: 'Invalid category'
        }, { status: 400 });
      }

      // Update category event counts
      await Promise.all([
        Category.findByIdAndUpdate(existingEvent.category, { $inc: { eventCount: -1 } }),
        Category.findByIdAndUpdate(sanitizedData.category, { $inc: { eventCount: 1 } })
      ]);
    }

    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { ...sanitizedData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('category', 'name slug icon color');

    return NextResponse.json({
      success: true,
      event: updatedEvent
    });

  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update event'
    }, { status: 500 });
  }
}

// DELETE /api/admin/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    // Find event to get category
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    // TODO: Check if event has bookings and handle appropriately
    // For now, we'll allow deletion

    // Delete event
    await Event.findByIdAndDelete(id);

    // Update category event count
    await Category.findByIdAndUpdate(event.category, {
      $inc: { eventCount: -1 }
    });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete event'
    }, { status: 500 });
  }
}