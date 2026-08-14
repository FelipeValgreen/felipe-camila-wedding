# RBAC_PERMISSIONS.md — Roles y permisos

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Definir una matriz única de permisos para el Centro de Gestión. La UI puede ocultar acciones, pero la autorización real debe existir en servidor/RLS/RPC.

## 2. Roles actuales

Roles operativos conocidos:

- `owner`
- `editor`
- `viewer`

Mientras el producto sea un único matrimonio, estos roles son globales dentro del caso. La evolución comercial debe migrar a permisos por `wedding_id`.

## 3. Principios

1. Denegar por defecto.
2. Lectura y escritura son permisos distintos.
3. Borrar/archivar requiere más privilegio que editar.
4. Acciones masivas requieren privilegio elevado y confirmación.
5. La IA nunca amplía el permiso del usuario.
6. Datos sensibles requieren necesidad funcional.
7. Proveedores futuros sólo ven su subconjunto.
8. Service-role no representa a un usuario humano.

## 4. Matriz actual objetivo

Leyenda:

- ✅ permitido;
- ⚠️ permitido con validación/confirmación;
- 👁 lectura;
- ❌ no permitido.

| Dominio / acción | owner | editor | viewer |
|---|---:|---:|---:|
| Dashboard / métricas | 👁 | 👁 | 👁 |
| Estado del sistema | 👁 | 👁 | 👁 limitado |
| Invitados: leer | ✅ | ✅ | ✅ |
| Invitados: crear/editar | ✅ | ✅ | ❌ |
| Invitados: archivar | ⚠️ | ⚠️ | ❌ |
| RSVP original: leer | ✅ | ✅ | 👁 |
| RSVP original: alterar evidencia | ❌ | ❌ | ❌ |
| Conciliación manual | ✅ | ✅ | ❌ |
| Relaciones: leer | ✅ | ✅ | ✅ |
| Relaciones: probable | ✅ | ✅ | ❌ |
| Relaciones: confirmar | ⚠️ | ⚠️ | ❌ |
| Mesas: leer | ✅ | ✅ | ✅ |
| Mesas: CRUD | ✅ | ✅ | ❌ |
| Seating: asignar/mover/quitar | ✅ | ✅ | ❌ |
| Seating: aplicar propuesta masiva | ⚠️ | ⚠️ | ❌ |
| Salón: leer | ✅ | ✅ | ✅ |
| Salón: editar layout | ✅ | ✅ | ❌ |
| Presupuesto: leer | ✅ | ✅ | 👁 según alcance |
| Presupuesto: editar | ✅ | ✅ | ❌ |
| Pagos: registrar/editar | ✅ | ✅ | ❌ |
| Pagos: eliminar/revertir | ⚠️ | ⚠️ | ❌ |
| Proveedores: leer | ✅ | ✅ | ✅ |
| Proveedores: editar | ✅ | ✅ | ❌ |
| Cronograma: leer | ✅ | ✅ | ✅ |
| Cronograma: editar | ✅ | ✅ | ❌ |
| Música: leer | ✅ | ✅ | ✅ |
| Música: editar | ✅ | ✅ | ❌ |
| Documentos: leer | ✅ | ✅ | ✅ según visibilidad |
| Documentos: registrar/editar | ✅ | ✅ | ❌ |
| Tareas: leer | ✅ | ✅ | ✅ |
| Tareas: editar | ✅ | ✅ | ❌ |
| Actividad/audit log | ✅ | ✅ | 👁 saneado |
| Sync manual | ⚠️ | ⚠️ si se autoriza | ❌ |
| Configuración sensible | ✅ | ❌ por defecto | ❌ |
| Usuarios/roles | ✅ | ❌ | ❌ |
| Backfill/import masivo | ⚠️ | ❌ por defecto | ❌ |
| Deploy/migraciones | fuera de UI | fuera de UI | fuera de UI |

## 5. Datos sensibles

### Restricciones alimentarias

Lectura sólo para:

- owner;
- editor con función operativa;
- futuro catering autorizado.

No exponer por defecto a fotografía, DJ, decoración u otros proveedores.

### Finanzas

Proveedores externos no deben ver:

- presupuesto total;
- pagos de otros proveedores;
- cotizaciones de terceros;
- notas financieras internas.

### Relaciones/notas familiares

Sólo pareja/planner/roles internos necesarios.

## 6. Operaciones irreversibles o de alto impacto

Requieren confirmación explícita y auditoría:

- archivo masivo;
- importación masiva;
- aplicación masiva de seating;
- reconstrucción de espejo Sheets;
- eliminación de pagos/documentos;
- cambios de roles;
- acciones que alteren múltiples entidades.

## 7. Service role

`SUPABASE_SECRET_KEY` o equivalente:

- se usa sólo server-side;
- no corresponde a un permiso humano;
- no debe saltarse validaciones de dominio por conveniencia;
- toda ruta que lo use debe autenticar/autorizar al caller o demostrar que es un proceso interno confiable (por ejemplo cron con secreto);
- nunca se expone al cliente.

## 8. Cron

Rutas de cron deben autenticarse con secreto dedicado y ejecutar únicamente el conjunto de acciones esperado.

No reutilizar una sesión de usuario como autenticación de cron.

## 9. Copiloto

El Copiloto opera bajo el usuario autenticado.

Ejemplo:

```text
viewer pregunta “mueve a Ana a mesa 4”
→ Copiloto puede explicar que no tiene permiso
→ no debe generar una ejecución privilegiada
```

Para `owner/editor`:

```text
pregunta
→ propuesta
→ confirmación
→ API autorizada
→ validación dominio
→ auditoría
```

## 10. Roles futuros por matrimonio

Modelo objetivo:

```text
wedding_members
- wedding_id
- user_id
- role
- permissions
- active
```

Roles sugeridos:

- `couple_owner`
- `planner_admin`
- `planner_editor`
- `catering_viewer`
- `venue_viewer`
- `photography_viewer`
- `av_viewer`
- `vendor_viewer`

No asumir que los nombres finales deben coincidir exactamente con esta propuesta; lo importante es la separación por boda y permisos.

## 11. Portal de proveedores futuro

Debe aplicar mínimo privilegio:

### Catering

- invitados necesarios;
- mesa;
- menú/restricción;
- cronograma de servicio;
- documentos propios.

### Venue

- layout;
- montaje;
- capacidad;
- cronograma relevante;
- documentos propios.

### Fotografía/video

- cronograma relevante;
- shot list;
- ubicaciones;
- contactos autorizados;
- documentos propios.

### Música/AV

- cues;
- música;
- cronograma relevante;
- layout técnico;
- documentos propios.

## 12. Validación requerida

Antes de considerar RBAC cerrado:

- [ ] cada Route Handler mutante declara requisito de rol/permiso;
- [ ] RLS coincide con la intención del API;
- [ ] `viewer` no puede mutar por llamada directa;
- [ ] roles inactivos quedan bloqueados;
- [ ] service role no crea bypass sin auth;
- [ ] futuras vistas de proveedor filtran por `wedding_id` y entidad;
- [ ] tests negativos cubren acceso denegado.
