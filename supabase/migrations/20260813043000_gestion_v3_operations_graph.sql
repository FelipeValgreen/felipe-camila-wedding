-- Wedding Planning OS V3: operations graph edges.
-- Additive only; links providers to schedule/tasks without duplicating provider data.

alter table public.event_timeline_items
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

alter table public.event_tasks
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

create index if not exists event_timeline_items_vendor_idx on public.event_timeline_items(vendor_id);
create index if not exists event_tasks_vendor_idx on public.event_tasks(vendor_id);
