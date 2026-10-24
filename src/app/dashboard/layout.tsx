'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Leaf,
  LayoutDashboard,
  PlusCircle,
  Zap,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  HandHeart,
} from 'lucide-react';
import { DemoBanner } from '@/components/ui';
import { useCurrentUser, useMounted } from '@/lib/hooks';
import { getOrganization } from '@/lib/store';
import type { Organization } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['donor', 'recipient', 'volunteer'] },
  { href: '/dashboard/add-food', label: 'Add Food', icon: PlusCircle, roles: ['donor'] },
  { href: '/dashboard/opportunities', label: 'Opportunities', icon: HandHeart, roles: ['recipient'] },
  { href: '/dashboard/decision-room', label: 'Decision Room', icon: Zap, roles: ['donor', 'recipient', 'volunteer'] },
  { href: '/dashboard/volunteer', label: 'Pickup Board', icon: Truck, roles: ['volunteer'] },
  { href: '/dashboard/impact', label: 'Impact', icon: BarChart3, roles: ['donor', 'recipient', 'volunteer'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['donor', 'recipient', 'volunteer'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mounted = useMounted();

  const org = useMemo(() => {
    return user ? getOrganization(user.organizationId) : undefined;
  }, [user]);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/demo');
    }
  }, [mounted, user, router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  const handleLogout = () => {
    setUser(null);
    router.push('/demo');
  };

  return (
    <div className="min-h-screen bg-bg">
      <DemoBanner />

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-border-subtle px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-text-secondary hover:text-text cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-forest-600 rounded-[var(--radius-sm)] flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-text">
            Fresh<span className="text-forest-600">Loop</span>
          </span>
        </Link>
        <div className="w-8 h-8 bg-forest-100 rounded-full flex items-center justify-center text-xs font-semibold text-forest-700">
          {user.avatarInitials}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-lg animate-slide-in">
            <SidebarContent
              user={user}
              org={org}
              filteredNav={filteredNav}
              pathname={pathname}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:top-[32px] bg-white border-r border-border-subtle">
          <SidebarContent
            user={user}
            org={org}
            filteredNav={filteredNav}
            pathname={pathname}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-32px)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  org,
  filteredNav,
  pathname,
  onLogout,
  onClose,
}: {
  user: NonNullable<ReturnType<typeof useCurrentUser>['user']>;
  org?: Organization;
  filteredNav: NavItem[];
  pathname: string;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-border-subtle shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-forest-600 rounded-[var(--radius-sm)] flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-text">
            Fresh<span className="text-forest-600">Loop</span>{' '}
            <span className="text-lime-500 text-xs font-semibold">AI</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text lg:hidden cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-forest-100 rounded-full flex items-center justify-center text-sm font-semibold text-forest-700">
            {user.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate">{user.name}</p>
            <p className="text-xs text-text-muted truncate">{org?.name || user.email}</p>
          </div>
        </div>
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-forest-50 text-forest-700 border border-forest-200 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-forest-50 text-forest-700'
                  : 'text-text-secondary hover:bg-ivory-100 hover:text-text'
              }`}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border-subtle shrink-0">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          Exit Demo
        </button>
      </div>
    </div>
  );
}
