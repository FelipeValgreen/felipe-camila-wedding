# ARCHITECTURE.md — Arquitectura del Centro de Gestión

> Alcance exclusivo: `gestion/**`. El sitio público y el flujo público de inscripción quedan fuera de este documento.

## 1. Vista general

```text
Usuario autenticado
→ Next.js en gestion/
→ Supabase Auth
→ Server Components / Client Components / Route Handlers
→ Supabase PostgreSQL con RLS y RPC
→ audit_log
→ sync_outbox
→ worker de sincronización
→ Google Sheets
```

## 2. Componentes

### Aplicación web

- Framework: Next.js 14.
- Lenguaje: TypeScript.
- UI: React 18, Tailwind CSS y Lucide React.
- Despliegue: Vercel.
- Dominio: `gestion.felipeycami.cl`.

### Clientes Supabase

#### Navegador

`gestion/lib/supabase-browser.ts`

Usa:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Su seguridad depende de:

- sesión autenticada;
- políticas RLS;
- grants correctos.

#### Servidor con sesión

`gestion/lib/supabase-server.ts`

Usa la clave publicable y propaga:

- cookies;
- autorización Bearer cuando existe.

Se utiliza en rutas que operan en nombre del usuario autenticado.

#### Administración

`gestion/lib/supabase-admin.ts`

Usa:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Solo puede ejecutarse server-side. No debe importarse desde componentes cliente.

## 3. Autenticación y autorización

Flujo actual:

```text
Supabase Auth
→ auth.users
→ admin_profiles
→ role + active
→ autorización de rutas y RLS
```

Roles actuales conocidos:

- `owner`
- `editor`
- `viewer`

Dirección futura:

- pareja;
- planner;
- catering;
- venue;
- photographer;
- av_production;
- vendor_viewer.

Los roles futuros deben ser por matrimonio y por permiso, no únicamente globales.

## 4. Flujo RSVP consumido por gestión

El Centro de Gestión no debe alterar el contrato del formulario público durante esta etapa.

```text
rsvp_responses
→ rsvp_response_members
→ conciliación exacta o revisión humana
→ wedding_guests
→ management_issues si hay problema
→ sync_outbox
→ Google Sheets
```

Una respuesta original puede contener más de una persona.

## 5. Gestión de invitados

Fuente canónica:

- `wedding_guests`

La interfaz permite:

- crear;
- editar;
- cambiar asistencia;
- registrar restricciones;
- revisar reconfirmación;
- clasificar grupos;
- consultar mesa.

Cambios relevantes deben producir:

- `audit_log`;
- operación en `sync_outbox` cuando corresponda.

## 6. Incidencias

`management_issues` funciona como bandeja operativa para:

- RSVP sin vincular;
- respuestas conjuntas;
- conciliaciones parciales;
- fichas faltantes;
- fallos de sincronización;
- futuras alertas transversales.

La UI debe mostrar lenguaje humano y acciones concretas.

## 7. Mesas

Entidades:

- `wedding_tables`
- `seating_assignments`
- `wedding_guests.table_id`

Operación esperada:

```text
Invitado confirmado
→ seleccionar mesa
→ RPC o ruta transaccional
→ validar capacidad
→ crear/mover asignación
→ actualizar invitado
→ auditoría
→ outbox
```

La vista operativa por lista es principal. La vista gráfica es secundaria hasta disponer de un editor 2D profesional.

## 8. Sincronización con Google Sheets

Mapa conocido:

| Entidad | Pestaña |
|---|---|
| `wedding_guests` | `INVITADOS_NUEVO` |
| `rsvp_responses` | `CONFIRMACIONES_RSVP` |
| `wedding_tables` | `MESAS_NUEVO` |
| `seating_assignments` | `ASIGNACIONES_MESA` |
| `vendors` | `PROVEEDORES` |
| `expenses` | `GASTOS` |
| `expense_payments` | `PAGOS` |

Worker:

- `gestion/lib/sync-outbox.ts`

Rutas:

- manual: `POST /api/sync/process`
- cron: `/api/cron/sync-outbox`

Vercel Cron actual:

```text
0 * * * *
```

Propiedades obligatorias:

- idempotencia por ID canónico;
- reintentos;
- respuesta `no-store`;
- no marcar procesado antes de verificar escritura;
- fallo de Sheets no invalida el dato guardado en Supabase.

## 9. Finanzas

Entidades conocidas:

- `vendors`
- `expenses`
- `expense_payments`

Actualmente forman parte del Centro de Gestión y del sincronizador. La facturación comercial de la futura plataforma queda fuera del alcance inmediato.

## 10. Auditoría

`audit_log` debe registrar, cuando aplique:

- actor;
- entidad;
- acción;
- estado anterior;
- estado posterior;
- origen;
- fecha.

No usar logs de aplicación como sustituto del historial de negocio.

## 11. Entornos requeridos

### Production

- dominio real;
- Supabase real;
- Sheets real;
- cron activo.

### Preview

Debe usar:

- Supabase staging o branch aislado;
- datos ficticios;
- Sheets de prueba o sync desactivado;
- sin secretos productivos.

### Development

Preferencia:

- Supabase local;
- seed ficticio;
- integraciones externas desactivadas.

## 12. Fronteras arquitectónicas

### Permitido en adaptación del dashboard

- nuevas páginas en `gestion/app/dashboard`;
- nuevas rutas en `gestion/app/api`;
- componentes de gestión;
- tablas aditivas;
- RLS;
- vistas y RPC protegidas;
- portal de proveedores;
- planos;
- propuestas de IA.

### Fuera de alcance

- editar frontend público;
- cambiar endpoint público RSVP;
- modificar galería pública;
- modificar carga pública de fotos;
- usar producción como staging.

## 13. Brechas técnicas conocidas

- No existe script formal `test` en `gestion/package.json`.
- No existe script formal `typecheck`.
- Falta entorno staging documentado y verificado.
- Roles actuales son demasiado generales para proveedores.
- Plano actual no trabaja a escala ni por capas.
- Multi-matrimonio aún no está implementado.

Estas brechas deben resolverse progresivamente, sin refactor total.
