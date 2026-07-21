# 00 — Executive Summary

Status: **Complete**

## Objective

Establish the verified current state of the Felipe & Camila wedding platform before redesigning, restructuring data flows or changing production.

## Confirmed baseline

- **Production domain:** `felipeycami.cl`
- **Repository:** `FelipeValgreen/felipe-camila-wedding`
- **Default production branch:** `main` (verified on GitHub and Vercel)
- **Current implementation:** A static HTML experience utilizing vanilla JS and CSS, integrating Supabase for RSVP storage, photo upload, trivia, song requests, and a background music widget.

## Required outcome

This audit establishes a solid foundation for the future Next.js/React rebuild by documenting all technical details, database schemas, security vulnerabilities, performance issues, and asset inventories.

## Decision matrix

| Finding | Evidence | Impact | Complexity | Risk | Priority | Acceptance criterion |
|---|---|---:|---:|---:|---:|---|
| Monolithic front-end architecture | `index.html` exceeds 87KB and contains multiple large inline `<script>` blocks. | Poor scalability, high risk of regression, hard to maintain. | Medium | Medium | P1 | Migrate to Next.js component-based structure. |
| Hardcoded client credentials | `js/supabase-client.js` contains exposed client config and Web3Forms keys. | Minor abuse risk (spammable endpoints). | Low | Low | P2 | Move keys to environment variables. |
| Permissive database Row Level Security | `supabase_migration.sql` contains `USING (true)` policies for public selects/inserts. | Public enumeration of guest list and spoofing RSVPs. | Low | High | P0 | Restrict DB reads/writes to verified codes using tokens. |
| Open storage bucket access | `debug_storage.js` shows unrestricted public uploads and list permissions. | Risk of malicious uploads or storage abuse. | Medium | High | P0 | Enforce file size/type validation and restrict storage bucket RLS. |

## Explicit exclusions

This audit does not authorize code changes, deployments, database mutations, asset replacement or production configuration changes.
