'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  HandHeart,
  Leaf,
  MapPin,
  Package,
  Plus,
  Sparkles,
  Truck,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  useCurrentUser,
  useFoodListings,
  useImpactRecords,
  useMounted,
  useOrganizations,
  useRescueRequests,
} from '@/lib/hooks';
import { calculateUrgency } from '@/lib/urgency-engine';
import { categoryLabel, formatTimeRemaining, minutesFromNow, statusLabel } from '@/lib/utils';
import type { FoodListing, RescueRequest } from '@/lib/types';

type Metric = {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone: 'green' | 'amber' | 'blue' | 'rose';
};

const metricTones = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  blue: 'bg-sky-50 text-sky-700 border-sky-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const mounted = useMounted();
  const allListings = useFoodListings();
  const rescues = useRescueRequests();
  const impacts = useImpactRecords();
  const organizations = useOrganizations();

  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );

  if (!mounted || !user) return null;

  const isDonor = user.role === 'donor';
  const isRecipient = user.role === 'recipient';
  const isVolunteer = user.role === 'volunteer';
  const isAdmin = user.role === 'admin';

  const ownListings = allListings.filter((listing) => listing.donorId === user.id);
  const activeNetworkListings = allListings.filter(
    (listing) =>
      (listing.status === 'posted' || listing.status === 'partially_claimed') &&
      minutesFromNow(listing.safePickupDeadline) > 0
  );
  const inventoryListings = isDonor ? ownListings : activeNetworkListings;
  const activeInventory = inventoryListings.filter(
    (listing) =>
      (listing.status === 'posted' || listing.status === 'partially_claimed') &&
      minutesFromNow(listing.safePickupDeadline) > 0
  );

  const userImpacts = impacts.filter((impact) => {
    if (isDonor) return impact.donorOrgId === user.organizationId;
    if (isRecipient) return impact.recipientOrgId === user.organizationId;
    if (isVolunteer) {
      const rescue = rescues.find((item) => item.id === impact.rescueRequestId);
      return rescue?.volunteerId === user.id;
    }
    return true;
  });

  const rescuedKg = userImpacts.reduce((sum, impact) => sum + impact.quantityKg, 0);
  const mealsSupported = userImpacts.reduce((sum, impact) => sum + impact.estimatedMeals, 0);
  const co2Avoided = userImpacts.reduce((sum, impact) => sum + impact.estimatedCO2SavedKg, 0);

  const visibleRescues = rescues
    .filter((rescue) => {
      const listing = allListings.find((item) => item.id === rescue.listingId);
      if (isDonor) return listing?.donorId === user.id;
      if (isRecipient) return rescue.recipientId === user.id;
      if (isVolunteer) return rescue.volunteerId === user.id || !rescue.volunteerId;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  const metrics: Metric[] = isDonor
    ? [
        { label: 'Active Listings', value: activeInventory.length, note: 'Food ready for rescue', icon: Package, tone: 'green' },
        { label: 'Food Rescued', value: rescuedKg.toLocaleString() + ' kg', note: 'Completed handoffs', icon: HandHeart, tone: 'amber' },
        { label: 'Meals Supported', value: mealsSupported.toLocaleString(), note: 'Estimated servings', icon: Users, tone: 'blue' },
        { label: 'CO₂ Avoided', value: co2Avoided.toLocaleString() + ' kg', note: 'Estimated emissions avoided', icon: Leaf, tone: 'rose' },
      ]
    : isRecipient
      ? [
          { label: 'Available Nearby', value: activeNetworkListings.length, note: 'Listings with a safe pickup window', icon: Package, tone: 'green' },
          { label: 'My Rescues', value: rescues.filter((item) => item.recipientId === user.id && item.status !== 'cancelled').length, note: 'Requests in your workflow', icon: Truck, tone: 'amber' },
          { label: 'Food Received', value: rescuedKg.toLocaleString() + ' kg', note: 'Completed deliveries', icon: HandHeart, tone: 'blue' },
          { label: 'Meals Supported', value: mealsSupported.toLocaleString(), note: 'Estimated servings', icon: Users, tone: 'rose' },
        ]
      : isVolunteer
        ? [
            { label: 'Available Rescues', value: visibleRescues.filter((item) => item.status !== 'delivered' && item.status !== 'cancelled').length, note: 'Pickups to coordinate', icon: Truck, tone: 'green' },
            { label: 'Completed', value: userImpacts.length, note: 'Rescues delivered', icon: CheckCircle2, tone: 'amber' },
            { label: 'Food Moved', value: rescuedKg.toLocaleString() + ' kg', note: 'Recorded deliveries', icon: Package, tone: 'blue' },
            { label: 'Meals Supported', value: mealsSupported.toLocaleString(), note: 'Estimated servings', icon: Users, tone: 'rose' },
          ]
        : [
            { label: 'Active Listings', value: activeNetworkListings.length, note: 'Open food opportunities', icon: Package, tone: 'green' },
            { label: 'Food Rescued', value: rescuedKg.toLocaleString() + ' kg', note: 'Completed handoffs', icon: HandHeart, tone: 'amber' },
            { label: 'Meals Supported', value: mealsSupported.toLocaleString(), note: 'Estimated servings', icon: Users, tone: 'blue' },
            { label: 'NGO Partners', value: organizations.filter((item) => ['ngo', 'community_kitchen', 'food_bank'].includes(item.type)).length, note: 'Recipient organizations', icon: Users, tone: 'rose' },
          ];

  const roleLabel = isDonor ? 'Food Donor' : isRecipient ? 'Recipient Organization' : isVolunteer ? 'Rescue Volunteer' : 'Platform Overview';
  const title = isDonor ? 'Food Waste Intelligence' : isRecipient ? 'Rescue Opportunities' : isVolunteer ? 'Pickup & Delivery Overview' : 'FreshLoop Operations';
  const subtitle = isDonor
    ? 'Track your surplus, prioritize time-sensitive food, and measure the impact you make.'
    : isRecipient
      ? 'Find safe, suitable surplus food and follow every rescue from request to delivery.'
      : isVolunteer
        ? 'Coordinate collections, keep handoffs moving, and see the impact of each delivery.'
        : 'Monitor food rescue activity and keep the community moving together.';

  const quickActions = isDonor
    ? [
        { label: 'Add Surplus Food', detail: 'List food ready to be rescued', href: '/dashboard/add-food', icon: Plus },
        { label: 'Decision Room', detail: 'Review urgent opportunities', href: '/dashboard/decision-room', icon: Zap },
        { label: 'View Impact', detail: 'See food and emissions saved', href: '/dashboard/impact', icon: BarChart3 },
      ]
    : isRecipient
      ? [
          { label: 'Find Food', detail: 'Browse nearby opportunities', href: '/dashboard/opportunities', icon: Package },
          { label: 'Decision Room', detail: 'Review the best matches', href: '/dashboard/decision-room', icon: Zap },
          { label: 'View Impact', detail: 'See meals received', href: '/dashboard/impact', icon: BarChart3 },
        ]
      : isVolunteer
        ? [
            { label: 'Pickup Board', detail: 'Review collection tasks', href: '/dashboard/volunteer', icon: Truck },
            { label: 'Decision Room', detail: 'Prioritize urgent rescues', href: '/dashboard/decision-room', icon: Zap },
            { label: 'View Impact', detail: 'See completed deliveries', href: '/dashboard/impact', icon: BarChart3 },
          ]
        : [
            { label: 'Decision Room', detail: 'Prioritize current rescues', href: '/dashboard/decision-room', icon: Zap },
            { label: 'Review Organizations', detail: 'Manage network partners', href: '/dashboard/admin', icon: Users },
            { label: 'View Impact', detail: 'Review community impact', href: '/dashboard/impact', icon: BarChart3 },
          ];

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-100 shadow-sm"
        style={{
          backgroundImage:
            "linear-gradient(100deg, rgba(239,248,241,0.98) 0%, rgba(245,249,244,0.94) 56%, rgba(245,249,244,0.42) 100%), url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=80')",
          backgroundPosition: 'center, right center',
          backgroundSize: 'cover',
        }}
      >
        <div className="relative flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              {roleLabel} Workspace
              {user.isDemo && <span className="text-emerald-600">· Demo data</span>}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <Link
              href={isDonor ? '/dashboard/add-food' : isRecipient ? '/dashboard/opportunities' : isVolunteer ? '/dashboard/volunteer' : '/dashboard/decision-room'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-white"
            >
              {isDonor ? 'Manage Inventory' : isRecipient ? 'Find Surplus Food' : isVolunteer ? 'Open Pickup Board' : 'Open Decision Room'}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/decision-room"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <Activity className="h-4 w-4" />
              View Decision Room
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">{metric.label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{metric.value}</p>
                </div>
                <span className={'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ' + metricTones[metric.tone]}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Package className="h-4 w-4" /></span>
                <h2 className="text-lg font-bold text-slate-900">{isDonor ? 'Surplus Food Inventory' : 'Available Food Opportunities'}</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">{isDonor ? 'Keep an eye on the food that is ready for redistribution.' : 'Listings with an active safe-pickup window.'}</p>
            </div>
            <Link href={isDonor ? '/dashboard/add-food' : '/dashboard/opportunities'} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
              {isDonor ? 'Add surplus' : 'Browse all'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {inventoryListings.slice(0, 5).map((listing) => (
              <InventoryRow
                key={listing.id}
                listing={listing}
                organizationName={organizationById.get(listing.organizationId)?.name ?? 'Community donor'}
              />
            ))}
            {inventoryListings.length === 0 && (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Package className="h-6 w-6" /></span>
                <p className="mt-3 text-sm font-semibold text-slate-800">Your inventory is ready when you are</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{isDonor ? 'Add your first surplus listing to start a rescue.' : 'New surplus listings appear here as donors publish them.'}</p>
                <Link href={isDonor ? '/dashboard/add-food' : '/dashboard/opportunities'} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
                  {isDonor ? 'Add Food' : 'Explore Opportunities'} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs text-slate-500 sm:px-6">
            <span>Showing {Math.min(inventoryListings.length, 5)} of {inventoryListings.length} listings</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Updated from current workspace</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Truck className="h-4 w-4" /></span>
              <h2 className="text-lg font-bold text-slate-900">{isVolunteer ? 'Pickup & Delivery Queue' : 'Active Redistributions'}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Follow the handoff from acceptance to delivery.</p>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {visibleRescues.map((rescue) => {
              const listing = allListings.find((item) => item.id === rescue.listingId);
              const recipient = organizationById.get(rescue.recipientOrgId);
              const state = rescue.status === 'delivered'
                ? { label: 'Delivered', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
                : rescue.status === 'collected'
                  ? { label: 'In transit', classes: 'bg-sky-50 text-sky-700 ring-sky-200' }
                  : rescue.status === 'pickup_scheduled'
                    ? { label: 'Scheduled', classes: 'bg-violet-50 text-violet-700 ring-violet-200' }
                    : rescue.status === 'cancelled'
                      ? { label: 'Cancelled', classes: 'bg-slate-100 text-slate-600 ring-slate-200' }
                      : { label: 'Accepted', classes: 'bg-amber-50 text-amber-700 ring-amber-200' };
              return (
                <div key={rescue.id} className="rounded-xl border border-slate-200/80 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{listing?.foodName ?? 'Food rescue'}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{recipient?.name ?? 'Recipient organization'}</p>
                    </div>
                    <span className={'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ' + state.classes}>{state.label}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>{rescue.quantity} {listing?.unit ?? 'kg'} reserved</span>
                    <Link href={'/dashboard/rescue/' + rescue.id} className="font-semibold text-emerald-700 hover:text-emerald-900">View details <ArrowRight className="inline h-3.5 w-3.5" /></Link>
                  </div>
                </div>
              );
            })}
            {visibleRescues.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-5 py-9 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Truck className="h-5 w-5" /></span>
                <p className="mt-3 text-sm font-semibold text-slate-800">No redistributions yet</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">New food requests and pickups will appear here.</p>
              </div>
            )}
            <Link href="/dashboard/decision-room" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">
              Open Rescue Decision Room <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Zap className="h-4 w-4" /></span><h2 className="text-lg font-bold text-slate-900">Quick Actions</h2></div>
            <p className="mt-1 text-sm text-slate-500">Common tasks to keep good food moving.</p>
          </div>
          <span className="text-xs text-slate-400">FreshLoop AI · Rescue more, waste less</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{action.detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
              </Link>
            );
          })}
        </div>
      </section>

      <p className="px-1 text-xs leading-5 text-slate-500">
        {user.isDemo ? 'Demo workspace: records shown here are local sample data for evaluation.' : 'Impact indicators are estimates based on completed rescues. Operational records are stored in this browser in the current prototype.'}
      </p>
    </div>
  );
}

function InventoryRow({ listing, organizationName }: { listing: FoodListing; organizationName: string }) {
  const urgency = calculateUrgency(listing);
  const timeLeft = minutesFromNow(listing.safePickupDeadline);
  const isUrgent = urgency.level === 'critical' || urgency.level === 'high';
  const badgeClasses = listing.status === 'fully_claimed'
    ? 'bg-slate-100 text-slate-600'
    : isUrgent
      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';

  return (
    <div className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50/80 sm:px-6">
      <div className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' + (isUrgent ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
        {listing.category === 'prepared_meals' ? <Utensils className="h-5 w-5" /> : listing.category === 'produce' ? <Leaf className="h-5 w-5" /> : <Package className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{listing.foodName}</p>
          <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + badgeClasses}>{isUrgent ? 'Urgent' : statusLabel(listing.status)}</span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{organizationName} · {categoryLabel(listing.category)} · {listing.availableQuantity} {listing.unit} available</p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-700"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{timeLeft > 0 ? formatTimeRemaining(timeLeft) : 'Window passed'}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Pickup window</p>
      </div>
    </div>
  );
}
