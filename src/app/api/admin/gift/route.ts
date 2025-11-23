import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import GiftTicket from '@/models/GiftTicket';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isUserAdmin())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam === 'all' ? 0 : parseInt(limitParam || '50', 10);

    await connectToDatabase();
    const query = GiftTicket.find({}).sort({ createdAt: -1 });
    if (limit > 0) query.limit(limit);
    const tickets = await query.lean();

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    console.error('[GiftTicket][GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list gift tickets' }, { status: 500 });
  }
}