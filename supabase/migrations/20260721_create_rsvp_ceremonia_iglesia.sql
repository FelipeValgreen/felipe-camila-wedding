-- Migration: Proposed Church Wedding RSVP Schema
-- File: supabase/migrations/20260721_create_rsvp_ceremonia_iglesia.sql
-- Status: PROPOSED (DO NOT APPLY AUTOMATICALLY)

-- 1. Create table rsvp_ceremonia_iglesia
CREATE TABLE IF NOT EXISTS public.rsvp_ceremonia_iglesia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confirmation_code TEXT UNIQUE NOT NULL,
    invitation_token TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('yes', 'no')),
    dietary_restriction TEXT DEFAULT 'none',
    dietary_detail TEXT,
    source TEXT DEFAULT 'web',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'confirmed', 'modified', 'cancelled')),
    whatsapp_opened_at TIMESTAMPTZ,
    whatsapp_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_rsvp_iglesia_confirmation_code ON public.rsvp_ceremonia_iglesia (confirmation_code);
CREATE INDEX IF NOT EXISTS idx_rsvp_iglesia_phone ON public.rsvp_ceremonia_iglesia (phone);

-- 3. Row Level Security (RLS) Configuration
-- Tables are closed to anon and authenticated roles. Service role accesses directly.
ALTER TABLE public.rsvp_ceremonia_iglesia ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke public access
REVOKE ALL ON public.rsvp_ceremonia_iglesia FROM anon, authenticated;

COMMENT ON TABLE public.rsvp_ceremonia_iglesia IS 'Tabla oficial de respuestas de asistencia al matrimonio religioso de Felipe y Camila (23-Oct-2026)';
