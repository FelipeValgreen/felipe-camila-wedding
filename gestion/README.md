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

1. [`AGENTS.md`](./AGENTS.md)
2. [`CONTEXT.md`](./CONTEXT.md)
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
4. [`docs/DOMAIN_RULES.md`](./docs/DOMAIN_RULES.md)
5. [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md)
6. [`docs/STATUS_AND_ROADMAP.md`](./docs/STATUS_AND_ROADMAP.md)
7. [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)

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

## Dirección del producto

La evolución debe ser progresiva:

1. Consolidar el matrimonio actual.
2. Crear accesos entendibles para proveedores.
3. Incorporar cronograma y entregables.
4. Desarrollar planos 2D profesionales.
5. Añadir IA asistida para propuestas de mesas.
6. Probar un segundo matrimonio.
7. Implementar multi-matrimonio con aislamiento completo.
8. Incorporar facturación en una etapa posterior.

## Regla esencial

```text
No romper lo que ya funciona.
No probar sobre producción.
No confundir una respuesta RSVP con una persona.
No modificar el sitio público desde trabajos del Centro de Gestión.
```
