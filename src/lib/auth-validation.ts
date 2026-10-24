// ──────────────────────────────────────────────
// FreshLoop AI — Authentication & Authorization Rules
// ──────────────────────────────────────────────

import type { UserRole, RescueStatus } from './types';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: UserRole;
  organizationName?: string;
  phone?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must include at least one number' };
  }
  return { isValid: true };
}

export function validateRegistration(input: RegisterInput): ValidationResult {
  const errors: Record<string, string> = {};

  // Full name
  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters)';
  }

  // Email
  if (!input.email || !validateEmail(input.email)) {
    errors.email = 'Please provide a valid email address';
  }

  // Password
  const pwdCheck = validatePassword(input.password || '');
  if (!pwdCheck.isValid) {
    errors.password = pwdCheck.message || 'Invalid password';
  }

  // Confirm password
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Role validation: Admin role NEVER allowed during registration
  const allowedPublicRoles: UserRole[] = ['donor', 'recipient', 'volunteer'];
  if (!allowedPublicRoles.includes(input.role)) {
    errors.role = 'Administrator role cannot be selected during public registration';
  }

  // Organization name required for donor and recipient
  if ((input.role === 'donor' || input.role === 'recipient') && (!input.organizationName || input.organizationName.trim().length < 2)) {
    errors.organizationName = 'Organization or business name is required for donors and recipients';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Route permission matrix
export const ROLE_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': ['donor', 'recipient', 'volunteer', 'admin'],
  '/dashboard/add-food': ['donor', 'admin'],
  '/dashboard/opportunities': ['recipient', 'admin'],
  '/dashboard/decision-room': ['donor', 'recipient', 'volunteer', 'admin'],
  '/dashboard/volunteer': ['volunteer', 'admin'],
  '/dashboard/impact': ['donor', 'recipient', 'volunteer', 'admin'],
  '/dashboard/settings': ['donor', 'recipient', 'volunteer', 'admin'],
  '/dashboard/admin': ['admin'],
};

export function isAuthorizedForRoute(role: UserRole, pathname: string): boolean {
  // Sort routes by length descending so subroutes like /dashboard/opportunities
  // take precedence over parent routes like /dashboard
  const sortedEntries = Object.entries(ROLE_ROUTE_PERMISSIONS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [route, allowedRoles] of sortedEntries) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return allowedRoles.includes(role);
    }
  }
  return true;
}

// State machine transition verification
export function isPermittedRescueTransition({
  role,
  currentStatus,
  targetStatus,
  isAssignedVolunteer = false,
  isListingDonor = false,
  isRecipient = false,
}: {
  role: UserRole;
  currentStatus: RescueStatus;
  targetStatus: RescueStatus;
  isAssignedVolunteer?: boolean;
  isListingDonor?: boolean;
  isRecipient?: boolean;
}): { permitted: boolean; reason?: string } {
  if (role === 'admin') {
    return { permitted: true };
  }

  // Cancellations
  if (targetStatus === 'cancelled') {
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
      return { permitted: false, reason: `Cannot cancel a rescue that is already ${currentStatus}` };
    }
    if (isRecipient || isListingDonor || isAssignedVolunteer) {
      return { permitted: true };
    }
    return { permitted: false, reason: 'Only the recipient, donor, or assigned volunteer can cancel this rescue' };
  }

  // Forward lifecycle transitions
  if (currentStatus === 'accepted' && targetStatus === 'pickup_scheduled') {
    if (role === 'volunteer' || isRecipient) {
      return { permitted: true };
    }
    return { permitted: false, reason: 'Only a volunteer or recipient can schedule pickup' };
  }

  if (currentStatus === 'pickup_scheduled' && targetStatus === 'collected') {
    if (role === 'volunteer' && isAssignedVolunteer) {
      return { permitted: true };
    }
    if (isListingDonor) {
      return { permitted: true };
    }
    return { permitted: false, reason: 'Only the assigned volunteer or donor can confirm food collection' };
  }

  if (currentStatus === 'collected' && targetStatus === 'delivered') {
    if (role === 'volunteer' && isAssignedVolunteer) {
      return { permitted: true };
    }
    if (isRecipient) {
      return { permitted: true };
    }
    return { permitted: false, reason: 'Only the assigned volunteer or recipient can confirm final handover' };
  }

  return {
    permitted: false,
    reason: `Invalid lifecycle transition from ${currentStatus} to ${targetStatus}`,
  };
}
