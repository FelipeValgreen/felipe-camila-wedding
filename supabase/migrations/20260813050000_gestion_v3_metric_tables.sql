-- Wedding Planning OS V3: metric table geometry.
-- Keeps legacy relative fields for backwards compatibility while adding real-world measurements.

alter table public.wedding_tables
  add column if not exists position_x_m numeric(8,2),
  add column if not exists position_y_m numeric(8,2),
  add column if not exists width_m numeric(6,2),
  add column if not exists height_m numeric(6,2);

with active_space as (
  select coalesce(space_width_m, 30.00) as w, coalesce(space_height_m, 18.00) as h
  from public.event_venue_layouts
  where status = 'active'
  order by version desc
  limit 1
), dims as (
  select coalesce((select w from active_space), 30.00) as w,
         coalesce((select h from active_space), 18.00) as h
)
update public.wedding_tables t
set position_x_m = coalesce(t.position_x_m, round((coalesce(t.position_x, 50)::numeric / 100) * dims.w, 2)),
    position_y_m = coalesce(t.position_y_m, round((coalesce(t.position_y, 50)::numeric / 100) * dims.h, 2)),
    width_m = coalesce(t.width_m, case when t.table_type = 'rectangular_guest' then 2.40 else 1.80 end),
    height_m = coalesce(t.height_m, case when t.table_type = 'rectangular_guest' then 0.90 else 1.80 end)
from dims;

alter table public.wedding_tables drop constraint if exists wedding_tables_metric_dimensions_positive;
alter table public.wedding_tables add constraint wedding_tables_metric_dimensions_positive
  check ((width_m is null or width_m > 0) and (height_m is null or height_m > 0));
