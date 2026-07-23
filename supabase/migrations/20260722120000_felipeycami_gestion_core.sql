-- Migration: Core Schema for F&C Management Dashboard (Fase A)
-- Creates management tables and alters rsvp_responses for reconciliation

-- 1. WEDDING GUESTS
CREATE TABLE IF NOT EXISTS public.wedding_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name_normalized TEXT NOT NULL,
    phone_e164 TEXT,
    group_name TEXT NOT NULL DEFAULT 'General',
    family_side TEXT NOT NULL DEFAULT 'Compartido',
    guest_category TEXT NOT NULL DEFAULT 'Adulto',
    invitation_status TEXT NOT NULL DEFAULT 'not_sent',
    attendance_status TEXT NOT NULL DEFAULT 'pending',
    rsvp_id UUID,
    dietary_type TEXT,
    dietary_detail TEXT,
    reconfirmation_status TEXT NOT NULL DEFAULT 'pending',
    reconfirmed_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    table_id UUID,
    replacement_for_guest_id UUID REFERENCES public.wedding_guests(id) ON DELETE SET NULL,
    guest_status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

-- 2. WEDDING TABLES
CREATE TABLE IF NOT EXISTS public.wedding_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 10,
    table_type TEXT NOT NULL DEFAULT 'round_guest',
    zone TEXT NOT NULL DEFAULT 'Principal',
    position_x NUMERIC NOT NULL DEFAULT 0,
    position_y NUMERIC NOT NULL DEFAULT 0,
    width NUMERIC NOT NULL DEFAULT 120,
    height NUMERIC NOT NULL DEFAULT 120,
    rotation NUMERIC NOT NULL DEFAULT 0,
    locked BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign Key from Guests to Tables
ALTER TABLE public.wedding_guests 
    ADD CONSTRAINT fk_guest_table FOREIGN KEY (table_id) REFERENCES public.wedding_tables(id) ON DELETE SET NULL;

-- 3. SEATING ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.seating_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID UNIQUE NOT NULL REFERENCES public.wedding_guests(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.wedding_tables(id) ON DELETE CASCADE,
    seat_number INTEGER,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'En negociación',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    concept TEXT NOT NULL,
    category TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CLP',
    budget_amount NUMERIC,
    contracted_amount NUMERIC,
    tax_rate NUMERIC,
    total_amount NUMERIC,
    payment_status TEXT NOT NULL DEFAULT 'Pendiente',
    due_date DATE,
    responsible TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. EXPENSE PAYMENTS
CREATE TABLE IF NOT EXISTS public.expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    amount NUMERIC,
    currency TEXT NOT NULL DEFAULT 'CLP',
    payment_date DATE,
    payment_type TEXT,
    status TEXT NOT NULL DEFAULT 'Pagado',
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. GUEST CONTACT EVENTS
CREATE TABLE IF NOT EXISTS public.guest_contact_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES public.wedding_guests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    notes TEXT,
    actor TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. SYNC OUTBOX
CREATE TABLE IF NOT EXISTS public.sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    target TEXT NOT NULL DEFAULT 'google_sheets',
    operation TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- 9. SYNC CONFLICTS
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    actor TEXT,
    origin TEXT NOT NULL DEFAULT 'dashboard',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ADMIN PROFILES
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. ALTER RSVP RESPONSES FOR RECONCILIATION
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_responses' AND column_name='guest_id') THEN
        ALTER TABLE public.rsvp_responses ADD COLUMN guest_id UUID REFERENCES public.wedding_guests(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_responses' AND column_name='reconciliation_status') THEN
        ALTER TABLE public.rsvp_responses ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'unmatched';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_responses' AND column_name='reconciliation_notes') THEN
        ALTER TABLE public.rsvp_responses ADD COLUMN reconciliation_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_responses' AND column_name='version') THEN
        ALTER TABLE public.rsvp_responses ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rsvp_responses' AND column_name='updated_by') THEN
        ALTER TABLE public.rsvp_responses ADD COLUMN updated_by TEXT;
    END IF;
END $$;

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_wedding_guests_phone ON public.wedding_guests(phone_e164);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_status ON public.wedding_guests(guest_status);
CREATE INDEX IF NOT EXISTS idx_wedding_guests_table ON public.wedding_guests(table_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_reconciliation ON public.rsvp_responses(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON public.sync_outbox(status);
