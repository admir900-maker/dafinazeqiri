'use client';

import { useState, useEffect } from 'react';
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
  Database,
  Bell,
  Tag,
  BookOpen,
  CheckCircle,
  Activity,
  Mail
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  currency: string;
  timezone: string;
  logoUrl: string;
  faviconUrl: string;
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

  return (
    <nav className="w-64 min-h-screen bg-white/20 backdrop-blur-xl border-r border-white/30 shadow-2xl">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-8 drop-shadow-lg">Admin Panel</h1>
        <div className="space-y-2">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/admin/dashboard' && pathname === '/admin');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  'hover:bg-white/30 hover:text-white hover:shadow-lg backdrop-blur-sm',
                  isActive
                    ? 'bg-white/30 text-white border border-white/40 shadow-lg backdrop-blur-sm'
                    : 'text-white/90 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 drop-shadow-sm" />
                <div className="flex-1">
                  <div className="font-medium drop-shadow-sm">{item.label}</div>
                  <div className="text-xs text-white/70 group-hover:text-white/90 drop-shadow-sm">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function AdminHeader() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: 'SUPERNOVA', // fallback
    siteDescription: '',
    siteUrl: '',
    currency: 'EUR',
    timezone: 'UTC',
    logoUrl: '',
    faviconUrl: ''
  })

  // Fetch site configuration
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const response = await fetch('/api/site-config')
        if (response.ok) {
          const config = await response.json()
          setSiteConfig(config)
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error)
      }
    }

    fetchSiteConfig()
  }, [])

  return (
    <header className="bg-white/20 backdrop-blur-xl border-b border-white/30 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white drop-shadow-lg">{siteConfig.siteName} Admin</h2>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-white/90 hover:text-white cursor-pointer transition-colors drop-shadow-sm" />
          <div className="w-8 h-8 bg-white/30 rounded-full border border-white/40 shadow-lg backdrop-blur-sm"></div>
        </div>
      </div>
    </header>
  );
}