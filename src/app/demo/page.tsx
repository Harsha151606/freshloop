'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, ArrowLeft, Utensils, HandHeart, Truck, Shield, UserPlus } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { seedUsers } from '@/lib/seed-data';
import type { DemoUser } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

// Ensure seed data includes an admin user for demo evaluation
const demoAdminUser: DemoUser = {
  id: 'user-admin-demo',
  name: 'Devika Menon (Coordinator)',
  email: 'devika.admin@freshloop.org',
  role: 'admin',
  organizationId: 'org-1',
  avatarInitials: 'DM',
};

const roles = [
  {
    role: 'donor' as const,
    title: 'Food Donor',
    description: 'Restaurants, grocery stores, and caterers with surplus food to share.',
    icon: Utensils,
    color: 'bg-forest-50 text-forest-600 border-forest-200',
    users: seedUsers.filter((u) => u.role === 'donor'),
  },
  {
    role: 'recipient' as const,
    title: 'Recipient Organization',
    description: 'NGOs, community kitchens, and food banks looking for surplus food.',
    icon: HandHeart,
    color: 'bg-lime-50 text-lime-600 border-lime-200',
    users: seedUsers.filter((u) => u.role === 'recipient'),
  },
  {
    role: 'volunteer' as const,
    title: 'Rescue Volunteer',
    description: 'Volunteers who coordinate food pickup and delivery between donors and recipients.',
    icon: Truck,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    users: seedUsers.filter((u) => u.role === 'volunteer'),
  },
  {
    role: 'admin' as const,
    title: 'Platform Administrator',
    description: 'Platform coordinators overseeing organization verifications and compliance audit logs.',
    icon: Shield,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    users: [demoAdminUser],
  },
];

export default function DemoPage() {
  const router = useRouter();
  const { setDemoUser } = useAuth();

  const handleSelectUser = (user: DemoUser) => {
    setDemoUser({
      id: user.id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      avatarInitials: user.avatarInitials,
      isDemo: true,
    });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Demo Banner */}
      <div className="bg-lime-50 border-b border-lime-200 px-4 py-2.5 text-center text-xs font-medium text-forest-700 flex items-center justify-center gap-3">
        <span>🧪 Interactive Demo Sandbox — Explore FreshLoop roles instantly with pre-seeded data.</span>
        <span className="hidden sm:inline text-lime-400">|</span>
        <span className="hidden sm:inline text-text-secondary">
          Prefer real auth?{' '}
          <Link href="/login" className="font-semibold text-forest-700 underline underline-offset-2">
            Log In
          </Link>{' '}
          or{' '}
          <Link href="/register" className="font-semibold text-forest-700 underline underline-offset-2">
            Register
          </Link>
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-forest-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button size="sm" variant="outline" className="text-xs">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" variant="primary" className="text-xs">
                <UserPlus className="w-3.5 h-3.5" />
                Create Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-forest-600 rounded-[var(--radius-md)] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">
              Choose Your Demo Persona
            </h1>
          </div>
        </div>
        <p className="text-text-secondary mb-10">
          Select a role to evaluate FreshLoop AI from different operational perspectives. Demo accounts are sandboxed locally and do not alter production database records.
        </p>

        {/* Roles */}
        <div className="space-y-8">
          {roles.map((role) => (
            <div key={role.role}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center border ${role.color}`}>
                  <role.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-text">{role.title}</h2>
                    {role.role === 'admin' && (
                      <Badge variant="secondary" className="text-[10px]">
                        Demo Evaluator
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{role.description}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 ml-12">
                {role.users.map((user) => (
                  <Card
                    key={user.id}
                    hover
                    className="p-4 cursor-pointer group"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-forest-100 rounded-full flex items-center justify-center text-sm font-semibold text-forest-700">
                        {user.avatarInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text group-hover:text-forest-600 transition-colors">
                          {user.name}
                        </p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        tabIndex={-1}
                      >
                        Enter →
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
