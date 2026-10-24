-- ==============================================================================
-- FreshLoop AI — Supabase Database Migration & Row Level Security (RLS)
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Types
CREATE TYPE user_role AS ENUM ('donor', 'recipient', 'volunteer');
CREATE TYPE org_type AS ENUM ('restaurant', 'grocery', 'caterer', 'hostel', 'ngo', 'community_kitchen', 'food_bank');
CREATE TYPE food_category AS ENUM ('prepared_meals', 'bakery', 'dairy', 'produce', 'packaged', 'beverages', 'frozen');
CREATE TYPE storage_req AS ENUM ('ambient', 'refrigerated', 'frozen', 'hot_holding');
CREATE TYPE listing_status AS ENUM ('posted', 'partially_claimed', 'fully_claimed', 'expired', 'cancelled');
CREATE TYPE rescue_status AS ENUM ('accepted', 'pickup_scheduled', 'collected', 'delivered', 'cancelled');
CREATE TYPE pickup_status AS ENUM ('assigned', 'picked_up', 'delivered', 'cancelled');

-- 3. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT ('org-' || uuid_generate_v4()::text),
    name TEXT NOT NULL,
    type org_type NOT NULL,
    address TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bangalore',
    contact_phone TEXT NOT NULL,
    categories food_category[] NOT NULL DEFAULT '{}',
    storage_capabilities storage_req[] NOT NULL DEFAULT '{ambient}',
    max_capacity_kg NUMERIC(10, 2) NOT NULL DEFAULT 100,
    operating_hours TEXT NOT NULL DEFAULT '9:00 AM – 9:00 PM',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Users Table (Profile linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT ('user-' || uuid_generate_v4()::text),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    avatar_initials TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Food Listings Table
CREATE TABLE IF NOT EXISTS public.food_listings (
    id TEXT PRIMARY KEY DEFAULT ('listing-' || uuid_generate_v4()::text),
    donor_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    category food_category NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    available_quantity NUMERIC(10, 2) NOT NULL CHECK (available_quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    prepared_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    safe_pickup_deadline TIMESTAMPTZ NOT NULL,
    pickup_area TEXT NOT NULL,
    storage_requirement storage_req NOT NULL DEFAULT 'ambient',
    allergens TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    status listing_status NOT NULL DEFAULT 'posted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT safe_pickup_before_expiry CHECK (safe_pickup_deadline <= expires_at),
    CONSTRAINT available_le_total CHECK (available_quantity <= quantity)
);

-- 6. Rescue Requests Table
CREATE TABLE IF NOT EXISTS public.rescue_requests (
    id TEXT PRIMARY KEY DEFAULT ('rescue-' || uuid_generate_v4()::text),
    listing_id TEXT NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    status rescue_status NOT NULL DEFAULT 'accepted',
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_explanation TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    pickup_scheduled_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    volunteer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Pickup Assignments Table
CREATE TABLE IF NOT EXISTS public.pickup_assignments (
    id TEXT PRIMARY KEY DEFAULT ('pickup-' || uuid_generate_v4()::text),
    rescue_request_id TEXT NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
    volunteer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scheduled_pickup_time TIMESTAMPTZ NOT NULL,
    actual_pickup_time TIMESTAMPTZ,
    delivery_time TIMESTAMPTZ,
    notes TEXT,
    status pickup_status NOT NULL DEFAULT 'assigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Impact Records Table (Derived from completed rescues)
CREATE TABLE IF NOT EXISTS public.impact_records (
    id TEXT PRIMARY KEY DEFAULT ('impact-' || uuid_generate_v4()::text),
    rescue_request_id TEXT NOT NULL UNIQUE REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
    listing_id TEXT NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
    donor_org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    category food_category NOT NULL,
    quantity_kg NUMERIC(10, 2) NOT NULL CHECK (quantity_kg > 0),
    estimated_meals NUMERIC(10, 2) NOT NULL CHECK (estimated_meals >= 0),
    estimated_co2_saved_kg NUMERIC(10, 2) NOT NULL CHECK (estimated_co2_saved_kg >= 0),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.food_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_expiry ON public.food_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_listings_donor ON public.food_listings(donor_id);
CREATE INDEX IF NOT EXISTS idx_rescues_listing ON public.rescue_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_rescues_recipient ON public.rescue_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_rescues_status ON public.rescue_requests(status);
CREATE INDEX IF NOT EXISTS idx_impact_completed ON public.impact_records(completed_at);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_records ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies
-- Organizations: Verified orgs readable by authenticated users
CREATE POLICY "Organizations are viewable by all verified users"
    ON public.organizations FOR SELECT
    TO authenticated, anon
    USING (true);

-- Food Listings:
-- Everyone can read active/posted food listings
CREATE POLICY "Active listings are viewable by everyone"
    ON public.food_listings FOR SELECT
    TO authenticated, anon
    USING (status IN ('posted', 'partially_claimed', 'fully_claimed'));

-- Donors can insert new listings for their own organization
CREATE POLICY "Donors can create listings"
    ON public.food_listings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = donor_id);

-- Donors can update their own listings
CREATE POLICY "Donors can update own listings"
    ON public.food_listings FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = donor_id);

-- Rescue Requests:
-- Recipients can view their own rescues, donors can view rescues for their listings, volunteers can view assigned
CREATE POLICY "Users can view relevant rescue requests"
    ON public.rescue_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = recipient_id
        OR auth.uid()::text = volunteer_id
        OR auth.uid()::text IN (SELECT donor_id FROM public.food_listings WHERE id = listing_id)
    );

-- Recipients can create rescue requests for active listings
CREATE POLICY "Recipients can create rescue requests"
    ON public.rescue_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = recipient_id);

-- Involved parties can update rescue status
CREATE POLICY "Parties can update rescue requests"
    ON public.rescue_requests FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = recipient_id
        OR auth.uid()::text = volunteer_id
        OR auth.uid()::text IN (SELECT donor_id FROM public.food_listings WHERE id = listing_id)
    );

-- Impact records: Publicly verifiable ledger of completed rescues
CREATE POLICY "Impact records are readable by all"
    ON public.impact_records FOR SELECT
    TO authenticated, anon
    USING (true);
