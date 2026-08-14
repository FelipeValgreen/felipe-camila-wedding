# DEPENDENCY_POLICY.md

## Principios

- minimizar dependencias cliente;
- preferir APIs del framework/plataforma ya instalada;
- nuevas dependencias requieren propósito claro, mantenimiento activo y tamaño/riesgo razonable;
- no incorporar SDK privilegiado al bundle cliente;
- fijar major versions conscientemente;
- revisar advisories antes de freeze.

## Antes de agregar

- ¿se puede resolver con código existente?;
- ¿afecta bundle?;
- ¿requiere secretos?;
- ¿tiene licencia adecuada?;
- ¿está mantenida?;
- ¿cómo se actualiza?;
- ¿cómo se prueba?

## Última semana

Evitar upgrades mayores no esenciales durante production freeze.
