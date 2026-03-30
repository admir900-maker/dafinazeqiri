import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import UserActivity from '@/models/UserActivity';
import GiftTicket from '@/models/GiftTicket';

// GET /api/admin/security-audit — Analyze for exploitation attempts
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId || !(await isUserAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    const client = await clerkClient();

    const threats: any[] = [];
    const suspiciousUsers = new Map<string, any>();

    // Helper to collect info about a suspicious user
    const trackUser = (userId: string, info: any) => {
      if (!suspiciousUsers.has(userId)) {
        suspiciousUsers.set(userId, {
          userId,
          emails: new Set(),
          names: new Set(),
          ips: new Set(),
          userAgents: new Set(),
          countries: new Set(),
          cities: new Set(),
          actions: [],
          threatCount: 0,
        });
      }
      const u = suspiciousUsers.get(userId)!;
      if (info.email) u.emails.add(info.email);
      if (info.name) u.names.add(info.name);
      if (info.ip) u.ips.add(info.ip);
      if (info.userAgent) u.userAgents.add(info.userAgent);
      if (info.country) u.countries.add(info.country);
      if (info.city) u.cities.add(info.city);
      u.threatCount++;
    };

    // ═══════════════════════════════════════════════════
    // 1. PRIVILEGE ESCALATION DETECTION
    // Check for non-admin users who previously used the promote endpoint
    // ═══════════════════════════════════════════════════
    const promoteActivities = await UserActivity.find({
      $or: [
        { action: 'admin_action', description: { $regex: /promot/i } },
        { action: 'role_change' },
        { description: { $regex: /role|promote|admin/i } },
      ]
    }).sort({ createdAt: -1 }).lean();

    // Also check ALL users' roles via Clerk to find unexpected admins
    try {
      const allUsers = await client.users.getUserList({ limit: 200 });
      const adminUsers = allUsers.data.filter(u => u.publicMetadata?.role === 'admin');

      // Flag admins created recently or with suspicious metadata
      for (const admin of adminUsers) {
        const createdAt = new Date(admin.createdAt);
        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        // Check if this admin has any suspicious activity
        const adminActivity = await UserActivity.find({ userId: admin.id })
          .sort({ createdAt: -1 }).limit(50).lean();

        const hasPromoteActivity = promoteActivities.some(a => a.userId === admin.id);

        if (hasPromoteActivity || daysSinceCreation < 7) {
          threats.push({
            id: `priv-${admin.id}`,
            type: 'privilege_escalation',
            severity: 'critical',
            title: 'Potential Privilege Escalation',
            description: `User "${admin.emailAddresses?.[0]?.emailAddress || admin.id}" has admin role. ${hasPromoteActivity ? 'Found promote activity in logs.' : ''} ${daysSinceCreation < 7 ? `Account created only ${Math.round(daysSinceCreation)} days ago.` : ''}`,
            userId: admin.id,
            email: admin.emailAddresses?.[0]?.emailAddress,
            name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
            createdAt: createdAt.toISOString(),
            evidence: adminActivity.slice(0, 10).map(a => ({
              action: a.action,
              description: a.description,
              ip: a.ipAddress,
              userAgent: a.userAgent,
              country: a.country,
              city: a.city,
              timestamp: a.createdAt,
            })),
          });

          trackUser(admin.id, {
            email: admin.emailAddresses?.[0]?.emailAddress,
            name: `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
          });
        }
      }
    } catch (e) {
      console.error('Error checking Clerk users:', e);
    }

    // ═══════════════════════════════════════════════════
    // 1b. ROLE CHANGE FORENSICS
    // Detect all role changes logged in UserActivity
    // ═══════════════════════════════════════════════════
    const roleChangeActivities = await UserActivity.find({
      action: 'admin_action',
      'metadata.action': 'role_change',
    }).sort({ createdAt: -1 }).limit(100).lean();

    for (const activity of roleChangeActivities) {
      const meta = activity.metadata as any;
      const isEscalation = meta?.newRole === 'admin';
      threats.push({
        id: `role-${activity._id}`,
        type: isEscalation ? 'privilege_escalation' : 'role_change',
        severity: isEscalation ? 'critical' : 'medium',
        title: isEscalation ? 'Admin Role Granted' : 'User Role Changed',
        description: `Admin "${activity.userId}" changed role of "${meta?.targetEmail || meta?.targetUserId}" from "${meta?.previousRole || 'user'}" to "${meta?.newRole || 'user'}" on ${new Date(activity.createdAt).toLocaleString()}.`,
        userId: meta?.targetUserId,
        email: meta?.targetEmail,
        name: meta?.targetName,
        changedBy: activity.userId,
        previousRole: meta?.previousRole,
        newRole: meta?.newRole,
        createdAt: activity.createdAt,
        evidence: [{
          action: 'role_change',
          description: activity.description,
          ip: activity.ipAddress,
          userAgent: activity.userAgent,
          country: activity.country,
          city: activity.city,
          timestamp: activity.createdAt,
        }],
      });

      if (meta?.targetUserId) {
        trackUser(meta.targetUserId, {
          email: meta?.targetEmail,
          name: meta?.targetName,
        });
      }
    }

    // Also detect bulk role changes
    const bulkRoleChanges = await UserActivity.find({
      action: 'admin_action',
      'metadata.bulkAction': 'updateRole',
    }).sort({ createdAt: -1 }).limit(50).lean();

    for (const activity of bulkRoleChanges) {
      const meta = activity.metadata as any;
      threats.push({
        id: `bulk-role-${activity._id}`,
        type: 'role_change',
        severity: meta?.role === 'admin' ? 'critical' : 'high',
        title: 'Bulk Role Change Detected',
        description: `Admin "${activity.userId}" performed bulk role change to "${meta?.role}" affecting ${meta?.targetUserIds?.length || 0} users. ${meta?.successCount || 0} successful, ${meta?.errorCount || 0} failed.`,
        changedBy: activity.userId,
        newRole: meta?.role,
        affectedUsers: meta?.targetUserIds?.length || 0,
        targetUserIds: meta?.targetUserIds,
        createdAt: activity.createdAt,
        evidence: [{
          action: 'bulk_role_change',
          description: activity.description,
          ip: activity.ipAddress,
          timestamp: activity.createdAt,
        }],
      });
    }

    // ═══════════════════════════════════════════════════
    // 2. PAYMENT FRAUD DETECTION
    // Bookings confirmed as paid via raiffeisen without a proper transactionId
    // ═══════════════════════════════════════════════════
    const suspiciousBookings = await Booking.find({
      paymentMethod: 'raiffeisen',
      paymentStatus: 'paid',
      status: 'confirmed',
      $or: [
        { raiffeisenTransactionId: { $exists: false } },
        { raiffeisenTransactionId: null },
        { raiffeisenTransactionId: '' },
      ]
    }).populate('eventId', 'title date').lean();

    for (const booking of suspiciousBookings) {
      // Get the user's activity around the booking time
      const windowStart = new Date(booking.createdAt.getTime() - 10 * 60 * 1000);
      const windowEnd = new Date(booking.createdAt.getTime() + 30 * 60 * 1000);

      const relatedActivity = await UserActivity.find({
        userId: booking.userId,
        createdAt: { $gte: windowStart, $lte: windowEnd }
      }).sort({ createdAt: 1 }).lean();

      threats.push({
        id: `pay-${booking._id}`,
        type: 'payment_fraud',
        severity: 'critical',
        title: 'Suspicious Payment Confirmation',
        description: `Booking "${booking.bookingReference}" confirmed as paid (€${booking.totalAmount}) via Raiffeisen but has NO transaction ID. This could indicate the confirm-payment endpoint was exploited to bypass payment.`,
        userId: booking.userId,
        email: booking.customerEmail,
        name: booking.customerName,
        bookingId: booking._id?.toString(),
        bookingReference: booking.bookingReference,
        amount: booking.totalAmount,
        currency: booking.currency,
        eventTitle: (booking as any).eventId?.title || 'Unknown',
        createdAt: booking.createdAt,
        confirmedAt: booking.confirmedAt,
        evidence: relatedActivity.map(a => ({
          action: a.action,
          description: a.description,
          ip: a.ipAddress,
          userAgent: a.userAgent,
          country: a.country,
          city: a.city,
          timestamp: a.createdAt,
        })),
      });

      trackUser(booking.userId, {
        email: booking.customerEmail,
        name: booking.customerName,
        ip: relatedActivity[0]?.ipAddress,
        userAgent: relatedActivity[0]?.userAgent,
        country: relatedActivity[0]?.country,
        city: relatedActivity[0]?.city,
      });
    }

    // ═══════════════════════════════════════════════════
    // 3. ORPHAN TICKET DETECTION
    // Tickets in Ticket collection not linked to any booking
    // (created via mass assignment vulnerability)
    // ═══════════════════════════════════════════════════
    const allTickets = await Ticket.find({}).lean();
    const allBookingQRs = new Set<string>();

    const allBookings = await Booking.find({}, 'tickets.qrCode').lean();
    for (const b of allBookings) {
      for (const t of b.tickets || []) {
        allBookingQRs.add(t.qrCode);
      }
    }

    const orphanTickets = allTickets.filter(t => !allBookingQRs.has(t.qrCode));
    if (orphanTickets.length > 0) {
      // Group by userId
      const byUser: Record<string, any[]> = {};
      for (const t of orphanTickets) {
        if (!byUser[t.userId]) byUser[t.userId] = [];
        byUser[t.userId].push(t);
      }

      for (const [uid, tickets] of Object.entries(byUser)) {
        const userActivity = await UserActivity.find({ userId: uid })
          .sort({ createdAt: -1 }).limit(20).lean();

        threats.push({
          id: `ticket-${uid}`,
          type: 'ticket_fraud',
          severity: 'high',
          title: 'Orphan Tickets Detected (Mass Assignment)',
          description: `${tickets.length} ticket(s) created by user "${uid}" that do NOT belong to any booking. These may have been created via the /api/tickets mass assignment vulnerability to get free tickets.`,
          userId: uid,
          ticketCount: tickets.length,
          tickets: tickets.map(t => ({
            id: t._id?.toString(),
            qrCode: t.qrCode,
            eventId: t.eventId?.toString(),
            isValidated: t.isValidated,
            createdAt: t.createdAt,
          })),
          evidence: userActivity.slice(0, 10).map(a => ({
            action: a.action,
            description: a.description,
            ip: a.ipAddress,
            userAgent: a.userAgent,
            country: a.country,
            city: a.city,
            timestamp: a.createdAt,
          })),
        });

        const firstActivity = userActivity[0];
        trackUser(uid, {
          email: firstActivity?.userEmail,
          name: firstActivity?.userName,
          ip: firstActivity?.ipAddress,
          userAgent: firstActivity?.userAgent,
          country: firstActivity?.country,
          city: firstActivity?.city,
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // 3b. GIFT TICKET FORENSICS
    // Detect suspicious gift ticket creation patterns
    // ═══════════════════════════════════════════════════
    const allGiftTickets = await GiftTicket.find({}).sort({ createdAt: -1 }).lean();

    // Group gift tickets by adminUserId to find bulk creators
    const giftsByAdmin: Record<string, any[]> = {};
    for (const gt of allGiftTickets) {
      const adminId = gt.adminUserId || 'unknown';
      if (!giftsByAdmin[adminId]) giftsByAdmin[adminId] = [];
      giftsByAdmin[adminId].push(gt);
    }

    // Flag suspicious gift patterns
    for (const [adminId, gifts] of Object.entries(giftsByAdmin)) {
      // Get unique recipients
      const recipients = new Set(gifts.map(g => g.recipientEmail));
      const totalValue = gifts.reduce((sum, g) => sum + (g.price || 0), 0);

      // Flag if: high volume, high value, or recently created in bulk
      const last7Days = gifts.filter(g => Date.now() - new Date(g.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);

      if (gifts.length >= 5 || totalValue > 500 || last7Days.length >= 3) {
        threats.push({
          id: `gift-${adminId}`,
          type: 'ticket_fraud',
          severity: gifts.length >= 20 || totalValue > 2000 ? 'critical' : last7Days.length >= 3 ? 'high' : 'medium',
          title: 'Suspicious Gift Ticket Activity',
          description: `Admin "${adminId}" created ${gifts.length} gift ticket(s) worth €${totalValue.toFixed(2)} total, sent to ${recipients.size} unique recipient(s). ${last7Days.length} created in last 7 days.`,
          userId: adminId,
          giftCount: gifts.length,
          totalValue,
          uniqueRecipients: recipients.size,
          recentCount: last7Days.length,
          recipients: Array.from(recipients),
          evidence: gifts.slice(0, 15).map(g => ({
            action: 'gift_ticket_created',
            description: `${g.ticketType} for "${g.recipientEmail}" (${g.customerName}) — ${g.eventTitle} — €${g.price} — Status: ${g.status}`,
            ip: '',
            timestamp: g.createdAt,
          })),
        });

        trackUser(adminId, { name: `Admin ${adminId}` });
      }
    }

    // Also list ALL gift tickets as evidence for review
    if (allGiftTickets.length > 0) {
      threats.push({
        id: 'gift-all',
        type: 'ticket_fraud',
        severity: 'low',
        title: `All Gift Tickets (${allGiftTickets.length} total)`,
        description: `Complete list of all ${allGiftTickets.length} gift ticket(s) for forensic review. Total value: €${allGiftTickets.reduce((s, g) => s + (g.price || 0), 0).toFixed(2)}.`,
        giftCount: allGiftTickets.length,
        evidence: allGiftTickets.map(g => ({
          action: 'gift_ticket',
          description: `[${g.ticketId}] ${g.ticketType} → ${g.recipientEmail} (${g.customerName}) | ${g.eventTitle} ${new Date(g.eventDate).toLocaleDateString()} | €${g.price} | Status: ${g.status} | Validated: ${g.isValidated ? 'YES' : 'No'}`,
          ip: g.adminUserId || '',
          timestamp: g.createdAt,
        })),
      });
    }

    // ═══════════════════════════════════════════════════
    // 4. BRUTE FORCE / SCANNING DETECTION
    // Users with excessive failed actions or rapid-fire requests
    // ═══════════════════════════════════════════════════
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const failedActivity = await UserActivity.aggregate([
      {
        $match: {
          status: 'failed',
          createdAt: { $gte: last30Days },
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          ips: { $addToSet: '$ipAddress' },
          userAgents: { $addToSet: '$userAgent' },
          emails: { $addToSet: '$userEmail' },
          names: { $addToSet: '$userName' },
          countries: { $addToSet: '$country' },
          cities: { $addToSet: '$city' },
          actions: { $push: { action: '$action', description: '$description', ip: '$ipAddress', timestamp: '$createdAt' } },
          firstSeen: { $min: '$createdAt' },
          lastSeen: { $max: '$createdAt' },
        }
      },
      { $match: { count: { $gte: 10 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    for (const entry of failedActivity) {
      threats.push({
        id: `brute-${entry._id}`,
        type: 'brute_force',
        severity: entry.count > 50 ? 'high' : 'medium',
        title: 'Excessive Failed Requests',
        description: `User "${entry._id}" had ${entry.count} failed actions in the last 30 days from ${entry.ips?.length || 0} IP(s). Could indicate brute-force scanning or exploitation attempts.`,
        userId: entry._id,
        email: entry.emails?.filter(Boolean)[0],
        name: entry.names?.filter(Boolean)[0],
        failedCount: entry.count,
        ips: entry.ips?.filter(Boolean),
        countries: entry.countries?.filter(Boolean),
        firstSeen: entry.firstSeen,
        lastSeen: entry.lastSeen,
        evidence: (entry.actions || []).slice(0, 15).map((a: any) => ({
          action: a.action,
          description: a.description,
          ip: a.ip,
          timestamp: a.timestamp,
        })),
      });

      for (const ip of (entry.ips || []).filter(Boolean)) {
        trackUser(entry._id, {
          email: entry.emails?.filter(Boolean)[0],
          name: entry.names?.filter(Boolean)[0],
          ip,
          country: entry.countries?.filter(Boolean)[0],
          city: entry.cities?.filter(Boolean)[0],
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // 5. SUSPICIOUS IP PATTERN DETECTION
    // Same IP making requests as multiple users
    // ═══════════════════════════════════════════════════
    const ipCrossUser = await UserActivity.aggregate([
      {
        $match: {
          ipAddress: { $exists: true, $nin: [null, 'unknown', ''] },
          createdAt: { $gte: last30Days },
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          userIds: { $addToSet: '$userId' },
          userCount: { $addToSet: '$userId' },
          countries: { $addToSet: '$country' },
          actions: { $sum: 1 },
        }
      },
      {
        $project: {
          _id: 1,
          userIds: 1,
          uniqueUsers: { $size: '$userCount' },
          countries: 1,
          actions: 1,
        }
      },
      { $match: { uniqueUsers: { $gte: 5 } } },
      { $sort: { uniqueUsers: -1 } },
      { $limit: 10 }
    ]);

    for (const entry of ipCrossUser) {
      threats.push({
        id: `ip-${entry._id}`,
        type: 'suspicious_ip',
        severity: 'medium',
        title: 'IP Used by Multiple Accounts',
        description: `IP address "${entry._id}" was used by ${entry.uniqueUsers} different user accounts with ${entry.actions} total requests. Could indicate account enumeration or credential stuffing.`,
        ip: entry._id,
        userIds: entry.userIds,
        uniqueUsers: entry.uniqueUsers,
        totalActions: entry.actions,
        countries: entry.countries?.filter(Boolean),
      });
    }

    // ═══════════════════════════════════════════════════
    // 6. DIRECT/FREE BOOKING ANOMALIES
    // Bookings with $0 amount or 'direct' payment that look suspicious
    // ═══════════════════════════════════════════════════
    const freeBookings = await Booking.find({
      $or: [
        { totalAmount: 0 },
        { totalAmount: { $lt: 0 } },
      ],
      status: 'confirmed',
      paymentStatus: 'paid',
    }).populate('eventId', 'title date ticketTypes').lean();

    for (const booking of freeBookings) {
      // Check if event actually has free tickets
      const event = booking.eventId as any;
      const hasFreeTickets = event?.ticketTypes?.some((t: any) => t.price === 0);

      if (!hasFreeTickets) {
        threats.push({
          id: `free-${booking._id}`,
          type: 'payment_fraud',
          severity: 'high',
          title: 'Free Booking for Paid Event',
          description: `Booking "${booking.bookingReference}" has €0 amount but the event "${event?.title || 'Unknown'}" has no free ticket types. This could indicate price manipulation via mass assignment.`,
          userId: booking.userId,
          email: booking.customerEmail,
          name: booking.customerName,
          bookingId: booking._id?.toString(),
          bookingReference: booking.bookingReference,
          amount: booking.totalAmount,
          eventTitle: event?.title || 'Unknown',
          createdAt: booking.createdAt,
        });

        trackUser(booking.userId, {
          email: booking.customerEmail,
          name: booking.customerName,
        });
      }
    }

    // ═══════════════════════════════════════════════════
    // 7. UNAUTHORIZED ADMIN API ACCESS PATTERNS
    // Activity from anonymous or non-admin users on admin-type actions
    // ═══════════════════════════════════════════════════
    const adminActionPatterns = await UserActivity.find({
      userId: 'anonymous',
      createdAt: { $gte: last30Days },
      $or: [
        { action: { $regex: /admin/i } },
        { description: { $regex: /admin|promote|role|bulk|seed|debug|smtp/i } },
      ]
    }).sort({ createdAt: -1 }).limit(50).lean();

    if (adminActionPatterns.length > 0) {
      threats.push({
        id: 'anon-admin',
        type: 'unauthorized_access',
        severity: 'critical',
        title: 'Anonymous Admin Action Attempts',
        description: `${adminActionPatterns.length} admin-related actions were logged from anonymous/unauthenticated users. These are exploitation attempts against unprotected admin endpoints.`,
        activities: adminActionPatterns.map(a => ({
          action: a.action,
          description: a.description,
          ip: a.ipAddress,
          userAgent: a.userAgent,
          country: a.country,
          city: a.city,
          timestamp: a.createdAt,
        })),
      });
    }

    // ═══════════════════════════════════════════════════
    // Build final suspicious users list (convert Sets to Arrays)
    // ═══════════════════════════════════════════════════
    const suspiciousUsersList = Array.from(suspiciousUsers.values()).map(u => ({
      ...u,
      emails: Array.from(u.emails),
      names: Array.from(u.names),
      ips: Array.from(u.ips),
      userAgents: Array.from(u.userAgents),
      countries: Array.from(u.countries),
      cities: Array.from(u.cities),
    }));

    // Sort threats by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    threats.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalThreats: threats.length,
        critical: threats.filter(t => t.severity === 'critical').length,
        high: threats.filter(t => t.severity === 'high').length,
        medium: threats.filter(t => t.severity === 'medium').length,
        suspiciousUsers: suspiciousUsersList.length,
        fraudulentBookings: suspiciousBookings.length,
        orphanTickets: orphanTickets.length,
      },
      threats,
      suspiciousUsers: suspiciousUsersList,
    });
  } catch (error) {
    console.error('Security audit error:', error);
    return NextResponse.json({ error: 'Security audit failed' }, { status: 500 });
  }
}
