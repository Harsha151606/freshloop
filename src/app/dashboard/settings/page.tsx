'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  AlertTriangle,
  User,
  Building2,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Dialog,
} from '@/components/ui';
import { useCurrentUser, useMounted } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { getOrganization, resetDemo } from '@/lib/store';
import { orgTypeLabel } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const { isDemo } = useAuth();
  const mounted = useMounted();
  const router = useRouter();
  const [resetDialog, setResetDialog] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  if (!mounted || !user) return null;

  const org = getOrganization(user.organizationId);

  const handleReset = () => {
    resetDemo();
    setResetComplete(true);
    setTimeout(() => {
      router.push('/demo');
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          {isDemo ? 'Demo configuration and controls.' : 'Your signed-in account details and available settings.'}
        </p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-forest-600" />
            <h2 className="text-base font-semibold text-text">{isDemo ? 'Demo User' : 'Account Profile'}</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center text-base font-bold text-forest-700">
              {user.avatarInitials}
            </div>
            <div>
              <p className="font-semibold text-text">{user.name}</p>
              <p className="text-sm text-text-secondary">{user.email}</p>
              <Badge variant="success" className="mt-1 capitalize">{user.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      {org && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-forest-600" />
              <h2 className="text-base font-semibold text-text">Organization</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Name</span>
              <span className="font-medium text-text">{org.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Type</span>
              <span className="text-text">{orgTypeLabel(org.type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Area</span>
              <span className="text-text">{org.area}, {org.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Hours</span>
              <span className="text-text">{org.operatingHours}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Verified</span>
              <Badge variant={org.isVerified ? 'success' : 'outline'}>
                {org.isVerified ? 'Verified' : 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-forest-600" />
            <h2 className="text-base font-semibold text-text">AI Features</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)]">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">AI Not Configured</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Gemini API key is not set. AI features (priority explanation, CSV extraction) use
                deterministic fallback logic. Set <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">GEMINI_API_KEY</code> in
                your environment to enable AI-powered features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isDemo && (
        <>
          {/* Demo Reset */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4.5 h-4.5 text-red-500" />
            <h2 className="text-base font-semibold text-text">Reset Demo</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            Reset all demo data to its initial state. This will clear all food listings, rescue
            requests, and impact records you have created during this session.
          </p>
          <Button variant="destructive" onClick={() => setResetDialog(true)}>
            <RotateCcw className="w-4 h-4" />
            Reset All Demo Data
          </Button>
        </CardContent>
      </Card>

      {/* Reset Dialog */}
      <Dialog
        open={resetDialog}
        onClose={() => setResetDialog(false)}
        title="Reset Demo Data"
        footer={
          resetComplete ? null : (
            <>
              <Button variant="outline" onClick={() => setResetDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
                Confirm Reset
              </Button>
            </>
          )
        }
      >
        {resetComplete ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-forest-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-text">Demo data has been reset.</p>
            <p className="text-xs text-text-muted mt-1">Redirecting to demo selector...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                This will permanently delete all data created in this demo session and restore the
                initial seed data. This action cannot be undone.
              </p>
            </div>
          </div>
        )}
      </Dialog>
        </>
      )}
    </div>
  );
}
