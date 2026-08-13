# PREVIEW_STAGING.md — Entornos seguros del Centro de Gestión

## Objetivo

Evitar que Development o Vercel Preview modifiquen datos reales del matrimonio o la Google Sheet operativa.

## Regla principal

```text
Production puede escribir en producción.
Preview y Development permanecen read-only por defecto.
```

## Barreras incorporadas

### 1. API de gestión

`middleware.ts` bloquea por defecto métodos mutantes bajo `/api/**` cuando `VERCEL_ENV` no es `production`.

Métodos bloqueados por defecto:

- POST
- PUT
- PATCH
- DELETE

Para un staging aislado se puede habilitar explícitamente:

```dotenv
ALLOW_NON_PRODUCTION_WRITES=true
```

### 2. Supabase desde navegador

`lib/supabase-browser.ts` usa un `fetch` protegido.

Fuera del dominio canónico `gestion.felipeycami.cl` bloquea por defecto mutaciones contra:

- `/rest/v1/**`
- `/storage/v1/object**`

La autenticación de Supabase permanece disponible para poder iniciar sesión en Preview.

Para un staging aislado:

```dotenv
NEXT_PUBLIC_ALLOW_NON_PRODUCTION_WRITES=true
```

### 3. Google Sheets / sync_outbox

La sincronización externa requiere una habilitación independiente fuera de producción:

```dotenv
ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=true
```

No activar esta variable si `GOOGLE_SHEETS_SPREADSHEET_ID` corresponde a la planilla productiva.

## Configuración recomendada de Preview

Antes de habilitar escrituras:

1. crear Supabase staging o branch persistente;
2. usar datos ficticios;
3. configurar `NEXT_PUBLIC_SUPABASE_URL` de staging;
4. configurar publishable key de staging;
5. configurar secret key de staging;
6. usar una Google Sheet de prueba o mantener sync bloqueado;
7. habilitar `ALLOW_NON_PRODUCTION_WRITES=true`;
8. habilitar `NEXT_PUBLIC_ALLOW_NON_PRODUCTION_WRITES=true`;
9. habilitar `ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=true` sólo si existe Sheet de prueba;
10. redeploy del Preview;
11. ejecutar smoke tests con datos ficticios.

## Configuración recomendada de Development

Mantener por defecto:

```dotenv
ALLOW_NON_PRODUCTION_WRITES=false
NEXT_PUBLIC_ALLOW_NON_PRODUCTION_WRITES=false
ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=false
```

Habilitar sólo contra Supabase local o staging.

## Qué no prueba esta barrera

Las barreras de aplicación reducen el riesgo de escrituras accidentales, pero no reemplazan el aislamiento de infraestructura.

El objetivo final sigue siendo:

```text
Preview → Supabase staging → Sheet de prueba opcional
Production → Supabase production → Sheet production
```

## Checklist antes de un PR funcional

- [ ] branch distinta de `main`;
- [ ] Preview deployment `READY`;
- [ ] escritura accidental bloqueada;
- [ ] credenciales productivas no necesarias para desarrollar;
- [ ] si hay escrituras: Supabase staging confirmado;
- [ ] si hay sync: Google Sheet de prueba confirmada;
- [ ] `npm run typecheck`;
- [ ] `npm run build`;
- [ ] no cambios al sitio público;
- [ ] rollback documentado.
