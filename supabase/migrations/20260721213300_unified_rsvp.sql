-- SQL Migration: Unified RSVP Foundation
-- File: supabase/migrations/20260721213300_unified_rsvp.sql

CREATE TABLE IF NOT EXISTS public.rsvp_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name_normalized TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    attendance_status TEXT NOT NULL CHECK (attendance_status IN ('attending', 'not_attending', 'pending')),
    dietary_type TEXT NULL,
    dietary_detail TEXT NULL,
    source TEXT NOT NULL CHECK (source IN ('web', 'whatsapp', 'manual')),
    first_response_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reconfirmation_status TEXT NOT NULL DEFAULT 'not_started' CHECK (reconfirmation_status IN ('not_started', 'pending', 'confirmed', 'changed', 'not_required')),
    reconfirmed_at TIMESTAMPTZ NULL,
    sheet_row_number INTEGER NULL,
    sheet_sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sheet_sync_status IN ('pending', 'synced', 'failed')),
    manage_token_hash TEXT NULL,
    last_whatsapp_message_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate confirmations per person/phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_responses_phone_name ON public.rsvp_responses (phone_e164, full_name_normalized);

CREATE TABLE IF NOT EXISTS public.rsvp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rsvp_id UUID NOT NULL REFERENCES public.rsvp_responses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('web', 'whatsapp', 'manual', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    phone_e164 TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_message_id TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.whatsapp_processed_messages (
    message_id TEXT PRIMARY KEY,
    phone_e164 TEXT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance & maintenance
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_phone ON public.rsvp_responses(phone_e164);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_attendance ON public.rsvp_responses(attendance_status);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_sync ON public.rsvp_responses(sheet_sync_status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires ON public.whatsapp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_processed_messages_expires ON public.whatsapp_processed_messages(expires_at);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS 4678
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
4678 language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_rsvp_responses ON public.rsvp_responses;
CREATE TRIGGER set_updated_at_rsvp_responses
BEFORE UPDATE ON public.rsvp_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_whatsapp_sessions ON public.whatsapp_sessions;
CREATE TRIGGER set_updated_at_whatsapp_sessions
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
