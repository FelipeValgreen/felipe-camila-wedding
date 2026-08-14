# SECURITY_PRIVACY.md — Seguridad, privacidad y protección de datos

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026  
**Ámbito:** `gestion/**`, Supabase canónico, sincronización operativa y datos gestionados desde el Centro de Gestión.

## 1. Objetivo

Definir la política técnica vigente para proteger datos personales, secretos, permisos, sesiones, integraciones y cambios sensibles del Wedding Operations System.

Este documento reemplaza como referencia operativa a informes históricos de incidentes o hardening. Los documentos históricos pueden conservarse como evidencia, pero no deben usarse para inferir el estado actual sin verificación.

## 2. Principios

1. Mínimo privilegio.
2. Supabase es fuente canónica de datos estructurados.
3. El repositorio público nunca contiene PII real ni secretos.
4. Preview/Development no escriben en producción.
5. Toda acción sensible requiere autorización de servidor.
6. La IA no amplía permisos.
7. RLS/grants son controles de seguridad; la UI no los sustituye.
8. Logs de aplicación no deben convertirse en una copia de PII.
9. Auditoría de negocio y observabilidad técnica son capas distintas.
10. La información se comparte sólo con quien la necesita para operar el evento.

## 3. Clasificación de datos

### Pública / no sensible

- nombre del producto;
- fecha general del evento cuando ya es pública;
- estructura de módulos;
- código fuente sin secretos;
- esquemas/migraciones sin datos reales;
- assets no privados.

### Interna

- configuración operativa no pública;
- roadmap;
- estado de proveedores sin datos sensibles;
- parámetros del sistema;
- metadata técnica no secreta.

### Confidencial

- nombres de invitados cuando no sean públicos;
- teléfonos/correos;
- relaciones familiares/sociales nominales;
- restricciones alimentarias;
- notas privadas;
- cotizaciones, contratos y pagos;
- documentos de proveedores;
- agenda detallada day-of;
- historial de actividad asociado a personas.

### Secreto

- `SUPABASE_SECRET_KEY` / service-role equivalente;
- claves privadas de service accounts;
- `CRON_SECRET`;
- `OPENAI_API_KEY` y credenciales de proveedores externos;
- tokens OAuth/Meta/WhatsApp;
- claves de firma o webhooks.

Los secretos nunca se almacenan en Git ni se exponen al navegador.

## 4. Identidad y sesión

- Supabase Auth es la capa de identidad administrativa actual.
- `admin_profiles` determina rol y estado activo.
- Una sesión válida no implica permiso para toda acción.
- La autorización final debe resolverse server-side o mediante RLS/RPC.
- Usuarios inactivos deben perder capacidad operativa.
- Las sesiones deben invalidarse cuando exista un incidente que pueda comprometerlas.

## 5. Roles actuales y evolución

Roles actuales conocidos:

- `owner`;
- `editor`;
- `viewer`.

La matriz detallada vive en `RBAC_PERMISSIONS.md`.

La evolución comercial requiere permisos por `wedding_id`, no roles globales compartidos entre matrimonios.

## 6. Supabase

### Cliente navegador

Puede usar exclusivamente URL pública y publishable key. La seguridad depende de sesión, RLS y grants.

### Cliente servidor autenticado

Opera en nombre del usuario y debe respetar permisos y RLS.

### Cliente administrativo

- sólo server-side;
- nunca importado en Client Components;
- reservado a operaciones que realmente requieren privilegios elevados;
- no debe usarse para evitar diseñar RLS apropiado.

### RLS

Toda tabla con datos administrativos o personales debe tener una decisión explícita de acceso. Antes de release se debe verificar:

- RLS habilitada donde corresponde;
- policies mínimas;
- grants de `anon`/`authenticated`;
- funciones `SECURITY DEFINER` con `search_path` seguro;
- RPC que revaliden precondiciones de dominio.

## 7. PII y minimización

No recolectar información sólo porque sea posible.

Para cada dato nuevo debe poder responderse:

- ¿para qué se necesita?;
- ¿qué rol lo usa?;
- ¿por cuánto tiempo?;
- ¿debe aparecer en exportaciones?;
- ¿puede ocultarse en logs?;
- ¿necesita auditoría de cambios?

El sistema no debe persistir IP, fingerprint o identificadores de dispositivo como mecanismo de inferencia de relaciones salvo una necesidad concreta, proporcional y documentada.

## 8. Restricciones alimentarias

Se consideran datos sensibles dentro del contexto operativo.

- asociadas a una persona;
- sólo visibles para roles que las necesitan;
- evitar texto nominal en logs;
- exportaciones a catering deben contener únicamente lo necesario;
- no inferir condiciones médicas adicionales.

## 9. Relaciones de invitados

- `confirmed` significa relación conocida/validada;
- `probable` significa inferencia operativa pendiente;
- no convertir una inferencia en parentesco confirmado;
- no exponer notas familiares privadas a proveedores no autorizados.

## 10. Finanzas y documentos

- contratos, cotizaciones, pagos y documentos son confidenciales;
- no incluir archivos privados dentro del repositorio público;
- futuras URLs de documentos deben tener controles de acceso y, cuando aplique, expiración;
- un proveedor no ve información financiera de otros proveedores por defecto.

## 11. Copiloto / IA

El Copiloto:

- hereda el permiso del usuario y nunca lo amplía;
- sólo recibe los datos necesarios para responder;
- debe trabajar desde un snapshot autorizado;
- no debe incluir secretos en prompts;
- debe diferenciar hechos, inferencias y recomendaciones;
- no ejecuta una mutación sensible sin confirmación;
- toda mutación vuelve al servidor para validación;
- no debe registrar prompts/respuestas con PII completa en logs por defecto.

Si se usa un proveedor LLM externo, revisar términos de datos y configuración antes de enviar información confidencial.

## 12. Google Sheets

Google Sheets es espejo operativo, no bypass de seguridad.

- limitar el acceso del archivo;
- evitar `anyone with link` cuando contenga datos reales;
- cuenta de servicio con mínimo privilegio;
- rotar claves redundantes;
- no sincronizar desde Preview a la planilla productiva;
- no guardar más columnas sensibles que las necesarias para operación.

## 13. Logs y observabilidad

Logs técnicos pueden registrar:

- request/correlation ID;
- ruta;
- estado HTTP;
- duración;
- tipo de entidad;
- ID técnico cuando sea necesario;
- código de error saneado.

Evitar por defecto:

- nombres completos;
- teléfonos;
- restricciones;
- contratos;
- tokens;
- claves;
- payloads completos de RSVP.

El historial de negocio corresponde a `audit_log`.

## 14. Secretos

- sólo variables de entorno o secret manager del proveedor;
- valores separados por entorno;
- Preview no debe recibir secretos productivos si no son necesarios;
- rotar inmediatamente ante sospecha de exposición;
- revocar credencial previa después de confirmar la nueva;
- nunca copiar valores reales a README, PR, issue, chat o screenshot.

## 15. Entornos

### Production

- datos reales;
- escrituras autorizadas;
- sync real;
- backups;
- observabilidad.

### Preview

- read-only contra producción por guard;
- para mutaciones reales debe usar Supabase staging;
- Sheet de prueba opcional;
- secretos propios.

### Development

Preferencia por Supabase local/staging y datos ficticios.

## 16. Backups

- backups son confidenciales;
- no exponer esquema de backup por APIs públicas;
- verificar conteos y restaurabilidad;
- documentar el punto de restauración;
- limitar acceso al mínimo necesario;
- una copia no verificada no se considera backup operativo.

Ver `BACKUP_RESTORE.md`.

## 17. Retención y eliminación

Antes de comercializar el producto se debe definir una política formal por matrimonio.

Para el caso actual:

- no borrar historial de negocio necesario para operar antes del evento;
- preferir soft delete para fichas con relaciones;
- archivar después del evento según decisión de los propietarios;
- eliminar o anonimizar datos que ya no tengan propósito operacional cuando se defina el cierre del evento;
- accesos temporales de proveedores deben expirar.

## 18. Respuesta a incidentes

Ante sospecha de exposición o modificación no autorizada:

1. detener despliegues/mutaciones relacionadas;
2. identificar secreto, usuario o superficie;
3. revocar/rotar credenciales afectadas;
4. invalidar sesiones si corresponde;
5. preservar evidencia técnica;
6. revisar RLS, auditoría y logs;
7. determinar datos afectados;
8. restaurar sólo si existe corrupción;
9. documentar causa y mitigación;
10. añadir prueba/regla preventiva.

## 19. Checklist de release de seguridad

- [ ] sin secretos en diff;
- [ ] sin PII real nueva en Git;
- [ ] nuevas tablas con RLS/grants revisados;
- [ ] RPC/functions con autorización y `search_path` seguro;
- [ ] Preview aislado;
- [ ] endpoints mutantes protegidos;
- [ ] logs saneados;
- [ ] migraciones reversibles o con plan de recuperación;
- [ ] audit log para acciones sensibles;
- [ ] permisos actualizados en `RBAC_PERMISSIONS.md`;
- [ ] integración externa revisada antes de habilitarse.

## 20. Estado de documentos históricos

Los informes de seguridad previos a este documento deben tratarse como evidencia histórica de una fase concreta. Cualquier afirmación sobre claves activas, PRs, ramas o incidentes debe verificarse contra la infraestructura vigente antes de actuar.
