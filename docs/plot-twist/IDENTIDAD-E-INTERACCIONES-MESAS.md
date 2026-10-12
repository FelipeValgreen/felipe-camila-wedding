# Identidad de mesas e interacciones — decisión de producto
Fecha: 2026-10-08
## Regla principal
Cada QR identifica una mesa por ID/número inmutable. Los invitados inventan y confirman un nombre público para su equipo. Uno o dos cómplices tienen permisos para enviar decisiones oficiales; el resto de invitados puede observar sin registrarse individualmente. El nombre elegido no reemplaza el ID interno.
## Onboarding
Escanear QR -> bienvenida -> designar 1 o 2 cómplices -> elegir nombre en conjunto -> confirmar nombre -> tutorial breve -> juego. Evitar nombres prellenados ficticios en producción. Validar longitud, contenido inapropiado, nombres duplicados con sugerencia de alternativa, y permitir edición supervisada con historial. Mostrar nombre y número de mesa.
## Directorio social
Cuando una mesa confirme su nombre, aparece en el directorio de equipos, en proyección y como destino válido de interacciones. Antes de confirmar, mostrar «Mesa NN · preparando su nombre». Las interacciones siempre apuntan a table_id; los nombres se resuelven en pantalla. Evitar listas hardcodeadas de «Los Primos», «Sin Señal», etc.
## Mecánicas entre mesas
- Desafío amistoso: elegir otra mesa por nombre, ambas reciben instrucciones y resultado claro.
- Poder limitado: seleccionar un equipo elegible por nombre, con reglas de protección y límite visibles.
- Alianza: colaborar con otra mesa y recibir fragmentos complementarios.
- Mensaje/reacción: opcional, moderado, no insultos ni spam.
- Misión social: visitar otra mesa, identificada por nombre y número, sin obligar a desplazarse a mayores o personas con movilidad reducida.
- Proyección: anuncios puntuales «Los Desubicados desafían a Los Improvisados», sin ranking constante.
## Plot Twist final
Las rivalidades visibles y alianzas construyen una red colectiva de fragmentos. La pantalla revela conexiones reales entre equipos y forma una composición FC. Ninguna mesa queda excluida por no tener celular o no completar una misión. La revelación es emocional y luego da paso a celebración conjunta. Mantener ganadores por puntuación y Mesa de la Noche.
## Criterios de aceptación
1. Mesa 08 puede llamarse «Los Desubicados» y conservar identidad después de recargar/reconectar.
2. Una segunda mesa ve «Los Desubicados · Mesa 08» sin poder editarla.
3. Una interacción dirigida se guarda contra ID de mesa, nunca texto de nombre.
4. No aparecen nombres de personas o mesas inventadas como si fueran asistentes reales.
5. Observadores pueden seguir sin emitir acciones oficiales.
6. Dos cómplices no pueden duplicar una apuesta, giro o ataque.
7. El final muestra relaciones entre mesas realmente registradas, con fallback narrativo para mesas sin acciones.
8. No cambiar main ni Supabase productiva sin autorización.
