# Data Migration Plan

This plan outlines the secure schema transition, data preservation, and testing procedures for the Supabase database.

## 1. Migration Strategy & Schema Evolution

We will migrate the existing tables to reinforce security (RLS) and referential integrity (foreign keys).

### Database Schema Target (Evolution from legacy)

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Guest List (Source of truth for authorized codes)
create table if not exists public.guest_list (
    id uuid default gen_random_uuid() primary key,
    code text not null unique,
    first_name text not null,
    last_name text not null,
    passes int4 not null default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index on code lookup
create index if not exists idx_guest_list_code on public.guest_list(code);

-- 2. RSVP Guests (Now referencing guest_list via foreign key)
create table if not exists public.rsvp_guests (
    id uuid default gen_random_uuid() primary key,
    guest_id uuid references public.guest_list(id) on delete cascade not null,
    attending boolean not null,
    dietary_restrictions text not null default 'Ninguna',
    whatsapp text not null,
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Guest Photos (Adding approval status & album tagging)
create table if not exists public.guest_photos (
    id uuid default gen_random_uuid() primary key,
    url text not null unique,
    uploader_name text not null,
    event_type text not null default 'wedding', -- 'civil' or 'wedding'
    album text not null default 'Invitados',
    approved boolean not null default false,
    visible_in_gallery boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for gallery filters
create index if not exists idx_guest_photos_gallery on public.guest_photos(approved, visible_in_gallery);
```

---

## 2. Backup & Export Procedure

Before performing any database modifications, a full JSON backup of the active database will be exported.

### Commands to Run (Admin Access required)
```bash
# 1. Export tables to JSON format using Supabase CLI or curl endpoints
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" https://mwumnywbvjxekskfrlms.supabase.co/rest/v1/guest_list > backup_guest_list.json
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" https://mwumnywbvjxekskfrlms.supabase.co/rest/v1/rsvp_guests > backup_rsvp_guests.json
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" https://mwumnywbvjxekskfrlms.supabase.co/rest/v1/guest_photos > backup_guest_photos.json
```

---

## 3. Data Transformation & Validation (Dry-Run)

A local dockerized PostgreSQL instance will be instantiated to test the migrations:
1. Load `backup_guest_list.json` and `backup_rsvp_guests.json`.
2. Execute the schema evolution migration script.
3. Validate that:
   - Foreign key relations map correctly from `rsvp_guests.guest_id` to `guest_list.id`.
   - All historical photos are tagged as `event_type = 'civil'` where their original creation dates are prior to the active religious wedding project.
   - Zero rows are lost or corrupted.

---

## 4. Rollback Plan

If a database lock occurs or a migration fails in production:
1. Revert target database DDL to original state.
2. Restore table values using exported backup files.
3. Re-verify the legacy client endpoint functions correctly.
