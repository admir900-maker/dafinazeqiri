'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Ticket,
  Settings,
  BarChart3,
  CreditCard,
  Tag,
  BookOpen,
  CheckCircle,
  Activity,
  Mail,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const adminNavItems: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and analytics'
  },
  {
    href: '/admin/events',
    label: 'Events',
    icon: Calendar,
    description: 'Manage events and schedules'
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: Tag,
    description: 'Manage event categories'
  },
  {
    href: '/admin/tickets',
    label: 'Tickets',
    icon: BookOpen,
    description: 'Manage ticket types and pricing'
  },
  {
    href: '/admin/tickets/sales',
    label: 'Sold Tickets',
    icon: Ticket,
    description: 'View sold tickets and resend'
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: Ticket,
    description: 'Manage bookings and tickets'
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
    description: 'User management and roles'
  },
  {
    href: '/admin/validations',
    label: 'Validation Logs',
    icon: CheckCircle,
    description: 'View validation activities'
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Reports and insights'
  },
  {
    href: '/admin/user-activity',
    label: 'User Activity',
    icon: Activity,
    description: 'Monitor user behavior and actions'
  },
  {
    href: '/admin/emails',
    label: 'Email Client',
    icon: Mail,
    description: 'View and reply to emails'
  },
  {
    href: '/admin/payments',
    label: 'Payments',
    icon: CreditCard,
    description: 'Payment settings and methods'
  },
  {
    href: '/admin/payments/reconcile',
    label: 'Reconcile',
    icon: CreditCard,
    description: 'Cross-check RaiAccept vs local'
  },
  {
    href: '/admin/payment-options',
    label: 'Payment Options',
    icon: CreditCard,
    description: 'Configure payment methods'
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    description: 'System configuration'
  }
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">Admin Panel</h1>
        <button
          className="md:hidden text-white/90 hover:text-white"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="space-y-1 md:space-y-2">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/admin/dashboard' && pathname === '/admin');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-lg transition-all duration-200',
                'hover:bg-white/30 hover:text-white hover:shadow-lg backdrop-blur-sm',
                isActive
                  ? 'bg-white/30 text-white border border-white/40 shadow-lg backdrop-blur-sm'
                  : 'text-white/90 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 drop-shadow-sm flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium drop-shadow-sm text-sm md:text-base">{item.label}</div>
                <div className="text-xs text-white/70 group-hover:text-white/90 drop-shadow-sm hidden md:block">
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-[60] bg-amber-800/90 backdrop-blur-sm text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[70]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sliding sidebar */}
      <nav
        className={cn(
          'md:hidden fixed top-0 left-0 h-full w-72 z-[80] bg-gradient-to-b from-amber-900 to-amber-700 backdrop-blur-xl shadow-2xl overflow-y-auto transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:block w-64 min-h-screen bg-white/20 backdrop-blur-xl border-r border-white/30 shadow-2xl flex-shrink-0">
        {navContent}
      </nav>
    </>
  );
}