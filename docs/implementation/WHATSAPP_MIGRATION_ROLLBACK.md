# WhatsApp Migration Rollback Plan

This document defines the rollback operations and validation metrics in case of failure during the WhatsApp AI Concierge database migration.

---

## 1. Rollback SQL Commands

In the event of a migration failure, run the following SQL script to revert all database schemas to their baseline state:

```sql
-- Disable Row Level Security policies
alter table if exists public.conversation_messages disable row level security;
alter table if exists public.conversation_threads disable row level security;
alter table if exists public.human_handoffs disable row level security;
alter table if exists public.approved_knowledge disable row level security;
alter table if exists public.idempotency_records disable row level security;

-- Drop RLS policies
drop policy if exists "Service role full access" on public.conversation_threads;
drop policy if exists "Service role full access" on public.conversation_messages;
drop policy if exists "Service role full access" on public.human_handoffs;
drop policy if exists "Service role full access" on public.approved_knowledge;
drop policy if exists "Service role full access" on public.idempotency_records;

-- Drop tables in order of dependency
drop table if exists public.conversation_messages cascade;
drop table if exists public.human_handoffs cascade;
drop table if exists public.conversation_threads cascade;
drop table if exists public.approved_knowledge cascade;
drop table if exists public.idempotency_records cascade;
```

---

## 2. Validation & Restoration Verification

After executing a rollback:
1. Verify that tables `conversation_threads`, `conversation_messages`, `human_handoffs`, `approved_knowledge`, and `idempotency_records` do not exist in the public schema cache.
2. Confirm that previous database tables (`guest_list`, `rsvp_guests`, `guest_photos`) remain intact, and verify their row counts match the values captured prior to the migration.
