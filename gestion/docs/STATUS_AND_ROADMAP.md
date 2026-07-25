# STATUS_AND_ROADMAP.md — Estado y hoja de ruta

> Los conteos de producción son una fotografía temporal. Verificar Supabase antes de tomar decisiones operativas.

## 1. Leyenda

- ✅ Producción
- 🟡 Funcional, requiere mejoras
- 🔵 En desarrollo o siguiente entrega
- ⚪ No iniciado
- 🔴 Bloqueado o requiere decisión

## 2. Estado actual

| Módulo | Estado | Observación |
|---|---|---|
| Autenticación administrativa | ✅ | Supabase Auth + `admin_profiles` |
| Resumen operativo | ✅ | Métricas y actualización automática |
| Invitados individuales | ✅ | Creación, edición y estados |
| RSVP originales | ✅ | Visibles en gestión |
| Integrantes de RSVP conjuntos | ✅ | Separación de personas implementada |
| Conciliación | ✅ | Exacta y revisión manual |
| Bandeja de incidencias | ✅ | Base para “Necesita tu atención” |
| Restricciones alimentarias | ✅ | Por persona, con datos sensibles |
| Google Sheets | ✅ | Espejo mediante `sync_outbox` |
| Auditoría | ✅ | `audit_log` para cambios relevantes |
| Mesas por lista | ✅ | Selector, capacidad y validaciones |
| Plano referencial | 🟡 | No trabaja aún como editor profesional |
| Finanzas y pagos | 🟡 | Funcional para matrimonio actual |
| Proveedores | 🟡 | Datos existentes; falta experiencia completa |
| Portal de proveedores | ⚪ | Falta implementar permisos y UX |
| Cronograma compartido | ⚪ | Falta modelo y vistas |
| Entregables versionados | ⚪ | Falta modelo y portal |
| Planos 2D profesionales | ⚪ | Prioridad estratégica |
| IA para mesas | ⚪ | Debe operar sobre propuestas aisladas |
| Staging aislado | 🔴 | Debe configurarse antes de PR funcionales grandes |
| Pruebas automatizadas de gestión | 🔴 | No existe script formal `test` |
| Typecheck separado | 🔴 | No existe script formal `typecheck` |
| Multi-matrimonio | ⚪ | Etapa posterior al segundo piloto |
| Facturación comercial | ⚪ | Pospuesta deliberadamente |

## 3. Fotografía operativa conocida

Corte histórico de referencia al cierre de la reparación del 25 de julio de 2026:

| Indicador | Valor conocido |
|---|---:|
| RSVP totales | 54 |
| RSVP afirmativos | 53 |
| RSVP negativos | 1 |
| Invitados activos | 258 |
| Personas individuales confirmadas | 36 |
| RSVP individuales conciliados | 32 |
| Respuestas conjuntas conciliadas | 2 |
| Respuestas parciales | 1 |
| Sin conciliar | 19 |
| Sheets sincronizados | 54 |
| `sync_outbox` pendientes | 0 |
| Mesas configuradas | 4 |
| Capacidad configurada | 40 |
| Asignaciones reales | 0 |

No hardcodear estos valores en la aplicación ni tratarlos como vigentes sin consulta actual.

## 4. Riesgos abiertos

### Producción activa

Personas continúan confirmándose. Una migración o preview mal configurado puede afectar datos reales.

### Falta de staging formal

Antes de desarrollo funcional nuevo se requiere:

- Supabase staging o branch persistente;
- Vercel Preview apuntando a staging;
- datos ficticios;
- Google Sheets de prueba o integración desactivada.

### Cobertura automática insuficiente

El proyecto necesita:

- `typecheck`;
- tests de dominio;
- tests de RLS;
- tests de rutas;
- guard de regresión específico de `gestion/`.

### Roles actuales

`owner`, `editor` y `viewer` no son suficientes para proveedores ni múltiples matrimonios.

### Planos

La experiencia visual actual no es suficiente para que un centro de eventos o productor la use como plano profesional.

## 5. Roadmap progresivo

## Fase 0 — Documentación y seguridad

Estado: 🔵

Objetivos:

- incorporar documentación profesional;
- definir alcance protegido;
- crear reglas para agentes;
- auditar Preview y variables;
- diseñar staging;
- añadir scripts de calidad.

Criterio de salida:

- agentes pueden comprender el sistema;
- Preview no puede escribir en producción;
- existe una prueba básica repetible.

## Fase 1 — Producto comprensible

Objetivos:

- reorganizar navegación;
- convertir incidencias en “Necesita tu atención”;
- mejorar experiencia de proveedores;
- definir roles entendibles;
- crear contexto mínimo de matrimonio.

Primer PR funcional recomendado:

- navegación;
- home operativo;
- proveedores básicos;
- roles iniciales;
- sin multi-matrimonio completo;
- sin IA;
- sin editor de planos.

## Fase 2 — Operación compartida

Objetivos:

- cronograma;
- tareas por proveedor;
- entregables;
- confirmar recepción;
- comentarios simples;
- exportaciones por rol.

## Fase 3 — Planos 2D profesionales

Objetivos:

- cargar plano como fondo;
- escala;
- objetos;
- capas;
- zoom;
- alineación;
- rotación;
- bloqueo;
- versiones;
- vistas por proveedor.

No incluir 3D inicialmente.

## Fase 4 — IA asistida para mesas

Objetivos:

- reglas estructuradas;
- instrucciones en lenguaje natural;
- motor determinista;
- varias propuestas;
- puntuación;
- explicación;
- aprobación humana;
- rollback.

La IA nunca debe modificar asignaciones reales durante la generación.

## Fase 5 — Segundo matrimonio piloto

Objetivos:

- crear segundo conjunto ficticio o piloto;
- probar onboarding;
- probar roles;
- probar aislamiento;
- encontrar supuestos hardcodeados.

## Fase 6 — Multi-matrimonio

Objetivos:

- `weddings`;
- `wedding_members`;
- `wedding_id` progresivo;
- RLS por matrimonio;
- plantillas;
- archivo de eventos terminados.

## Fase 7 — Producto comercial

Objetivos:

- marca blanca;
- planes y límites;
- soporte;
- recuperación de cuenta;
- privacidad;
- términos;
- observabilidad.

## Fase posterior

- facturación;
- pagos en plataforma;
- 3D;
- marketplace;
- app nativa.

## 6. Criterios del MVP comercial

El MVP es utilizable cuando:

1. La pareja opera sin entrar a Supabase.
2. El planner gestiona invitados, RSVP, mesas y cronograma.
3. La banquetera descarga cantidades y restricciones.
4. El centro consulta plano, capacidades y montaje.
5. Fotografía consulta cronograma y shot list.
6. Cada proveedor ve solo lo necesario.
7. Respuestas conjuntas cuentan por persona.
8. Incidencias son accionables.
9. Sheets refleja Supabase.
10. Cambios relevantes quedan auditados.
11. La interfaz funciona en móvil y escritorio.
12. Las propuestas de IA son reversibles.
13. Puede agregarse un segundo matrimonio sin duplicar código.

## 7. Fuera de alcance inmediato

- cambios al sitio público;
- facturación comercial;
- pagos online;
- 3D;
- marketplace;
- chat en tiempo real;
- aplicación móvil nativa;
- IA autónoma.

## 8. Próxima decisión

Después de fusionar este paquete documental:

1. Antigravity IDE realiza auditoría de solo lectura de `gestion/`.
2. Se corrigen discrepancias documentales.
3. Se configura staging.
4. Se prepara un PR pequeño de calidad y protecciones de entorno.
5. Solo después comienza la adaptación funcional.
