import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import { auth } from '@clerk/nextjs/server';
import { validateAndSanitize, validateEvent } from '@/lib/validation';
import { logError } from '@/lib/errorLogger';

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find({}).sort({ date: 1 });
    return NextResponse.json(events);
  } catch (error: any) {
    logError('Error fetching events', error, { action: 'events-api-get' });
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate and sanitize the event data
    const { data: sanitizedData, validation } = validateAndSanitize(body, validateEvent);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors.map(err => `${err.field}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const event = new Event(sanitizedData);
    await event.save();

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    logError('Error creating event', error, { action: 'events-api-post' });
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
