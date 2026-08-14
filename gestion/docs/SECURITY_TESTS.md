# SECURITY_TESTS.md

## Auth

- unauthenticated → 401/redirect;
- inactive user blocked;
- expired session handled.

## RBAC

- viewer direct API mutation denied;
- editor cannot manage roles;
- cross-role sensitive fields hidden where required.

## Environment

- Preview POST/PATCH/DELETE blocked;
- browser direct Supabase mutation blocked outside canonical production/staging opt-in;
- external sync blocked.

## Supabase

- RLS denies unauthorized direct client query;
- service-role only server-side;
- SECURITY DEFINER functions have secure search path;
- no overly broad grants.

## Injection / validation

- unexpected enum;
- oversized string;
- JSON shape;
- spreadsheet formula injection;
- prompt-injected document does not alter Copilot permissions.

## Secrets/PII

- build output no secret;
- logs no token;
- public repo scan;
- API errors no stack/SQL/secret.
