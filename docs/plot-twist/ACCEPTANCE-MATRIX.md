# PLOT TWIST — ACCEPTANCE MATRIX

No marcar PASS sin evidencia de ejecución.

| ID | Prioridad | Escenario | Resultado esperado | Estado |
|---|---|---|---|---|
| AC-01 | P0 | QR/código válido | entra a mesa correcta | NOT RUN |
| AC-02 | P0 | nickname duplicado case-insensitive | rechazo amable, sin duplicar | NOT RUN |
| AC-03 | P0 | 3 usuarios reclaman responsable | solo 2 aceptados | NOT RUN |
| AC-04 | P0 | solo 1 teléfono en mesa | flujo completo posible | NOT RUN |
| AC-05 | P0 | cerrar/reload tras decisión | identidad+mesa+decisión restauradas | NOT RUN |
| AC-06 | P0 | cambiar teléfono | recuperar identidad con mecanismo físico | NOT IMPLEMENTED |
| AC-07 | P0 | doble tap/retry misma acción | una acción/una mutación score | NOT RUN |
| AC-08 | P0 | 10 submits concurrentes misma mesa | máximo una decisión colectiva | NOT RUN |
| AC-09 | P0 | offline 5 min | confirmado previo intacto; elegibles reintentan | NOT RUN |
| AC-10 | P0 | backend caído | no aparece falso confirmado | NOT RUN |
| AC-11 | P0 | submit después de cierre | rechazado, estado restaurable | NOT RUN |
| AC-12 | P0 | reconstruir score | cache = suma ledger | NOT RUN |
| AC-13 | P0 | apuesta final | queda congelada antes de pregunta | NOT IMPLEMENTED |
| AC-14 | P0 | poder ya usado | segundo uso rechazado | NOT IMPLEMENTED |
| AC-15 | P0 | ignorar media | mesa puede terminar juego | NOT IMPLEMENTED |
| AC-16 | P0 | final | campeón reproducible por ledger | NOT RUN |
| AC-17 | P0 | contingencia operador | recupera stage sin editar DB | NOT RUN |
| AC-18 | P0 | invitado abre operador sin key | 401 | NOT RUN |
| AC-19 | P0 | pantalla salón en pregunta abierta | no filtra respuesta | NOT IMPLEMENTED |
| AC-20 | P0 | reveal | campeón y Mesa de la Noche reproducibles | NOT IMPLEMENTED |
| AC-21 | P1 | readiness >=75% | motor puede avanzar según política | NOT IMPLEMENTED |
| AC-22 | P1 | empate individual | fallback definido y estable | NOT IMPLEMENTED |
| AC-23 | P1 | 8 fotos misma oportunidad | máximo un bonus | NOT IMPLEMENTED |
| AC-24 | P1 | spin retry | mismo resultado, no doble premio | NOT IMPLEMENTED |
| AC-25 | P1 | robo/penalidad | respeta cap | NOT IMPLEMENTED |
| AC-26 | P1 | reacción | solo set permitido, rate-limited | NOT IMPLEMENTED |
| AC-27 | P1 | media no aprobada | no aparece en feed/pantalla | NOT IMPLEMENTED |
| AC-28 | P1 | intervención operador | queda operator_log | NOT IMPLEMENTED |
| AC-29 | P1 | secret score | no altera visible winner | NOT IMPLEMENTED |
| AC-30 | P1 | navegación 65+ | Ahora comprensible sin explicación | NOT RUN |

## Evidencia
Al ejecutar un test, registrar fecha, commit SHA, entorno, dispositivo/browser y evidencia/resultados en TEST-REPORT.md. “Funciona en código” no equivale a PASS.
