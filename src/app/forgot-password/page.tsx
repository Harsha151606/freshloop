'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Leaf, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { validateEmail } from '@/lib/auth-validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !validateEmail(email)) {
      setError('Please provide a valid email address');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-forest-600 transition-colors mb-6 mx-auto block w-fit">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
        <Link href="/" className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 bg-forest-600 rounded-[var(--radius-md)] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-text">
            Fresh<span className="text-forest-600">Loop</span>{' '}
            <span className="text-lime-500 text-xs font-semibold">AI</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-text">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Enter your registered email and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center mx-auto text-forest-700">
                <CheckCircle2 className="w-6 h-6 text-forest-600" />
              </div>
              <h3 className="text-lg font-semibold text-text">Check your inbox</h3>
              <p className="text-sm text-text-secondary">
                We sent a secure password reset link to <strong className="text-text">{email}</strong>.
                Please click the link in the email to set a new password.
              </p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="primary" className="w-full">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <Input
                label="Email address"
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full flex items-center justify-center"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending reset link...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
