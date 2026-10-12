# Plot Twist — Runbook de contingencia

## Principio
La fiesta continúa aunque Plot Twist no. Ninguna caída tecnológica puede secuestrar la cena.

## Niveles
VERDE: realtime normal. Sistema automático.
AMARILLO: algunos teléfonos sin señal. Mantener último snapshot; QR/código recupera sesión; uploads quedan pendientes.
NARANJO: backend o internet general inestable >3 min. Pausar nuevas acciones puntuables. Continuar comida/conversación. Proyección anuncia pausa sin dramatizar.
ROJO: caída >15 min. Activar kit físico A/B/C/D para una ronda opcional o suspender Plot Twist. No improvisar puntajes manuales masivos.

## Recuperación
Al volver servicio: snapshot autoritativo -> reconciliar idempotency keys -> subir pendientes -> descartar duplicados -> operador revisa health -> reanudar.
Mensaje sugerido: “PLOT TWIST ESTÁ DE VUELTA. +100 para todos por sobrevivir 😏” solo si operador decide otorgar el bonus vía ledger.

## Kit físico por mesa
QR + código corto; reglas universales; tarjetas A/B/C/D; nombre/número de mesa; instrucción “No memoricen nada”; contacto del único operador backup.

## Operador
Puede pausar/reanudar, abrir/cerrar etapa, otorgar giro, invalidar pregunta, transferir roles, ocultar media y corregir puntaje mediante entrada compensatoria. Nunca editar/borrar ledger histórico.

## Prohibido
- Felipe o Cami haciendo soporte.
- Depender de push notifications.
- Afirmar “guardado” sin ACK.
- Resolver caída pidiendo a todos registrarse de nuevo.
- Convertir fotos o alcohol en requisito.


## Preflight sin costo
1. Mantener desarrollo en `feat/plot-twist-v1` + Vercel Preview.
2. No aplicar migración a producción hasta gate explícito.
3. Validar que `PLOT_TWIST_OPERATOR_KEY` exista en Preview antes de usar `/plot-twist/operator.html`.
4. Aplicar `20261005205000_plot_twist_v1.sql` y luego `seed-plot-twist-v1.sql` solo en el E2E autorizado.
5. No inventar mapping de mesas: generar QR/código cuando `wedding_tables` final esté confirmado.

## Ensayo P0 obligatorio
- cerrar Safari durante una pregunta y volver;
- modo avión 5 minutos y reconectar;
- reload repetido después de respuesta confirmada;
- dos responsables respondiendo casi simultáneamente;
- diez envíos simultáneos;
- un solo teléfono para toda la mesa;
- nombre repetido;
- cambio de teléfono usando recuperación física;
- caída de backend: nunca mostrar confirmación falsa;
- retry de puntaje: ledger debe registrar una sola mutación.

## Operación
El panel `/plot-twist/operator.html` es contingencia. Permite ver readiness, abrir/cerrar stages y resolver preguntas. La cena no debe depender de que Felipe/Cami lo operen.
