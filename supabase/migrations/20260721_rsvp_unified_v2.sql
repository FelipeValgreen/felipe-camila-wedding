-- Phase B Database Migration: Unified RSVP System V2
-- File: supabase/migrations/20260721_rsvp_unified_v2.sql
-- Status: PROPOSED (DO NOT APPLY AUTOMATICALLY TO PRODUCTION)

-- 1. Table: wedding_guests (Master guest list)
CREATE TABLE IF NOT EXISTS public.wedding_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_master_id TEXT,
    full_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    phone_e164 TEXT,
    invitation_token_hash TEXT UNIQUE,
    group_name TEXT,
    category TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: rsvp_current (Single state per guest)
CREATE TABLE IF NOT EXISTS public.rsvp_current (
    guest_id UUID PRIMARY KEY REFERENCES public.wedding_guests(id) ON DELETE CASCADE,
    attendance TEXT CHECK (attendance IN ('yes', 'no')),
    dietary_type TEXT,
    dietary_detail TEXT,
    contact_phone_e164 TEXT,
    channel TEXT CHECK (channel IN ('web_direct', 'whatsapp_cloud', 'manual_admin')),
    status TEXT CHECK (status IN ('draft', 'whatsapp_started', 'confirmed', 'cancelled')),
    confirmed_at TIMESTAMPTZ,
    whatsapp_started_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- 3. Table: rsvp_events (Immutable audit event log)
CREATE TABLE IF NOT EXISTS public.rsvp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES public.wedding_guests(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    event_type TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: sheet_sync_queue (Outbox for Google Sheets DEV/Prod sync)
CREATE TABLE IF NOT EXISTS public.sheet_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID REFERENCES public.wedding_guests(id) ON DELETE CASCADE,
    rsvp_version INTEGER NOT NULL,
    operation TEXT CHECK (operation IN ('UPSERT', 'DELETE')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wg_normalized_name ON public.wedding_guests (normalized_name);
CREATE INDEX IF NOT EXISTS idx_wg_phone_e164 ON public.wedding_guests (phone_e164);
CREATE INDEX IF NOT EXISTS idx_wg_token_hash ON public.wedding_guests (invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sheet_sync_queue (status);

-- RLS Enforcement: Closed to public anon & authenticated access
ALTER TABLE public.wedding_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_sync_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wedding_guests FROM anon, authenticated;
REVOKE ALL ON public.rsvp_current FROM anon, authenticated;
REVOKE ALL ON public.rsvp_events FROM anon, authenticated;
REVOKE ALL ON public.sheet_sync_queue FROM anon, authenticated;
