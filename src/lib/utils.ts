import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

// Deterministic anchor timestamp for build-time static prerendering
const SSR_ANCHOR_TIME = 1777000000000;

export function getSafeNow(): number {
  if (typeof window === 'undefined') {
    return SSR_ANCHOR_TIME;
  }
  return Date.now();
}

export function getSafeDate(): Date {
  return new Date(getSafeNow());
}

export function minutesFromNow(date: string | Date): number {
  const diff = new Date(date).getTime() - getSafeNow();
  return Math.round(diff / 60000);
}

export function hoursFromNow(date: string | Date): number {
  return Math.round(minutesFromNow(date) / 60);
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Expired';
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m remaining` : `${hours}h remaining`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h remaining`;
}

let fallbackCounter = 1000;
export function generateId(): string {
  if (typeof window === 'undefined') {
    return `ssr-${++fallbackCounter}`;
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function estimateMeals(quantityKg: number, category: string): number {
  const mealsPerKg: Record<string, number> = {
    prepared_meals: 2.5,
    bakery: 3,
    dairy: 2,
    produce: 2,
    packaged: 3,
    beverages: 4,
    frozen: 2.5,
    other: 2,
  };
  return Math.round(quantityKg * (mealsPerKg[category] || 2));
}

export function estimateCO2Saved(quantityKg: number): number {
  // Approx 2.5 kg CO2 per kg of food waste avoided
  return Math.round(quantityKg * 2.5 * 10) / 10;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    prepared_meals: 'Prepared Meals',
    bakery: 'Bakery',
    dairy: 'Dairy',
    produce: 'Fresh Produce',
    packaged: 'Packaged Food',
    beverages: 'Beverages',
    frozen: 'Frozen',
    other: 'Other',
  };
  return labels[category] || category;
}

export function storageLabel(req: string): string {
  const labels: Record<string, string> = {
    ambient: 'Ambient',
    refrigerated: 'Refrigerated',
    frozen: 'Frozen',
    hot_holding: 'Hot Holding',
  };
  return labels[req] || req;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    posted: 'Posted',
    partially_claimed: 'Partially Claimed',
    fully_claimed: 'Fully Claimed',
    expired: 'Expired',
    cancelled: 'Cancelled',
    pending: 'Pending',
    accepted: 'Accepted',
    pickup_scheduled: 'Pickup Scheduled',
    collected: 'Collected',
    delivered: 'Delivered',
  };
  return labels[status] || status;
}

export function orgTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    restaurant: 'Restaurant',
    grocery: 'Grocery Store',
    caterer: 'Caterer',
    hostel: 'Hostel',
    ngo: 'NGO',
    community_kitchen: 'Community Kitchen',
    food_bank: 'Food Bank',
  };
  return labels[type] || type;
}
