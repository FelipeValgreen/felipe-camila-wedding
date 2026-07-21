# 04 — Supabase Schema

Status: **Complete**

## Project identification

- **Project URL:** `https://mwumnywbvjxekskfrlms.supabase.co` [VERIFIED LIVE]
- **Client key scope:** Publishable Anon Key (`sb_publishable_fd17si3...`) [VERIFIED REPOSITORY]
- **CLI link status:** Unlinked [UNVERIFIED]

## Database inventory [VERIFIED LIVE via direct API schema inspection]

### Tables

#### `guest_list`
- **Status:** **NOT PRESENT** in live schema database cache (triggers table not found error on query) [VERIFIED LIVE].
- **Expected Columns in SQL:** `id` (uuid), `created_at` (timestamptz), `code` (text, unique), `first_name` (text), `last_name` (text), `passes` (int4) [VERIFIED REPOSITORY].
- **Note:** Passes column is **REMOVED** from the target guest-facing model.

#### `rsvp_guests`
- **Status:** **PRESENT** in live schema [VERIFIED LIVE].
- **Verified Columns on Live DB:** `id`, `created_at`, `name`, `email`, `whatsapp`, `has_partner`, `partner_name` [VERIFIED LIVE].
- **Missing Columns in Live DB (Expected in SQL):** `dietary_restrictions`, `partner_dietary` [VERIFIED LIVE - NOT PRESENT].
- **Note:** `passes` is not present in this table.

#### `guest_photos`
- **Status:** **PRESENT** in live schema [VERIFIED LIVE].
- **Verified Columns on Live DB:** `id`, `url`, `uploader_name`, `created_at` [VERIFIED LIVE].
- **Missing Columns in Live DB (Expected in SQL):** `event_type`, `album`, `approved`, `visible_in_gallery`, `notes` [VERIFIED LIVE - NOT PRESENT].

#### `song_requests`
- **Status:** **PRESENT** in live schema [VERIFIED LIVE].
- **Verified Columns on Live DB:** `id`, `created_at`, `song_name`, `artist_name`, `requester_name` [VERIFIED LIVE].

## Data model requirements

- RSVP is individual: Each record in `rsvp_guests` represents one person.
- Separation of concerns: Historical civil-wedding photos and files should be pre-tagged with `album = 'civil'` to avoid mixing with the active religious event photos.
