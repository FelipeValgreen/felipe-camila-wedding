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

La producción está activa y recibe confirmaciones reales. Ningún desarrollo o preview debe escribir en la base productiva salvo una operación aprobada, respaldada y verificada explícitamente.

## Dirección de producto

El Centro de Gestión debe evolucionar hacia un sistema integral de planificación y operación de bodas, conservando la lógica fiable ya existente.

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

## Comandos actuales

Desde `gestion/`:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

### Brecha conocida

El `package.json` actual no contiene scripts formales de `test` ni `typecheck`. Hasta incorporarlos, el build de Next.js no debe considerarse la única garantía de calidad.

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
```

Production, Preview y Development deben usar valores independientes. Preview nunca debe heredar credenciales productivas.

## Flujo de datos principal

```text
Centro de Gestión
→ sesión Supabase Auth
→ rutas API / RPC con RLS
→ Supabase como fuente canónica
→ sync_outbox
→ worker idempotente
→ Google Sheets como espejo
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

- Resumen operativo
- Invitados individuales
- Respuestas RSVP originales
- Integrantes de respuestas conjuntas
- Bandeja de incidencias
- Mesas y asignaciones
- Vista gráfica referencial
- Finanzas y pagos
- Proveedores en base de datos
- Auditoría
- Sincronización con Google Sheets

## Evolución prioritaria

1. Documentación y baseline.
2. Aislamiento seguro de Preview y staging.
3. Sistema visual y navegación propios.
4. Inicio, planificación, presupuesto y proveedores.
5. Invitados, mesas y salón conectados.
6. Cronograma, música y documentos.
7. Inteligencia asistida con aprobación humana.
8. Segundo matrimonio piloto.
9. Multi-matrimonio.
10. Comercialización y facturación posterior.

## Regla esencial

```text
No romper lo que ya funciona.
No probar sobre producción.
No confundir una respuesta RSVP con una persona.
No modificar el sitio público desde trabajos del Centro de Gestión.
No copiar literalmente el benchmark externo.
```
