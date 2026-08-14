# VENUE_ENGINE_SPEC.md

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Mantener una representación operativa del recinto que conecte dimensiones, mesas y elementos de producción con una escala coherente y versionable.

## 2. Separación conceptual

Siempre distinguir:

1. **Referencia oficial/visual** — plano, PDF o imagen del recinto;
2. **Layout operativo** — geometría editable usada para planificar;
3. **Propuesta temporal** — elementos virtuales derivados de seating u otras simulaciones.

Una referencia visual no se considera geometría canónica.

## 3. Sistema de coordenadas

Preferencia V3:

- `space_width_m`;
- `space_height_m`;
- `grid_step_m`;
- `position_x_m`;
- `position_y_m`;
- `width_m`;
- `height_m`;
- `rotation`.

Los campos legacy relativos pueden mantenerse durante migración, pero una versión canónica no debe mezclar unidades sin conversión explícita.

## 4. Elementos

Tipos mínimos:

- mesa;
- silla/cluster de sillas cuando sea útil;
- pista;
- escenario;
- DJ/AV;
- barra;
- buffet;
- acceso;
- zona;
- decoración/objeto genérico.

Cada elemento puede tener:

- id;
- tipo;
- nombre;
- posición;
- tamaño;
- rotación;
- lock;
- layer;
- metadata.

## 5. Mesas

La mesa operacional del layout debe referenciar la mesa canónica de seating cuando exista. No crear una segunda entidad funcional desconectada sólo para dibujarla.

Separar:

```text
número interno
nombre visible
capacidad
geometría
```

## 6. Edición

Desktop:

- pan;
- zoom;
- drag;
- resize;
- rotate;
- snap/grid;
- lock;
- duplicate;
- delete;
- layers.

Móvil/tablet:

- seleccionar elemento;
- editar posición/tamaño mediante controles alternativos;
- lock/duplicate/delete;
- zoom/pan táctil.

No depender únicamente de precisión de drag.

## 7. Versionado

Guardar versiones con:

- layout ID;
- versión;
- estado (`draft`, `canonical`, `archived` o esquema vigente);
- actor;
- timestamp;
- snapshot de geometría.

Una nueva versión no debe destruir la anterior.

## 8. Validaciones

- dimensiones positivas;
- posiciones finitas;
- rotación normalizada;
- referencia de mesa válida;
- IDs únicos;
- objetos locked no se modifican accidentalmente;
- no perder elementos ante save parcial;
- concurrencia detectada cuando corresponda.

## 9. Capacidad

El layout debe mostrar:

- mesas;
- capacidad total;
- invitados asignados;
- cupos libres;
- déficit/superávit;
- mesas propuestas virtuales cuando corresponda.

La capacidad de seating sigue siendo regla de dominio, no cálculo visual solamente.

## 10. Preview

Sin staging aislado:

- lectura productiva permitida según guard;
- cambios de UX permanecen como draft local;
- no guardar geometría en producción.

Con staging:

- habilitar mutaciones sólo después de verificar destinos.

## 11. Importación de referencia

Una imagen/PDF puede cargarse como overlay con escala manual o puntos de calibración.

No inferir medidas exactas desde una imagen sin evidencia.

## 12. Exportación

Antes del evento, permitir generar una representación offline legible con:

- nombres/números de mesa;
- ubicación;
- capacidad;
- elementos críticos;
- versión/timestamp.

## 13. Casos de prueba P0

- crear layout;
- cambiar dimensiones;
- mover/resize/rotate;
- lock impide edición accidental;
- duplicar conserva propiedades esperadas;
- eliminar no borra mesa canónica;
- guardar nueva versión;
- cargar versión anterior;
- propuesta virtual no persiste;
- responsive/touch.
