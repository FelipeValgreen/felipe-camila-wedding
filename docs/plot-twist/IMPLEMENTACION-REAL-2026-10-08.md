# Plot Twist — Implementación real / corte de trabajo 2026-10-08
Rama exclusiva: feat/plot-twist-v1. No merge, no migración de producción, no deploy de producción.

## Cambios implementados
- api/_lib/plot-twist-engine.js: giro de tómbola requiere stage live_tombola abierto y resultado con crypto.randomInt; se mantiene la regla de enfriamiento existente. NO es garantía de exclusión atómica ni de efectos aplicados.
- plot-twist/app.js: sección Mi mesa muestra nombres confirmados por otros equipos (provenientes de chronicle.tables); formulario de nombre explica uso social y no incluye nombre de ejemplo ficticio; tómbola anuncia categorías antes de girar.
- docs/plot-twist/CONSOLIDACION-APRENDIZAJES-V6.md: contrato consolidado.

## Riesgos P0 observados al leer código (no afirmar corregidos)
1. recover(tableCode,playerId) reasigna el token de dispositivo de cualquier integrante listado por recoveryCandidates: secuestro de rol de cómplice si se conoce el código impreso. Rediseñar recuperación con secreto individual/confirmación del cómplice actual u operador, sin exponer takeover a espectadores. No publicar.
2. join obliga nickname/registro individual aunque el producto requiere acceso observador sin registro. Implementar spectator anónimo por mesa sin privilegios y consentimiento opcional para voto individual.
3. spin guarda giro, poder y evento en tres solicitudes distintas; un fallo parcial produce resultados inconsistentes. Implementar RPC transaccional única con unique(game_id,stage_id,table_id), outcome server-side y efectos atómicos. Actualmente no hay stage_id en spins.
4. usePower hace PATCH sin comprobar filas afectadas y registra evento por separado; no es atómico y puede duplicarse. Validar target y etapa, y resolver con RPC.
5. submitAction wager guarda fracción y snapshot pero falta resolución de saldo; verificar etapa, freeze y ledger.
6. No existe implementación integral de alianzas, desafíos, fragmentos, red final ni revelación basada en conexiones verificadas.
7. snapshot entrega stage.payload sin sanitización específica por rol; auditar para impedir filtración de correctAnswer o pistas privadas.
8. setTeamName no valida unicidad por juego ni modera nombre; directorio excluye mesas sin nombre, que requieren fallback «Mesa NN».
9. Falta validación completa de 20 mesas, concurrency, offline, accesibilidad y proyección.

## Próximos cambios en orden de riesgo
A. Recuperación segura y espectador sin registro.
B. Migración SQL aditiva revisada en entorno aislado para RPC transaccional y conexiones.
C. Implementar motor de acciones cross-table (invitar, aceptar, expirar, resolver) por ID, idempotente.
D. UI de invitado/cómplice por etapa y proyección curada; sin controles demo.
E. Resolver ledger, tómbola, poderes, apuestas y final en servidor.
F. Tests unitarios, integración y carga; rehearsal real. Mantener estados NOT RUN hasta evidencia.

## Evidencia
Sólo inspección estática y commits de código. No se han ejecutado pruebas E2E ni verificado producción. La rama puede tener fallos no detectados.
