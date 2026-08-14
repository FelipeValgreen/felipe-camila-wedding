# PERFORMANCE_BUDGET.md

## Objetivo

El Centro de Gestión no necesita optimización extrema, pero debe seguir siendo rápido en móvil y conexiones imperfectas durante la operación real.

## Metas de experiencia

- navegación P0 responde de forma perceptiblemente inmediata cuando los datos ya están cargados;
- evitar waterfalls innecesarios;
- tablas/listados grandes usan paginación, filtros server-side o virtualización cuando sea necesario;
- imágenes/documentos no bloquean el shell;
- editor de salón mantiene interacción fluida con el volumen real esperado;
- Copiloto muestra estado de progreso y no bloquea la UI.

## Budgets orientativos

- JS cliente: minimizar dependencias pesadas por ruta;
- Server Components por defecto cuando no se necesita interactividad;
- evitar cargar editor de salón en páginas que no lo usan;
- queries selectivas, no `select *` indiscriminado en listas sensibles;
- no polling agresivo.

## Validación

Antes del freeze medir al menos:

- carga de dashboard;
- listado de invitados real;
- mesas;
- salón;
- móvil 390×844;
- una conexión simulada lenta razonable.
