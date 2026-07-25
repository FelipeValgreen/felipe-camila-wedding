# AGENTS.md — Reglas para agentes de IA

Este archivo es vinculante para cualquier agente que trabaje en `gestion/**`.

## 1. Alcance permitido

Se puede trabajar en:

- `gestion/**`
- migraciones nuevas estrictamente necesarias para el Centro de Gestión
- documentación específica del Centro de Gestión

No se puede modificar sin autorización separada:

- `index.html` público
- `js/main.js` público
- `galeria/**`
- `fotos/**`
- APIs públicas de RSVP
- flujo público de inscripción
- frontend de `felipeycami.cl`

La producción pública está activa y recibe confirmaciones reales.

## 2. Regla de seguridad principal

```text
Preview y desarrollo nunca deben escribir en Supabase de producción.
```

Antes de cualquier trabajo funcional, confirmar:

- rama Git distinta de `main`;
- Supabase local o staging;
- Vercel Preview con variables staging;
- sincronización externa desactivada o dirigida a una planilla de prueba;
- ausencia de secretos productivos en el entorno del agente.

## 3. Lectura obligatoria

Antes de proponer cambios, leer:

1. `gestion/README.md`
2. `gestion/CONTEXT.md`
3. `gestion/docs/ARCHITECTURE.md`
4. `gestion/docs/DOMAIN_RULES.md`
5. `gestion/docs/DATA_MODEL.md`
6. `gestion/docs/STATUS_AND_ROADMAP.md`
7. `gestion/docs/RUNBOOK.md`

Después, inspeccionar el código real. La documentación orienta, pero el código y la base verificada determinan el estado vigente.

## 4. Proceso obligatorio

Para cada tarea:

1. Explicar el objetivo.
2. Identificar archivos afectados.
3. Identificar tablas, vistas, RPC y triggers afectados.
4. Evaluar si puede impactar RSVP activos.
5. Proponer un cambio pequeño.
6. Describir riesgos y rollback.
7. Esperar aprobación si existe escritura sensible.
8. Crear respaldo si habrá cambios de datos.
9. Trabajar en rama.
10. Ejecutar validaciones.
11. Crear PR.
12. No fusionar automáticamente.
13. Verificar Preview.
14. Verificar producción después de una aprobación explícita de despliegue.

## 5. Operaciones prohibidas por defecto

- Ejecutar SQL directamente en producción para “probar”.
- Ejecutar `supabase db push` contra producción.
- Usar `SUPABASE_SECRET_KEY` productiva en un agente.
- Procesar `sync_outbox` productivo durante desarrollo.
- Escribir en Google Sheets productivo desde Preview.
- Ejecutar backfills masivos sin dry-run.
- Eliminar tablas o columnas existentes.
- Renombrar campos usados por RSVP activos.
- Cambiar tipos de columnas productivas en un primer paso.
- Fusionar a `main` automáticamente.
- Ocultar errores con valores hardcodeados.

## 6. Migraciones

Las primeras migraciones de un módulo deben ser aditivas.

Permitido:

- tablas nuevas;
- columnas nuevas nullable;
- vistas nuevas;
- funciones nuevas;
- índices nuevos;
- políticas RLS nuevas;
- triggers nuevos cuidadosamente aislados.

Requiere revisión especial:

- `DROP`;
- columnas `NOT NULL` sobre datos existentes;
- reemplazar triggers actuales;
- cambiar contratos de APIs activas;
- backfills;
- nuevas funciones `SECURITY DEFINER`.

Toda función `SECURITY DEFINER` debe:

- fijar `search_path`;
- validar `auth.uid()`;
- validar rol o permiso;
- restringir grants;
- registrar auditoría cuando corresponda.

## 7. Reglas de dominio que no pueden romperse

- Una respuesta RSVP no siempre equivale a una persona.
- Cada asistente debe tener una ficha individual.
- El RSVP original debe conservarse.
- No crear acompañantes implícitos.
- No hacer fuzzy matching automático.
- Conciliar automáticamente solo por teléfono exacto y único o nombre normalizado exacto y único.
- `attendance_status` y `reconfirmation_status` son independientes.
- Solo asistentes confirmados pueden asignarse a mesas.
- No superar capacidad de mesa.
- La IA de mesas genera propuestas separadas; nunca escribe directamente en asignaciones reales.
- Supabase es canónico; Sheets es espejo.
- Los proveedores solo ven lo necesario.

## 8. IA y gestión de contexto

Si el agente:

- tiene pocos tokens;
- pierde contexto;
- no sabe si una migración fue aplicada;
- encuentra discrepancias entre código y documentación;
- pierde la respuesta de una herramienta;
- encuentra cambios ajenos en la rama;
- no puede confirmar el entorno;

debe detener todas las escrituras.

Crear un handoff en:

```text
gestion/docs/handoffs/YYYY-MM-DD-tarea.md
```

Debe incluir:

- objetivo;
- estado actual;
- archivos modificados;
- migraciones creadas;
- migraciones aplicadas y entorno;
- pruebas ejecutadas;
- errores;
- riesgos;
- rollback;
- siguiente paso exacto.

Regla:

```text
Poco contexto = no migrar, no desplegar, no escribir en producción.
```

## 9. Validaciones mínimas

Actualmente existen:

```bash
npm run lint
npm run build
```

Brecha conocida: faltan scripts formales de pruebas y `typecheck`.

Para cambios futuros se debe incorporar y ejecutar, cuando estén disponibles:

```bash
npm run typecheck
npm test
npm run build
```

Además:

- revisar diff;
- buscar secretos;
- revisar RLS;
- probar roles;
- verificar móvil y escritorio;
- comprobar que no cambió el sitio público.

## 10. Datos sensibles

No incluir en logs:

- teléfonos completos;
- correos completos;
- alergias asociadas a nombres;
- notas familiares;
- tokens;
- claves;
- documentos privados.

Usar datos ficticios en tests y staging.

## 11. Convención de PR

Cada PR debe explicar:

- problema;
- alcance;
- archivos;
- migraciones;
- impacto de datos;
- pruebas;
- seguridad;
- rollback;
- elementos fuera de alcance.

Un PR no debe mezclar documentación, refactor amplio, migración y nueva funcionalidad si pueden separarse.

## 12. Definición de terminado

Una tarea no está terminada porque “compila”. Debe comprobarse:

- comportamiento esperado;
- ausencia de regresión en gestión;
- aislamiento de producción;
- integridad de datos;
- permisos;
- sincronización si corresponde;
- trazabilidad;
- rollback documentado.
