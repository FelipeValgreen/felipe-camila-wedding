# Informe de Estabilización y Cierre de Seguridad — MVP Centro de Gestión F&C (v4.2)

## 1. Resumen Ejecutivo
Se completó la auditoría integral y el endurecimiento técnico del **Centro de Gestión** (`gestion.felipeycami.cl`) y la base de datos Supabase para dejar el **Pull Request #9** formalmente calificado y preparado para la revisión final antes de integrar a `main`.

---

## 2. Estado de Repositorio y Despliegues

- **Repositorio**: `FelipeValgreen/felipe-camila-wedding`
- **Rama**: `feature/felipeycami-gestion-mvp`
- **PR #9**: Abierto en GitHub ([PR #9](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/9)), estado `MERGEABLE`.
- **Despliegue Productivo Gestión**: `https://gestion.felipeycami.cl` (Proyecto Vercel `gestion`, Root: `gestion`).
- **Despliegue Productivo Público**: `https://felipeycami.cl` (Proyecto Vercel `felipeycamila`, Root: `.`, intacto).

---

## 3. Matriz de Correcciones Realizadas

### 3.1 Seguridad Auth y Rotación de Contraseñas (P0)
- **Rotación Independiente**: Se rotaron las contraseñas de los dos administradores (`filipo.valverde@gmail.com` y `cavargask@gmail.com`) asignando valores aleatorios independientes y revocando las sesiones anteriores activas.
- **Protección de Secretos**: Ninguna contraseña se registró en archivos del repositorio, logs, Vercel ni transcript.
- **Script de Bootstrap**: Se actualizó `gestion/scripts/set-management-passwords.mjs` eliminando variables fallback de contraseña compartida y exigiendo `FELIPE_ADMIN_PASSWORD` y `CAMILA_ADMIN_PASSWORD` independientes.

### 3.2 Seguridad SQL y Esquema Dedicado (P0)
- **Esquema Interno `security`**: Se creó el esquema SQL `security` y la función `security.get_my_role()` (`SECURITY DEFINER`, `SET search_path = public, pg_temp;`) que obtiene el rol del administrador autenticado exclusivamente mediante `auth.uid()`.
- **Invocación Segura**: Se revocó el acceso a `PUBLIC` y `anon`, otorgándolo únicamente a `authenticated`.
- **Defensa contra Roles Cruzados**: Se redefinió `public.get_user_role(p_user_id)` para impedir la consulta de roles de otros usuarios.
- **Trigger `update_updated_at_column()`**: Se cambió a `SECURITY INVOKER` y se revocaron sus permisos a `PUBLIC` y `anon`.
- **RPC `reconcile_rsvp_to_guest`**: Se documentó la necesidad de `SECURITY DEFINER` (mutación transaccional multi-tabla across `rsvp_responses`, `wedding_guests`, `audit_log`, `sync_outbox`) asegurando la validación estricta de `auth.uid()`, perfil activo, rol `editor`/`owner`, y revocando permisos a `PUBLIC` y `anon`.

### 3.3 Consolidación RLS y Optimización de Consultas (P1)
- **Eliminación de `auth_rls_initplan`**: Se actualizaron las políticas RLS en todas las tablas de gestión utilizando la expresión `( (SELECT security.get_my_role()) ... )` evaluada una sola vez por consulta.
- **Políticas Públicas Acotadas**:
  - `guest_photos`: Restricción `WITH CHECK` para validar formato URL y longitud de nombre.
  - `rsvp_guests`: Restricción `WITH CHECK` para validar formato de nombre.
  - `song_requests`: Restricción `WITH CHECK` para validar longitud de título de canción y remitente.
- **Storage Bucket `wedding-photos`**: Se revocó el listado público broad (`storage.objects` listing) conservando la lectura pública de imágenes por URL directa. Se comprobó la carga activa de las fotografías históricas del matrimonio civil.

### 3.4 Rendimiento e Índices de Claves Foráneas (P1)
- Se crearon los índices faltantes:
  - `idx_expenses_vendor_id` en `public.expenses(vendor_id)`
  - `idx_guest_contact_events_guest_id` en `public.guest_contact_events(guest_id)`
  - `idx_rsvp_events_rsvp_id` en `public.rsvp_events(rsvp_id)`
  - `idx_wedding_guests_replacement_for` en `public.wedding_guests(replacement_for_guest_id)`
- Se eliminó el índice duplicado `idx_wedding_guests_table` manteniendo `idx_wedding_guests_table_id`.

### 3.5 RSVP Individual y Reconciliación de Datos (P0/P1)
- Se auditó el sitio público confirmando que todo el flujo web sea estrictamente **individual** (sin pases, sin acompañante, sin cupos familiares visibles) guardando en Supabase e integrando con Outbox antes de ofrecer el contacto por WhatsApp.
- Se reconcilió la respuesta de RSVP `unmatched` perteneciente al novio (`Felipe Valverde`), registrando la nota explicativa correspondiente.

---

## 4. Matriz de Pruebas y Evidencias de QA

| Prueba de QA | Tipo | Resultado | Evidencia |
| :--- | :--- | :--- | :--- |
| Login Felipe / Camila con contraseñas rotadas | Autenticación | `PASS` | Autenticación concedida con credenciales independientes |
| Contraseñas antiguas / Correo no autorizado | Seguridad | `PASS` | HTTP 400 / Rechazado con mensaje explícito |
| Revocación de sesiones previas | Seguridad | `PASS` | Sesiones anteriores invalidadas mediante Supabase Admin Auth |
| Invocar RPC `reconcile_rsvp_to_guest` sin auth / anon | Seguridad | `PASS` | Excepción `UNAUTHORIZED` / Permiso denegado |
| Carga de foto histórica civil por URL | Storage | `PASS` | HTTP 200 directo sin permitir listado de bucket |
| Outbox Sync y Idempotencia | Integración | `PASS` | QA test atómico procesado y limpiado dejando log de auditoría |
| Compilación Next.js (`npm run build`) | Build | `PASS` | `✓ Generating static pages (19/19)` sin errores de TypeScript |
| Aislamiento de dominios productivos | Infraestructura | `PASS` | `gestion.felipeycami.cl` (Gestión) y `felipeycami.cl` (Público) 100% aislados |

---

## 5. Procedimiento de Rollback

En caso de requerir reversión inmediata:
1. **Infraestructura Vercel**: Re-promover el deployment anterior en Vercel Dashboard -> Project `gestion` -> Deployments -> Promote to Production.
2. **Base de Datos Supabase**: Aplicar la migración de reversión restableciendo el esquema y ejecutando `npx supabase db push`.
3. **Respaldo Google Sheets**: La copia nativa `BACKUP COMPLETO — F&C Centro Comandos` (ID: `1xT3G1mYk7zU-N3rZ14xH-4_y6j8K0q9L7m3v5b8w1N2`) compartida con los novios permanece como punto de restauración de datos.
