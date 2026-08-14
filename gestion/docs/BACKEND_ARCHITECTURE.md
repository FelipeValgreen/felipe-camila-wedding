# BACKEND_ARCHITECTURE.md

## Principios

- Route Handlers delgados;
- auth/RBAC temprano;
- validación de schema;
- lógica de dominio reusable;
- transacciones/RPC para invariantes multi-entidad;
- audit/outbox después de validar y dentro de estrategia consistente;
- errores saneados;
- service role sólo cuando es necesario.

## Capas objetivo

```text
HTTP
→ auth/permission
→ schema validation
→ domain service
→ Supabase/RPC
→ audit/outbox
→ response
```

## No hacer

- SQL/reglas distintas duplicadas en varios routes;
- confiar en payload de rol enviado por cliente;
- usar service role para evitar RLS sin justificar;
- `console.log` de payload sensible;
- sync externo dentro de la transacción principal del usuario.
