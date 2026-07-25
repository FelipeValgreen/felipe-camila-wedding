# CONTEXT.md — Contexto del Centro de Gestión

## Alcance

Este documento describe exclusivamente `gestion.felipeycami.cl/dashboard` y los servicios usados por el Centro de Gestión.

Queda fuera de alcance:

- frontend público de `felipeycami.cl`;
- flujo público de RSVP;
- galería pública;
- carga pública de fotografías;
- cambios editoriales de la invitación.

## Identidad del proyecto

- Novios: Felipe y Camila
- Fecha: 23 de octubre de 2026
- Ceremonia: 17:30
- Repositorio único: `FelipeValgreen/felipe-camila-wedding`
- Aplicación de gestión: `gestion/`
- Producción: `https://gestion.felipeycami.cl/dashboard`
- Supabase canónico: `mwumnywbvjxekskfrlms`
- Google Sheets: `F&C Centro Comandos`

## Situación operativa

El matrimonio actual es un caso real en producción. Personas continúan enviando confirmaciones, por lo que cualquier cambio debe preservar:

- inserción de nuevos RSVP;
- conciliación;
- fichas individuales;
- incidencias;
- sincronización con Sheets;
- métricas;
- asignaciones de mesa;
- auditoría.

El Centro de Gestión ya es funcional. La meta es adaptarlo progresivamente para que también pueda ser usado por:

- novios;
- wedding planners;
- banqueteras;
- centros de eventos;
- fotógrafos y videógrafos;
- equipos audiovisuales;
- decoradores y otros proveedores.

## Visión del producto

La plataforma tendrá tres experiencias conectadas.

### 1. Administración del matrimonio

Para pareja y planner:

- invitados;
- RSVP;
- incidencias;
- restricciones;
- mesas;
- planos;
- cronograma;
- proveedores;
- entregables;
- finanzas;
- actividad.

### 2. Portal de proveedores

Cada proveedor debe ver únicamente:

- tareas propias;
- documentos compartidos;
- cronograma relevante;
- cambios recientes;
- contactos autorizados;
- información mínima necesaria.

### 3. Inteligencia asistida

La IA debe:

- interpretar instrucciones;
- transformar instrucciones en reglas;
- generar propuestas de mesas;
- explicar decisiones;
- comparar alternativas.

La IA nunca debe:

- aplicar cambios reales sin aprobación;
- inferir relaciones privadas;
- saltarse capacidad;
- mover invitados directamente si la generación queda incompleta.

## Estado funcional conocido

Módulos en producción:

- resumen operativo;
- directorio de invitados;
- respuestas RSVP originales;
- integrantes individuales por respuesta;
- conciliación;
- bandeja de incidencias;
- restricciones alimentarias;
- edición de fichas;
- mesas;
- asignaciones;
- vista gráfica referencial;
- finanzas;
- actividad;
- sincronización con Google Sheets;
- auditoría.

Módulos incompletos o pendientes:

- proveedores como experiencia completa;
- portal de proveedores;
- cronograma compartido;
- entregables versionados;
- planos 2D profesionales;
- reglas y propuestas de IA para mesas;
- multi-matrimonio;
- facturación, para una etapa posterior.

## Conceptos de negocio

### Invitado

Persona individual registrada en `wedding_guests`.

### Respuesta RSVP

Formulario original guardado en `rsvp_responses`. Puede representar una o varias personas.

### Integrante de respuesta

Persona detectada dentro de una respuesta, registrada en `rsvp_response_members`.

### Incidencia

Situación que requiere revisión humana, registrada en `management_issues`.

### Conciliación

Vinculación entre un integrante de RSVP y una ficha individual.

### Reconfirmación

Estado posterior e independiente de la asistencia original.

### Espejo operativo

Google Sheets. Refleja Supabase, pero no debe sustituirlo.

## Casos conjuntos importantes

Resueltos como personas individuales:

- Claudia Kauak y Phillipe Casabon.
- Felipe Márquez y Mane Sánchez.

Parcial:

- Verónica Ceroni identificada.
- Hernán Muñoz pendiente de ficha inequívoca.

Estos casos justifican que el modelo separe respuesta original de personas.

## Reglas históricas importantes

- Invitaciones individuales.
- No existe acompañante implícito.
- No realizar fuzzy matching automático.
- No alterar reconfirmación al cambiar asistencia.
- No afirmar sincronización sin verificarla.
- Crear respaldo antes de cambios masivos.
- No usar Supabase Edge Functions.
- Proveedores con mínimo privilegio.
- Una sola fuente de verdad para cada dato.

## Stack confirmado

- monorepo único;
- Next.js y TypeScript en `gestion/`;
- Supabase PostgreSQL, Auth y RLS;
- Vercel;
- Google Sheets API;
- cron horario;
- GitHub y PR;
- desarrollo asistido por IA, especialmente Antigravity IDE y agentes compatibles con Markdown de contexto.

## Forma de trabajo

- documentación dentro de `gestion/`;
- agentes leen contexto antes de modificar;
- Preview aislado;
- staging con datos ficticios;
- PR pequeños;
- migraciones aditivas;
- aprobación humana antes de producción.

## Orden de evolución

1. Documentación profesional.
2. Aislamiento seguro de Preview y staging.
3. Navegación y “Necesita tu atención”.
4. Proveedores y permisos entendibles.
5. Cronograma y entregables.
6. Planos 2D profesionales.
7. IA asistida para mesas.
8. Segundo matrimonio piloto.
9. Multi-matrimonio.
10. Facturación y comercialización posterior.
