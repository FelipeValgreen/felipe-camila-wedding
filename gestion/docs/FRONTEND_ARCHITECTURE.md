# FRONTEND_ARCHITECTURE.md

## Principios

- Server Components por defecto para lectura;
- Client Components sólo donde se necesita estado/interacción;
- domain/API layer compartida para mutaciones;
- no duplicar reglas de dominio en cada componente;
- estados loading/error/empty explícitos;
- optimistic UI sólo cuando rollback/conflicto están resueltos.

## Dashboard

Shell persistente + rutas modulares. Copiloto transversal no debe acoplar cada módulo a un proveedor LLM.

## Formularios

- validación cliente para UX;
- validación servidor como autoridad;
- conservar valores ante error;
- errores por campo y globales.

## Datos sensibles

No hidratar al cliente campos que la pantalla no necesita sólo porque la consulta server los obtuvo.
