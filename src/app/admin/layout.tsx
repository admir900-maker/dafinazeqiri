import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || !user.publicMetadata?.role || user.publicMetadata.role !== 'admin') {
    redirect('/');
  }
  return (
    <div className="min-h-screen main-background">
      <header className="border-b border-white/30 p-4 text-xl font-bold text-white bg-white/20 backdrop-blur-sm">Admin Panel</header>
      <main className="p-8 main-content">{children}</main>
    </div>
  );
}
