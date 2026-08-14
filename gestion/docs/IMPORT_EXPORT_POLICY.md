# IMPORT_EXPORT_POLICY.md

## Importaciones

- plantilla versionada;
- validar headers;
- dry-run;
- mostrar altas/cambios/errores;
- no fuzzy match automático;
- no sobrescribir campos sensibles silenciosamente;
- operación idempotente cuando sea posible;
- auditoría de batch;
- rollback o archivo fuente.

## Exportaciones

- scope por rol;
- IDs canónicos cuando sea útil;
- timestamp/version;
- CSV/XLSX protegidos contra formula injection;
- no incluir PII innecesaria;
- versión offline separada para catering/venue/proveedores.

## Google Sheets

Una exportación/importación explícita no convierte Sheets en fuente bidireccional libre.
