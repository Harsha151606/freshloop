'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronRight,
  Target,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Dialog,
  Textarea,
} from '@/components/ui';
import { useFoodListings, useRescueRequests, useMounted, useCurrentUser } from '@/lib/hooks';
import { getOrganization, updateRescueStatus } from '@/lib/store';
import {
  formatDateTime,
  categoryLabel,
  storageLabel,
  statusLabel,
  minutesFromNow,
} from '@/lib/utils';
import type { RescueStatus } from '@/lib/types';

export default function RescueDetailsPage() {
  const params = useParams();
  const { user } = useCurrentUser();
  const mounted = useMounted();
  const allRescues = useRescueRequests();
  const allListings = useFoodListings();

  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<RescueStatus | null>(null);

  const rescueId = params?.id as string;

  const rescue = useMemo(() => {
    return allRescues.find((r) => r.id === rescueId);
  }, [allRescues, rescueId]);

  const listing = useMemo(() => {
    return rescue ? allListings.find((l) => l.id === rescue.listingId) : undefined;
  }, [allListings, rescue]);

  if (!mounted || !user) return null;

  if (!rescue || !listing) {
    return (
      <div className="animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-forest-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-lg font-semibold text-text">Rescue not found</p>
            <p className="text-sm text-text-secondary mt-1">This rescue may have been removed or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const donorOrg = getOrganization(listing.organizationId);
  const recipientOrg = getOrganization(rescue.recipientOrgId);
  const timeLeft = minutesFromNow(listing.safePickupDeadline);

  const statusSteps: { status: RescueStatus; label: string; icon: React.ElementType }[] = [
    { status: 'accepted', label: 'Accepted', icon: CheckCircle2 },
    { status: 'pickup_scheduled', label: 'Pickup Scheduled', icon: Clock },
    { status: 'collected', label: 'Collected', icon: Truck },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const statusOrder = ['accepted', 'pickup_scheduled', 'collected', 'delivered'];
  const currentIndex = statusOrder.indexOf(rescue.status);

  const nextStatus = (): RescueStatus | null => {
    if (rescue.status === 'cancelled' || rescue.status === 'delivered') return null;
    const idx = statusOrder.indexOf(rescue.status);
    if (idx < statusOrder.length - 1) return statusOrder[idx + 1] as RescueStatus;
    return null;
  };

  const handleAdvanceStatus = () => {
    const next = nextStatus();
    if (next) {
      setConfirmDialog(next);
    }
  };

  const confirmAdvance = () => {
    if (!confirmDialog) return;
    if (confirmDialog === 'pickup_scheduled') {
      updateRescueStatus(rescue.id, 'pickup_scheduled', { volunteerId: user.id });
    } else {
      updateRescueStatus(rescue.id, confirmDialog);
    }
    setConfirmDialog(null);
  };

  const handleCancel = () => {
    updateRescueStatus(rescue.id, 'cancelled', { cancellationReason: cancelReason || 'Cancelled by user' });
    setCancelDialog(false);
    setCancelReason('');
  };

  const isCancelled = rescue.status === 'cancelled';
  const isDelivered = rescue.status === 'delivered';
  const canCancel = !isCancelled && !isDelivered;
  const next = nextStatus();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-forest-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{listing.foodName}</h1>
          <p className="text-sm text-text-secondary mt-1">
            Rescue #{rescue.id.split('-').pop()} • {rescue.quantity} {listing.unit}
          </p>
        </div>
        <Badge
          variant={
            isCancelled
              ? 'destructive'
              : isDelivered
                ? 'success'
                : 'warning'
          }
          className="text-sm py-1 px-3"
        >
          {statusLabel(rescue.status)}
        </Badge>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-text">Rescue Status</h2>
        </CardHeader>
        <CardContent>
          {isCancelled ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">Rescue Cancelled</p>
                {rescue.cancellationReason && (
                  <p className="text-xs text-red-600 mt-0.5">Reason: {rescue.cancellationReason}</p>
                )}
                {rescue.cancelledAt && (
                  <p className="text-xs text-red-500 mt-0.5">{formatDateTime(rescue.cancelledAt)}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center justify-between">
                {statusSteps.map((step, idx) => {
                  const isComplete = currentIndex >= idx;
                  const isCurrent = currentIndex === idx;
                  return (
                    <div key={step.status} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isComplete
                            ? 'bg-forest-600 border-forest-600 text-white'
                            : isCurrent
                              ? 'border-forest-400 text-forest-600 bg-forest-50'
                              : 'border-border bg-white text-text-muted'
                        }`}
                      >
                        <step.icon className="w-5 h-5" />
                      </div>
                      <p
                        className={`text-xs mt-2 text-center ${
                          isComplete ? 'text-forest-700 font-medium' : 'text-text-muted'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              {/* Progress line */}
              <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-border -z-0">
                <div
                  className="h-full bg-forest-500 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentIndex / (statusSteps.length - 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
        {canCancel && (
          <CardFooter className="justify-between">
            <Button variant="destructive" size="sm" onClick={() => setCancelDialog(true)}>
              <XCircle className="w-3.5 h-3.5" />
              Cancel Rescue
            </Button>
            {next && (
              <Button size="sm" onClick={handleAdvanceStatus}>
                Mark as {statusLabel(next)}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text">Food Details</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Category" value={categoryLabel(listing.category)} />
            <DetailRow label="Quantity" value={`${rescue.quantity} ${listing.unit}`} />
            <DetailRow label="Storage" value={storageLabel(listing.storageRequirement)} />
            <DetailRow
              label="Pickup Deadline"
              value={formatDateTime(listing.safePickupDeadline)}
              highlight={timeLeft > 0 && timeLeft < 120}
            />
            <DetailRow label="Pickup Area" value={listing.pickupArea} />
            {listing.allergens.length > 0 && (
              <DetailRow label="Allergens" value={listing.allergens.join(', ')} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text">Parties</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-text-muted mb-1">Donor</p>
              <p className="font-medium text-text">{donorOrg?.name || 'Unknown'}</p>
              <p className="text-xs text-text-secondary">{donorOrg?.address}, {donorOrg?.area}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Recipient</p>
              <p className="font-medium text-text">{recipientOrg?.name || 'Unknown'}</p>
              <p className="text-xs text-text-secondary">{recipientOrg?.address}, {recipientOrg?.area}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Explanation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-forest-600" />
            <h3 className="text-sm font-semibold text-text">Match Explanation</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">{rescue.matchExplanation}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
            <Badge variant="outline">Score: {rescue.matchScore}%</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-text">Timeline</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <TimelineItem time={rescue.createdAt} label="Rescue created" />
            {rescue.acceptedAt && <TimelineItem time={rescue.acceptedAt} label="Accepted by recipient" />}
            {rescue.pickupScheduledAt && <TimelineItem time={rescue.pickupScheduledAt} label="Pickup scheduled" />}
            {rescue.collectedAt && <TimelineItem time={rescue.collectedAt} label="Food collected" />}
            {rescue.deliveredAt && <TimelineItem time={rescue.deliveredAt} label="Delivered successfully" />}
            {rescue.cancelledAt && <TimelineItem time={rescue.cancelledAt} label="Rescue cancelled" isNegative />}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog
        open={cancelDialog}
        onClose={() => setCancelDialog(false)}
        title="Cancel Rescue"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              Keep Rescue
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary mb-4">
          Are you sure you want to cancel this rescue? The food will be returned to available listings.
        </p>
        <Textarea
          label="Reason (optional)"
          placeholder="Why is this rescue being cancelled?"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Dialog>

      {/* Confirm Advance Dialog */}
      <Dialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        title={`Mark as ${confirmDialog ? statusLabel(confirmDialog) : ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button onClick={confirmAdvance}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          {confirmDialog === 'pickup_scheduled' && 'Confirm that a volunteer has been assigned and pickup is scheduled.'}
          {confirmDialog === 'collected' && 'Confirm that the food has been physically collected from the donor.'}
          {confirmDialog === 'delivered' && 'Confirm that the food has been delivered to the recipient. This will complete the rescue and record the impact.'}
        </p>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium ${highlight ? 'text-urgent-orange' : 'text-text'}`}>{value}</span>
    </div>
  );
}

function TimelineItem({
  time,
  label,
  isNegative,
}: {
  time: string;
  label: string;
  isNegative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${isNegative ? 'bg-red-400' : 'bg-forest-400'}`}
      />
      <div className="flex-1 flex items-center justify-between">
        <span className={`text-sm ${isNegative ? 'text-red-600' : 'text-text'}`}>{label}</span>
        <span className="text-xs text-text-muted">{formatDateTime(time)}</span>
      </div>
    </div>
  );
}
