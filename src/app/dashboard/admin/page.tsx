'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { useOrganizations, useFoodListings, useRescueRequests, useUsers } from '@/lib/hooks';

export default function AdminPage() {
  const { user } = useAuth();
  const organizations = useOrganizations();
  const listings = useFoodListings();
  const rescues = useRescueRequests();
  const users = useUsers();

  const [filter, setFilter] = useState<'all' | 'unverified'>('all');

  // Hard authorization gate: only real or demo admin can view this page
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <Card className="p-8 text-center border-red-200 bg-red-50/30">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-text mb-2">Access Denied</h1>
          <p className="text-sm text-text-secondary mb-4">
            The Administration Console is restricted to authorized platform administrators.
            Your current assigned role is <strong className="text-text uppercase font-semibold">{user?.role || 'Guest'}</strong>.
          </p>
          <div className="p-3 bg-white rounded-[var(--radius-md)] border border-red-200 text-xs text-text-muted mb-6">
            🔒 Administrative roles cannot be self-assigned during registration. Privileges must be granted by database administrators via SQL migration or secure server provisioning.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard">
              <Button variant="primary">Return to Dashboard</Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline">Switch Demo Persona</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const unverifiedOrgs = organizations.filter((o) => !o.isVerified);
  const displayedOrgs = filter === 'unverified' ? unverifiedOrgs : organizations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Administration Console</h1>
            <Badge variant="urgent" className="text-xs">
              Admin Access Active
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Platform governance, organization verifications, and compliance oversight.
          </p>
        </div>
      </div>

      {/* Admin Stat Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-medium">Total Organizations</span>
          </div>
          <div className="text-2xl font-bold text-text">{organizations.length}</div>
          <div className="text-xs text-amber-600 mt-1 font-medium">
            {unverifiedOrgs.length} pending verification
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Registered Accounts</span>
          </div>
          <div className="text-2xl font-bold text-text">{users.length}</div>
          <div className="text-xs text-forest-600 mt-1 font-medium">All roles active</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">Listings Tracked</span>
          </div>
          <div className="text-2xl font-bold text-text">{listings.length}</div>
          <div className="text-xs text-text-secondary mt-1">Active inventory</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-medium">Completed Rescues</span>
          </div>
          <div className="text-2xl font-bold text-text">
            {rescues.filter((r) => r.status === 'delivered').length}
          </div>
          <div className="text-xs text-forest-600 mt-1 font-medium">100% audit verified</div>
        </Card>
      </div>

      {/* Organization Verification Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Organizations & Verification Status</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Verified organizations gain full food safety trust clearance on matching boards.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-colors ${
                filter === 'all' ? 'bg-forest-600 text-white' : 'bg-ivory-100 text-text-secondary'
              }`}
            >
              All ({organizations.length})
            </button>
            <button
              onClick={() => setFilter('unverified')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-colors ${
                filter === 'unverified' ? 'bg-amber-600 text-white' : 'bg-ivory-100 text-text-secondary'
              }`}
            >
              Pending ({unverifiedOrgs.length})
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs text-text-muted uppercase">
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Storage</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {displayedOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-ivory-50/50">
                    <td className="py-3 font-medium text-text">{org.name}</td>
                    <td className="py-3 text-text-secondary capitalize">{org.type.replace('_', ' ')}</td>
                    <td className="py-3 text-text-secondary">{org.area}, {org.city}</td>
                    <td className="py-3 text-xs text-text-muted">
                      {org.storageCapabilities.join(', ')}
                    </td>
                    <td className="py-3">
                      {org.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
                          <CheckCircle2 className="w-3 h-3 text-forest-600" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outline" className="text-xs">
                        Review Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
