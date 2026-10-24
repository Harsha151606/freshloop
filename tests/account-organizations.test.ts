import test from 'node:test';
import assert from 'node:assert';
import {
  ensureAccountOrganization,
  getOrganization,
  getOrganizations,
  resetDemo,
} from '../src/lib/store';

test('account organizations: donor receives a stable local organization profile', () => {
  resetDemo();
  try {
    const id = ensureAccountOrganization({
      userId: 'auth-user-donor-1',
      organizationName: 'Harsha Foods',
      role: 'donor',
    });

    assert.strictEqual(id, 'account-org-auth-user-donor-1');
    assert.strictEqual(getOrganization(id!)?.name, 'Harsha Foods');
    assert.strictEqual(getOrganization(id!)?.type, 'restaurant');

    ensureAccountOrganization({
      userId: 'auth-user-donor-1',
      organizationName: 'Harsha Foods',
      role: 'donor',
    });
    assert.strictEqual(
      getOrganizations().filter((organization) => organization.id === id).length,
      1,
      'loading the same account more than once must not duplicate its organization'
    );
  } finally {
    resetDemo();
  }
});

test('account organizations: recipient uses an NGO profile and keeps the supplied id', () => {
  resetDemo();
  try {
    const id = ensureAccountOrganization({
      userId: 'auth-user-recipient-1',
      organizationId: 'org-recipient-custom',
      organizationName: 'Hope Kitchen',
      role: 'recipient',
    });

    assert.strictEqual(id, 'org-recipient-custom');
    assert.strictEqual(getOrganization(id!)?.name, 'Hope Kitchen');
    assert.strictEqual(getOrganization(id!)?.type, 'ngo');
  } finally {
    resetDemo();
  }
});

test('account organizations: volunteers do not receive a fake organization', () => {
  resetDemo();
  try {
    const countBefore = getOrganizations().length;
    const id = ensureAccountOrganization({
      userId: 'auth-user-volunteer-1',
      role: 'volunteer',
    });

    assert.strictEqual(id, null);
    assert.strictEqual(getOrganizations().length, countBefore);
  } finally {
    resetDemo();
  }
});
