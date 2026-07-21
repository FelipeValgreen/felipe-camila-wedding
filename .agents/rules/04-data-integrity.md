# Data Integrity

## Source of truth

- Supabase is the central source of truth.
- Google Sheets is the operational and review layer.
- WhatsApp is the communication and concierge channel.

## RSVP constraints

- RSVP is individual.
- Do not implement visible partner, companion, pass, quota or family logic.
- A guest must have a stable identifier and secure personal invitation context.
- Save or update the RSVP in Supabase before opening WhatsApp.
- Never claim success when the database operation failed.
- Avoid uncontrolled duplicate inserts; prefer idempotent updates where appropriate.
- All changes must be auditable.

## Historical separation

- Civil-wedding data is historical and must not be treated as confirmation for the active religious event.
- Preserve historical records and photos while separating active and historical event contexts.

## Safety

- Do not change schema, RLS, Storage policies, functions, triggers or production data without a reviewed migration, backup and rollback plan.
- Do not expose one guest's information to another guest.
- Never allow the AI assistant to invent or directly perform uncontrolled database operations.
