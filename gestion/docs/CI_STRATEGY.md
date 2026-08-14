# CI_STRATEGY.md

## Objetivo

Hacer que los gates básicos del Centro de Gestión sean reproducibles y no dependan de recordar comandos manuales.

## Pipeline mínimo

```text
install
→ lint
→ typecheck
→ unit/integration tests
→ build
→ secret/PII sanity checks
```

## E2E

Separado porque requiere infraestructura:

```text
staging ready
→ seed ficticio
→ e2e
→ cleanup/reset
```

## Scripts objetivo

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:ci
```

`check:ci` debe ser ejecutable localmente y en CI.

## PR gate

No permitir que documentación diga `check:ci` disponible si el script real no existe.

## Seguridad

CI nunca imprime secretos. Tests de integración externa usan credenciales de staging, no producción.
