'use client';

import { useUser } from '@clerk/nextjs';
import { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardContent } from '@/components/ui/admin-card';

export default function TicketsTestPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Access denied. Please sign in.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Tickets Management</h1>
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Test Page</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
          <p>This is the tickets management page. It will be enhanced with full functionality.</p>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}