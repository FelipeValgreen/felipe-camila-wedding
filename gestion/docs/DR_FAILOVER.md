# DR_FAILOVER.md — Continuidad operacional mínima

## Escenarios

### Frontend Vercel caído

- usar exportaciones offline;
- verificar estado de Supabase antes de cualquier intervención;
- promover deployment estable anterior si corresponde.

### Supabase degradado

- congelar mutaciones;
- operar offline;
- no considerar Sheets fuente de verdad por defecto;
- restaurar/recuperar según alcance.

### Google Sheets degradado

- continuar con Supabase;
- dejar outbox pendiente;
- reparar espejo posteriormente.

### Proveedor LLM degradado

- activar fallback determinista;
- no bloquear módulos operativos.

### Internet local del venue degradado

- usar pack offline;
- registrar cambios localmente con hora/operador;
- reconciliar cuando vuelva conectividad.

## Prioridad

```text
personas y operación del evento
→ integridad canónica
→ disponibilidad UI
→ integraciones auxiliares
```
