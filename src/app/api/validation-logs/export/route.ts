import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import ValidationLog from '@/models/ValidationLog';

// GET /api/validation-logs/export - Export validation logs as CSV
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const validatorId = searchParams.get('validatorId');
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');
    const validationType = searchParams.get('validationType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = {};

    if (validatorId) {
      query.validatorId = validatorId;
    }

    if (eventId) {
      query.eventId = eventId;
    }

    if (status) {
      query.status = status;
    }

    if (validationType) {
      query.validationType = validationType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get validation logs
    const logs = await ValidationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(5000) // Limit for performance
      .lean();

    // Generate CSV
    const csvHeaders = [
      'Date',
      'Time',
      'Event',
      'Customer',
      'Validator',
      'Type',
      'Status',
      'Location',
      'Notes',
      'Scan Method',
      'Ticket Type',
      'Quantity'
    ].join(',');

    const csvRows = logs.map(log => {
      const date = new Date(log.createdAt);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        `"${log.eventTitle.replace(/"/g, '""')}"`,
        `"${log.userName.replace(/"/g, '""')}"`,
        `"${log.validatorName.replace(/"/g, '""')}"`,
        log.validationType,
        log.status,
        log.location ? `"${log.location.replace(/"/g, '""')}"` : '',
        log.notes ? `"${log.notes.replace(/"/g, '""')}"` : '',
        log.metadata?.scanMethod || '',
        log.metadata?.ticketType ? `"${log.metadata.ticketType.replace(/"/g, '""')}"` : '',
        log.metadata?.ticketQuantity || ''
      ].join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Generate filename
    const now = new Date();
    const filename = `validation-logs-${now.toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting validation logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export validation logs'
    }, { status: 500 });
  }
}