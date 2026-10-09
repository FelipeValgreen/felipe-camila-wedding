# PROMPT MAESTRO — PLOT TWIST / ENTREGA INTEGRAL V3
## Mandato
Actúa como product lead, game designer, ingeniero full-stack senior, arquitecto Supabase, QA lead, diseñador de experiencias y productor técnico de eventos. Continúa el trabajo EXISTENTE en FelipeValgreen/felipe-camila-wedding, rama feat/plot-twist-v1. No reinicies ni reemplaces decisiones aprobadas. Lee AGENTS.md, docs/plot-twist/PRD-MAESTRO-V2.md, IMPLEMENTATION-PLAN.md, ACCEPTANCE-MATRIX.md, TEST-REPORT.md, SIMULATION.md, migraciones, seed, API y frontend. Verifica HEAD real antes de editar.

## Resultado requerido
Un juego real y robusto para aproximadamente 20 mesas y 160–230 asistentes, con 20–35 minutos de interacción repartidos durante una cena de 60–90 minutos, sin exigir teléfono constante, sin humillaciones ni alcohol obligatorio. Un teléfono por mesa debe bastar. Todos pueden participar; dos Responsables de Mesa confirman decisiones. Nadie requiere correo ni contraseña. La experiencia termina antes de agradecimientos/baile. Felipe y Cami no operan el juego.

## Experiencia narrativa
Lobby y QR → identidad/recuperación → nombre de mesa → rompehielo → preguntas deducibles de novios → votación privada y callbacks → tómbola en vivo → poderes limitados → misiones sociales y fotos opcionales → Todo o Nada con apuesta congelada → pregunta final → bloqueo → campeón visible → Mesa de la Noche por puntuación secreta → piezas físicas que componen F+C · 23.10.26 → cierre «Creyeron que había 20 equipos. Siempre hubo uno solo: nuestra gente». Respetar PRD como fuente de verdad; no inventar respuestas reales de novios ni invitados.

## Identidad visual
Diseñar experiencia premium editorial/cinematográfica coherente con felipeycami.cl. Usar logo FC real, fotografías reales existentes y fuentes Newsreader + Inter. Marfil #F3EBDD, carbón #29282B, burdeos #682C35, champagne #BCA47B; tokens de sitio existente prevalecen si están verificados. Pantallas normales claras; tensión/tómbola/apuesta/reveal nocturnos. Evitar estética Kahoot, casino, neón, cards genéricas, retratos IA de los novios. Crear demo SHOWCASE sin backend con interacciones genuinas, animación de tómbola, puntuación reactiva, navegación invitado/proyección y final secuencial. Demo y producción aisladas; no contaminar datos.

## Motor y persistencia
Servidor es fuente de verdad. Máquina de estados explícita de juego y etapa, transiciones autorizadas, readiness >=75% con timeout seguro y contingencia operador. Tabla es unidad competitiva. Ledger append-only, puntuación visible y secreta independientes, proyecciones reconstruibles, idempotencia de cada acción/reintento, transacciones/RPC atómicas para resolución, poderes, giros, apuestas y premios. Claves de respuesta privadas: nunca viajan al cliente ni pantalla. Callback individual con empate estable, responsable designado para apuesta y autorización real. Robo/penalización con caps y prevención de ataques repetidos. Una recompensa por oportunidad fotográfica, independientemente del número de archivos.

## Robustez
Identidad QR y código, nickname único por mesa sin distinguir mayúsculas, recuperación mismo/cambiado dispositivo, roles máximo dos, concurrencia, reconexión, offline con outbox únicamente para acciones seguras y sin falso ACK. Validar entrada, permisos y pertenencia en servidor; rate limits y ausencia de filtraciones. Media opcional con moderación y protección de datos. Hall screen sólo contenido curado, nunca respuestas activas ni ranking permanente. Panel operador protegido, auditado y con recuperación.

## Operación
Preparar QR y tarjetas por mesa, códigos de recuperación, instrucciones imprimibles, roles, secuencia DJ/proyección, contingencias sin internet, fallback sin teléfono, checklist de venue, ensayos 8–12 personas y simulación 20 mesas/160 jugadores. Generar scripts reproducibles y reporte de pruebas por AC-01..30, incluyendo concurrencia, idempotencia, score=ledger, permisos, pantalla, mobile Safari y Android. No declarar PASS sin ejecución observada y evidencia (SHA, entorno, fecha, pasos, esperado, observado).

## Proceso obligatorio en loop
1. Inspecciona repo y estado real de Vercel, GitHub y Supabase sin suponer.
2. Identifica inconsistencias y riesgos P0 antes de estética.
3. Implementa lotes grandes y coherentes (DB/RPC/API/UI/tests/docs), no cambios aislados.
4. Relee diffs, ejecuta verificaciones disponibles, corrige regresiones.
5. Actualiza IMPLEMENTATION-PLAN y TEST-REPORT con evidencia y bloqueos honestos.
6. Repite por prioridades P0→P1→P2, y sólo entonces pulido de diseño definitivo.
7. Mantén demo presentable y desplegable en Preview en paralelo con juego real.
8. Si un conector bloquea una escritura, no finjas éxito: busca otra vía permitida, documenta el bloqueo y avanza trabajo independiente.
9. No preguntes salvo decisión indispensable: contenido verdadero de novios, distribución definitiva de mesas, autorización de migración productiva, aprobación de arte físico o merge/deploy final.
10. Nunca tocar main, datos productivos ni generar costes sin aprobación explícita. Preview de rama sí; migraciones productivas no.

## Definition of Done
No basta que compile. Cada etapa debe ser jugable end-to-end, reproducible con ledger, con prueba de fallo/reintento, interfaz accesible, observabilidad y contingencia. El proyecto sólo está LISTO PARA EL EVENTO tras gates de especificación, preview, migración autorizada, E2E real, ensayo y freeze. Proveer al usuario enlaces verificados, estado por componente, pruebas y pendientes precisos.

## Orden de trabajo inmediato
Auditar Demo V0.1 y transformarla en showcase de alta fidelidad; corregir snapshot individual por player_id; asegurar desempate único y callback final_wagerer; implementar RPC atómica para poderes/tómbola y límites; media y bonus único; seguridad de reacciones; automatización segura; operator/hall; cierre reproducible; simulador 20x8; ensayos y runbook. No introducir respuestas inventadas como si fueran hechos.
