import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Connecting to database...');
    await connectToDatabase();
    console.log('✅ DEBUG: Database connected');

    // Get all events - just IDs and titles
    const events = await Event.find({}).select('_id title date').lean();
    console.log('📊 DEBUG: Found events:', events.length);

    return NextResponse.json({
      success: true,
      count: events.length,
      events: events.map(e => ({
        id: e._id.toString(),
        title: e.title,
        date: e.date
      })),
      message: 'This is a debug endpoint showing all events in the database'
    });
  } catch (error: any) {
    console.error('❌ DEBUG ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
