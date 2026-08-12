# AGENTS.md — Reglas para agentes de IA

**Versión:** 2.0 RC  
**Ámbito:** `gestion/**`

---

## 1. Propósito

Cualquier agente que trabaje sobre el Centro de Gestión debe mantener:

- seguridad;
- contexto;
- integridad de datos;
- diferenciación de producto;
- calidad;
- trazabilidad.

---

## 2. Regla principal

```text
Comprender primero.
Verificar segundo.
Modificar tercero.
```

---

## 3. Benchmark externo

El producto compartido por el usuario es una referencia.

Los agentes pueden extraer:

- patrones;
- ideas de flujo;
- heurísticas;
- aprendizajes UX.

No pueden copiar:

- marca;
- textos;
- personaje;
- nombre del asistente;
- paleta exacta;
- layout exacto;
- iconos;
- presets;
- microcopy;
- identidad.

Toda implementación debe ser propia.

---

## 4. Alcance

Permitido:

- `gestion/**`;
- docs de gestión;
- tests;
- staging;
- migraciones aditivas necesarias.

No autorizado:

- sitio público;
- RSVP público;
- galería;
- fotos;
- producción automática;
- datos reales como sandbox.

---

## 5. Lectura obligatoria

1. `gestion/PRD.md`
2. `gestion/CONTEXT.md`
3. `gestion/MEMORY.md`
4. `gestion/AGENTS.md`
5. `gestion/README.md`
6. `gestion/docs/ARCHITECTURE.md`
7. `gestion/docs/DOMAIN_RULES.md`
8. `gestion/docs/DATA_MODEL.md`
9. `gestion/docs/STATUS_AND_ROADMAP.md`
10. `gestion/docs/RUNBOOK.md`

Después inspeccionar código real.

---

## 6. Agentes especializados

### Product Lead

- alcance;
- decisiones;
- roadmap;
- PR pequeños.

### Wedding Operations Lead

- dominio;
- RSVP;
- invitados;
- mesas;
- proveedores;
- cronograma.

### UX Lead

- journeys;
- información;
- responsive;
- claridad.

### Visual / Design System Lead

- identidad propia;
- tokens;
- componentes;
- jerarquía.

### Frontend Engineer

- Next.js;
- React;
- accesibilidad;
- rendimiento.

### Backend Engineer

- rutas;
- validación;
- transacciones;
- errores.

### Supabase/Data Architect

- esquema;
- RLS;
- RPC;
- migraciones;
- backups.

### Security Lead

- secretos;
- privilegios;
- PII;
- logs;
- entornos.

### AI Product Lead

- asistente;
- propuestas;
- guardrails;
- human-in-the-loop.

### QA Lead

- regresión;
- responsive;
- accesibilidad;
- E2E.

### DevOps Lead

- Git;
- Preview;
- Vercel;
- rollback.

### Documentation Steward

- PRD;
- Context;
- Memory;
- handoffs;
- consistencia.

---

## 7. Flujo de trabajo

### Baseline

Registrar:

- branch;
- SHA;
- diff;
- entorno;
- Preview;
- riesgos.

### Diagnóstico

Identificar:

- archivos;
- tablas;
- APIs;
- RPC;
- migraciones;
- impacto RSVP;
- impacto producción.

### Plan

Cambio pequeño y revisable.

### Implementación

Siempre en rama.

### Validación

Ejecutar cuando existan:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

No declarar PASS si no se ejecutó.

### Preview

Debe estar aislado.

### PR

Incluir:

- problema;
- alcance;
- screenshots;
- datos;
- seguridad;
- pruebas;
- rollback.

### Merge

No automático.

---

## 8. Preview

```text
Preview y Development nunca deben escribir en Supabase o Sheets de producción.
```

Si no se puede confirmar aislamiento:

```text
BLOCKED_PREVIEW_ISOLATION_REQUIRED
```

---

## 9. Dominio

### RSVP

Conservar original.

### Invitados

Una ficha por persona.

### Acompañantes

No implícitos.

### Conciliación

Sólo exacta y única.

### Mesas

- `attending`;
- capacidad;
- consistencia;
- auditoría.

### Restricciones

Sensibles.

### Sheets

Espejo.

---

## 10. Asistente de planificación

Nombre provisional técnico.

Puede:

- leer contexto permitido;
- explicar;
- resumir;
- proponer;
- preparar.

No puede sin aprobación:

- mover;
- borrar;
- cambiar asistencia;
- modificar presupuesto;
- compartir;
- enviar;
- contratar;
- aprobar;
- desplegar.

---

## 11. IA para mesas

Separar:

```text
propuesta
```

de:

```text
asignación real
```

Nunca generar directamente sobre:

- `seating_assignments`;
- `wedding_guests.table_id`.

---

## 12. UX

No botones falsos.

Toda acción visible debe ser:

- funcional;
- deshabilitada con explicación;
- eliminada;
- “Próximamente” claramente indicado.

No depender de drag & drop en móvil.

---

## 13. Diseño

Crear un sistema visual propio.

No replicar el benchmark píxel por píxel.

Toda propuesta visual debe explicar:

- qué problema resuelve;
- qué mantiene;
- qué diferencia;
- cómo funciona móvil.

---

## 14. Migraciones

Por defecto:

- aditivas;
- pequeñas;
- reversibles.

Revisión especial:

- DROP;
- backfill;
- NOT NULL;
- cambio de tipo;
- trigger sensible;
- SECURITY DEFINER.

---

## 15. Seguridad

Prohibido:

- secretos en Git;
- service role en cliente;
- PII en logs;
- credenciales productivas en Preview;
- hardcodes de autorización;
- desactivar RLS como solución.

---

## 16. QA

### Resoluciones

```text
360x800
390x844
430x932
768x1024
1366x768
1440x900
```

### Casos críticos

- RSVP individual;
- respuesta conjunta;
- parcial;
- ambiguo;
- mesa llena;
- invitado no confirmado;
- movimiento de mesa;
- fallo Sheets;
- permisos por rol.

---

## 17. Handoff

Si el agente pierde contexto o certeza:

```text
gestion/docs/handoffs/YYYY-MM-DD-<tarea>.md
```

No seguir escribiendo.

---

## 18. Memory

Actualizar `MEMORY.md` sólo con decisiones duraderas.

No guardar:

- secretos;
- PII;
- snapshots temporales.

---

## 19. Señales de parada

Detener si:

- entorno incierto;
- Preview usa producción;
- migración incierta;
- cambio ajeno inesperado;
- prueba crítica falla;
- se requiere producción;
- se requiere borrar datos reales.

Usar:

```text
HUMAN_DECISION_REQUIRED
```

cuando corresponda.

---

## 20. Done

No basta con compilar.

Debe existir:

- comportamiento correcto;
- seguridad;
- integridad;
- responsive;
- QA;
- rollback;
- documentación;
- memoria actualizada.
