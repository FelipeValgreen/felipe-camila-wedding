# Felipe & Camila — Centro de Gestión

Aplicación interna para operar el matrimonio de Felipe y Camila y base del futuro producto de gestión para parejas, wedding planners y proveedores.

> **Alcance protegido:** esta documentación se aplica exclusivamente a `gestion/**`, sus rutas API, migraciones y servicios de gestión. No autoriza cambios en el frontend público de `felipeycami.cl`, su galería, su carga de fotografías ni el flujo público de inscripción RSVP.

## Producción

- Centro de gestión: `https://gestion.felipeycami.cl/dashboard`
- Repositorio único: `FelipeValgreen/felipe-camila-wedding`
- Directorio de aplicación: `gestion/`
- Supabase canónico: proyecto `mwumnywbvjxekskfrlms`
- Google Sheets: espejo operativo, nunca fuente primaria
- Hosting: Vercel

La producción está activa y recibe confirmaciones reales. Ningún desarrollo o Preview debe escribir en la base productiva salvo una operación aprobada, respaldada y verificada explícitamente.

## Dirección de producto

El Centro de Gestión evoluciona hacia un Wedding Planning OS: planificación, personas, presupuesto, proveedores, seating, salón, cronograma, música, documentos, operación del evento y Copiloto conectados sobre una única fuente de verdad.

Las referencias externas compartidas por el usuario son **benchmarks**, no especificaciones literales. Se pueden reutilizar patrones de producto, pero la marca, identidad visual, navegación, microcopy, asistente y presets deben ser propios.

## Stack verificado

- Next.js 14
- React 18
- TypeScript 5
- Tailwind CSS 4 / PostCSS
- Supabase Auth, PostgreSQL y RLS
- `@supabase/ssr` y `@supabase/supabase-js`
- Vercel y Vercel Cron
- Google Sheets API mediante cuenta de servicio
- Lucide React
- Node test runner + TypeScript para pruebas automatizadas sin dependencias de test adicionales

## Comandos actuales

Desde `gestion/`:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run qa
npm run check:ci
npm run start
```

### Quality gates

- `npm test`: compila una suite aislada y ejecuta pruebas automatizadas de contratos críticos.
- `npm run typecheck`: valida TypeScript sin emitir archivos.
- `npm run build`: ejecuta primero `npm test` y sólo después genera el build de Next.js.
- `npm run qa`: lint + typecheck + build con tests incluidos.
- `npm run check:ci`: alias estable del gate completo para agentes y automatizaciones.

La suite protege actualmente política de entornos, normalización de teléfonos, guards obligatorios de rutas de escritura/sync, contratos del Copiloto y coordinación exclusiva de paneles flotantes.

## Estrategia de QA costo 0

Por decisión de producto no se mantendrá por ahora un branch Supabase de staging de pago.

El flujo de trabajo es:

```text
rama de desarrollo
→ Vercel Preview
→ lectura de fuentes reales
→ mutaciones bloqueadas por servidor
→ borradores locales para interacción
→ tests automáticos
→ build/typecheck
→ revisión
→ merge controlado
```

Esto mantiene el costo incremental en **US$0** y evita escribir en producción desde Preview. La contrapartida es que no se realizan E2E de escritura real fuera de producción. Esa brecha se compensa con tests de contratos y lógica pura; si más adelante una migración o feature necesita mutaciones completas, el staging se levanta sólo temporalmente.

## Variables de entorno

No guardar valores reales en Git.

Variables conocidas:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
CRON_SECRET=
ALLOW_NON_PRODUCTION_WRITES=
ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=
OPENAI_API_KEY=
OPENAI_COPILOT_MODEL=
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL=
```

Production, Preview y Development deben usar valores independientes. Preview nunca debe heredar credenciales productivas con capacidad de escritura. Los flags `ALLOW_NON_PRODUCTION_*` sólo se habilitan cuando exista un staging realmente aislado.

## Flujo de datos principal

```text
Centro de Gestión
→ sesión Supabase Auth
→ rutas API / RPC con RLS
→ Supabase como fuente canónica
→ audit_log
→ sync_outbox
→ worker idempotente
→ Google Sheets como espejo
```

## Política de entorno

`lib/runtime-policy.ts` contiene la lógica pura y testeable de clasificación del entorno y autorización de escrituras. `lib/environment-guard.ts` es el adaptador server-only que aplica esa política a `process.env`.

Regla:

```text
Production
→ escrituras canónicas permitidas según rol/RLS

Preview / Development / unknown
→ escrituras bloqueadas por defecto
→ sync externo bloqueado por defecto
→ sólo se habilitan con flags explícitos en staging aislado
```

## Documentación obligatoria

Antes de modificar código, leer en este orden:

1. [`PRD.md`](./PRD.md)
2. [`CONTEXT.md`](./CONTEXT.md)
3. [`MEMORY.md`](./MEMORY.md)
4. [`AGENTS.md`](./AGENTS.md)
5. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
6. [`docs/DOMAIN_RULES.md`](./docs/DOMAIN_RULES.md)
7. [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md)
8. [`docs/STATUS_AND_ROADMAP.md`](./docs/STATUS_AND_ROADMAP.md)
9. [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)

## Módulos actuales

- Inicio / Command Center
- Necesita atención / conciliación RSVP
- Planificación y tareas
- Invitados y editor rápido
- Relaciones y ramas familiares/sociales
- Mesas y asignaciones
- Seating Intelligence con escenarios explicables
- Diseño del salón 2D y layout versionado
- Presupuesto, pagos y proveedores
- Equipo / producción de proveedores
- Cronograma / Run of Show
- Música / repertorio / cues
- Documentos
- Actividad y auditoría
- Copiloto operacional grounded con acciones confirmables
- Estado del sistema
- Sincronización con Google Sheets

## Evolución prioritaria

1. Cerrar quality gates y regresiones del caso Felipe/Camila.
2. Ampliar pruebas automatizadas de conciliación, seating y acciones del Copiloto.
3. Mantener Preview en modo costo 0: lectura real + borradores locales + writes bloqueadas.
4. Terminar conciliación operativa de confirmados y seating final.
5. Ajustar salón, cronograma, música, proveedores y documentos con datos definitivos.
6. Validar la experiencia completa con Felipe/Camila como primer caso real.
7. Preparar segundo matrimonio piloto.
8. Multi-matrimonio y permisos por evento.
9. Portal de proveedores.
10. Comercialización y facturación posterior.

## Regla esencial

```text
No romper lo que ya funciona.
No probar escrituras reales sobre producción.
No confundir una respuesta RSVP con una persona.
No modificar el sitio público desde trabajos del Centro de Gestión.
No copiar literalmente el benchmark externo.
Toda IA propone; los cambios sensibles requieren confirmación explícita.
```