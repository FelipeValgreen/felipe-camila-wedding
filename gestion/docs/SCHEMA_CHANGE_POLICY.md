# SCHEMA_CHANGE_POLICY.md

## Principios

- migraciones aditivas primero;
- expand → migrate → contract;
- no `DROP` en el mismo paso que introduce reemplazo salvo emergencia controlada;
- constraints duras se incorporan después de limpiar/backfill y verificar;
- funciones `SECURITY DEFINER` con `search_path` seguro;
- índices para FKs/queries críticas;
- RLS/grants en la misma entrega que una tabla sensible.

## Flujo

```text
migración SQL
→ revisión
→ local/staging
→ seed
→ tests
→ backup prod
→ apply prod
→ verification
```

## Backfills

- idempotentes cuando sea posible;
- batch si el volumen lo requiere;
- datos privados no incluidos en migraciones públicas;
- registrar conteos antes/después;
- no mezclar inferencias no verificadas con schema migration.

## Rollback

Preferir corrección forward si revertir esquema destruye datos. Documentar restauración selectiva para cambios de datos.
