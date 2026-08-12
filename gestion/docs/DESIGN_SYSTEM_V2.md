# DESIGN_SYSTEM_V2.md — Dirección visual candidata

**Estado:** Candidate / Preview  
**Fecha:** 12 de agosto de 2026

## 1. Objetivo

Probar una identidad visual propia para el Centro de Gestión antes de expandir el rediseño a todos los módulos.

Esta propuesta NO copia el benchmark externo. Conserva únicamente principios de claridad, modularidad y jerarquía.

## 2. Concepto

```text
Editorial operativo
```

La interfaz combina la tranquilidad de una pieza editorial con la precisión de una herramienta de operación.

Debe sentirse:

- premium;
- serena;
- madura;
- contemporánea;
- organizada;
- emocional sin ser ornamental.

## 3. Diferenciación frente al benchmark

El benchmark utiliza una estética crema/oliva/dorado y una navegación particular.

Esta candidata utiliza una dirección diferente:

- azul tinta / carbón azulado para navegación;
- papel cálido para canvas;
- cobre/terracota como acento;
- rosa arcilla muy suave como apoyo;
- jerarquía de navegación basada en trabajo, no en replicar las secciones de referencia;
- estados futuros explícitamente no interactivos;
- la identidad del asistente permanece sin definir.

## 4. Tokens candidatos

```text
Ink:          #16212A
Ink Soft:     #24323C
Paper:        #F7F5F1
Surface:      #FFFDF9
Line:         #DDD9D2
Text:         #1C252B
Muted:        #768087
Copper:       #B86F52
Copper Soft:  #EAD8CF
Mist:         #E7EBEC
Success:      #3D7161
Warning:      #9A6536
Danger:       #A34F49
```

Estos tokens son candidatos, no identidad final aprobada.

## 5. Tipografía

En esta primera iteración se conservan las familias ya cargadas por el proyecto:

- Newsreader para títulos/editorial;
- Inter para interfaz y datos.

La decisión evita introducir dependencias visuales nuevas antes de validar el shell.

## 6. Navegación candidata

### Control

- Inicio
- Necesita atención

### Personas y espacio

- Invitados
- Mesas

### Operación

- Presupuesto y proveedores
- Actividad

### En evolución

Se muestran como estados informativos, no como botones falsos:

- Planificación
- Salón
- Cronograma
- Música
- Documentos

## 7. Asistente

No se define nombre ni personaje.

El shell muestra únicamente el estado:

```text
Asistente de planificación
Identidad y funciones en diseño
```

No existe una acción falsa ni se reutiliza el asistente del benchmark.

## 8. Responsive

### Desktop

- sidebar persistente;
- contexto de página superior;
- canvas amplio;
- navegación con descripción.

### Tablet

- sidebar algo más compacta;
- descripciones secundarias reducidas.

### Móvil

- topbar;
- drawer lateral;
- no depende de hover;
- contenido conserva el sistema existente mientras se rediseñan módulos progresivamente.

## 9. Alcance de esta candidata

Incluye:

- shell;
- navegación;
- color system candidato;
- adaptación superficial de KPI, botones y tablas existentes;
- responsive shell.

No incluye todavía:

- rediseño profundo de Inicio;
- nueva experiencia de invitados;
- nuevo módulo de mesas;
- editor de salón;
- planning;
- cronograma;
- asistente funcional.

## 10. Criterio de evaluación

Antes de extender el sistema visual a módulos completos, evaluar:

1. ¿Se percibe claramente distinto del benchmark?
2. ¿Se siente adecuado para una boda sin parecer una invitación digital?
3. ¿Es suficientemente profesional para planners y proveedores?
4. ¿La navegación se entiende sin explicación?
5. ¿El sistema puede escalar a multi-matrimonio?
6. ¿Funciona en móvil sin perder jerarquía?
