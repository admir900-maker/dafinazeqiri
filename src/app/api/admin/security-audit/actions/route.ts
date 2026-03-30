import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import UserActivity from '@/models/UserActivity';

// POST /api/admin/security-audit/actions — Block user or clean fraudulent data
export async function POST(request: NextRequest) {
  try {
    const { userId: adminId } = await auth();
    if (!adminId || !(await isUserAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { action, targetUserId, bookingId, threatId } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    const results: string[] = [];
    const client = await clerkClient();

    switch (action) {
      case 'block_user': {
        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
        }

        try {
          // Ban user via Clerk
          await client.users.banUser(targetUserId);
          results.push(`User ${targetUserId} banned via Clerk`);

          // Remove admin role if they have it
          const user = await client.users.getUser(targetUserId);
          if (user.publicMetadata?.role === 'admin') {
            const newMeta = { ...(user.publicMetadata as Record<string, any>), role: 'user', blockedByAudit: true, blockedAt: new Date().toISOString() };
            await client.users.updateUserMetadata(targetUserId, { publicMetadata: newMeta });
            results.push(`Admin role removed from ${targetUserId}`);
          }
        } catch (e: any) {
          results.push(`Failed to ban user: ${e.message}`);
        }

        // Log the action
        await UserActivity.create({
          userId: adminId,
          action: 'admin_action',
          description: `Security audit: Blocked user ${targetUserId}`,
          status: 'success',
          metadata: { targetUserId, threatId },
        });

        break;
      }

      case 'clean_bookings': {
        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
        }

        // Cancel all suspicious bookings for this user (raiffeisen with no transaction ID)
        const cancelResult = await Booking.updateMany(
          {
            userId: targetUserId,
            paymentMethod: 'raiffeisen',
            paymentStatus: 'paid',
            $or: [
              { raiffeisenTransactionId: { $exists: false } },
              { raiffeisenTransactionId: null },
              { raiffeisenTransactionId: '' },
            ]
          },
          {
            $set: {
              status: 'cancelled',
              paymentStatus: 'failed',
              metadata: { cancelledByAudit: true, cancelledAt: new Date().toISOString(), cancelledBy: adminId }
            }
          }
        );
        results.push(`Cancelled ${cancelResult.modifiedCount} suspicious booking(s)`);

        // Also cancel zero-amount bookings for paid events
        const zeroCancelResult = await Booking.updateMany(
          {
            userId: targetUserId,
            totalAmount: { $lte: 0 },
            status: 'confirmed',
            paymentStatus: 'paid',
          },
          {
            $set: {
              status: 'cancelled',
              paymentStatus: 'failed',
              metadata: { cancelledByAudit: true, reason: 'zero_amount_fraud', cancelledAt: new Date().toISOString(), cancelledBy: adminId }
            }
          }
        );
        results.push(`Cancelled ${zeroCancelResult.modifiedCount} zero-amount booking(s)`);

        // Log the action
        await UserActivity.create({
          userId: adminId,
          action: 'admin_action',
          description: `Security audit: Cleaned bookings for user ${targetUserId}`,
          status: 'success',
          metadata: { targetUserId, cleanedBookings: cancelResult.modifiedCount + zeroCancelResult.modifiedCount, threatId },
        });

        break;
      }

      case 'clean_tickets': {
        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
        }

        // Find orphan tickets for this user
        const userTickets = await Ticket.find({ userId: targetUserId }).lean();
        const userBookings = await Booking.find({ userId: targetUserId }, 'tickets.qrCode').lean();

        const bookingQRs = new Set<string>();
        for (const b of userBookings) {
          for (const t of b.tickets || []) {
            bookingQRs.add(t.qrCode);
          }
        }

        const orphanIds = userTickets
          .filter(t => !bookingQRs.has(t.qrCode))
          .map(t => t._id);

        if (orphanIds.length > 0) {
          const deleteResult = await Ticket.deleteMany({ _id: { $in: orphanIds } });
          results.push(`Deleted ${deleteResult.deletedCount} orphan ticket(s)`);
        } else {
          results.push('No orphan tickets found');
        }

        // Log
        await UserActivity.create({
          userId: adminId,
          action: 'admin_action',
          description: `Security audit: Cleaned orphan tickets for user ${targetUserId}`,
          status: 'success',
          metadata: { targetUserId, deletedTickets: orphanIds.length, threatId },
        });

        break;
      }

      case 'cancel_booking': {
        if (!bookingId) {
          return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
        }

        const booking = await Booking.findByIdAndUpdate(bookingId, {
          $set: {
            status: 'cancelled',
            paymentStatus: 'failed',
            metadata: { cancelledByAudit: true, cancelledAt: new Date().toISOString(), cancelledBy: adminId }
          }
        });

        if (booking) {
          results.push(`Cancelled booking ${booking.bookingReference}`);
          // Also invalidate related tickets
          for (const t of booking.tickets || []) {
            if (t.qrCode) {
              await Ticket.updateOne({ qrCode: t.qrCode }, { $set: { isValidated: true, validatedAt: new Date() } });
            }
          }
          results.push('Related tickets invalidated');
        } else {
          results.push('Booking not found');
        }

        await UserActivity.create({
          userId: adminId,
          action: 'admin_action',
          description: `Security audit: Cancelled booking ${bookingId}`,
          status: 'success',
          metadata: { bookingId, threatId },
        });

        break;
      }

      case 'remove_admin': {
        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
        }

        try {
          const user = await client.users.getUser(targetUserId);
          if (user.publicMetadata?.role === 'admin') {
            const newMeta = { ...(user.publicMetadata as Record<string, any>), role: 'user', demotedByAudit: true, demotedAt: new Date().toISOString() };
            await client.users.updateUserMetadata(targetUserId, { publicMetadata: newMeta });
            results.push(`Admin role removed from ${targetUserId}`);
          } else {
            results.push('User is not an admin');
          }
        } catch (e: any) {
          results.push(`Failed: ${e.message}`);
        }

        await UserActivity.create({
          userId: adminId,
          action: 'admin_action',
          description: `Security audit: Removed admin role from ${targetUserId}`,
          status: 'success',
          metadata: { targetUserId, threatId },
        });

        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, results });
  } catch (error) {
    console.error('Security action error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
