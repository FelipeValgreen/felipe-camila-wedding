# Informe de Estabilización, Auditoría y Seguridad — MVP Centro de Gestión F&C (v4.2 Final)

## 1. Resumen Ejecutivo
Se completó la auditoría integral, estabilización de seguridad y verificación del **Centro de Gestión** (`gestion.felipeycami.cl`) y la base de datos Supabase, dejando el **Pull Request #9** formalmente calificado y en estado `MERGEABLE` para su integración a `main`.

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
6. `supabase/migrations/20260723050000_felipeycami_remove_legacy_storage_upload_policy.sql`

---

## 4. Matriz de Correcciones Realizadas

### 4.1 RSVP Individual en Sitio Público (P0)
- **Confirmación del RSVP Público**: Se verificó el componente de confirmaciones públicas en `index.html` y la web viva `https://felipeycami.cl/`.
- **Resultado del Test de Términos**:
  - `Pases e Invitaciones`: **false**
  - `Para confirmar tus pases`: **false**
  - `Pases Asignados`: **false**
  - `acompañante`: **false**
  - `cupos`: **false**

### 4.2 Revocación de Acceso Público en Google Sheets (P0)
- **Revocación de Permisos Públicos**: Se eliminó el permiso `anyoneWithLink` (`role: writer`) en la planilla operacional `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`.
- **Lista de Permisos Sanitizada**:
  - `filipo.valverde@gmail.com` (`role: owner`)
  - `cavargask@gmail.com` (`role: writer`)
  - `vargasriffka@hotmail.com` (`role: writer`)
  - `matrimonio-rsvp-sheets@claude-498820.iam.gserviceaccount.com` (`role: writer`)

### 4.3 Seguridad SQL y RLS (P0)
- **Esquema Interno `security`**: Creada la función `security.get_my_role()` (`SECURITY DEFINER`, `SET search_path = public, pg_temp;`) revocado el acceso a `PUBLIC` y `anon`.
- **Limpieza de Funciones Obsoletas**: Eliminadas `public.get_my_role()` y `public.get_user_role(uuid)`.
- **RPC `reconcile_rsvp_to_guest`**: Documentada como excepción aceptada `SECURITY DEFINER` (mutación transaccional multi-tabla across `rsvp_responses`, `wedding_guests`, `audit_log`, `sync_outbox`) asegurando validación estricta de `auth.uid()`, perfil activo y rol `editor`/`owner`.

### 4.4 Storage Bucket Hardening (P0/P1)
- **Migración 20260723050000**: Eliminada la política permisiva `Anyone can upload to Wedding Photos`.
- **Política Estricta Public Upload**: Aplicada `Validated Public Upload wedding-photos` acotada a `guest_uploads/`.
- **Matriz de Pruebas de Storage**:
  - `DIRECT_PUBLIC_URL_STATUS`: **200 (Permitido)**
  - `ANON_LIST_STATUS`: **200 (OBJECTS_COUNT: 0)**
  - `REAL_JPEG_UPLOAD_STATUS`: **200 (Permitido)**
  - `REAL_PNG_UPLOAD_STATUS`: **200 (Permitido)**
  - `EXECUTABLE_UPLOAD_STATUS`: **400 (Rechazado)**
  - `ROOT_FOLDER_UPLOAD_STATUS`: **400 (Rechazado)**

---

## 5. Respaldo de Datos y Runbook

- **Spreadsheet ID Oficial**: `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`
- **Pestaña Nativa de Respaldo**: Creada `BK_MAESTRA_OFFICIAL_...` dentro del archivo oficial.
- **Exportación XLSX Local (Gitignored)**: `backups/FC_Centro_Comandos_Backup_Official.xlsx` (287 KB).
- **Runbook de Restauración**: Documentado en `docs/gestion-restoration-runbook.md`.
