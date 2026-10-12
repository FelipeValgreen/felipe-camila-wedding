# Plot Twist V2 — Entrega y criterios de aceptación

Estado: DEMO INTERACTIVA AISLADA, NO APROBADA PARA PRODUCCIÓN.

## Alcance implementado
- `/plot-twist/demo.html`: experiencia móvil independiente de Supabase y de la API de producción.
- Registro de nombre de equipo e integrantes de demostración.
- Selección local de imagen mediante FileReader; **no se transmite al servidor**.
- Misión social, tres preguntas **ficticias** y puntaje calculado en memoria.
- Tómbola animada con un resultado de demostración, premios simulados.
- Regalo y alianza con aceptación **simulada**, sin avisar a otras mesas.
- Clasificación combinando la mesa del visitante y tres mesas ficticias.
- Apuesta final con opción de no apostar y resultado ficticio.
- Campeón, Mesa de la Noche y revelación final.
- Prevención de doble recompensa por la misma acción en una partida.

## No implementado / bloqueos de lanzamiento
- Preguntas, respuestas, anécdotas y premios validados por Felipe y Cami.
- Persistencia y recuperación segura de sesiones; roles y permisos reales.
- Carga de fotografías al almacenamiento, consentimiento, moderación y borrado.
- Aceptación y entrega física verificadas de regalos.
- Alianzas y puntajes entre mesas reales sin duplicados.
- Sincronización de rondas y marcador en tiempo real.
- Panel del operador con pausa, control de proyección, moderación y contingencia.
- Verificación de idempotencia, concurrencia, protección ante abusos y carga.
- Ensayo con 20 mesas, banquetería, proyector, audio y operador.

## Matriz de pruebas manuales de la demo
1. Abrir en iPhone y Android. No debe haber desbordamiento horizontal.
2. Intentar continuar sin nombre de mesa: debe bloquearse.
3. Escribir nombre e integrantes: debe mostrarse nombre y puntaje.
4. Probar fotografía válida y omisión: ambos caminos deben continuar.
5. Intentar registrar misión vacía: debe bloquearse.
6. Responder tres preguntas: una sola recompensa por pregunta correcta.
7. Girar la tómbola: el botón queda inhabilitado durante el giro y no permite segundo premio.
8. Simular regalo y alianza: deben avanzar una sola vez.
9. Probar cada apuesta, incluida 0%: verificar cálculo del puntaje.
10. Volver a pantallas anteriores: no debe duplicar recompensas.
11. Verificar que campeón corresponde al puntaje ordenado.
12. Reiniciar: datos de la partida anterior no deben conservarse.
13. Comprobar que ninguna imagen se envía a una API.
14. Verificar preferencia de movimiento reducido y legibilidad con poca luz.

## Reglas de seguridad y despliegue
- Nunca usar datos de invitados reales en la demo.
- No ejecutar migraciones ni modificar Supabase de producción.
- No fusionar con main ni desplegar a producción sin autorización explícita.
- No anunciar que el juego está listo para el evento por el solo hecho de que la demo funcione.
- El lanzamiento requiere pruebas integrales y aprobación expresa.

## Siguiente incremento
Conectar el flujo definitivo a un entorno de staging aislado, con credenciales y datos de prueba. Implementar primero registro/recuperación, preguntas reales y moderación. Solo después habilitar regalos, alianzas y final real.
