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
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index on code lookup
create index if not exists idx_guest_list_code on public.guest_list(code);

-- 2. RSVP Guests (Now referencing guest_list via foreign key, passes removed)
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
    event_type text not null default 'iglesia', -- 'civil', 'preparativos', 'iglesia', 'invitados'
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

Before performing any database modifications, a full snapshot backup of the schema, table data, and storage metadata will be executed.

### Secure Backup Script (Avoiding exposed tokens in history)
We will export using `pg_dump` via secure environment variables:
```bash
# Export schema and table data using PostgreSQL dump
pg_dump "$PG_CONNECTION_STRING" -F c -b -v -f /tmp/supabase_backup.dump

# Export Storage metadata catalog
psql "$PG_CONNECTION_STRING" -c "COPY (SELECT * FROM storage.objects) TO STDOUT WITH CSV HEADER" > /tmp/storage_objects_backup.csv

# Encrypt temporary backups for safety
gpg --symmetric --cipher-algo AES256 /tmp/supabase_backup.dump
gpg --symmetric --cipher-algo AES256 /tmp/storage_objects_backup.csv

# Remove unencrypted temporary files immediately
rm -f /tmp/supabase_backup.dump /tmp/storage_objects_backup.csv
```

---

## 3. Data Transformation & Validation (Dry-Run)

### Validation Metrics
Before applying changes, we compute metrics and record them:
- Record count of `rsvp_guests` (must match after migration).
- Record count of `guest_photos` (must match after migration).
- Compute MD5 checksums of the database dumps.

### Mapping Legacy Code-based RSVP rows
Since the old table did not have `guest_id`, we will run a mapping query to resolve guest codes to new individual guest records:
```sql
INSERT INTO public.rsvp_guests (guest_id, attending, dietary_restrictions, whatsapp, submitted_at)
SELECT gl.id, r.attending, COALESCE(r.dietary_restrictions, 'Ninguna'), r.whatsapp, r.created_at
FROM legacy_rsvp_guests r
JOIN public.guest_list gl ON gl.code = r.code;
```

---

## 4. Rollback SQL and Restoration Order

In case of failure:
1. Revert target database DDL to legacy schema.
2. Re-import data from the encrypted backup files:
   ```bash
   # Decrypt backups
   gpg -d /tmp/supabase_backup.dump.gpg > /tmp/supabase_backup.dump
   
   # Restore schema and database
   pg_restore -d "$PG_CONNECTION_STRING" --clean --no-owner /tmp/supabase_backup.dump
   
   # Delete temporary decrypted files
   rm -f /tmp/supabase_backup.dump
   ```
