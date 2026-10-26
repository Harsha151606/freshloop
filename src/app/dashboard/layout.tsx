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
  Shield,
  Lock,
  Sparkles,
} from 'lucide-react';
import { DemoBanner, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { getOrganization } from '@/lib/store';
import { isAuthorizedForRoute } from '@/lib/auth-validation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['donor', 'recipient', 'volunteer', 'admin'] },
  { href: '/dashboard/add-food', label: 'Add Food', icon: PlusCircle, roles: ['donor', 'admin'] },
  { href: '/dashboard/opportunities', label: 'Opportunities', icon: HandHeart, roles: ['recipient', 'admin'] },
  { href: '/dashboard/decision-room', label: 'Decision Room', icon: Zap, roles: ['donor', 'recipient', 'volunteer', 'admin'] },
  { href: '/dashboard/volunteer', label: 'Pickup Board', icon: Truck, roles: ['volunteer', 'admin'] },
  { href: '/dashboard/impact', label: 'Impact', icon: BarChart3, roles: ['donor', 'recipient', 'volunteer', 'admin'] },
  { href: '/dashboard/admin', label: 'Administration', icon: Shield, roles: ['admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['donor', 'recipient', 'volunteer', 'admin'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isDemo, isLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const org = useMemo(() => {
    return user?.organizationId ? getOrganization(user.organizationId) : undefined;
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Check role authorization for the current path
  const isAuthorized = isAuthorizedForRoute(user.role, pathname);

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-bg">
      {isDemo && <DemoBanner />}

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
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#f5f7f6] shadow-xl z-50 flex flex-col">
            <SidebarContent
              user={user}
              isDemo={isDemo}
              org={org}
              filteredNav={filteredNav}
              pathname={pathname}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#f5f7f6] border-r border-border-subtle z-20">
          <SidebarContent
            user={user}
            isDemo={isDemo}
            org={org}
            filteredNav={filteredNav}
            pathname={pathname}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64 min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {!isAuthorized ? (
              <div className="max-w-lg mx-auto py-16 text-center">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 border border-amber-200">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-text mb-2">Access Restricted</h2>
                <p className="text-sm text-text-secondary mb-6">
                  Your current account role (<strong className="capitalize">{user.role}</strong>) does not have permission to access this section.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/dashboard">
                    <Button variant="primary">Go to Dashboard</Button>
                  </Link>
                  {isDemo && (
                    <Link href="/demo">
                      <Button variant="outline">Change Demo Role</Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  isDemo,
  org,
  filteredNav,
  pathname,
  onLogout,
  onClose,
}: {
  user: { fullName: string; email: string; role: string; avatarInitials: string; organizationName?: string | null };
  isDemo: boolean;
  org?: { name: string };
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
            <p className="text-sm font-semibold text-text truncate">{user.fullName}</p>
            <p className="text-xs text-text-muted truncate">
              {org?.name || user.organizationName || user.email}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-forest-50 text-forest-700 border border-forest-200 capitalize">
            {user.role}
          </span>
          {isDemo ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Demo Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
              ● Live Account
            </span>
          )}
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
                  ? 'bg-forest-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-forest-700'
              }`}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Demo switch / Account Actions */}
      <div className="px-3 py-3 border-t border-border-subtle shrink-0 space-y-1">
        {isDemo ? (
          <Link
            href="/demo"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-forest-600 hover:bg-forest-50 rounded-[var(--radius-md)] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Switch Demo Role
          </Link>
        ) : null}

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors w-full cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          {isDemo ? 'Exit Demo' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
