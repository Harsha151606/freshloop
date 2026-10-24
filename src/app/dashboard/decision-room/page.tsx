'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Clock,
  Package,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Thermometer,
  Target,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  EmptyState,
  ProgressBar,
  StatCard,
} from '@/components/ui';
import { useCurrentUser, useFoodListings, useRescueRequests, useMounted } from '@/lib/hooks';
import { getOrganization, getRecipientOrgs } from '@/lib/store';
import { rankListingsByUrgency } from '@/lib/urgency-engine';
import { matchRecipients } from '@/lib/matching-engine';
import {
  formatTimeRemaining,
  categoryLabel,
  storageLabel,
  statusLabel,
} from '@/lib/utils';
import type { DecisionRoomItem } from '@/lib/types';

export default function DecisionRoomPage() {
  const { user } = useCurrentUser();
  const allListings = useFoodListings();
  const rescues = useRescueRequests();
  const mounted = useMounted();

  const recipientOrgs = useMemo(() => getRecipientOrgs(), []);

  const decisionItems: DecisionRoomItem[] = useMemo(() => {
    const activeListings = allListings.filter(
      (l) => l.status === 'posted' || l.status === 'partially_claimed'
    );

    const ranked = rankListingsByUrgency(activeListings);

    return ranked
      .filter((item) => item.urgency.isEligible)
      .slice(0, 10)
      .map(({ listing, urgency }) => {
        const matches = matchRecipients(listing, recipientOrgs);
        const topMatch = matches.length > 0 ? matches[0] : null;
        const currentRescue = rescues.find(
          (r) => r.listingId === listing.id && r.status !== 'cancelled' && r.status !== 'delivered'
        ) || null;
        const donorOrg = getOrganization(listing.organizationId);

        return { listing, urgency, topMatch, currentRescue, donorOrg };
      });
  }, [allListings, rescues, recipientOrgs]);

  if (!mounted || !user) return null;

  const criticalCount = decisionItems.filter((d) => d.urgency.level === 'critical').length;
  const highCount = decisionItems.filter((d) => d.urgency.level === 'high').length;
  const matchedCount = decisionItems.filter((d) => d.topMatch && d.topMatch.score >= 60).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 bg-forest-600 rounded-[var(--radius-md)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">Rescue Decision Room</h1>
        </div>
        <p className="text-sm text-text-secondary mt-1 ml-[46px]">
          Prioritized rescue opportunities with matching recommendations. Most urgent items first.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Eligible Listings"
          value={decisionItems.length}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          label="Critical Urgency"
          value={criticalCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          className={criticalCount > 0 ? 'border-red-200 bg-red-50/50' : ''}
        />
        <StatCard
          label="High Urgency"
          value={highCount}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Good Matches"
          value={matchedCount}
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* AI explanation placeholder */}
      <Card className="border-forest-200 bg-forest-50/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-forest-700 mb-1">
                Priority Analysis (Deterministic — AI not configured)
              </p>
              <p className="text-xs text-forest-600">
                {decisionItems.length > 0
                  ? `${decisionItems.length} eligible listings ranked by urgency. ${criticalCount > 0 ? `${criticalCount} critical item(s) need immediate rescue — ` : ''}Rankings are based on time to expiry, quantity, perishability, and storage requirements. ${matchedCount > 0 ? `${matchedCount} listing(s) have strong recipient matches (≥60% compatibility).` : 'Consider broadening recipient network for better matching.'}`
                  : 'No eligible listings to analyze at this time.'}
              </p>
              <p className="text-[10px] text-forest-500 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Configure GEMINI_API_KEY to enable AI-powered explanations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Items */}
      {decisionItems.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<CheckCircle2 className="w-12 h-12" />}
              title="All clear!"
              description="No eligible rescue opportunities right now. New listings will appear here when donors post surplus food."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {decisionItems.map((item, index) => (
            <DecisionCard key={item.listing.id} item={item} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionCard({ item, rank }: { item: DecisionRoomItem; rank: number }) {
  const { listing, urgency, topMatch, currentRescue, donorOrg } = item;

  const urgencyBg: Record<string, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-forest-500',
  };

  return (
    <Card className={`border-l-4 ${urgencyBg[urgency.level] || 'border-l-gray-300'}`}>
      <CardContent className="p-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left: Listing info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold text-text-muted">#{rank}</span>
              <h3 className="text-base font-semibold text-text">{listing.foodName}</h3>
              <Badge
                variant={
                  urgency.level === 'critical'
                    ? 'urgent'
                    : urgency.level === 'high'
                      ? 'warning'
                      : urgency.level === 'medium'
                        ? 'secondary'
                        : 'success'
                }
              >
                {urgency.level === 'critical' && <AlertTriangle className="w-3 h-3" />}
                {urgency.level} priority
              </Badge>
              {currentRescue && (
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3" />
                  {statusLabel(currentRescue.status)}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary mb-3">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {listing.availableQuantity}/{listing.quantity} {listing.unit}
              </span>
              <span className={`flex items-center gap-1 font-semibold urgency-${urgency.level}`}>
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

            {/* Urgency reasons */}
            <div className="space-y-1 mb-3">
              {urgency.reasons.slice(0, 3).map((reason, i) => (
                <p key={i} className="text-xs text-text-secondary">{reason}</p>
              ))}
            </div>

            <p className="text-xs text-text-muted">
              Donor: {donorOrg?.name || 'Partner Donor'} • {categoryLabel(listing.category)}
            </p>

            {/* Urgency score bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted">Urgency Score</span>
                <span className="font-semibold text-text">{urgency.score}/100</span>
              </div>
              <ProgressBar value={urgency.score} />
            </div>
          </div>

          {/* Right: Match & Action */}
          <div className="lg:w-72 shrink-0 space-y-3">
            {topMatch ? (
              <div className="p-3 bg-forest-50 border border-forest-200 rounded-[var(--radius-md)]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3.5 h-3.5 text-forest-600" />
                  <span className="text-xs font-semibold text-forest-700">Recommended Recipient</span>
                </div>
                <p className="text-sm font-medium text-text">{topMatch.recipientOrgName}</p>
                <p className="text-xs text-forest-600 mt-1">{topMatch.explanation}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-text-muted">Match Score</span>
                  <span className="text-xs font-bold text-forest-700">{topMatch.score}%</span>
                </div>
                <ProgressBar value={topMatch.score} className="mt-1" />
                <p className="text-xs text-forest-600 mt-2 font-medium">{topMatch.suggestedAction}</p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)]">
                <p className="text-xs text-amber-700 font-medium">No strong recipient match found.</p>
                <p className="text-xs text-amber-600 mt-1">Consider broadening the search area or contacting recipients directly.</p>
              </div>
            )}

            {/* Action */}
            <div className="flex gap-2">
              {currentRescue ? (
                <Link href={`/dashboard/rescue/${currentRescue.id}`} className="w-full">
                  <Button variant="secondary" size="sm" className="w-full">
                    View Rescue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/opportunities" className="w-full">
                  <Button size="sm" className="w-full">
                    Coordinate Rescue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
