import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const booking = await Booking.findById(id).populate('eventId');

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);

  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const body = await request.json();
    const {
      status,
      paymentStatus,
      customerEmail,
      customerName,
      notes
    } = body;

    // Find existing booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (status) {
      booking.status = status;
      if (status === 'confirmed' && !booking.confirmedAt) {
        booking.confirmedAt = new Date();
      }
    }

    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid' && !booking.paymentDate) {
        booking.paymentDate = new Date();
      }
    }

    if (customerEmail) booking.customerEmail = customerEmail;
    if (customerName) booking.customerName = customerName;
    if (notes !== undefined) booking.notes = notes;

    await booking.save();

    // Populate event details
    await booking.populate('eventId');

    return NextResponse.json(booking);

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Instead of hard delete, mark as cancelled
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    booking.notes = booking.notes
      ? `${booking.notes}\n\nCancelled by admin on ${new Date().toISOString()}`
      : `Cancelled by admin on ${new Date().toISOString()}`;

    await booking.save();

    return NextResponse.json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}