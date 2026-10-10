# Plot Twist — criterios de habilitación (10 octubre 2026)

## Situación
Rama `feat/plot-twist-v1`, PR #48 en borrador. No aplicar migraciones a la base de producción ni publicar en el dominio principal sin autorización explícita.

## Bloqueantes de liberación
- [ ] Migraciones aplicadas en base aislada y revisadas por SQL lint / Postgres real, en orden.
- [ ] `npm run check:plot-twist` verde en CI; corregir todas las fallas.
- [ ] Pruebas de idempotencia y concurrencia: 20 mesas, dos responsables, 50 reintentos por acción.
- [ ] Auditoría de respuestas privadas en snapshot, pantalla y eventos.
- [ ] Recuperación de sesión con verificación personal u operador (actualmente bloqueada por seguridad).
- [ ] Validar poderes: solo bonus_300 operativo; deshabilitar el resto o completar resoluciones.
- [ ] Apuesta final: snapshot congelado, un envío por mesa, resolución única, sin puntuación negativa no prevista.
- [ ] Alianzas: expiración, aceptación concurrente, secreto +100 por mesa, no duplicación.
- [ ] Proyección AV: prueba real con pantalla, audio, red móvil y modo de contingencia.
- [ ] Carga de trivia aprobada por novios y premios reales; no usar datos inventados.
- [ ] Operador identificado y ensayo cronometrado de 20–35 minutos.
- [ ] Aprobación explícita antes de habilitar flags, migraciones y producción.

## Variables de activación (apagadas por defecto)
- `PLOT_TWIST_ATOMIC_SPIN=enabled`
- `PLOT_TWIST_ATOMIC_POWERS=enabled`
- `PLOT_TWIST_ALLIANCES=enabled`

## Fallback de evento
Si no hay validación end-to-end, usar el juego guiado por animador/operador y no habilitar las acciones transaccionales. La presentación emocional puede ejecutarse sin simular alianzas.
