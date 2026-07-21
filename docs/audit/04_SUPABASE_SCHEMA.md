# 04 — Supabase Schema

Status: **Complete**

## Project identification

- **Project URL:** `https://mwumnywbvjxekskfrlms.supabase.co`
- **Client key scope:** Publishable Anon Key (`sb_publishable_fd17si3...`)

## Database inventory

### Tables

#### `guest_list`
- `id` (uuid, primary key)
- `code` (text, unique) - Code used by guests to log in (e.g. FAM2026)
- `first_name` (text)
- `last_name` (text)
- `passes` (int4)

#### `rsvp_guests`
- `id` (uuid, primary key)
- `code` (text) - Foreign-like key matching guest_list code
- `first_name` (text)
- `last_name` (text)
- `attending` (boolean)
- `dietary_restrictions` (text)
- `whatsapp` (text)
- `submitted_at` (timestamp)

#### `guest_photos`
- `id` (uuid, primary key)
- `url` (text) - Storage URL link
- `uploader_name` (text)
- `event_type` (text)
- `album` (text)
- `approved` (boolean, default false)
- `visible_in_gallery` (boolean, default false)
- `created_at` (timestamp)

#### `song_requests`
- `id` (uuid, primary key)
- `song_title` (text)
- `artist` (text)
- `guest_name` (text)
- `created_at` (timestamp)

## Data model requirements

- RSVP is individual: Each record in `rsvp_guests` represents one person.
- Separation of concerns: Historical civil-wedding photos and files should be pre-tagged with `album = 'civil'` to avoid mixing with the active religious event photos.
