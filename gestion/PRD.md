# PRD.md — Centro de Gestión de Bodas

**Versión:** 1.0 RC — para revisión final  
**Fecha:** 12 de agosto de 2026  
**Estado:** DOCUMENTACIÓN DE PRODUCTO — NO AUTORIZA CAMBIOS DE PRODUCCIÓN  
**Ámbito técnico:** `gestion/**` del repositorio `FelipeValgreen/felipe-camila-wedding`

---

## 1. Resumen ejecutivo

El proyecto debe evolucionar desde el Centro de Gestión interno del matrimonio de Felipe y Camila hacia un **sistema integral de planificación y operación de bodas**.

La plataforma debe centralizar:

- planificación y checklist;
- presupuesto;
- proveedores;
- invitados y RSVP;
- incidencias;
- distribución de mesas;
- diseño del salón;
- cronograma;
- música;
- documentos y entregables;
- colaboración por roles;
- inteligencia asistida.

El producto debe aprovechar la base técnica existente y mejorarla progresivamente. **No se reconstruye desde cero.**

Principio rector:

> La plataforma debe reducir carga mental y convertir información dispersa en decisiones y acciones claras.

---

## 2. Benchmark externo y regla de diferenciación

El usuario compartió como referencia externa:

- capturas de un sistema de planificación de bodas;
- un video de referencia: `https://www.youtube.com/watch?v=CoHKehTBP-Y`.

Ese producto es un **benchmark**, no una especificación a copiar.

### 2.1 Qué sí se puede aprender del benchmark

Patrones de producto valiosos observados:

- navegación modular;
- agrupación de funciones por etapa de planificación;
- flujo conectado entre invitados, mesas y salón;
- banco de invitados sin mesa;
- tarjetas de mesa con ocupación/capacidad;
- importación y exportación mediante Excel;
- proveedores con estado, moneda y cotización;
- presets de distribución del salón;
- separación entre preview visual y editor operativo;
- ayuda contextual en cada pantalla;
- mensajes de estado en lenguaje humano.

### 2.2 Qué NO se debe copiar

No replicar:

- nombre;
- marca;
- logotipo;
- personaje;
- nombre del asistente;
- textos;
- claims;
- iconografía distintiva;
- paleta exacta;
- tipografía exacta;
- composición exacta;
- ilustraciones;
- presets idénticos;
- microcopy;
- estructura visual píxel por píxel.

### 2.3 Regla de producto

```text
Inspirarse en patrones.
Reinterpretar la solución.
Diseñar identidad propia.
```

El resultado debe ser claramente reconocible como un producto distinto.

---

## 3. Problema que resolvemos

Planificar una boda obliga a coordinar personas, dinero, proveedores, fechas, decisiones, restricciones, espacios, documentación, cambios y responsabilidades.

La información suele repartirse entre WhatsApp, planillas, correos, notas, documentos, calendarios y conversaciones con proveedores.

El sistema debe eliminar esa fragmentación.

---

## 4. Visión

Construir un **Wedding Operations System** que permita responder rápidamente:

1. ¿Qué falta?
2. ¿Qué cambió?
3. ¿Qué necesita atención?
4. ¿Quién es responsable?
5. ¿Cuánto hemos comprometido y pagado?
6. ¿Quién confirmó?
7. ¿Quién aún no tiene mesa?
8. ¿Cómo queda el salón?
9. ¿Qué ocurre a continuación?
10. ¿Qué necesita cada proveedor?

---

## 5. Usuarios

### 5.1 Pareja

Necesita simplicidad, claridad y control.

### 5.2 Planner / coordinador

Necesita visión transversal, incidencias y ejecución.

### 5.3 Catering

Necesita cantidades, restricciones, mesas y horarios autorizados.

### 5.4 Centro de eventos

Necesita layout, capacidades, montaje y cronograma.

### 5.5 Fotografía / video

Necesita hitos, horarios, ubicaciones, shot list y contactos autorizados.

### 5.6 DJ / música / audiovisual

Necesita cues, canciones, archivos, horarios y requerimientos técnicos.

### 5.7 Decoración y otros proveedores

Necesitan únicamente tareas, horarios, documentos y planos relevantes.

---

## 6. Principios de producto

1. **Supabase es la fuente canónica.**
2. **Google Sheets es espejo operativo.**
3. Una respuesta RSVP no equivale necesariamente a una persona.
4. Cada persona contabilizable debe tener ficha individual.
5. No existe acompañante implícito.
6. La IA propone; el usuario aprueba.
7. La UI usa lenguaje humano.
8. Móvil y escritorio son experiencias de primera clase.
9. No hay botones falsos.
10. Toda acción sensible debe ser auditable.
11. El producto debe reducir carga mental.
12. Seguridad y privacidad prevalecen sobre conveniencia.
13. Los proveedores reciben mínimo privilegio.
14. Los módulos deben estar conectados, no duplicar información.

---

## 7. Arquitectura de información objetivo

La arquitectura final debe ser propia, aunque aproveche aprendizajes del benchmark.

### Principal

- Inicio
- Planificación
- Presupuesto
- Proveedores
- Invitados
- Mesas
- Salón
- Cronograma
- Música
- Documentos
- Actividad

### Secundario

- Configuración
- Mi cuenta

### Inteligencia asistida

Debe existir un acceso transversal a un **Asistente de planificación**.

**Nombre, personalidad, avatar e identidad quedan pendientes de definición.**

No usar nombres del producto de referencia.

---

## 8. Inicio

### Objetivo

Responder en menos de 30 segundos:

> ¿Cómo está nuestra boda y qué debemos hacer ahora?

### Componentes

- cuenta regresiva;
- progreso;
- pendientes críticos;
- invitados;
- confirmaciones;
- personas sin mesa;
- restricciones;
- capacidad del salón;
- presupuesto;
- pagos próximos;
- hitos;
- actividad reciente;
- accesos rápidos.

### “Necesita atención”

Debe agrupar:

- RSVP ambiguos;
- personas sin ficha;
- inconsistencias;
- pagos vencidos;
- proveedores sin cerrar;
- mesas sobre capacidad;
- tareas atrasadas;
- cambios de cronograma.

---

## 9. Planificación

### Funciones

- checklist;
- tareas;
- plantillas;
- responsable;
- prioridad;
- fecha límite;
- categoría;
- dependencia;
- notas;
- estado;
- completado.

### Responsables iniciales

- Novio
- Novia
- Ambos
- Planner / Coordinación
- Proveedor autorizado

---

## 10. Presupuesto

Debe permitir:

- presupuesto total;
- moneda principal;
- categorías;
- estimado;
- cotizado;
- contratado;
- pagado;
- saldo;
- fecha próxima;
- cuotas;
- anticipo;
- tipo de cambio;
- notas;
- alertas.

### Regla económica

No modificar retrospectivamente valores históricos sin trazabilidad.

---

## 11. Proveedores

### Ciclo

```text
Por buscar
→ Contactado
→ Cotizando
→ Evaluando
→ Seleccionado
→ Contratado
→ Finalizado
```

También: `Descartado`.

### Datos

- categoría;
- empresa;
- contacto;
- estado;
- moneda;
- cotización;
- tipo de cambio;
- link;
- notas;
- pagos;
- documentos;
- tareas;
- cronograma relacionado.

### Importación / exportación

Soportar plantilla, importación y exportación.

No copiar nombres, textos o layouts exactos del benchmark.

---

## 12. Invitados

### Objetivo

Mantener una ficha individual confiable por persona.

### Funciones

- crear;
- editar;
- importar;
- exportar;
- buscar;
- filtrar;
- categorizar;
- agrupar;
- ver RSVP;
- resolver incidencias;
- registrar restricción;
- asignar mesa;
- reconfirmar.

### Reglas

- no inventar +1;
- no fuzzy matching automático;
- conservar RSVP original;
- separar personas de respuestas conjuntas;
- datos sensibles sólo para roles autorizados.

---

## 13. Mesas

### Objetivo

Hacer que distribuir invitados sea simple, seguro y visual.

### Vistas

#### A. Personas sin mesa

- búsqueda;
- filtros;
- grupos;
- restricciones;
- selección múltiple.

#### B. Mesas

Cada mesa muestra:

- nombre/número;
- ocupación;
- capacidad;
- integrantes;
- grupos;
- restricciones;
- alertas.

#### C. Detalle

Al seleccionar una mesa:

- integrantes;
- lugares disponibles;
- mover;
- quitar;
- capacidad;
- notas;
- alertas.

### Interacción

Desktop:

- drag & drop;
- selección;
- acciones rápidas.

Móvil:

- asignar;
- mover;
- quitar;
- drawers;
- cards.

**Drag & drop nunca debe ser el único mecanismo.**

---

## 14. Salón / Plano

### Objetivo

Crear una representación útil para la operación real del matrimonio.

### 14.1 Presets

Los presets son inspiración y punto de partida. Pueden representar cena clásica, cóctel, jardín, salón rectangular, salón circular, montaje mixto, ceremonia + cena o fiesta.

Los nombres y estilos deben ser propios.

### 14.2 Preview

Un preset puede tener una visualización aspiracional. Esa imagen sirve para imaginar el ambiente.

### 14.3 Editor 2D

El plano real debe permitir:

- dimensiones;
- escala;
- zoom;
- pan;
- fondo;
- mesas;
- sillas;
- barras;
- pista;
- escenario;
- buffet;
- DJ;
- accesos;
- zonas;
- objetos;
- rotación;
- alineación;
- capas;
- bloqueo;
- duplicar;
- eliminar;
- versiones.

### 14.4 Capacidad

Mostrar siempre invitados, sillas, mesas, capacidad y déficit/superávit.

---

## 15. Relación Invitados ↔ Mesas ↔ Salón

Estos tres módulos comparten información.

```text
Invitado
→ asistencia
→ elegibilidad
→ mesa
→ asiento / posición
→ plano
```

Un cambio de mesa debe reflejarse en el plano.

Una modificación de capacidad del plano debe generar advertencias en mesas.

---

## 16. Cronograma

### Funciones

- evento;
- hora;
- duración;
- responsable;
- proveedor;
- ubicación;
- dependencia;
- notas;
- archivos;
- estado;
- aprobación.

### Vistas por rol

- general;
- pareja;
- planner;
- venue;
- catering;
- fotografía;
- audiovisual;
- música.

---

## 17. Música

### Momentos

- ceremonia;
- llegada;
- cóctel;
- cena;
- entrada;
- primer baile;
- fiesta;
- cierre.

### Datos

- canción;
- artista;
- link;
- estado;
- cue;
- duración;
- notas;
- responsable.

La inteligencia asistida puede sugerir, no aprobar automáticamente.

---

## 18. Documentos y entregables

Debe permitir progresivamente:

- contratos;
- cotizaciones;
- planos;
- PDFs;
- cronogramas;
- listas;
- documentos por proveedor;
- versiones;
- aprobaciones;
- entregables.

---

## 19. Asistente de planificación

### Identidad

Por ahora se denomina internamente:

```text
Asistente de planificación
```

El nombre definitivo se definirá posteriormente.

### Puede

- explicar la pantalla;
- resumir;
- detectar pendientes;
- responder preguntas;
- sugerir siguiente acción;
- preparar tareas;
- preparar cronograma;
- revisar presupuesto;
- detectar inconsistencias;
- generar propuestas de mesas;
- comparar alternativas.

### No puede sin confirmación

- mover personas;
- modificar asistencia;
- cambiar presupuesto;
- enviar mensajes;
- compartir datos;
- aplicar un plano;
- contratar/descartar;
- borrar;
- aprobar;
- desplegar.

---

## 20. IA para distribución de mesas

### Arquitectura

```text
instrucción
→ reglas estructuradas
→ validación
→ propuestas
→ score
→ explicación
→ comparación
→ aprobación humana
→ aplicación transaccional
→ auditoría
→ rollback
```

### Restricciones duras

- asistencia;
- capacidad;
- accesibilidad;
- incompatibilidades explícitas;
- grupos inseparables;
- mesas bloqueadas;
- reservas obligatorias.

La IA no escribe en asignaciones reales mientras genera.

---

## 21. Diseño visual: dirección, no copia

El sistema debe desarrollar identidad propia.

### Rasgos deseados

- premium;
- elegante;
- calmado;
- editorial;
- moderno;
- emocional sin ser cursi;
- funcional;
- alta legibilidad.

### A definir

- paleta;
- tipografías;
- iconografía;
- sistema de cards;
- estilo de gráficos;
- ilustraciones;
- microinteracciones;
- identidad del asistente.

Las capturas de referencia ayudan a evaluar densidad, claridad y jerarquía, pero **no determinan nuestra paleta ni composición**.

---

## 22. Responsive

Validar:

```text
360x800
390x844
430x932
768x1024
1366x768
1440x900
```

No depender de tablas horizontales.

---

## 23. Accesibilidad

Objetivo: WCAG 2.2 AA cuando sea razonablemente aplicable.

Validar teclado, focus, contraste, labels, errores, reduced motion, acciones táctiles y mecanismos alternativos a drag & drop.

---

## 24. Datos y sincronización

### Fuente canónica

Supabase.

### Espejo

Google Sheets.

### Reglas

- idempotencia;
- reintentos;
- trazabilidad;
- fallo de Sheets no invalida Supabase;
- no bidireccional libre;
- no marcar sync antes de confirmar escritura.

---

## 25. Seguridad

- Supabase Auth;
- RLS;
- mínimo privilegio;
- roles;
- futura autorización por matrimonio;
- staging;
- Preview aislado;
- backups;
- audit log;
- logs saneados;
- secretos fuera de Git;
- PII minimizada.

---

## 26. Estado actual reutilizable

Ya existe una base para auth, dashboard, invitados, RSVP, integrantes de RSVP, conciliación, incidencias, mesas, asignaciones, finanzas, proveedores, actividad, auditoría y sincronización.

No se reemplaza sin evidencia de necesidad.

---

## 27. Roadmap

### Fase 0 — Documentación

- PRD;
- Context;
- Agents;
- Memory.

### Fase 1 — Seguridad de desarrollo

- staging;
- typecheck;
- tests;
- guardas de Preview.

### Fase 2 — Sistema visual propio

- tokens;
- layout;
- navegación;
- componentes;
- responsive.

### Fase 3 — Inicio y planificación

- dashboard;
- pendientes;
- checklist;
- presupuesto;
- proveedores.

### Fase 4 — Invitados y mesas

- directorio;
- RSVP;
- incidencias;
- distribución;
- selección múltiple.

### Fase 5 — Salón

- presets propios;
- preview;
- editor 2D.

### Fase 6 — Operación del evento

- cronograma;
- música;
- documentos;
- vistas por proveedor.

### Fase 7 — Inteligencia

- asistente;
- propuestas;
- mesas;
- recomendaciones.

### Fase 8 — Segundo matrimonio piloto

- onboarding;
- aislamiento;
- permisos;
- preparación multi-matrimonio.

---

## 28. Fuera de alcance inmediato

- marketplace;
- app nativa;
- 3D;
- facturación SaaS;
- pagos online;
- IA autónoma;
- chat completo;
- rediseño del sitio público;
- cambios al RSVP público.

---

## 29. Criterio de éxito

El producto estará bien encaminado cuando:

- la pareja entienda el estado de la boda en segundos;
- el planner pueda operar sin herramientas paralelas;
- los invitados se gestionen por persona;
- las mesas mantengan integridad;
- el salón refleje la distribución;
- proveedores vean sólo lo necesario;
- cronograma y documentos estén conectados;
- el asistente reduzca trabajo sin tomar control;
- móvil sea realmente usable;
- el producto tenga identidad propia.

---

## 30. Condición para empezar a implementar

No iniciar el rediseño funcional hasta que:

1. este PRD sea aprobado;
2. `CONTEXT.md`, `AGENTS.md` y `MEMORY.md` sean coherentes;
3. Preview esté aislado;
4. exista rama de trabajo;
5. se confirme que no se tocará producción.
