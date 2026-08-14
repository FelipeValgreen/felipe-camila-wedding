# NON_FUNCTIONAL_REQUIREMENTS.md

## Seguridad

- mínimo privilegio;
- RLS/RBAC;
- secretos server-side;
- Preview aislado;
- auditoría;
- PII minimizada.

## Integridad

- reglas críticas protegidas en servidor/DB;
- transacciones para operaciones multi-entidad;
- idempotencia en retries/sync;
- concurrencia detectada.

## Disponibilidad

- módulos operativos no dependen del LLM;
- fallo de Sheets no invalida Supabase;
- paquete offline para el evento.

## Rendimiento

- navegación responsive;
- queries selectivas;
- no cargar editores pesados globalmente;
- listados reales utilizables en móvil.

## Accesibilidad

- objetivo WCAG 2.2 AA razonable;
- teclado/focus;
- alternativa a drag & drop;
- estados y errores accesibles.

## Mantenibilidad

- TypeScript;
- migraciones versionadas;
- tests;
- documentación canónica;
- ADR;
- CI reproducible.

## Observabilidad

- health;
- logs saneados;
- audit log;
- sync health;
- diagnóstico de integridad.

## Recuperación

- backups verificables;
- restore selectivo;
- rollback de deploy;
- staging para ensayo.
