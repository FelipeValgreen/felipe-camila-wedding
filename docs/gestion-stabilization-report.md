# Informe de Estabilización, Auditoría y Seguridad — MVP Centro de Gestión F&C (v4.2)

## 1. Resumen Ejecutivo
Se completó la auditoría integral y el endurecimiento técnico del **Centro de Gestión** (`gestion.felipeycami.cl`) y la base de datos Supabase para dejar el **Pull Request #9** formalmente calificado y preparado para la revisión final antes de integrar a `main`.

---

## 2. Estado del Repositorio y Despliegues

- **Repositorio**: `FelipeValgreen/felipe-camila-wedding`
- **Rama**: `feature/felipeycami-gestion-mvp`
- **PR #9**: Abierto en GitHub ([PR #9](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/9)), estado `MERGEABLE`.
- **Despliegue Productivo Gestión**: `https://gestion.felipeycami.cl` (Proyecto Vercel `gestion`, Root: `gestion`).
- **Despliegue Productivo Público**: `https://felipeycami.cl` (Proyecto Vercel `felipeycamila`, Root: `.`, intacto).

---

## 3. Registro de Migraciones SQL Aplicadas

1. `supabase/migrations/20260723000000_felipeycami_security_and_performance_hardening.sql`
2. `supabase/migrations/20260723010000_felipeycami_advisors_security_and_performance.sql`
3. `supabase/migrations/20260723020000_felipeycami_cleanup_permissive_policies.sql`
4. `supabase/migrations/20260723030000_felipeycami_deny_anon_storage_list.sql`
5. `supabase/migrations/20260723040000_felipeycami_finalize_storage_and_policy_cleanup.sql`

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

### 4.3 Consolidación RLS y Eliminación de Políticas Permisivas (P0/P1)
- **Eliminación de `auth_rls_initplan`**: Se actualizaron las políticas RLS en todas las tablas de gestión utilizando la expresión `( (SELECT security.get_my_role()) ... )` evaluada una sola vez por consulta.
- **Depuración de Políticas Permisivas**: Se ejecutó `DROP POLICY` para eliminar políticas antiguas con `WITH CHECK (true)` en `guest_photos`, `rsvp_guests`, `song_requests` y `admin_profiles`.
- **Políticas Públicas Acotadas**:
  - `guest_photos`: Restricción `WITH CHECK` para validar formato URL y longitud de nombre.
  - `rsvp_guests`: Restricción `WITH CHECK` para validar formato de nombre.
  - `song_requests`: Restricción `WITH CHECK` para validar longitud de título de canción y remitente.
- **Storage Bucket `wedding-photos`**: Se revocaron las políticas públicas broad de listado en `storage.objects`, configurando límites de archivo (10MB) y MIME types permitidos (JPEG, PNG, WebP). La gestión se acotó a la política `Admin Manage storage wedding-photos` para administradores autenticados y uploads acotados a `guest_uploads/`. Se comprobó la carga activa de las fotografías históricas del matrimonio civil (HTTP 200).

### 4.4 Rendimiento e Índices de Claves Foráneas (P1)
- Se crearon los índices faltantes:
  - `idx_expenses_vendor_id` en `public.expenses(vendor_id)`
  - `idx_guest_contact_events_guest_id` en `public.guest_contact_events(guest_id)`
  - `idx_rsvp_events_rsvp_id` en `public.rsvp_events(rsvp_id)`
  - `idx_wedding_guests_replacement_for` en `public.wedding_guests(replacement_for_guest_id)`
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
1. **Script SQL de Reversión**: Documentado en `supabase/migrations/rollback/20260723020000_rollback_security_hardening.sql`.
2. **Infraestructura Vercel**: Re-promover el deployment anterior en Vercel Dashboard -> Project `gestion` -> Deployments -> Promote to Production.
3. **Respaldo Google Sheets**: Restaurar desde las pestañas nativas `BK_MAESTRA_...` en el spreadsheet `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0` o desde el export XLSX local.
