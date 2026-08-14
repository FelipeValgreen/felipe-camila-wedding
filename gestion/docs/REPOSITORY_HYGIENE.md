# REPOSITORY_HYGIENE.md

## Objetivo

Mantener el repositorio público libre de artefactos que confundan agentes, expongan información o dificulten releases.

## Reglas

- no commitear `.DS_Store` nuevos;
- no commitear `.env` reales;
- no commitear backups con datos reales;
- no commitear exports de invitados;
- no commitear screenshots con PII;
- scripts de debug deben eliminarse o aislarse antes de release si ya no son necesarios;
- documentos históricos deben marcarse como históricos;
- migraciones privadas/backfills con PII no viven en repo público;
- archivos generados deben estar en `.gitignore` cuando no sean parte del producto.

## Auditoría previa a release

Buscar:

```text
.env
secret
token
private_key
service_role
phone
email
backup
.DS_Store
debug
```

La presencia de una palabra no implica vulnerabilidad, pero requiere revisión contextual.

## Branches y PRs

- cambios funcionales en ramas;
- PR con alcance claro;
- cerrar ramas/PRs obsoletos después de verificar que no contienen trabajo único;
- no mantener múltiples documentos de estado “actual” en paralelo.
