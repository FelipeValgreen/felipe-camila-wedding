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
