# PLOT TWIST — CONSOLIDACIÓN V6: APRENDIZAJES + BENCHMARK + CONTRATO DE PRODUCTO
Estado: propuesta consolidada para implementación, NO equivale a funcionalidades construidas ni probadas.
Fecha: 2026-10-08. Rama: feat/plot-twist-v1. Sin cambios a main ni datos productivos.

## Jerarquía de fuentes y reconciliación
1. Decisiones recientes de Felipe y Cami prevalecen: juego POR MESA, uno o dos cómplices con control oficial, otros invitados observan sin registro obligatorio, equipos eligen nombre, interacciones entre equipos, final auténtico Plot Twist.
2. PRD-MAESTRO-V2 define seguridad, scoring, estados y operación salvo contradicción con lo anterior.
3. IDENTIDAD-E-INTERACCIONES-MESAS define IDs estables, nombres públicos y directorio dinámico.
4. BPMN y demos anteriores son prototipos que se deben actualizar; NO son fuente de verdad cuando contradicen el flujo final.
5. Benchmark de Goosechase (misiones secuenciadas), Kahoot (pregunta y feedback claros), SideQuest (experiencia social integrada), plataformas QR de bodas (fricción mínima) son patrones de diseño, NO funcionalidades confirmadas del producto ni justificación para copiar su estética.

## Hipótesis de producto
Los invitados creen que compiten por equipos, mientras sus interacciones construyen conexiones reales y fragmentos de una composición colectiva. La sorpresa final muestra esas conexiones, anuncia ganadores visibles y ocultos por reglas predefinidas y culmina con revelación emocional y transición musical festiva. Nunca prometer un final dependiente de acciones que no ocurran; cada mesa tiene pieza base y fallback.

## Reglas de experiencia obligatorias
- Entrada QR de mesa + código de recuperación; cero descarga, correo o registro obligatorio para observar.
- 1–2 cómplices designados por mesa; sólo ellos envían decisiones oficiales; observadores leen estado, pueden realizar actividades individuales opcionales sin controlar la mesa.
- La mesa elige nombre antes de empezar. Nombre público + número, ID interno inmutable. Directorio de equipos se alimenta exclusivamente de nombres confirmados; cero nombres ficticios en producción.
- Un solo CTA dominante por pantalla; no mostrar 'Anterior', 'Siguiente', proyección ni controles demo a invitados.
- Siempre mostrar: qué ocurre, qué hacer, qué pasa al confirmar, qué esperar después. Las acciones irreversibles requieren confirmación y ACK real.
- El motor controla etapas por estado, readiness, timeout seguro y operador; no por navegación local arbitraria.
- Activaciones cortas repartidas en cena; teléfono complementa conversación. No obligar a fotos, alcohol, desplazamiento ni exponerse.
- Tómbola: ANTES del giro mostrar catálogo de posibles resultados, categorías y riesgos; resultado server-side fijado antes de animar; luego mostrar consecuencia y CTA. Premio/poder/penitencia amable/Plot Twist social. Penitencias tienen alternativa digna, no castigo abusivo.
- Poderes: explicar objetivo, elegibilidad, costo/cap y resultado antes de confirmar. Dirigir por table_id con nombre dinámico.
- Trivia: una pregunta a la vez, respuesta oficial por mesa, resultados sólo tras cierre. Nunca inventar respuesta verdadera de novios.
- Todo o Nada: monto congelado y validado antes de pregunta; resolución idempotente y reproducible.
- Alianzas/desafíos: invitación, aceptación/declinación, vencimiento y resolución; no bloquear progreso por ausencia de otra mesa.
- Fragmentos: pieza base por mesa; conexiones reales opcionales generan aristas; proyección final muestra sólo aristas verificadas, con composición inclusiva aun sin conexiones.
- Final: lock ledger -> campeón visible -> Mesa de la Noche por fórmula secreta congelada -> aparente cierre -> interrupción narrativa -> red real de mesas + fragmentos -> mensaje colectivo -> invitación festiva voluntaria con DJ.
- Tres superficies aisladas: invitado/responsable, proyección curada, operador autenticado. Demo aislada de producción.

## Benchmark -> decisión -> artefacto -> test
| Aprendizaje | Decisión de Plot Twist | Artefacto | Test |
|---|---|---|---|
| Goosechase: misiones y desbloqueos | Misiones sociales encadenadas sin bloqueo por ausencia | stage engine, U12–U15 | Completar/declinar misión |
| Kahoot: claridad de pregunta y feedback | Una pregunta, una acción, confirmación y resultado posterior | U07–U09 | Usuario nuevo comprende sin ayuda |
| SideQuest: juego social en un QR | Directorio real, alianzas, retos y fotos opcionales | U02,U11–U16 | Interacción entre 2 mesas |
| QR de bodas: baja fricción | Observador sin cuenta; 1 teléfono basta | U00–U06 | Entrada y recuperación |
| Lección interna: nombres inventados | Nombres ingresados por mesas y resolución por ID | U04, directorio | No aparecen fixtures en prod |
| Lección interna: tómbola vacía | Mostrar riesgos y consecuencia | U10 | Giro único, resultado persistido |
| Lección interna: demo como slideshow | Separar flujo real y controles de showcase | U00–U23, P01,O01 | Invitado sin navegación artificial |
| Lección interna: final decorativo | Revelación de conexiones reales y piezas | P01, U22–U23 | Reconstruir aristas y fallback |

## Estados y wireframes sincronizados
U00 QR/código; U01 bienvenida; U02 roles observador/cómplice; U03 designar hasta 2; U04 nombre de mesa; U05 tutorial; U06 lobby/espera; U07 pregunta; U08 confirmar; U09 resultado; U10 tómbola: riesgos/giro/resultado; U11 directorio; U12 desafío enviar; U13 desafío recibir/aceptar; U14 alianza; U15 misión/pista/fragmento; U16 foto/reacción opcional; U17 poderes; U18 apuesta; U19 pregunta final; U20 bloqueo/espera; U21 campeón/Mesa de la Noche; U22 giro y red; U23 cierre/celebración.
P01 pantalla del salón: lobby, anuncios curados, momentos en vivo, resultados, final, contingencia.
O01 operador: estado, readiness, pausa/reanudación, intervención auditada, moderación, contingencia.
Cada U requiere variantes: invitado observador, cómplice autorizado, cargando, confirmado, error, sin conexión, reingreso, etapa cerrada, contenido accesible.

## Modelo de datos y API adicionales necesarios
- table display_name normalized + history, uniqueness per game; table_id único.
- team_connections(source_table_id,target_table_id,mission_id,status,created_at), sin aristas ficticias.
- team_challenges(challenger_id,target_id,stage_id,status,expires_at,resolution_id).
- fragments(table_id,fragment_key,base_or_earned,unlocked_at), pieza base garantizada.
- tombola_catalog(version,weight,effect_type,effect_config,eligibility), spin result congelado.
- secret_score_ledger separado del visible, fórmula y versionado.
- Todas las mutaciones con rol validado, idempotency key y auditoría.
No migrar producción sin aprobación.

## Gates
G0 aprobar contenido real, catálogo tómbola y final.
G1 wireframes U00–U23 + P01/O01 y prueba de comprensión.
G2 motor completo en entorno de prueba y tests de seguridad/concurrencia.
G3 20 mesas simuladas, fallos de red, puntajes reproducibles y aristas verificables.
G4 ensayo 8–12 invitados + DJ + proyección + fallback.
G5 autorización explícita de migración/merge/deploy y freeze.
Estado actual: este documento consolida decisiones, NO supera gates.

## Backlog priorizado
P0: identidad de mesa, roles, nombre/directorio, onboarding, flujo sincronizado, trivia, tómbola con consecuencias, alianzas, final y operador, ledger y recuperación.
P1: retos adicionales, poderes complejos, galería moderada, reacciones, animaciones refinadas.
P2: bingo social y peticiones musicales descartados para V1 por sobrecarga.
