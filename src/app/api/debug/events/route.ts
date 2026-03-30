import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import { isUserAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    const admin = await isUserAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('🔍 DEBUG: Connecting to database...');
    await connectToDatabase();
    console.log('✅ DEBUG: Database connected');

    // Get all events - just IDs and titles
    const events = await Event.find({}).select('_id title date').lean();
    console.log('📊 DEBUG: Found events:', events.length);

    return NextResponse.json({
      success: true,
      count: events.length,
      events: events.map((e: any) => ({
        id: e._id?.toString() || 'unknown',
        title: e.title || 'No title',
        date: e.date || 'No date'
      })),
      message: 'This is a debug endpoint showing all events in the database'
    });
  } catch (error: any) {
    console.error('❌ DEBUG ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal error'
    }, { status: 500 });
  }
}
