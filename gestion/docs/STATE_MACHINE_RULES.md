# STATE_MACHINE_RULES.md

## Propósito

Evitar estados libres/incompatibles en dominios con ciclos claros.

## Proveedores

```text
Por buscar
→ Contactado
→ Cotizando
→ Evaluando
→ Seleccionado
→ Contratado
→ Finalizado
```

`Descartado` puede ocurrir desde estados previos según regla vigente.

## RSVP

Estados de reconciliación soportados deben usar allowlist del esquema vigente. Cambiar asistencia no debe alterar reconfirmación.

## Tareas

Estados deben ser explícitos y no derivarse únicamente de fecha.

## Documentos

Si se implementan versiones/aprobaciones, separar estado del documento de disponibilidad del archivo.

## Layout

Separar draft/canonical/archived según implementación vigente.

## Regla

El cliente no decide transiciones válidas por sí solo. Servidor/DB valida las transiciones sensibles.
