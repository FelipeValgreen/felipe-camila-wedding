# Wedding Planning OS V3 — Arquitectura de producto

**Fecha:** 13 de agosto de 2026  
**Ámbito:** `gestion/**`

## 1. Tesis de producto

El Centro de Gestión deja de evolucionar como un conjunto de módulos aislados y pasa a operar como un **Wedding Operations OS**: una única fuente de verdad para planificar, coordinar, simular y ejecutar un matrimonio.

La ventaja no es “tener IA”, sino combinar:

- simplicidad para pareja/planner;
- profundidad operacional;
- datos canónicos conectados;
- IA grounded con herramientas reales;
- memoria durable del evento;
- plano operativo a escala;
- relaciones de invitados que alimentan seating;
- proveedores conectados con cronograma, música, tareas y presupuesto.

## 2. Dominios de experiencia

### Plan
Tareas, decisiones, incidencias, presupuesto y prioridades.

### Personas
Invitados, RSVP, restricciones, relaciones, ramas familiares/sociales y conciliación.

### Espacio
Mesas, seating intelligence, salón, montaje, escala, geometría y escenarios.

### Equipo
Proveedores, producción, contactos day-of, horarios, entregables, equipamiento y necesidades técnicas.

### Programa
Cronograma operativo, dependencias, responsables, proveedores, montaje/desmontaje y contingencias.

### Experiencia
Música, actos, sets, canciones, cues, prioridades y necesidades técnicas.

### Inteligencia
Copiloto, memoria, deltas desde última revisión, recomendaciones y acciones confirmables.

## 3. Regla UX principal

Toda acción frecuente debe poder completarse en **≤ 3 clics o una frase**.

Ejemplos:

- “Agrega mesa para 10.”
- “Llámala El Umbral.”
- “Agrega Dancing Queen al DJ como Must Play.”
- “Revisa la lista actualizada.”
- “¿Qué cambió desde mi última revisión?”
- “El fotógrafo llega a las 16:30.”

La interfaz y la IA deben converger en las mismas operaciones de dominio y reglas de validación.

## 4. Copiloto V3

### Arquitectura

```text
Usuario
  ↓
Copiloto
  ↓
modelo LLM
  ↓
interpretación + herramientas
  ↓
Domain/API layer
  ↓
Supabase
  ↓
resultado grounded
```

### Modelo primario

- OpenAI Responses API.
- `gpt-5.6` como modelo primario cuando existe `OPENAI_API_KEY`.
- AI Gateway/fallback sólo como resiliencia.
- fallback determinista debe responder estados críticos incluso sin LLM externo.

### Guardrails

- no inventar parentescos;
- no inventar costos, horarios, canciones, proveedores o documentos;
- hechos / inferencias / recomendaciones deben distinguirse;
- `probable` nunca se presenta como hecho;
- toda mutación sensible requiere confirmación explícita;
- la validación final ocurre en servidor, no en el modelo;
- toda escritura queda auditada.

### Delta operacional

El comando “revisar lista actualizada” debe comparar el estado actual contra `copilot_review_state` y responder:

- altas;
- bajas;
- cambios de asistencia;
- cambios relevantes;
- fecha de corte;
- problemas de conciliación.

El estado de revisión se persiste sólo en un entorno autorizado para escritura.

## 5. Memoria durable

`event_memory` almacena hechos y decisiones del producto, no memoria efímera del LLM.

Tipos:

- fact;
- decision;
- preference;
- relationship;
- constraint;
- rejected_option;
- learning.

Cada memoria debe incluir confianza, fuente y estado.

No guardar PII privada en documentación Git.

## 6. Venue Engine V3

### Modelo

Cada recinto define:

- `space_width_m`;
- `space_height_m`;
- `grid_step_m`;
- referencia visual opcional;
- template reutilizable.

Cada elemento define:

- posición métrica;
- ancho/alto métricos;
- rotación;
- bloqueo;
- tipo;
- nombre.

Las mesas comparten la misma escala mediante:

- `position_x_m`;
- `position_y_m`;
- `width_m`;
- `height_m`.

Los campos relativos legacy se mantienen temporalmente por compatibilidad.

### Objetivo UX

- mover;
- redimensionar;
- rotar;
- bloquear;
- duplicar;
- eliminar;
- crear elementos;
- grilla métrica;
- dimensiones editables del recinto;
- guardar/versionar;
- reutilizar template para otro evento.

## 7. Mesas y naming

Separar siempre:

```text
número interno = 03
nombre visible = El Umbral
```

El nombre es editable sin cambiar el identificador/orden operativo.

Los nombres temáticos son opcionales y nunca deben interferir con capacity/seating.

## 8. Seating Intelligence

Prioridad de reglas:

1. relaciones confirmadas;
2. capacidad dura;
3. restricciones explícitas;
4. ramas familiares/sociales;
5. relaciones probables;
6. balance/mezcla según escenario.

Escenarios soportados:

- Cohesión;
- Equilibrada;
- Mezcla social.

La IA propone; el usuario revisa; la aplicación valida; sólo entonces se aplica.

## 9. Música V3

Estructura mental:

```text
Acto → Set → Momento → Canción → Cue
```

Actos habituales:

- DJ;
- violinista / músicos;
- banda / grupo;
- ceremonia;
- cocktail;
- cena;
- otros.

Cada ítem puede registrar canción, artista, versión, link, cue, prioridad, proveedor, estado, set y notas técnicas.

Prioridades mínimas:

- Normal;
- Alta;
- Must Play;
- No tocar.

## 10. Equipo / Producción

La fuente de verdad para fotógrafos, audiovisual, sonidistas, músicos, arriendos, iluminación, venue, banquetería y otros es el dominio Equipo/Proveedores.

Cada proveedor puede registrar:

- contacto comercial;
- contacto day-of;
- categoría;
- estado comercial;
- estado de producción;
- llegada;
- montaje;
- desmontaje;
- ubicación;
- entregables;
- equipamiento;
- requerimientos técnicos;
- contrato;
- presupuesto/pagos;
- cronograma relacionado;
- música relacionada;
- tareas relacionadas.

No crear módulos independientes por cada tipo de proveedor salvo que necesiten una vista especializada.

## 11. Operations Graph

Las entidades deben relacionarse entre sí:

```text
Proveedor
  ├─ Presupuesto / Pagos
  ├─ Cronograma
  ├─ Música
  ├─ Tareas
  └─ Montaje / Salón
```

La misma información no debe duplicarse en cada pantalla.

## 12. Reutilización comercial

Secuencia objetivo:

```text
Felipe & Camila
→ segundo matrimonio sin cambios de código
→ Planner Mode
→ Venue Mode
→ colaboración externa
→ marketplace opcional
```

El marketplace no es prioridad V3.

## 13. Criterios de aceptación V3

V3 se considera funcional cuando:

- “revisar lista actualizada” produce un delta real y no una respuesta genérica;
- el Copiloto usa OpenAI Responses cuando la clave está configurada y mantiene fallback seguro;
- memoria durable se puede consultar y mantener;
- mesas pueden tener nombre visible independiente del número;
- mesas y elementos del salón operan en la misma escala métrica;
- el usuario puede cambiar dimensiones del recinto;
- música se organiza por acto/set/canción;
- proveedores tienen información day-of/producción;
- proveedor puede verse conectado con cronograma, música, tareas y presupuesto;
- Preview no escribe en producción;
- cambios sensibles requieren confirmación y auditoría.
