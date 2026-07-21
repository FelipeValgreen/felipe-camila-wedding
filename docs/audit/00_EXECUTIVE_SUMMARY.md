# 00 — Executive Summary

Status: **Complete**

## Objective

Establish the verified current state of the Felipe & Camila wedding platform before redesigning, restructuring data flows or changing production.

## Confirmed baseline

- **Production domain:** `felipeycami.cl` [VERIFIED LIVE via DNS and HTTP header checks]
- **Repository:** `FelipeValgreen/felipe-camila-wedding` [VERIFIED REPOSITORY via git remote]
- **Default production branch:** `main` [VERIFIED REPOSITORY via git branch tracks]
- **Hosting environment:** Vercel [VERIFIED LIVE via server headers]

## Required outcome

This dossier presents a comprehensive audit of the legacy monolithic platform, correcting previous evidence gaps and distinguishing verified live settings from code inferences.

## Decision matrix

| Finding | Evidence | Impact | Complexity | Risk | Priority | Acceptance criterion |
|---|---|---:|---:|---:|---:|---|
| Monolithic codebase | `index.html` size is 87KB, containing inline scripts [VERIFIED REPOSITORY] | Low maintainability, blocking scripts | Medium | Medium | P1 | Migrate to Next.js modular component framework |
| Exposed database credentials | Client-side keys in `js/supabase-client.js` [VERIFIED REPOSITORY] | Key abuse, DDoS vector | Low | Low | P2 | Move keys to server-side env variables |
| Missing database tables | `guest_list` table is missing in live cache [VERIFIED LIVE via API test] | Code validation fails on live site | Low | High | P0 | Execute migrations to create table |
| Inconsistent table schema | `guest_photos` lacks metadata columns `approved` and `album` [VERIFIED LIVE via select * query] | Photo categorization fails or is unmoderated | Low | High | P0 | Re-run SQL migrations to align schema |
| Permissive database policies | Public SELECT is open on `rsvp_guests` [VERIFIED LIVE via direct fetch] | Unauthenticated guests can read other RSVPs | Low | High | P0 | Enforce strict RLS policies on all tables |
| Unrestricted bucket access | `wedding-photos` bucket allows public uploads [VERIFIED LIVE via storage list] | Risk of bucket abuse and spam | Medium | High | P0 | Restrict upload permissions using secure JWT |
