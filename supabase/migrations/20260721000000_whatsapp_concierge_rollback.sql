-- Rollback Migration: WhatsApp AI Concierge Schema
-- Timestamp: 2026-07-21 00:00:00 UTC

alter table if exists public.conversation_messages disable row level security;
alter table if exists public.conversation_threads disable row level security;
alter table if exists public.human_handoffs disable row level security;
alter table if exists public.approved_knowledge disable row level security;
alter table if exists public.idempotency_records disable row level security;

drop table if exists public.conversation_messages cascade;
drop table if exists public.human_handoffs cascade;
drop table if exists public.conversation_threads cascade;
drop table if exists public.approved_knowledge cascade;
drop table if exists public.idempotency_records cascade;
