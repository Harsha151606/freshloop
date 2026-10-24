-- ==============================================================================
-- FreshLoop AI — Sprint 01.5: Authentication, Profiles, Roles, and RLS
-- ==============================================================================

-- 1. Extend user_role to include 'admin'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
END $$;

-- 2. Profiles Table (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'donor' CHECK (role IN ('donor', 'recipient', 'volunteer', 'admin')),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
    organization_name TEXT,
    phone TEXT,
    avatar_initials TEXT NOT NULL DEFAULT 'FL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);

-- 3. Admin Detection Helper (Security Definer)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

-- 4. Automatic Profile Provisioning on auth.users Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_raw_role TEXT;
    v_sanitized_role TEXT;
    v_full_name TEXT;
    v_org_name TEXT;
    v_phone TEXT;
    v_initials TEXT;
    v_org_id TEXT;
BEGIN
    -- Extract metadata safely
    v_raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'donor'));
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_org_name := NEW.raw_user_meta_data->>'organization_name';
    v_phone := NEW.raw_user_meta_data->>'phone';

    -- CRITICAL SECURITY CONSTRAINT:
    -- Never permit client-selected metadata to grant 'admin' role!
    IF v_raw_role IN ('donor', 'recipient', 'volunteer') THEN
        v_sanitized_role := v_raw_role;
    ELSE
        v_sanitized_role := 'donor';
    END IF;

    -- Compute avatar initials
    IF LENGTH(v_full_name) > 0 THEN
        v_initials := UPPER(SUBSTRING(split_part(v_full_name, ' ', 1), 1, 1) ||
                            COALESCE(SUBSTRING(split_part(v_full_name, ' ', 2), 1, 1), ''));
    ELSE
        v_initials := 'FL';
    END IF;
    IF LENGTH(v_initials) = 0 THEN
        v_initials := 'FL';
    END IF;

    -- If organization name was provided during registration, provision or link organization
    IF v_org_name IS NOT NULL AND LENGTH(TRIM(v_org_name)) > 0 THEN
        v_org_id := 'org-' || SUBSTRING(NEW.id::text, 1, 8);
        INSERT INTO public.organizations (
            id, name, type, address, area, city, contact_phone, is_verified, created_at, updated_at
        ) VALUES (
            v_org_id,
            TRIM(v_org_name),
            CASE WHEN v_sanitized_role = 'donor' THEN 'restaurant'::org_type ELSE 'ngo'::org_type END,
            'Registered Address Pending',
            'Central District',
            'Bangalore',
            COALESCE(v_phone, 'Not Provided'),
            FALSE,
            timezone('utc', now()),
            timezone('utc', now())
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Insert into public.profiles
    INSERT INTO public.profiles (
        id, email, full_name, role, organization_id, organization_name, phone, avatar_initials, created_at, updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_sanitized_role,
        v_org_id,
        v_org_name,
        v_phone,
        v_initials,
        timezone('utc', now()),
        timezone('utc', now())
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc', now());

    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Prevent Role Escalation Trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- If role is changing and user is not an existing admin, block it
    IF NEW.role <> OLD.role THEN
        IF NOT public.is_admin((SELECT auth.uid())) THEN
            RAISE EXCEPTION 'Privilege escalation rejected: users cannot modify their assigned role';
        END IF;
    END IF;
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_role_update ON public.profiles;
CREATE TRIGGER check_profile_role_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 6. Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies:
-- Any authenticated user can read profiles (needed for organization rosters & volunteer/donor cards)
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile (name, phone, avatar), but NOT escalate roles
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- 7. Atomic Food Acceptance Stored Procedure
CREATE OR REPLACE FUNCTION public.accept_food_listing(
    p_listing_id TEXT,
    p_quantity NUMERIC,
    p_recipient_id UUID,
    p_recipient_org_id TEXT DEFAULT NULL,
    p_match_score INTEGER DEFAULT 85,
    p_match_explanation TEXT DEFAULT 'Algorithmic FreshLoop match based on proximity and storage compatibility'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_listing RECORD;
    v_rescue_id TEXT;
    v_new_available NUMERIC;
    v_new_status TEXT;
BEGIN
    -- Validation: Positive quantity
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Rescue quantity must be strictly greater than zero (received %)', p_quantity;
    END IF;

    -- Row Lock FOR UPDATE to prevent concurrency race conditions
    SELECT * INTO v_listing
    FROM public.food_listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Food listing % does not exist', p_listing_id;
    END IF;

    -- Status verification
    IF v_listing.status NOT IN ('posted', 'partially_claimed') THEN
        RAISE EXCEPTION 'Listing % is not available for rescue (current status: %)', p_listing_id, v_listing.status;
    END IF;

    -- Expiry check
    IF v_listing.expires_at <= timezone('utc', now()) THEN
        RAISE EXCEPTION 'Listing % has expired and cannot be rescued', p_listing_id;
    END IF;

    -- Quantity limit check
    IF v_listing.available_quantity < p_quantity THEN
        RAISE EXCEPTION 'Requested quantity (%) exceeds available inventory (%)', p_quantity, v_listing.available_quantity;
    END IF;

    -- Prevent duplicate active acceptance by same recipient
    IF EXISTS (
        SELECT 1 FROM public.rescue_requests
        WHERE listing_id = p_listing_id
          AND recipient_id = p_recipient_id::text
          AND status IN ('accepted', 'pickup_scheduled')
    ) THEN
        RAISE EXCEPTION 'Recipient % already has an active rescue claim on listing %', p_recipient_id, p_listing_id;
    END IF;

    -- Calculate remaining balance
    v_new_available := v_listing.available_quantity - p_quantity;
    IF v_new_available = 0 THEN
        v_new_status := 'fully_claimed';
    ELSE
        v_new_status := 'partially_claimed';
    END IF;

    -- Atomically update food listing
    UPDATE public.food_listings
    SET available_quantity = v_new_available,
        status = v_new_status::listing_status,
        updated_at = timezone('utc', now())
    WHERE id = p_listing_id;

    -- Atomically record rescue request
    v_rescue_id := 'rescue-' || SUBSTRING(p_listing_id, 9) || '-' || SUBSTRING(p_recipient_id::text, 1, 6);
    INSERT INTO public.rescue_requests (
        id, listing_id, recipient_id, recipient_org_id,
        quantity, status, match_score, match_explanation,
        accepted_at, created_at, updated_at
    ) VALUES (
        v_rescue_id,
        p_listing_id,
        p_recipient_id::text,
        COALESCE(p_recipient_org_id, v_listing.organization_id),
        p_quantity,
        'accepted'::rescue_status,
        p_match_score,
        p_match_explanation,
        timezone('utc', now()),
        timezone('utc', now()),
        timezone('utc', now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'rescue_id', v_rescue_id,
        'listing_id', p_listing_id,
        'claimed_quantity', p_quantity,
        'remaining_quantity', v_new_available,
        'listing_status', v_new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_food_listing(TEXT, NUMERIC, UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_food_listing(TEXT, NUMERIC, UUID, TEXT, INTEGER, TEXT) TO authenticated, service_role;
