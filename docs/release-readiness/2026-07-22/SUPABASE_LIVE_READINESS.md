# Supabase Live Readiness — 2026-07-22

Audit of the active live database schemas, columns, RLS configurations, and Storage settings on the production Supabase project (`mwumnywbvjxekskfrlms`).

---

## 1. Live Database Schema Status

| Tabla | Estado en Vivo | Columnas Presentes | Columnas Faltantes (Requeridas por código) | RLS Estado |
|---|---|---|---|---|
| `guest_list` | **INEXISTENTE (404)** | Ninguna (Tabla no creada en DB). | `id`, `created_at`, `code`, `first_name`, `last_name`, `passes` | N/A |
| `rsvp_guests` | **PRESENTE (200)** | `id`, `created_at`, `name`, `email`, `whatsapp`, `has_partner`, `partner_name` | `dietary_restrictions`, `partner_dietary` | **Activo sin políticas públicas** (Bloquea INSERT con 401). |
| `guest_photos` | **PRESENTE (200)** | `id`, `url`, `uploader_name`, `created_at` | `event_type`, `album`, `approved`, `visible_in_gallery`, `notes` | **Activo sin políticas públicas** (Bloquea subidas). |
| `song_requests` | **PRESENTE (200)** | `id`, `created_at`, `song_name`, `artist_name`, `requester_name` | Ninguna. | **Activo sin políticas públicas** (Bloquea insert). |

---

## 2. Storage Bucket Status

- **Bucket Name:** `wedding-photos`
- **Configuración de Acceso:** Público.
- **Evidencia Visual / Paparazzi:** Los invitados pueden intentar subir fotos, pero el backend cliente no puede insertar la fila en `guest_photos` ni subir el archivo a Storage por falta de políticas de RLS e inserción anónima aprobadas en el bucket.
- **Protección de Archivo Histórico Civil:** No existe estructura de carpetas ni protección contra borrado en el bucket en vivo.

---

## 3. RLS Vulnerabilities and Database Integrity

- **RSVP Falla Silencioso:** Cualquier guardado en `rsvp_guests` falla por la columna faltante (`dietary_restrictions`) o por violación de RLS (401), sin embargo, el código frontend no captura esta excepción y reporta falsamente éxito.
- **Inexistencia de Invitados Reales:** La ausencia de `guest_list` obliga al sistema a usar la lista demo hardcodeada, impidiendo la validación de invitados reales.
