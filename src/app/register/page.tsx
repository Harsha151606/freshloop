'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Leaf,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Utensils,
  HandHeart,
  Truck,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { createClient } from '@/utils/supabase/client';
import { validateRegistration } from '@/lib/auth-validation';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('donor');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  // Password rules check for live visual guidance
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Front-end validation
    const validation = validateRegistration({
      fullName,
      email,
      password,
      confirmPassword,
      role,
      organizationName,
      phone,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});
    setLoading(true);

    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
            organization_name: organizationName.trim(),
            phone: phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setGeneralError('This email address is already registered. Please log in instead.');
        } else {
          setGeneralError(error.message);
        }
        setLoading(false);
        return;
      }

      // Check if session was created automatically (auto-confirm enabled) or confirmation needed
      if (data.session) {
        await refreshUser();
        router.push('/dashboard');
      } else {
        setRegisteredEmail(email.trim());
      }
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
          <Card className="p-8 text-center">
            <div className="w-14 h-14 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4 text-forest-700">
              <CheckCircle2 className="w-8 h-8 text-forest-600" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Check your email</h2>
            <p className="text-sm text-text-secondary mb-6">
              We sent a verification link to <strong className="text-text">{registeredEmail}</strong>.
              Click the link to verify your account and activate your organization profile.
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button variant="primary" className="w-full">
                  Go to Login
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="ghost" className="w-full text-xs text-text-muted">
                  Or explore Demo Mode meanwhile
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-forest-600 rounded-[var(--radius-md)] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-text">
            Fresh<span className="text-forest-600">Loop</span>{' '}
            <span className="text-lime-500 text-xs font-semibold">AI</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-text">
          Create an Account
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Join FreshLoop to rescue surplus food and empower your community.{' '}
          <Link href="/login" className="font-medium text-forest-600 hover:text-forest-700 underline underline-offset-2">
            Already registered? Log in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <Card className="p-6 sm:p-8">
          {generalError && (
            <div className="mb-6 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-sm text-red-700">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>{generalError}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Account Type Selection */}
            <div>
              <label className="block text-sm font-medium text-text mb-2.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('donor')}
                  className={`p-3.5 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === 'donor'
                      ? 'border-forest-600 bg-forest-50/70 ring-1 ring-forest-600'
                      : 'border-border bg-white hover:border-forest-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Utensils className="w-4 h-4 text-forest-600" />
                    <span className="text-sm font-semibold text-text">Food Donor</span>
                  </div>
                  <p className="text-xs text-text-secondary">Restaurants, bakeries, caterers, groceries</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('recipient')}
                  className={`p-3.5 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === 'recipient'
                      ? 'border-forest-600 bg-forest-50/70 ring-1 ring-forest-600'
                      : 'border-border bg-white hover:border-forest-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <HandHeart className="w-4 h-4 text-lime-600" />
                    <span className="text-sm font-semibold text-text">Recipient</span>
                  </div>
                  <p className="text-xs text-text-secondary">NGOs, shelters, community kitchens, food banks</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('volunteer')}
                  className={`p-3.5 rounded-[var(--radius-md)] border text-left cursor-pointer transition-all ${
                    role === 'volunteer'
                      ? 'border-forest-600 bg-forest-50/70 ring-1 ring-forest-600'
                      : 'border-border bg-white hover:border-forest-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-text">Volunteer</span>
                  </div>
                  <p className="text-xs text-text-secondary">Pickup & delivery dispatch coordinators</p>
                </button>
              </div>
              {formErrors.role && <p className="text-xs text-red-600 mt-1.5">{formErrors.role}</p>}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                id="fullName"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={formErrors.fullName}
              />

              <Input
                label="Email Address"
                id="email"
                type="email"
                required
                placeholder="jane@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={formErrors.email}
              />
            </div>

            {/* Organization Name (For Donors and Recipients) */}
            {role !== 'volunteer' && (
              <Input
                label={role === 'donor' ? 'Business or Restaurant Name' : 'Organization or NGO Name'}
                id="organizationName"
                required
                placeholder={role === 'donor' ? 'e.g. Olive Green Bistro' : 'e.g. Hope Shelter Kitchen'}
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                error={formErrors.organizationName}
                hint="Your public organization profile will be associated with food listings and rescues."
              />
            )}

            {/* Contact Phone */}
            <Input
              label="Contact Phone Number"
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              hint="Used by dispatchers and recipients to coordinate pickup logistics."
            />

            {/* Password Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-text">
                    Password
                  </label>
                  <span className="text-xs text-text-muted">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={formErrors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Criteria Checklist */}
                {password.length > 0 && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-text-secondary bg-ivory-50 p-2.5 rounded-[var(--radius-sm)] border border-border-subtle">
                    <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-forest-700' : 'text-text-muted'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLen ? 'text-forest-600' : 'text-border'}`} />
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-forest-700' : 'text-text-muted'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? 'text-forest-600' : 'text-border'}`} />
                      Uppercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLower ? 'text-forest-700' : 'text-text-muted'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasLower ? 'text-forest-600' : 'text-border'}`} />
                      Lowercase letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNum ? 'text-forest-700' : 'text-text-muted'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasNum ? 'text-forest-600' : 'text-border'}`} />
                      At least 1 number
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={formErrors.confirmPassword}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="w-full flex items-center justify-center mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="bg-forest-50/60 rounded-[var(--radius-md)] border border-forest-100 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-forest-600 shrink-0" />
                <div className="text-xs text-text-secondary">
                  <span className="font-semibold text-text">Hackathon Demo?</span> Instant sandbox roles available.
                </div>
              </div>
              <Link href="/demo">
                <Button size="sm" variant="secondary" className="text-xs whitespace-nowrap">
                  Explore Demo
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
