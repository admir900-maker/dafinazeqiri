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

    await connectToDatabase();

    // Get all counts without fetching the full documents
    const totalCount = await GiftTicket.countDocuments({});
    const sentCount = await GiftTicket.countDocuments({ status: 'sent' });
    const validatedCount = await GiftTicket.countDocuments({ isValidated: true });

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount,
        sent: sentCount,
        validated: validatedCount
      }
    });
  } catch (error: any) {
    console.error('[GiftTicket][STATS] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get gift ticket stats' }, { status: 500 });
  }
}
