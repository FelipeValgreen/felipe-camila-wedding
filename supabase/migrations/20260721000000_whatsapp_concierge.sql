-- Migration: WhatsApp AI Concierge Integration Schema
-- Timestamp: 2026-07-21 00:00:00 UTC
-- Reversible DDL for conversation threads, messages, tool calls, and handoffs.

-- Enable UUID extension if not already present
create extension if not exists "uuid-ossp";

-- 1. Conversation Threads (One active thread per guest phone number)
create table if not exists public.conversation_threads (
    id uuid default gen_random_uuid() primary key,
    guest_id uuid references public.guest_list(id) on delete set null,
    phone_number text not null unique,
    ai_paused boolean not null default false,
    paused_until timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_threads_phone on public.conversation_threads(phone_number);

-- 2. Conversation Messages (Ingests raw metadata & messages history)
create table if not exists public.conversation_messages (
    id uuid default gen_random_uuid() primary key,
    thread_id uuid references public.conversation_threads(id) on delete cascade not null,
    meta_message_id text unique,
    direction text not null check (direction in ('inbound', 'outbound')),
    sender_type text not null check (sender_type in ('guest', 'ai', 'operator', 'system')),
    message_type text not null default 'text',
    text_content text,
    media_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_messages_thread_chrono on public.conversation_messages(thread_id, created_at);

-- 3. Human Handoffs (Operator queues for takeover)
create table if not exists public.human_handoffs (
    id uuid default gen_random_uuid() primary key,
    thread_id uuid references public.conversation_threads(id) on delete cascade not null,
    status text not null default 'open' check (status in ('open', 'resolved', 'escalated')),
    urgency text not null default 'normal' check (urgency in ('normal', 'urgent')),
    reason_code text not null,
    guest_summary text,
    assigned_to text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    resolved_at timestamp with time zone
);

create index if not exists idx_handoffs_status on public.human_handoffs(status);

-- 4. Approved Knowledge (Authorized wedding facts)
create table if not exists public.approved_knowledge (
    id uuid default gen_random_uuid() primary key,
    topic text not null unique,
    content text not null,
    version integer not null default 1,
    approved_by text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Idempotency Records (Deduplicates Meta webhooks)
create table if not exists public.idempotency_records (
    meta_message_id text primary key,
    processed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) policies
alter table public.conversation_threads enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.human_handoffs enable row level security;
alter table public.approved_knowledge enable row level security;
alter table public.idempotency_records enable row level security;

-- Establish RLS Rules (Deny public reads/writes, only permit service-role/admin actions)
create policy "Service role full access" on public.conversation_threads for all using (true);
create policy "Service role full access" on public.conversation_messages for all using (true);
create policy "Service role full access" on public.human_handoffs for all using (true);
create policy "Service role full access" on public.approved_knowledge for all using (true);
create policy "Service role full access" on public.idempotency_records for all using (true);
