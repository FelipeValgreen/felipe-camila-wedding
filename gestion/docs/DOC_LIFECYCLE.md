# DOC_LIFECYCLE.md

## Estados

- `CURRENT` — fuente vigente;
- `DRAFT` — diseño aún no adoptado;
- `HISTORICAL` — evidencia de fase anterior;
- `DEPRECATED` — reemplazado, conservar sólo por referencia;
- `ARCHIVED` — fuera del set de lectura normal.

## Reglas

- sólo un `STATUS_AND_ROADMAP.md` vigente por subproyecto;
- documentos históricos con fecha/estado visible;
- si código contradice docs actuales, actualizar docs en el mismo PR;
- no guardar conteos live en documentos durables;
- PRD cambia versión cuando cambia alcance/requisito significativo;
- ADR no se reescribe para ocultar una decisión anterior: crear ADR superseding cuando corresponda.
