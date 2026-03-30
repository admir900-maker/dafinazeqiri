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
  X,
  ShieldAlert
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
  },
  {
    href: '/admin/security-audit',
    label: 'Security Audit',
    icon: ShieldAlert,
    description: 'Forensic analysis & threat detection'
  }
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Admin Panel</h1>
        <button
          className="md:hidden text-orange-100/90 hover:text-orange-100"
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
                'hover:bg-orange-500/10 hover:text-orange-400',
                isActive
                  ? 'bg-orange-500/15 text-orange-500 border border-orange-500/40 shadow-lg shadow-orange-500/5'
                  : 'text-orange-100/70 hover:text-orange-400'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm md:text-base">{item.label}</div>
                <div className="text-xs text-orange-100/40 group-hover:text-orange-100/60 hidden md:block">
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
        className="md:hidden fixed top-3 left-3 z-[60] bg-black/90 border-2 border-orange-500/50 text-orange-500 p-2 rounded-lg shadow-lg"
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
          'md:hidden fixed top-0 left-0 h-full w-72 z-[80] shadow-2xl overflow-y-auto transition-transform duration-300 border-r border-orange-500/20 bg-gradient-to-b from-black via-zinc-950 to-black',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:block w-64 min-h-screen border-r border-orange-500/20 shadow-2xl flex-shrink-0 bg-gradient-to-b from-black via-zinc-950 to-black">
        {navContent}
      </nav>
    </>
  );
}