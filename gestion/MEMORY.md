# MEMORY.md — Memoria durable del Centro de Gestión

**Versión:** 1.1 RC  
**Fecha:** 12 de agosto de 2026

---

## 1. Proyecto

- Caso actual: Felipe & Camila
- Fecha: 23 de octubre de 2026
- Repo: `FelipeValgreen/felipe-camila-wedding`
- App: `gestion/`
- Producción: `https://gestion.felipeycami.cl/dashboard`

---

## 2. Objetivo

Evolucionar el Centro de Gestión hacia un producto integral de planificación y operación de bodas.

No reconstruir desde cero.

---

## 3. Benchmark externo

El sistema visual compartido por el usuario es **sólo un benchmark**.

### Recordar

- no es nuestra marca;
- no es nuestro nombre;
- su asistente no es nuestro asistente;
- sus colores no son nuestros colores;
- su navegación no debe copiarse literalmente;
- sus presets no deben copiarse.

### Sí podemos aprender

- modularidad;
- invitados/mesas/salón conectados;
- importación;
- proveedores;
- presets;
- ayuda contextual;
- lenguaje simple.

---

## 4. Decisión de diferenciación

```text
Similar en capacidad.
Diferente en identidad.
Mejor en integración.
```

Nuestro producto debe ser claramente reconocible como independiente.

---

## 5. Arquitectura

```text
Supabase = fuente canónica
Google Sheets = espejo
```

---

## 6. Stack

- Next.js 14
- React 18
- TypeScript 5
- Tailwind/PostCSS
- Supabase
- Vercel
- Sheets
- GitHub

---

## 7. Dominio

### RSVP

Respuesta ≠ persona.

### Personas

Una ficha individual por asistente.

### +1

No existe implícito.

### Matching

No fuzzy automático.

### Asistencia

Independiente de reconfirmación.

### Mesas

Sólo `attending`.

No superar capacidad.

### Restricciones

Sensibles.

---

## 8. Módulos objetivo

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
- Configuración

---

## 9. Asistente

Nombre provisional:

```text
Asistente de planificación
```

No usar nombres del benchmark.

Identidad definitiva pendiente.

Principio:

```text
sugiere
explica
prepara
no ejecuta cambios sensibles sin aprobación
```

---

## 10. Invitados + Mesas + Salón

Deben estar conectados.

```text
persona
→ asistencia
→ mesa
→ capacidad
→ plano
```

---

## 11. Salón

Separar:

```text
preview aspiracional
```

de:

```text
editor 2D operativo
```

---

## 12. Diseño

No existe todavía paleta definitiva aprobada.

Dirección:

- premium;
- elegante;
- calmado;
- editorial;
- moderno;
- propio.

La referencia externa no define nuestros tokens.

---

## 13. Estado reusable

Existe base para:

- auth;
- dashboard;
- invitados;
- RSVP;
- integrantes;
- conciliación;
- incidencias;
- mesas;
- finanzas;
- proveedores;
- actividad;
- auditoría;
- Sheets sync.

---

## 14. Pendientes

- staging;
- typecheck;
- tests;
- sistema visual;
- responsive;
- proveedores completos;
- cronograma;
- documentos;
- editor 2D;
- asistente;
- IA de mesas;
- multi-matrimonio.

---

## 15. Git baseline histórico

```text
main
3c08cb05cdf0b2db636f89cf10dfe56ebfc23508
```

Verificar antes de cada tarea.

---

## 16. Vercel baseline histórico

```text
project: gestion
READY
target: production
commit: 3c08cb05cdf0b2db636f89cf10dfe56ebfc23508
```

Verificar nuevamente.

---

## 17. Protección

No modificar desde gestión:

- sitio público;
- RSVP público;
- galería;
- fotos.

No usar producción como staging.

No merge automático.

---

## 18. Referencia externa

Video:

`https://www.youtube.com/watch?v=CoHKehTBP-Y`

Uso:

```text
benchmark
```

No:

```text
especificación literal
```

---

## 19. Próximo proceso

1. aprobar estos documentos;
2. crear rama;
3. incorporarlos al repo;
4. verificar Preview/staging;
5. construir identidad visual propia;
6. primer PR funcional;
7. Preview;
8. revisión;
9. merge con aprobación.

---

## 20. Pendientes de decisión humana

### Marca

- nombre comercial;
- identidad;
- tono;
- nombre del asistente.

### Visual

- paleta;
- tipografías;
- iconografía;
- sistema gráfico.

### Producto

- alcance del primer MVP externo;
- primer usuario piloto;
- nivel de colaboración de proveedores.

### Tecnología

- staging;
- editor 2D;
- multi-wedding;
- permisos granulares.

---

## 21. Regla de actualización

Guardar aquí decisiones duraderas.

No guardar:

- teléfonos;
- correos;
- alergias;
- secretos;
- conteos temporales;
- estados momentáneos.

---

## 22. Registro

### 2026-08-12 — Corrección del benchmark

Decisión:

El producto compartido por el usuario es una referencia externa.

Se eliminan del producto propio:

- nombres;
- identidad;
- personaje/asistente;
- paleta obligatoria;
- presets obligatorios;
- lenguaje copiado.

Estado:

```text
APLICADO EN DOCUMENTACIÓN V2.
```
