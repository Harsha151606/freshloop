'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  TrendingUp,
  HandHeart,
  Truck,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button, StatCard, EmptyState } from '@/components/ui';
import { useCurrentUser, useFoodListings, useRescueRequests, useImpactRecords, useMounted } from '@/lib/hooks';
import { getOrganization } from '@/lib/store';
import { calculateUrgency } from '@/lib/urgency-engine';
import { formatTimeRemaining, categoryLabel, statusLabel, minutesFromNow } from '@/lib/utils';
import type { FoodListing } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const mounted = useMounted();

  if (!mounted || !user) return null;

  if (user.role === 'donor') return <DonorDashboard />;
  if (user.role === 'recipient') return <RecipientDashboard />;
  return <VolunteerDashboard />;
}

// ── Donor Dashboard ────────────────────────────

function DonorDashboard() {
  const { user } = useCurrentUser();
  const allListings = useFoodListings();
  const impacts = useImpactRecords();

  const myListings = useMemo(
    () => allListings.filter((l) => l.donorId === user?.id),
    [allListings, user]
  );

  const activeListings = myListings.filter(
    (l) => l.status === 'posted' || l.status === 'partially_claimed'
  );

  const urgentListings = useMemo(
    () =>
      activeListings
        .map((l) => ({ listing: l, urgency: calculateUrgency(l) }))
        .filter((item) => item.urgency.isEligible)
        .sort((a, b) => b.urgency.score - a.urgency.score)
        .slice(0, 5),
    [activeListings]
  );

  const myImpact = impacts.filter((i) => i.donorOrgId === user?.organizationId);
  const org = user ? getOrganization(user.organizationId) : undefined;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {org?.name} • Donor Dashboard
          </p>
        </div>
        <Link href="/dashboard/add-food">
          <Button>
            <PlusCircle className="w-4 h-4" />
            Add Surplus Food
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Listings"
          value={activeListings.length}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          label="Total Listed"
          value={myListings.length}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Food Rescued"
          value={`${myImpact.reduce((s, i) => s + i.quantityKg, 0)} kg`}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Meals Enabled"
          value={myImpact.reduce((s, i) => s + i.estimatedMeals, 0)}
          icon={<HandHeart className="w-5 h-5" />}
        />
      </div>

      {/* Urgency Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4.5 h-4.5 text-urgent-orange" />
              <h2 className="text-lg font-semibold text-text">Urgency Queue</h2>
            </div>
            <Link href="/dashboard/decision-room">
              <Button variant="ghost" size="sm">
                Decision Room <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {urgentListings.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-10 h-10" />}
              title="No urgent listings"
              description="All your active listings have comfortable rescue windows."
            />
          ) : (
            <div className="space-y-3">
              {urgentListings.map(({ listing, urgency }) => (
                <UrgencyItem key={listing.id} listing={listing} urgencyLevel={urgency.level} timeRemaining={urgency.timeRemainingMinutes} reasons={urgency.reasons} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Listings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Your Inventory</h2>
            <Badge variant="secondary">{myListings.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {myListings.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No listings yet"
              description="Add your first surplus food listing to start rescuing food."
              action={
                <Link href="/dashboard/add-food">
                  <Button>
                    <PlusCircle className="w-4 h-4" />
                    Add Food
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {myListings.slice(0, 8).map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Recipient Dashboard ────────────────────────

function RecipientDashboard() {
  const { user } = useCurrentUser();
  const allListings = useFoodListings();
  const rescues = useRescueRequests();
  const impacts = useImpactRecords();

  const myRescues = useMemo(
    () => rescues.filter((r) => r.recipientId === user?.id),
    [rescues, user]
  );

  const activeRescues = myRescues.filter(
    (r) => r.status !== 'delivered' && r.status !== 'cancelled'
  );

  const availableListings = useMemo(
    () =>
      allListings
        .filter((l) => l.status === 'posted' || l.status === 'partially_claimed')
        .filter((l) => {
          const timeLeft = minutesFromNow(l.safePickupDeadline);
          return timeLeft > 0;
        }),
    [allListings]
  );

  const myImpact = impacts.filter((i) => i.recipientOrgId === user?.organizationId);
  const org = user ? getOrganization(user.organizationId) : undefined;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-text-secondary mt-1">{org?.name} • Recipient Dashboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available Now"
          value={availableListings.length}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          label="Active Rescues"
          value={activeRescues.length}
          icon={<Truck className="w-5 h-5" />}
        />
        <StatCard
          label="Food Received"
          value={`${myImpact.reduce((s, i) => s + i.quantityKg, 0)} kg`}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Meals Served"
          value={myImpact.reduce((s, i) => s + i.estimatedMeals, 0)}
          icon={<HandHeart className="w-5 h-5" />}
        />
      </div>

      {/* Active Rescues */}
      {activeRescues.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-text">Active Rescues</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRescues.map((rescue) => {
                const listing = allListings.find((l) => l.id === rescue.listingId);
                return (
                  <Link href={`/dashboard/rescue/${rescue.id}`} key={rescue.id}>
                    <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-border-subtle hover:border-forest-200 hover:bg-ivory-50 transition-all cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-text">{listing?.foodName || 'Unknown'}</p>
                        <p className="text-xs text-text-muted">{rescue.quantity} {listing?.unit || 'kg'}</p>
                      </div>
                      <Badge variant={rescue.status === 'accepted' ? 'warning' : 'success'}>
                        {statusLabel(rescue.status)}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Available Opportunities</h2>
            <Link href="/dashboard/opportunities">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {availableListings.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No opportunities right now"
              description="Check back soon — new surplus food listings appear throughout the day."
            />
          ) : (
            <div className="space-y-2">
              {availableListings.slice(0, 5).map((listing) => (
                <ListingRow key={listing.id} listing={listing} showDonor />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Volunteer Dashboard ────────────────────────

function VolunteerDashboard() {
  const { user } = useCurrentUser();
  const rescues = useRescueRequests();
  const allListings = useFoodListings();
  const impacts = useImpactRecords();

  const pendingPickups = rescues.filter(
    (r) =>
      (r.status === 'accepted' || r.status === 'pickup_scheduled') &&
      (r.volunteerId === user?.id || !r.volunteerId)
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-text-secondary mt-1">Volunteer Dashboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pending Pickups"
          value={pendingPickups.length}
          icon={<Truck className="w-5 h-5" />}
        />
        <StatCard
          label="Total Deliveries"
          value={impacts.length}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Food Moved"
          value={`${impacts.reduce((s, i) => s + i.quantityKg, 0)} kg`}
          icon={<Package className="w-5 h-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Pending Pickups</h2>
            <Link href="/dashboard/volunteer">
              <Button variant="ghost" size="sm">
                Pickup Board <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {pendingPickups.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-10 h-10" />}
              title="No pending pickups"
              description="All current rescues are either completed or waiting for acceptance."
            />
          ) : (
            <div className="space-y-3">
              {pendingPickups.map((rescue) => {
                const listing = allListings.find((l) => l.id === rescue.listingId);
                const donorOrg = listing ? getOrganization(listing.organizationId) : undefined;
                const recipientOrg = getOrganization(rescue.recipientOrgId);
                return (
                  <Link href={`/dashboard/rescue/${rescue.id}`} key={rescue.id}>
                    <div className="p-4 rounded-[var(--radius-md)] border border-border-subtle hover:border-forest-200 hover:bg-ivory-50 transition-all cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-text">{listing?.foodName || 'Unknown'}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            {donorOrg?.name} → {recipientOrg?.name}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {rescue.quantity} {listing?.unit || 'kg'} • {listing?.pickupArea}
                          </p>
                        </div>
                        <Badge variant={rescue.status === 'accepted' ? 'warning' : 'success'}>
                          {statusLabel(rescue.status)}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared Components ──────────────────────────

function UrgencyItem({
  listing,
  urgencyLevel,
  timeRemaining,
  reasons,
}: {
  listing: FoodListing;
  urgencyLevel: string;
  timeRemaining: number;
  reasons: string[];
}) {
  const urgencyColors: Record<string, string> = {
    critical: 'bg-urgency-critical border',
    high: 'bg-urgency-high border',
    medium: 'bg-urgency-medium border',
    low: 'bg-urgency-low border',
  };

  return (
    <div className={`p-4 rounded-[var(--radius-md)] ${urgencyColors[urgencyLevel] || 'bg-ivory-50 border border-border-subtle'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {urgencyLevel === 'critical' && <AlertTriangle className="w-4 h-4 text-urgent-red shrink-0" />}
            <p className="text-sm font-semibold text-text">{listing.foodName}</p>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {listing.availableQuantity} {listing.unit} • {categoryLabel(listing.category)} • {listing.pickupArea}
          </p>
          <p className="text-xs text-text-muted mt-1">{reasons[0]}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold urgency-${urgencyLevel}`}>
            {formatTimeRemaining(timeRemaining)}
          </p>
          <Badge variant={urgencyLevel === 'critical' ? 'urgent' : urgencyLevel === 'high' ? 'warning' : 'secondary'} className="mt-1">
            {urgencyLevel}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ListingRow({ listing, showDonor }: { listing: FoodListing; showDonor?: boolean }) {
  const donorOrg = showDonor ? getOrganization(listing.organizationId) : undefined;
  const timeLeft = minutesFromNow(listing.safePickupDeadline);
  const statusVariant =
    listing.status === 'posted'
      ? 'success'
      : listing.status === 'partially_claimed'
        ? 'warning'
        : listing.status === 'fully_claimed'
          ? 'default'
          : 'secondary';

  return (
    <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-border-subtle hover:bg-ivory-50 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text truncate">{listing.foodName}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {showDonor && donorOrg ? `${donorOrg.name} • ` : ''}
          {listing.availableQuantity}/{listing.quantity} {listing.unit} • {categoryLabel(listing.category)}
          {timeLeft > 0 && ` • ${formatTimeRemaining(timeLeft)}`}
        </p>
      </div>
      <Badge variant={statusVariant}>{statusLabel(listing.status)}</Badge>
    </div>
  );
}
