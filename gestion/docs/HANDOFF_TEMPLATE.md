# HANDOFF_TEMPLATE.md — Plantilla de traspaso

Usar cuando una tarea no quede completamente cerrada en la misma sesión o cambie de responsable/agente.

Archivo recomendado:

```text
gestion/docs/handoffs/YYYY-MM-DD-descripcion.md
```

## 1. Objetivo

Qué se intentó lograr.

## 2. Alcance

- directorios/archivos;
- dominios afectados;
- fuera de alcance.

## 3. Git

- rama;
- commit inicial;
- último commit;
- PR;
- estado de merge.

## 4. Entornos

- local;
- Preview;
- staging;
- producción;
- Supabase project/ref;
- Sheet de prueba/productiva si aplica.

Nunca incluir secretos.

## 5. Cambios realizados

Lista concreta de cambios de código, datos, migraciones y documentación.

## 6. Migraciones / datos

- migraciones creadas/aplicadas;
- backfills;
- conteos verificados;
- backup usado;
- rollback.

No incluir PII nominal innecesaria.

## 7. Validación ejecutada

Registrar sólo comandos realmente ejecutados:

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:ci
```

Agregar resultado y cualquier limitación.

## 8. Preview / producción

- URL verificada;
- deployment ID/commit;
- smoke realizado;
- errores conocidos.

## 9. Riesgos

Riesgos abiertos y su severidad.

## 10. Pendientes exactos

Lista ordenada y accionable. Evitar “seguir revisando”.

Ejemplo:

```text
1. Implementar test negativo de viewer PATCH /api/...
2. Crear Supabase staging antes de habilitar ALLOW_NON_PRODUCTION_WRITES.
3. Ejecutar E2E de mover invitado entre mesas.
```

## 11. Siguiente acción

Una sola acción recomendada para reanudar.

## 12. Decisiones durables

Si una decisión debe sobrevivir al handoff, actualizar también `MEMORY.md`, `CONTEXT.md`, `DOMAIN_RULES.md` o un ADR. El handoff no debe convertirse en la única fuente de una regla permanente.
