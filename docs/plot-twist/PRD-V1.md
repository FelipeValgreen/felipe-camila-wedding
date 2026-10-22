# PLOT TWIST — V1 Product Contract

Estado: diseño congelado para implementación en preview.
Evento: Felipe & Camila — 23.10.2026.
Principio: el teléfono provoca momentos en la mesa; no reemplaza la conversación.

## Reglas no negociables
- Ninguna mecánica crítica depende de sacar una foto, grabar, levantarse o ir a otra mesa.
- Fotos/videos son bonus opcionales. Una oportunidad puntúa una sola vez.
- Cómplice y Dupla tienen los mismos permisos. La primera decisión confirmada bloquea la acción para ambos.
- Espectadores pueden mirar, reaccionar y aportar media cuando corresponda; no controlan decisiones.
- Nunca depender de memoria: cada pantalla explica qué pasa, qué hacer y qué viene después.
- Servidor = fuente de verdad. Recargar/cerrar Safari no pierde mesa, rol, puntaje ni decisiones.
- Sin ranking completo permanente. Usar radar y revelaciones puntuales.
- Felipe y Cami no operan ni solucionan el sistema durante el matrimonio.
- La app debe poder continuar ante conectividad intermitente y reconciliar al recuperar señal.
- El juego visible termina antes de agradecimientos, premiación final, baile y fiesta.

## Lenguaje visual
Heredar felipeycami.cl: Inter + Newsreader; #FAF8F3, #F3EFE7, #0F0C0B, #5C1D24, #C5A059; monograma F&C.
Plot Twist es un modo nocturno/dinámico dentro del mismo universo, no otra marca.

## Navegación móvil
Tres destinos: Ahora / La noche / Mi mesa.
Ahora siempre prioriza una única acción o estado.
La noche muestra eventos ya revelables, media aprobada y radar.
Mi mesa muestra nombre, integrantes/roles, puntos, logros, poderes y crónica.

## Journey V1
0. QR físico persistente por mesa. Entrada por table_token.
1. Mesa elige nombre.
2. Dos voluntarios: Cómplice y Dupla. Si no aparecen, mecanismo físico de selección.
3. Icebreaker sin puntos: encontrar algo que todos tengan en común (excepto conocer a los novios).
4. Bloque de preguntas deducibles/clues/Felipe-vs-Cami. Evitar trivia privilegiada.
5. Preguntas sociales de la mesa que generan callbacks posteriores.
6. Poderes/cartas limitados y auditables; nunca swap total de puntaje.
7. Tómbola ganada por hitos: Premio / Penitencia amable / Plot Twist social.
8. Ataques/regalos (incluido shot opcional con alternativa sin alcohol). Foto de reacción = bonus, nunca validación.
9. Momentos opcionales: selfie con novios, reacción, misión de foto, video corto. Un bonus por oportunidad.
10. Final Todo o Nada: apuesta antes de conocer la última pregunta; callback a elección previa de la mesa.
11. Juego cerrado: no se aceptan nuevas decisiones puntuables.
12. Revelación final: campeón por puntaje + segunda lectura de cómo jugó cada mesa. El giro debe recontextualizar acciones previas sin quitar legitimidad al ganador visible.

## Pacing
No usar cronograma rígido. Cada fase tiene estado y readiness. Cómplice/Dupla puede marcar mesa lista. El motor puede avanzar con umbral configurable (objetivo 70–80%) y timeout seguro. Operador puede pausar/liberar/omitir.
Solo 3–4 momentos requieren atención colectiva real.

## Modelo de eventos
El puntaje no se edita como contador opaco. Toda mutación genera ledger inmutable: razón, delta, mesa, actor, stage, metadata e idempotency_key.
El score mostrado es una proyección del ledger.

## Métrica secreta
Registrar señales de colaboración, participación, riesgo, generosidad e interacción. No mostrar fórmula durante el juego. Esta métrica puede determinar “Mesa de la Noche”, pero jamás reemplaza al campeón de puntos.

## Media
Reusar wedding-photos, agregando metadata Plot Twist en tablas propias. El upload debe soportar compresión, cola local, reintento e idempotencia.
No exponer media de una pregunta activa si puede revelar respuesta.

## Operación
Panel backup: estado global, readiness por mesa, pausar/reanudar, abrir/cerrar etapa, corregir vía ledger compensatorio, transferir rol, otorgar giro, invalidar pregunta, moderar media, cerrar juego, lanzar reveal.
Pantalla salón: resultados agregados, tómbola, radar, media seleccionada, reveal. Nunca espejo crudo del teléfono.

## Contingencia
Si backend/realtime cae, mostrar último estado válido y no inventar confirmaciones. Acciones offline elegibles quedan pendientes con UUID idempotente. Acciones de alto impacto (tómbola, poderes, apuesta final) requieren ACK del servidor antes de mostrarse como confirmadas.
Kit físico incluye reglas completas y fallback A/B/C/D.

## Criterio de éxito
Una persona de 65 años debe poder operar como Cómplice sin explicación adicional. Una mesa puede ignorar toda foto y terminar el juego. Un teléfono puede recargarse y volver exactamente al estado de su mesa. Ninguna acción puede duplicar puntos por doble tap/reintento.
