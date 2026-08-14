# TEST_NAMING.md

Convención recomendada:

```text
<domain>.<behavior>.test.ts
<journey>.spec.ts
```

Tests describen conducta observable, no implementación interna.

Ejemplo:

```text
seating.rejects-over-capacity.test.ts
rbac.viewer-cannot-mutate.test.ts
preview.blocks-production-write.test.ts
```
