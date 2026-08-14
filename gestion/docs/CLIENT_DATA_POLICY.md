# CLIENT_DATA_POLICY.md

## Regla

El navegador recibe sólo datos necesarios para la pantalla y el permiso actual.

## Evitar

- service-role/secret;
- consultas amplias con PII que luego “se oculta” por CSS;
- dataset financiero completo en páginas que sólo muestran un KPI;
- restricciones alimentarias en módulos que no las necesitan;
- notas privadas en payloads de proveedor.

## Caching

Datos personales/operativos deben usar estrategia de cache explícita. No asumir que una respuesta autenticada puede almacenarse públicamente.

## DevTools

Si un usuario autorizado abre Network/React state, no debería encontrar secretos ni PII que la pantalla no tenía motivo para cargar.
