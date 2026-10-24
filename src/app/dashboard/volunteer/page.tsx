'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  EmptyState,
  Dialog,
} from '@/components/ui';
import { useCurrentUser, useRescueRequests, useFoodListings, useMounted } from '@/lib/hooks';
import { getOrganization, updateRescueStatus } from '@/lib/store';
import {
  formatTimeRemaining,
  categoryLabel,
  statusLabel,
  minutesFromNow,
} from '@/lib/utils';

export default function VolunteerPage() {
  const { user } = useCurrentUser();
  const rescues = useRescueRequests();
  const allListings = useFoodListings();
  const mounted = useMounted();
  const [confirmAction, setConfirmAction] = useState<{
    rescueId: string;
    action: 'pickup_scheduled' | 'collected' | 'delivered';
    foodName: string;
  } | null>(null);

  const activeRescues = useMemo(() => {
    return rescues
      .filter(
        (r) =>
          r.status === 'accepted' ||
          r.status === 'pickup_scheduled' ||
          r.status === 'collected'
      )
      .map((rescue) => {
        const listing = allListings.find((l) => l.id === rescue.listingId);
        const donorOrg = listing ? getOrganization(listing.organizationId) : undefined;
        const recipientOrg = getOrganization(rescue.recipientOrgId);
        return { rescue, listing, donorOrg, recipientOrg };
      })
      .filter((item) => item.listing);
  }, [rescues, allListings]);

  const needsPickup = activeRescues.filter((r) => r.rescue.status === 'accepted');
  const inProgress = activeRescues.filter(
    (r) => r.rescue.status === 'pickup_scheduled' || r.rescue.status === 'collected'
  );

  if (!mounted || !user) return null;

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.action === 'pickup_scheduled') {
      updateRescueStatus(confirmAction.rescueId, 'pickup_scheduled', { volunteerId: user.id });
    } else {
      updateRescueStatus(confirmAction.rescueId, confirmAction.action);
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Pickup & Delivery Board</h1>
        <p className="text-sm text-text-secondary mt-1">
          Coordinate food pickups and deliveries for active rescues.
        </p>
      </div>

      {/* Needs Pickup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4.5 h-4.5 text-urgent-orange" />
              <h2 className="text-lg font-semibold text-text">Needs Pickup</h2>
            </div>
            <Badge variant="warning">{needsPickup.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {needsPickup.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-10 h-10" />}
              title="No pickups needed"
              description="All accepted rescues have been assigned for pickup."
            />
          ) : (
            <div className="space-y-3">
              {needsPickup.map(({ rescue, listing, donorOrg, recipientOrg }) => (
                <div
                  key={rescue.id}
                  className="p-4 rounded-[var(--radius-md)] border border-border-subtle hover:border-forest-200 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">{listing!.foodName}</p>
                      <div className="mt-1.5 space-y-1 text-xs text-text-secondary">
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          Pickup: {donorOrg?.name} ({listing!.pickupArea})
                        </p>
                        <p className="flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5" />
                          Deliver to: {recipientOrg?.name} ({recipientOrg?.area})
                        </p>
                        <p className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {rescue.quantity} {listing!.unit} • {categoryLabel(listing!.category)}
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Deadline: {formatTimeRemaining(minutesFromNow(listing!.safePickupDeadline))}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmAction({
                            rescueId: rescue.id,
                            action: 'pickup_scheduled',
                            foodName: listing!.foodName,
                          })
                        }
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Schedule Pickup
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4.5 h-4.5 text-forest-600" />
              <h2 className="text-lg font-semibold text-text">In Progress</h2>
            </div>
            <Badge variant="success">{inProgress.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {inProgress.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-10 h-10" />}
              title="No deliveries in progress"
              description="Schedule a pickup to get started."
            />
          ) : (
            <div className="space-y-3">
              {inProgress.map(({ rescue, listing, donorOrg, recipientOrg }) => {
                const nextAction =
                  rescue.status === 'pickup_scheduled' ? 'collected' : 'delivered';

                return (
                  <div
                    key={rescue.id}
                    className="p-4 rounded-[var(--radius-md)] border border-forest-200 bg-forest-50/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-text">{listing!.foodName}</p>
                          <Badge variant="success">{statusLabel(rescue.status)}</Badge>
                        </div>
                        <div className="mt-1.5 text-xs text-text-secondary">
                          <p>
                            {donorOrg?.name} → {recipientOrg?.name}
                          </p>
                          <p>
                            {rescue.quantity} {listing!.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/dashboard/rescue/${rescue.id}`}>
                          <Button variant="outline" size="sm">Details</Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              rescueId: rescue.id,
                              action: nextAction as 'collected' | 'delivered',
                              foodName: listing!.foodName,
                            })
                          }
                        >
                          Mark {statusLabel(nextAction)}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={`Confirm: ${confirmAction ? statusLabel(confirmAction.action) : ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAction}>Confirm</Button>
          </>
        }
      >
        {confirmAction && (
          <p className="text-sm text-text-secondary">
            {confirmAction.action === 'pickup_scheduled' &&
              `Confirm you are scheduling pickup for "${confirmAction.foodName}". You will be assigned as the volunteer.`}
            {confirmAction.action === 'collected' &&
              `Confirm that "${confirmAction.foodName}" has been physically collected from the donor.`}
            {confirmAction.action === 'delivered' &&
              `Confirm that "${confirmAction.foodName}" has been delivered to the recipient. This will complete the rescue and record the impact.`}
          </p>
        )}
      </Dialog>
    </div>
  );
}
