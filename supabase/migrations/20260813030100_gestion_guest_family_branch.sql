-- Explicit family/social branch used by Seating Intelligence.
-- Private production backfills are intentionally excluded from this public repo.

alter table public.wedding_guests
  add column if not exists family_branch text;

create index if not exists wedding_guests_family_branch_idx
  on public.wedding_guests(family_side, family_branch)
  where guest_status = 'active';
