# WEDDING_DAY_RUNBOOK.md — Operación del matrimonio

**Felipe & Camila · 23 de octubre de 2026**  
**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Definir cómo operar el Centro de Gestión antes, durante y después del matrimonio sin depender de improvisación técnica, conectividad perfecta o conocimiento de una sola persona.

Este runbook es operacional. No reemplaza el runbook técnico de despliegue/restauración.

## 2. Principios del día

1. La boda continúa aunque falle Internet.
2. El sistema apoya la operación; no debe convertirse en un punto único de falla.
3. Cambios de última hora deben ser pequeños, explícitos y auditables.
4. No hacer migraciones, rediseños ni cambios estructurales el día del evento.
5. La lista final, mesas, restricciones y cronograma deben existir offline.
6. Toda persona operativa debe saber dónde está la versión canónica.
7. Privacidad sigue aplicando durante contingencias.

## 3. Roles operativos mínimos

Asignar nominalmente antes de T-7 días:

- **Owner de sistema:** autoridad final sobre cambios de datos;
- **Planner/Coordinación:** operación general del evento;
- **Invitados/recepción:** confirmaciones, llegadas, incidencias y mesa;
- **Banquetería:** cantidades y restricciones autorizadas;
- **Venue/montaje:** layout y tiempos de montaje;
- **Música/AV:** cues y programa;
- **Contingencia técnica:** acceso a restore/deploy si ocurre un fallo crítico.

Una persona puede cumplir más de un rol, pero la responsabilidad debe estar explícita.

## 4. T-30 a T-14 días

- [ ] revisar confirmados sin ficha;
- [ ] validar relaciones relevantes para seating;
- [ ] completar ramas familiares/sociales necesarias;
- [ ] validar capacidad real del recinto;
- [ ] actualizar proveedores y contactos day-of;
- [ ] completar pagos críticos;
- [ ] completar cronograma macro;
- [ ] completar momentos musicales críticos;
- [ ] verificar documentos/contratos relevantes;
- [ ] ejecutar smoke general del sistema.

## 5. T-7 días — Freeze estructural

A partir de este punto evitar cambios arquitectónicos no esenciales.

- [ ] versión de aplicación estable;
- [ ] migraciones estructurales cerradas salvo emergencia;
- [ ] confirmados conciliados en nivel suficiente para seating;
- [ ] mesas y capacidad definidas;
- [ ] escenario de seating seleccionado;
- [ ] layout del salón alineado al montaje real;
- [ ] cronograma day-of en revisión final;
- [ ] lista de proveedores con contacto day-of;
- [ ] exportaciones de prueba generadas;
- [ ] backup/restore verificado.

## 6. T-72 horas

### Invitados

- [ ] incorporar últimas confirmaciones/cancelaciones;
- [ ] resolver incidencias prioritarias;
- [ ] cerrar restricciones alimentarias;
- [ ] validar personas sin mesa;
- [ ] validar cambios familiares relevantes.

### Mesas

- [ ] ejecutar validación de capacidad;
- [ ] revisar grupos conocidos separados;
- [ ] revisar accesibilidad/reservas especiales;
- [ ] generar distribución casi final.

### Proveedores

- [ ] enviar versión autorizada del cronograma;
- [ ] confirmar horas de llegada;
- [ ] confirmar montaje/desmontaje;
- [ ] confirmar contactos day-of;
- [ ] confirmar cues técnicos.

## 7. T-24 horas — Snapshot final operacional

Crear un paquete offline fechado.

Contenido mínimo:

1. lista de invitados;
2. asistencia;
3. mesa asignada;
4. restricciones necesarias para catering;
5. plano/layout;
6. cronograma;
7. música/cues críticos;
8. proveedores + contactos day-of;
9. teléfonos operativos;
10. incidencias todavía abiertas;
11. instrucciones de contingencia.

Formatos recomendados:

- PDF para consulta;
- XLSX/CSV cuando facilite búsqueda/edición controlada;
- copia local en al menos dos dispositivos autorizados.

No distribuir información financiera o notas privadas a personas que no la necesitan.

## 8. T-12 horas

- [ ] snapshot Supabase previo a operación final;
- [ ] copia de Google Sheet;
- [ ] deployment productivo registrado;
- [ ] health verde;
- [ ] sync sin cola anormal;
- [ ] exportaciones offline verificadas;
- [ ] accesos de operadores probados;
- [ ] baterías/conectividad de dispositivos operativos verificadas.

## 9. Día del matrimonio — Inicio

### Check técnico

- [ ] `gestion.felipeycami.cl` carga;
- [ ] login funciona;
- [ ] `/dashboard/system` no muestra degradación crítica;
- [ ] invitados/mesas cargan;
- [ ] cronograma carga;
- [ ] versión offline disponible.

### Regla de cambios

Cambiar únicamente datos operativos necesarios:

- asistencia real;
- cambio de mesa;
- incidencia;
- nota operativa;
- ajuste de cronograma;
- cue;
- dato day-of de proveedor.

No:

- migrar esquema;
- cambiar RLS;
- hacer backfills;
- rediseñar módulos;
- habilitar integraciones no probadas.

## 10. Recepción de invitados

Cuando una persona llega:

1. buscar por nombre;
2. confirmar identidad sin exponer información innecesaria;
3. mostrar mesa;
4. escalar una discrepancia a coordinación;
5. no crear un acompañante implícito sólo porque llegó con alguien.

### Invitado no encontrado

- buscar variantes razonables manualmente;
- revisar RSVP/registro;
- revisar listado offline;
- si sigue sin evidencia, crear incidencia operativa;
- coordinación decide admisión y ubicación.

No forzar conciliación automática por similitud.

## 11. Invitado inesperado

Si coordinación autoriza incorporación:

1. crear/registrar ficha individual si el entorno permite operación segura;
2. marcar origen de decisión;
3. validar capacidad de mesa;
4. asignar mesa explícitamente;
5. avisar a catering si impacta menú;
6. auditar la modificación;
7. si el sistema no está disponible, registrar en contingencia offline y reconciliar después.

## 12. Cancelación/no-show

- no borrar ficha;
- cambiar estado operativo según regla acordada;
- conservar historial;
- no reasignar automáticamente su asiento sin decisión de coordinación;
- informar a catering sólo si todavía es útil operacionalmente.

## 13. Cambio de mesa

Antes de mover:

- confirmar persona;
- revisar capacidad destino;
- revisar grupos/relaciones fuertes;
- evitar romper reservas especiales;
- ejecutar operación completa, no editar una referencia aislada.

Si es offline, registrar:

```text
hora
persona
mesa anterior
mesa nueva
quién autorizó
motivo
```

Reconciliar después.

## 14. Restricciones alimentarias

En operación day-of:

- mostrar sólo a personal autorizado;
- evitar anunciar públicamente datos personales;
- validar mesa/persona antes de servir cuando el proceso lo requiera;
- si aparece una restricción nueva, coordinación + catering deciden y se registra como incidencia.

## 15. Cronograma y cues

La versión autorizada del cronograma debe identificar:

- hora;
- bloque;
- responsable;
- proveedor;
- ubicación;
- dependencia;
- cue cuando aplica;
- contingencia.

Cambios de timing importantes deben comunicarse a los responsables afectados, no sólo editarse en la aplicación.

## 16. Música / audiovisual

Momentos P0 deben tener:

- canción/track correcto;
- versión;
- cue;
- proveedor/responsable;
- prioridad (`Must Play`, etc.);
- respaldo local cuando sea crítico.

El sistema no sustituye los archivos offline del DJ/AV.

## 17. Contingencia: sin Internet

Usar paquete offline T-24.

Operar cambios en una hoja/formato local controlado con:

- timestamp;
- operador;
- cambio;
- autorización.

Cuando vuelva conectividad:

1. comparar contra estado canónico;
2. aplicar cambios uno a uno o por batch revisado;
3. evitar duplicados;
4. verificar mesas/capacidad;
5. registrar auditoría.

## 18. Contingencia: aplicación caída pero Supabase sano

- usar exportaciones offline para operación inmediata;
- no improvisar cambios directos de base salvo que el responsable técnico determine que es necesario;
- restaurar/promover deployment estable siguiendo `BACKUP_RESTORE.md`;
- smoke mínimo antes de volver a depender de la app.

## 19. Contingencia: Supabase degradado

- congelar mutaciones no esenciales;
- operar offline;
- preservar registro de cambios;
- no reconstruir datos desde Sheets sin diagnóstico;
- seguir runbook técnico;
- reconciliar cuando la fuente canónica vuelva a estar disponible.

## 20. Contingencia: Google Sheets falla

Supabase sigue siendo canónico.

- continuar operación desde app si funciona;
- no repetir cambios sólo porque no aparecieron en Sheet;
- revisar outbox después;
- reconstruir espejo cuando corresponda.

## 21. Fin del evento

- [ ] cerrar incidencias urgentes;
- [ ] guardar cambios offline pendientes;
- [ ] snapshot post-evento;
- [ ] registrar cambios excepcionales;
- [ ] no eliminar datos esa noche;
- [ ] desactivar accesos temporales que ya no sean necesarios cuando sea seguro.

## 22. T+1 / T+7

### T+1

- reconciliar cambios offline;
- revisar auditoría;
- verificar sync;
- documentar incidentes;
- guardar versión final de seating/cronograma.

### T+7

- revisar accesos temporales;
- archivar exportaciones finales;
- decidir retención de datos;
- separar aprendizajes del caso real de PII;
- actualizar `MEMORY.md` sólo con aprendizajes durables no sensibles.

## 23. Checklist de readiness del día

No declarar `WEDDING_DAY_READY` hasta cumplir:

- [ ] seating final consistente;
- [ ] 0 sobrecapacidad no aceptada;
- [ ] lista offline;
- [ ] plano offline;
- [ ] restricciones autorizadas disponibles;
- [ ] cronograma final;
- [ ] cues críticos;
- [ ] proveedores day-of;
- [ ] backup verificado;
- [ ] restore conocido;
- [ ] health verde;
- [ ] responsables asignados;
- [ ] contingencia sin Internet ensayada al menos en mesa.
