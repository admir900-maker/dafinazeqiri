import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AdminNavigation } from '@/components/admin/AdminNavigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || !user.publicMetadata?.role || user.publicMetadata.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen main-background flex">
      <AdminNavigation />
      <main className="flex-1 p-6 main-content overflow-auto">
        <div className="admin-content p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
