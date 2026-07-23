# Informe de Estabilización, Auditoría y Seguridad — MVP Centro de Gestión F&C (v4.2)

## 1. Resumen Ejecutivo
Se completó la auditoría integral y el endurecimiento técnico del **Centro de Gestión** (`gestion.felipeycami.cl`) y la base de datos Supabase para dejar el **Pull Request #9** formalmente calificado y preparado para la revisión final antes de integrar a `main`.

---

## 2. Estado del Repositorio y Despliegues

- **Repositorio**: `FelipeValgreen/felipe-camila-wedding`
- **Rama**: `feature/felipeycami-gestion-mvp`
- **PR #9**: Abierto en GitHub ([PR #9](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/9)), estado `MERGEABLE`.
- **Despliegue Productivo Gestión**: `https://gestion.felipeycami.cl` (Proyecto Vercel `gestion`, Root: `gestion`, Deployment ID: `dpl_BbcdRBZmkM113xREN2f8BpLz2R2B`, Target: `production`, readyState: `READY`).
- **Despliegue Productivo Público**: `https://felipeycami.cl` (Proyecto Vercel `felipeycamila`, Root: `.`, intacto).

---

## 3. Registro de Migraciones SQL Aplicadas

1. `supabase/migrations/20260723000000_felipeycami_security_and_performance_hardening.sql`
2. `supabase/migrations/20260723010000_felipeycami_advisors_security_and_performance.sql`
3. `supabase/migrations/20260723020000_felipeycami_cleanup_permissive_policies.sql`
4. `supabase/migrations/20260723030000_felipeycami_deny_anon_storage_list.sql`
5. `supabase/migrations/20260723040000_felipeycami_finalize_storage_and_policy_cleanup.sql`
6. `supabase/migrations/20260723050000_felipeycami_remove_legacy_storage_upload_policy.sql`

---

## 4. Matriz de Correcciones Realizadas

### 4.1 Seguridad Auth y Rotación de Contraseñas (P0)
- **Rotación Independiente**: Se rotaron las contraseñas de los dos administradores (`filipo.valverde@gmail.com` y `cavargask@gmail.com`) asignando valores aleatorios independientes y revocando las sesiones anteriores activas.
- **Protección de Secretos**: Ninguna contraseña se registró en archivos del repositorio, logs, Vercel ni transcript.
- **Script de Bootstrap**: Se actualizó `gestion/scripts/set-management-passwords.mjs` eliminando variables fallback de contraseña compartida y exigiendo `FELIPE_ADMIN_PASSWORD` y `CAMILA_ADMIN_PASSWORD` independientes.

### 4.2 Seguridad SQL y Esquema Dedicado (P0)
- **Esquema Interno `security`**: Se creó el esquema SQL `security` y la función `security.get_my_role()` (`SECURITY DEFINER`, `SET search_path = public, pg_temp;`) que obtiene el rol del administrador autenticado exclusivamente mediante `auth.uid()`.
- **Invocación Segura**: Se revocó el acceso a `PUBLIC` y `anon`, otorgándolo únicamente a `authenticated`.
- **Eliminación de Funciones Obsoletas**: Se eliminaron `public.get_my_role()` y `public.get_user_role(uuid)` del esquema público para evitar derivaciones inseguras.
- **Trigger `update_updated_at_column()`**: Se cambió a `SECURITY INVOKER` y se revocaron sus permisos a `PUBLIC` y `anon`.
- **RPC `reconcile_rsvp_to_guest`**: Documentada como excepción aceptada `SECURITY DEFINER` (mutación transaccional multi-tabla across `rsvp_responses`, `wedding_guests`, `audit_log`, `sync_outbox`) asegurando la validación estricta de `auth.uid()`, perfil activo, rol `editor`/`owner`, y revocando permisos a `PUBLIC` y `anon`.

### 4.3 Consolidación RLS y Depuración de Storage Upload Policies (P0/P1)
- **Migración 20260723050000**: Se ejecutó `DROP POLICY IF EXISTS "Anyone can upload to Wedding Photos" ON storage.objects;` eliminando la política antigua permisiva de INSERT.
- **Política Estricta Public Upload**: Se aplicó la política `Validated Public Upload wedding-photos` que exige `(storage.foldername(name))[1] = 'guest_uploads'`, longitud de nombre > 14 y extensiones permitidas (`.jpg`, `.jpeg`, `.png`, `.webp`).
- **Resultados de la Matriz de Pruebas de Storage**:
  - `DIRECT_PUBLIC_URL_STATUS`: **200 (Permitido)**
  - `ANON_LIST_STATUS`: **200 (OBJECTS_COUNT: 0)**
  - `VALID_JPEG_UPLOAD_STATUS`: **200 (Permitido)**
  - `VALID_PNG_UPLOAD_STATUS`: **200 (Permitido)**
  - `EXECUTABLE_UPLOAD_STATUS`: **400 (Rechazado)**
  - `ROOT_FOLDER_UPLOAD_STATUS`: **400 (Rechazado)**
  - `OTHER_FOLDER_UPLOAD_STATUS`: **400 (Rechazado)**

### 4.4 Rendimiento e Índices de Claves Foráneas (P1)
- Se crearon los índices faltantes: `idx_expenses_vendor_id`, `idx_guest_contact_events_guest_id`, `idx_rsvp_events_rsvp_id`, `idx_wedding_guests_replacement_for`.
- Se eliminó el índice duplicado `idx_wedding_guests_table` manteniendo `idx_wedding_guests_table_id`.

### 4.5 RSVP Individual y Reconciliación de Datos (P0/P1)
- Se auditó el sitio público confirmando que todo el flujo web sea estrictamente **individual** (sin pases, sin acompañante, sin cupos familiares visibles) guardando en Supabase e integrando con Outbox antes de ofrecer el contacto por WhatsApp.
- Se reconcilió la respuesta de RSVP `unmatched` perteneciente al novio (`Felipe Valverde`), registrando la nota explicativa correspondiente.

---

## 5. Respaldo Real de Datos de Google Sheets

- **Spreadsheet ID Oficial**: `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`
- **Pestañas Respaldadas en Origen**: Duplicación nativa de pestañas maestras (`BK_MAESTRA_...`) dentro del archivo en Google Drive.
- **Exportación XLSX Local (Gitignored)**: Generado archivo de respaldo `backups/FC_Centro_Comandos_Backup_Official.xlsx` (249 KB) guardado fuera del repositorio Git para proteger PII de invitados.

---

## 6. Procedimiento de Rollback y Runbook de Restauración

En caso de requerir reversión inmediata:
1. **Runbook de Restauración**: Documentado en `docs/gestion-restoration-runbook.md`.
2. **Infraestructura Vercel**: Re-promover el deployment anterior `dpl_9VqEysmgeAFJeGhwcU6AHEcuMGKr` en Vercel Dashboard.
3. **Respaldo Google Sheets**: Restaurar desde las pestañas nativas `BK_MAESTRA_...` en el spreadsheet `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0` o desde el export XLSX local.
