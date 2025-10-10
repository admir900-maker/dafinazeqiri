import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Favorite from '@/models/Favorite';
import Event from '@/models/Event';

// GET /api/favorites - Get user's favorite events
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get user's favorites with event details
    const favorites = await Favorite.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const eventIds = favorites.map(fav => fav.eventId);

    // Get event details for favorited events
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('title description date venue location price posterImage bannerImage category tickets isActive')
      .lean();

    // Combine favorites with event data
    const favoritesWithEvents = favorites.map(favorite => {
      const event = events.find(e => String(e._id) === favorite.eventId);
      return {
        favoriteId: favorite._id,
        eventId: favorite.eventId,
        addedAt: favorite.createdAt,
        event
      };
    }).filter(fav => fav.event); // Filter out favorites for deleted events

    const totalCount = await Favorite.countDocuments({ userId });
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        favorites: favoritesWithEvents,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasMore: page < totalPages,
          limit
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch favorites'
    }, { status: 500 });
  }
}

// POST /api/favorites - Add event to favorites
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ userId, eventId });
    if (existingFavorite) {
      return NextResponse.json({
        success: false,
        error: 'Event already in favorites'
      }, { status: 400 });
    }

    // Create favorite
    const favorite = new Favorite({
      userId,
      eventId
    });

    await favorite.save();

    return NextResponse.json({
      success: true,
      message: 'Event added to favorites',
      data: {
        favoriteId: favorite._id,
        eventId,
        addedAt: favorite.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error adding to favorites:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'Event already in favorites'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to add to favorites'
    }, { status: 500 });
  }
}

// DELETE /api/favorites - Remove event from favorites
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Remove favorite
    const result = await Favorite.findOneAndDelete({ userId, eventId });

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Favorite not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Event removed from favorites'
    });

  } catch (error: any) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove from favorites'
    }, { status: 500 });
  }
}