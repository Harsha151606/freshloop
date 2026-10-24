'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Clock,
  MapPin,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Select,
} from '@/components/ui';
import { useCurrentUser, useFoodListings, useRescueRequests, useMounted } from '@/lib/hooks';
import { getOrganization, createRescueRequest } from '@/lib/store';
import { calculateUrgency } from '@/lib/urgency-engine';
import { matchRecipients } from '@/lib/matching-engine';
import {
  formatTimeRemaining,
  categoryLabel,
  storageLabel,
  minutesFromNow,
} from '@/lib/utils';
import type { FoodListing } from '@/lib/types';

export default function OpportunitiesPage() {
  const { user } = useCurrentUser();
  const allListings = useFoodListings();
  const rescues = useRescueRequests();
  const mounted = useMounted();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [acceptDialog, setAcceptDialog] = useState<{
    listing: FoodListing;
    quantity: string;
  } | null>(null);
  const [acceptError, setAcceptError] = useState('');
  const [acceptSuccess, setAcceptSuccess] = useState('');

  const recipientOrg = user ? getOrganization(user.organizationId) : undefined;

  const opportunities = useMemo(() => {
    return allListings
      .filter((l) => l.status === 'posted' || l.status === 'partially_claimed')
      .map((listing) => {
        const urgency = calculateUrgency(listing);
        const matches = recipientOrg
          ? matchRecipients(listing, [recipientOrg])
          : [];
        const myMatch = matches[0];
        return { listing, urgency, match: myMatch };
      })
      .filter((item) => item.urgency.isEligible)
      .filter((item) => categoryFilter === 'all' || item.listing.category === categoryFilter)
      .sort((a, b) => b.urgency.score - a.urgency.score);
  }, [allListings, recipientOrg, categoryFilter]);

  if (!mounted || !user) return null;

  const handleAccept = () => {
    if (!acceptDialog || !user) return;
    setAcceptError('');

    const qty = parseFloat(acceptDialog.quantity);
    if (isNaN(qty) || qty <= 0) {
      setAcceptError('Enter a valid quantity.');
      return;
    }
    if (qty > acceptDialog.listing.availableQuantity) {
      setAcceptError(`Only ${acceptDialog.listing.availableQuantity} ${acceptDialog.listing.unit} available.`);
      return;
    }

    const match = recipientOrg
      ? matchRecipients(acceptDialog.listing, [recipientOrg])[0]
      : null;

    const result = createRescueRequest({
      listingId: acceptDialog.listing.id,
      recipientId: user.id,
      recipientOrgId: user.organizationId,
      quantity: qty,
      matchScore: match?.score ?? 0,
      matchExplanation: match?.explanation ?? 'Direct rescue request.',
    });

    if ('error' in result) {
      setAcceptError(result.error);
      return;
    }

    setAcceptSuccess(`Successfully accepted ${qty} ${acceptDialog.listing.unit} of ${acceptDialog.listing.foodName}!`);
    setTimeout(() => {
      setAcceptDialog(null);
      setAcceptSuccess('');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Rescue Opportunities</h1>
          <p className="text-sm text-text-secondary mt-1">
            Surplus food available for rescue. Accept what your organization can handle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <Select
            options={[
              { value: 'all', label: 'All Categories' },
              ...['prepared_meals', 'bakery', 'dairy', 'produce', 'packaged', 'beverages', 'frozen'].map((c) => ({
                value: c,
                label: categoryLabel(c),
              })),
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              title="No opportunities available"
              description={
                categoryFilter !== 'all'
                  ? 'No listings match your filter. Try a different category.'
                  : 'Check back soon — new surplus food listings appear throughout the day.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {opportunities.map(({ listing, urgency, match }) => {
            const donorOrg = getOrganization(listing.organizationId);
            const existingRescue = rescues.find(
              (r) =>
                r.listingId === listing.id &&
                r.recipientId === user.id &&
                r.status !== 'cancelled' &&
                r.status !== 'delivered'
            );

            return (
              <Card key={listing.id} hover>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-text">{listing.foodName}</h3>
                        <Badge
                          variant={
                            urgency.level === 'critical'
                              ? 'urgent'
                              : urgency.level === 'high'
                                ? 'warning'
                                : 'secondary'
                          }
                        >
                          {urgency.level === 'critical' && <AlertTriangle className="w-3 h-3" />}
                          {urgency.level}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {listing.availableQuantity} {listing.unit} available
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimeRemaining(urgency.timeRemainingMinutes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {listing.pickupArea}
                        </span>
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5" />
                          {storageLabel(listing.storageRequirement)}
                        </span>
                      </div>

                      {listing.description && (
                        <p className="mt-2 text-sm text-text-secondary line-clamp-2">{listing.description}</p>
                      )}

                      {donorOrg && (
                        <p className="mt-2 text-xs text-text-muted">
                          From: {donorOrg.name} ({donorOrg.area})
                        </p>
                      )}

                      {listing.allergens.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {listing.allergens.map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px]">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Match explanation */}
                      {match && (
                        <div className="mt-3 p-2.5 bg-forest-50 border border-forest-200 rounded-[var(--radius-sm)] text-xs text-forest-700">
                          <span className="font-medium">Match ({match.score}%):</span>{' '}
                          {match.explanation}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {existingRescue ? (
                        <Link href={`/dashboard/rescue/${existingRescue.id}`}>
                          <Button variant="secondary" size="sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            View Rescue
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            setAcceptDialog({
                              listing,
                              quantity: String(listing.availableQuantity),
                            })
                          }
                        >
                          Accept Rescue
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Accept Dialog */}
      <Dialog
        open={!!acceptDialog}
        onClose={() => {
          setAcceptDialog(null);
          setAcceptError('');
          setAcceptSuccess('');
        }}
        title="Accept Rescue"
        footer={
          acceptSuccess ? null : (
            <>
              <Button variant="outline" onClick={() => setAcceptDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleAccept}>Confirm Acceptance</Button>
            </>
          )
        }
      >
        {acceptSuccess ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-forest-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-text">{acceptSuccess}</p>
          </div>
        ) : acceptDialog ? (
          <div className="space-y-4">
            <div className="p-3 bg-ivory-100 rounded-[var(--radius-md)]">
              <p className="text-sm font-medium text-text">{acceptDialog.listing.foodName}</p>
              <p className="text-xs text-text-secondary mt-1">
                {acceptDialog.listing.availableQuantity} {acceptDialog.listing.unit} available •{' '}
                {categoryLabel(acceptDialog.listing.category)} •{' '}
                {formatTimeRemaining(minutesFromNow(acceptDialog.listing.safePickupDeadline))}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Quantity to accept ({acceptDialog.listing.unit})
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                max={acceptDialog.listing.availableQuantity}
                value={acceptDialog.quantity}
                onChange={(e) =>
                  setAcceptDialog((prev) => prev ? { ...prev, quantity: e.target.value } : null)
                }
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-forest-400"
              />
              <p className="text-xs text-text-muted mt-1">
                Max: {acceptDialog.listing.availableQuantity} {acceptDialog.listing.unit}
              </p>
            </div>
            {acceptError && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{acceptError}</p>
              </div>
            )}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
