# WhatsApp Data Model Specification

This specification documents the fields, relationships, indexes, and RLS policies for the database tables supporting the WhatsApp AI Concierge.

---

## 1. Table Definitions

### 1.1 `public.conversation_threads`
Tracks active thread per phone number/guest.
- `id` (uuid, primary key): Unique identifier.
- `guest_id` (uuid, foreign key, nullable): References `public.guest_list(id)`.
- `phone_number` (text, unique): Normalized phone number in E.164 format.
- `ai_paused` (boolean, default false): Controls whether AI responses are suppressed.
- `paused_until` (timestamptz, nullable): Expiration timestamp for operator locks.
- `created_at` / `updated_at`: Metadata timestamps.

### 1.2 `public.conversation_messages`
Stores the complete chronological dialog history.
- `id` (uuid, primary key).
- `thread_id` (uuid, foreign key): References `public.conversation_threads(id)`.
- `meta_message_id` (text, unique, nullable): Unique identifier returned by Meta.
- `direction` (text): `inbound` or `outbound`.
- `sender_type` (text): `guest`, `ai`, `operator`, or `system`.
- `message_type` (text): `text`, `image`, or `audio`.
- `text_content` (text, nullable): Text content.
- `media_url` (text, nullable): URL pointing to storage bucket.
- `created_at` (timestamptz).

### 1.3 `public.human_handoffs`
Tracks threads handed over to human operators.
- `id` (uuid, primary key).
- `thread_id` (uuid, foreign key): References `public.conversation_threads(id)`.
- `status` (text): `open`, `resolved`, or `escalated`.
- `urgency` (text): `normal` or `urgent`.
- `reason_code` (text): Code representing handoff category.
- `guest_summary` (text, nullable): AI-generated summary of context.
- `assigned_to` (text, nullable): Assigned operator identifier.
- `created_at` (timestamptz).
- `resolved_at` (timestamptz, nullable).

---

## 2. Security & RLS Policies

All tables have RLS enabled. No client-side browser requests are permitted to query these tables (anonymous access is denied). Only authenticated service roles and server actions may access or modify these tables.
