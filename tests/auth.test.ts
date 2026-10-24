// ──────────────────────────────────────────────
// FreshLoop AI — Authentication & Authorization Tests
// ──────────────────────────────────────────────

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRegistration,
  validatePassword,
  validateEmail,
  isAuthorizedForRoute,
  isPermittedRescueTransition,
} from '../src/lib/auth-validation';
import {
  getState,
  setCurrentUser,
  getCurrentUser,
  resetDemo,
} from '../src/lib/store';
import type { UserRole } from '../src/lib/types';

// ── 1. Input Validation Tests ───────────────────

test('auth: email format validator validates standard RFC emails and rejects malformed', () => {
  assert.equal(validateEmail('coordinator@freshloop.org'), true);
  assert.equal(validateEmail('user.name+tag@sub.domain.co'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('@domain.com'), false);
  assert.equal(validateEmail('user@'), false);
  assert.equal(validateEmail(''), false);
});

test('auth: password requirements enforce length, uppercase, lowercase, and numbers', () => {
  assert.equal(validatePassword('Short1!').isValid, false, 'Should fail when < 8 characters');
  assert.equal(validatePassword('nouppercase123').isValid, false, 'Should fail without uppercase');
  assert.equal(validatePassword('NOLOWERCASE123').isValid, false, 'Should fail without lowercase');
  assert.equal(validatePassword('NoNumbersHere!').isValid, false, 'Should fail without numbers');
  assert.equal(validatePassword('SecurePass123!').isValid, true, 'Should pass all criteria');
});

test('auth: registration succeeds for valid donor credentials with organization', () => {
  const result = validateRegistration({
    fullName: 'Ananya Sharma',
    email: 'ananya@harvestbistro.in',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'donor',
    organizationName: 'Harvest Bistro',
    phone: '+91 98765 43210',
  });

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test('auth: registration rejects missing organization name for donors and recipients', () => {
  const donorResult = validateRegistration({
    fullName: 'Ananya Sharma',
    email: 'ananya@harvestbistro.in',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'donor',
    organizationName: '',
  });

  assert.equal(donorResult.isValid, false);
  assert.ok(donorResult.errors.organizationName);

  const recipientResult = validateRegistration({
    fullName: 'Rajesh Kumar',
    email: 'rajesh@communitykitchen.org',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'recipient',
    organizationName: ' ',
  });

  assert.equal(recipientResult.isValid, false);
  assert.ok(recipientResult.errors.organizationName);

  // Volunteers do not require an organization name
  const volunteerResult = validateRegistration({
    fullName: 'Kiran Rao',
    email: 'kiran@courier.net',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'volunteer',
  });
  assert.equal(volunteerResult.isValid, true);
});

test('auth: registration rejects password confirmation mismatch', () => {
  const result = validateRegistration({
    fullName: 'Vikram Singh',
    email: 'vikram@greenplate.org',
    password: 'Password123!',
    confirmPassword: 'DifferentPassword123!',
    role: 'donor',
    organizationName: 'Green Plate Caterers',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.confirmPassword?.includes('Passwords do not match'));
});

// ── 2. Privilege Escalation Prevention ─────────

test('auth: attempted self-registration as administrator is strictly rejected', () => {
  const result = validateRegistration({
    fullName: 'Malicious Actor',
    email: 'hacker@exploit.io',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'admin' as UserRole,
  });

  assert.equal(result.isValid, false);
  assert.ok(
    result.errors.role?.includes('Administrator role cannot be selected'),
    'Must explicitly reject public registration for admin role'
  );
});

// ── 3. Role-Based Route Protection Matrix ──────

test('authorization: donor can access add-food but is denied recipient opportunities', () => {
  assert.equal(isAuthorizedForRoute('donor', '/dashboard'), true);
  assert.equal(isAuthorizedForRoute('donor', '/dashboard/add-food'), true);
  assert.equal(isAuthorizedForRoute('donor', '/dashboard/opportunities'), false);
  assert.equal(isAuthorizedForRoute('donor', '/dashboard/volunteer'), false);
  assert.equal(isAuthorizedForRoute('donor', '/dashboard/admin'), false);
});

test('authorization: recipient can access opportunities but is denied add-food and volunteer board', () => {
  assert.equal(isAuthorizedForRoute('recipient', '/dashboard'), true);
  assert.equal(isAuthorizedForRoute('recipient', '/dashboard/opportunities'), true);
  assert.equal(isAuthorizedForRoute('recipient', '/dashboard/add-food'), false);
  assert.equal(isAuthorizedForRoute('recipient', '/dashboard/volunteer'), false);
  assert.equal(isAuthorizedForRoute('recipient', '/dashboard/admin'), false);
});

test('authorization: volunteer can access pickup board but is denied add-food and opportunities', () => {
  assert.equal(isAuthorizedForRoute('volunteer', '/dashboard'), true);
  assert.equal(isAuthorizedForRoute('volunteer', '/dashboard/volunteer'), true);
  assert.equal(isAuthorizedForRoute('volunteer', '/dashboard/add-food'), false);
  assert.equal(isAuthorizedForRoute('volunteer', '/dashboard/opportunities'), false);
  assert.equal(isAuthorizedForRoute('volunteer', '/dashboard/admin'), false);
});

test('authorization: administrator has full access across all platform dashboards', () => {
  assert.equal(isAuthorizedForRoute('admin', '/dashboard'), true);
  assert.equal(isAuthorizedForRoute('admin', '/dashboard/add-food'), true);
  assert.equal(isAuthorizedForRoute('admin', '/dashboard/opportunities'), true);
  assert.equal(isAuthorizedForRoute('admin', '/dashboard/volunteer'), true);
  assert.equal(isAuthorizedForRoute('admin', '/dashboard/impact'), true);
  assert.equal(isAuthorizedForRoute('admin', '/dashboard/admin'), true);
});

// ── 4. Lifecycle Status Transition Permissions ──

test('transitions: volunteer cannot update unassigned rescue status to collected or delivered', () => {
  const unassignedCheck = isPermittedRescueTransition({
    role: 'volunteer',
    currentStatus: 'pickup_scheduled',
    targetStatus: 'collected',
    isAssignedVolunteer: false,
  });

  assert.equal(unassignedCheck.permitted, false);
  assert.ok(unassignedCheck.reason?.includes('assigned volunteer'));
});

test('transitions: assigned volunteer can advance pickup_scheduled -> collected -> delivered', () => {
  const step1 = isPermittedRescueTransition({
    role: 'volunteer',
    currentStatus: 'pickup_scheduled',
    targetStatus: 'collected',
    isAssignedVolunteer: true,
  });
  assert.equal(step1.permitted, true);

  const step2 = isPermittedRescueTransition({
    role: 'volunteer',
    currentStatus: 'collected',
    targetStatus: 'delivered',
    isAssignedVolunteer: true,
  });
  assert.equal(step2.permitted, true);
});

test('transitions: recipient cannot mark food as collected at donor kitchen', () => {
  const check = isPermittedRescueTransition({
    role: 'recipient',
    currentStatus: 'pickup_scheduled',
    targetStatus: 'collected',
    isRecipient: true,
  });
  assert.equal(check.permitted, false);
  assert.ok(check.reason?.includes('assigned volunteer or donor'));
});

test('transitions: non-participating stranger cannot cancel an ongoing rescue', () => {
  const strangerCheck = isPermittedRescueTransition({
    role: 'recipient',
    currentStatus: 'accepted',
    targetStatus: 'cancelled',
    isRecipient: false,
    isListingDonor: false,
    isAssignedVolunteer: false,
  });
  assert.equal(strangerCheck.permitted, false);
});

// ── 5. Demo Sandbox Isolation ──────────────────

test('demo: demo user switching is isolated to browser session without altering real accounts', () => {
  resetDemo();
  const initialState = getState();
  assert.ok(initialState.isInitialized);

  setCurrentUser({
    id: 'user-demo-custom',
    name: 'Test Demo User',
    email: 'demo@test.local',
    role: 'donor',
    organizationId: 'org-1',
    avatarInitials: 'TD',
  });

  const currentUser = getCurrentUser();
  assert.equal(currentUser?.id, 'user-demo-custom');
  assert.equal(currentUser?.role, 'donor');

  // Verify demo reset restores clean state
  resetDemo();
  const resetUser = getCurrentUser();
  assert.equal(resetUser, null);
});
