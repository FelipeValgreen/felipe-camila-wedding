# ROLLBACK_MATRIX.md

| Cambio | Rollback preferido |
|---|---|
| UI | revert/promote deployment |
| API compatible | revert código |
| Feature nueva | flag + revert |
| Migración aditiva | dejar schema + revert uso si es seguro |
| Backfill incorrecto | restauración selectiva / correction forward |
| RLS | policy corrective migration + verify sessions |
| Seating masivo | restore previous assignment snapshot/transactional rollback |
| Sheet mirror | rebuild from Supabase canonical |
| LLM integration | disable provider, fallback deterministic |

No aplicar rollback de datos sin evaluar cambios válidos posteriores.
