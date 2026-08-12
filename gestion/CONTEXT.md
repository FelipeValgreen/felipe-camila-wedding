# CONTEXT.md — Contexto Maestro del Centro de Gestión

**Versión:** 2.0 RC  
**Fecha:** 12 de agosto de 2026  
**Ámbito:** `gestion/**`

---

## 1. Identidad

El repositorio `FelipeValgreen/felipe-camila-wedding` contiene:

1. experiencia pública del matrimonio;
2. Centro de Gestión en `gestion/`.

Este documento describe sólo el Centro de Gestión.

---

## 2. Caso real

- Pareja: Felipe y Camila
- Fecha: 23 de octubre de 2026
- Timezone: America/Santiago
- Producción: `https://gestion.felipeycami.cl/dashboard`
- Repositorio: `FelipeValgreen/felipe-camila-wedding`
- Directorio: `gestion/`
- Proyecto Vercel: `gestion`
- Supabase canónico: `mwumnywbvjxekskfrlms`
- Google Sheets: `F&C Centro Comandos`

Producción contiene datos reales y no debe usarse como sandbox.

---

## 3. Propósito

Evolucionar el Centro de Gestión hacia un sistema integral de planificación y operación de bodas reutilizable por:

- parejas;
- planners;
- catering;
- venues;
- fotografía;
- audiovisual;
- decoración;
- otros proveedores.

---

## 4. Benchmark compartido por el usuario

El usuario compartió un producto externo como referencia visual y funcional.

Referencia adicional:

`https://www.youtube.com/watch?v=CoHKehTBP-Y`

Ese producto debe tratarse únicamente como:

```text
benchmark / inspiración / referencia
```

Nunca como:

```text
marca / identidad / especificación literal
```

### Aprendizajes útiles

- módulos claros;
- gestión de proveedores;
- invitados;
- mesas;
- plano;
- importación Excel;
- presets;
- ayuda contextual;
- lenguaje simple.

### Diferenciación obligatoria

Nuestro producto debe tener:

- naming propio;
- navegación reinterpretada;
- identidad visual propia;
- microcopy propio;
- asistente propio;
- presets propios;
- iconografía propia;
- decisiones UX propias.

---

## 5. Baseline técnico conocido

### Stack

- Next.js 14
- React 18
- TypeScript 5
- Tailwind / PostCSS
- Supabase Auth
- PostgreSQL
- RLS
- Vercel
- Vercel Cron
- Google Sheets API
- GitHub

### Rutas conocidas

```text
/dashboard
/dashboard/guests
/dashboard/issues
/dashboard/tables
/dashboard/finance
/dashboard/activity
```

---

## 6. Arquitectura

```text
Usuario autenticado
→ Next.js
→ Supabase Auth
→ RLS / APIs / RPC
→ PostgreSQL
→ audit_log
→ sync_outbox
→ Google Sheets
```

Supabase es canónico.

Sheets es espejo.

---

## 7. Datos de dominio

### RSVP

`rsvp_responses`

Conserva la evidencia original.

### Integrantes

`rsvp_response_members`

Representa personas detectadas dentro de una respuesta.

### Invitados

`wedding_guests`

Ficha individual.

### Incidencias

`management_issues`

Casos que requieren revisión humana.

### Mesas

- `wedding_tables`
- `seating_assignments`
- `wedding_guests.table_id`

---

## 8. Reglas no negociables

- una respuesta RSVP no siempre es una persona;
- cada asistente necesita ficha individual;
- no +1 implícito;
- no fuzzy matching automático;
- asistencia y reconfirmación son independientes;
- sólo `attending` puede sentarse;
- no superar capacidad;
- restricciones son sensibles;
- Supabase es canónico;
- Sheets es espejo;
- IA propone, no aplica automáticamente.

---

## 9. Estado funcional

Existe base para:

- autenticación;
- resumen;
- invitados;
- RSVP;
- integrantes;
- conciliación;
- incidencias;
- restricciones;
- mesas;
- asignaciones;
- finanzas;
- proveedores;
- actividad;
- auditoría;
- sincronización.

Pendiente o incompleto:

- staging formal;
- tests;
- typecheck;
- sistema visual propio;
- mobile UX;
- ciclo completo de proveedores;
- cronograma;
- documentos;
- editor 2D profesional;
- asistente;
- IA de mesas;
- multi-matrimonio.

---

## 10. Dirección de producto

El producto se organiza alrededor de:

- Inicio
- Planificación
- Presupuesto
- Proveedores
- Invitados
- Mesas
- Salón
- Cronograma
- Música
- Documentos
- Actividad
- Configuración

La navegación final puede iterarse, pero no debe copiar literalmente la referencia externa.

---

## 11. Invitados, mesas y salón

Estos tres dominios deben conectarse.

```text
Invitado
→ estado
→ mesa
→ capacidad
→ plano
```

El sistema debe evitar duplicar datos entre pantallas.

---

## 12. Asistente

Nombre provisional:

```text
Asistente de planificación
```

El nombre definitivo, identidad, avatar y tono se definirán más adelante.

No utilizar nombres o personajes del benchmark.

---

## 13. Editor del salón

Debe separar:

### Preview

Inspiracional.

### Plano

Operativo.

El preview no reemplaza el plano real.

---

## 14. Diseño visual

Aún NO existe paleta definitiva aprobada para el nuevo sistema.

Requisitos de dirección:

- elegante;
- premium;
- calmado;
- editorial;
- moderno;
- legible;
- propio.

No asumir como obligatorios colores o tipografías del benchmark.

---

## 15. Entornos

### Production

Datos reales.

### Preview

Debe usar staging o impedir escrituras.

### Development

Preferir datos ficticios e integraciones externas desactivadas.

Regla:

```text
Preview nunca escribe en producción.
```

---

## 16. Alcance protegido

No modificar desde tareas de gestión:

- sitio público;
- galería;
- carga de fotos;
- RSVP público;
- APIs públicas de inscripción.

Requieren autorización separada.

---

## 17. Baseline Git histórico

Referencia conocida:

```text
main
3c08cb05cdf0b2db636f89cf10dfe56ebfc23508
```

Ese commit incorporó documentación profesional del Centro de Gestión.

Antes de trabajar, volver a verificar Git.

---

## 18. Baseline Vercel histórico

Referencia observada:

```text
project: gestion
state: READY
target: production
commit: 3c08cb05cdf0b2db636f89cf10dfe56ebfc23508
```

Volver a verificar antes de desplegar.

---

## 19. Documentación existente

Conservar y armonizar con:

- `gestion/README.md`
- `gestion/AGENTS.md`
- `gestion/CONTEXT.md`
- `gestion/PRD.md`
- `gestion/MEMORY.md`
- `gestion/docs/ARCHITECTURE.md`
- `gestion/docs/DOMAIN_RULES.md`
- `gestion/docs/DATA_MODEL.md`
- `gestion/docs/STATUS_AND_ROADMAP.md`
- `gestion/docs/RUNBOOK.md`
- auditorías.

---

## 20. Prioridad ante conflictos

1. seguridad;
2. reglas de dominio;
3. esquema y código verificados;
4. PRD aprobado;
5. Context;
6. Memory;
7. documentación histórica;
8. prompts antiguos.

Un benchmark externo nunca prevalece sobre el dominio del producto.
