# GOOGLE SHEETS RSVP MAPPING DOCUMENT

## Integration Overview
- **Target Spreadsheet**: `F&C Centro Comandos` (ID: `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`)
- **Target Dev Tab**: `RSVP_WEB_IGLESIA_DEV` (Pending creation after authorization)
- **Production Tab**: `RSVP_WEB_IGLESIA` (Production writes disabled)

---

## Column Mapping Table

| Supabase `rsvp_current` Column | Target Sheet Column Name | Field Type | Notes |
|---|---|---|---|
| `updated_at` | Timestamp | ISO 8601 | Server timestamp |
| `invitation_token_hash` | Token RSVP | Hashed String | Opaque identifier |
| `wedding_guests.full_name` | Nombre Completo | String | Matched guest name |
| `wedding_guests.email` | Email | String | Optional |
| `contact_phone_e164` | Teléfono | E.164 String | Contact phone |
| `attendance` | Asiste Fiesta | String (`Sí, asistiré` / `No podré asistir`) | Attendance state |
| `dietary_type` + `dietary_detail` | Restricción Alimentaria | String | Combined dietary restriction |
| `channel` | Fuente | String (`web_direct`, `whatsapp_cloud`) | Source channel |
| `status` | Estado Técnico | String (`CONFIRMED`, `WHATSAPP_STARTED`) | RSVP Status |
| `guest_id` | Guest UUID | UUID String | Primary Upsert Key |

---

## Synchronization Architecture
1. Web / Webhook writes state to Supabase `rsvp_current` and `rsvp_events`.
2. Supabase enqueues operation in `sheet_sync_queue`.
3. Background Worker processes queue and executes `UPSERT` on `RSVP_WEB_IGLESIA_DEV` using `Guest UUID`.
4. Retry strategy with exponential backoff on HTTP 429 / 5xx from Google Sheets API.
