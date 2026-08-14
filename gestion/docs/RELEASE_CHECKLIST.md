# RELEASE_CHECKLIST.md — Checklist de release del Centro de Gestión

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Propósito

Definir una única puerta de salida para cualquier cambio que llegue a `gestion.felipeycami.cl`.

Un release no se considera terminado sólo porque Vercel muestre `READY`. Debe preservar integridad de datos, permisos, sincronización, experiencia y capacidad de rollback.

## 2. Clasificación del cambio

Antes de comenzar, marcar el release como uno o varios de:

- UI sin contrato de datos;
- lógica de dominio;
- API/RPC;
- migración de esquema;
- backfill/datos;
- permisos/RLS;
- integración externa;
- configuración/infraestructura;
- IA/Copiloto;
- documentos/operación.

El nivel de prueba y backup depende de esta clasificación.

## 3. Pre-merge

### Git

- [ ] rama distinta de `main`;
- [ ] diff limitado al alcance;
- [ ] no hay archivos temporales o debug accidentales;
- [ ] no hay PII real;
- [ ] no hay secretos;
- [ ] migraciones están versionadas;
- [ ] documentación actualizada si cambian contratos/reglas.

### Calidad

Ejecutar lo disponible:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:ci
```

- [ ] typecheck verde;
- [ ] tests relevantes verdes;
- [ ] build verde;
- [ ] no declarar una prueba que no se ejecutó.

### Seguridad

- [ ] RLS/grants revisados si hay datos nuevos;
- [ ] autorización server-side para mutaciones;
- [ ] `SUPABASE_SECRET_KEY` sólo server-side;
- [ ] Preview no escribe producción;
- [ ] logs no agregan PII/secrets;
- [ ] cambio sensible genera `audit_log`.

### Datos

- [ ] constraints preservan reglas de dominio;
- [ ] backfill idempotente o controlado;
- [ ] no hay `DROP` destructivo sin plan explícito;
- [ ] se conoce el impacto sobre `sync_outbox`;
- [ ] se conoce el impacto sobre Sheets.

## 4. Preview

- [ ] deployment `READY`;
- [ ] login funciona;
- [ ] navegación completa;
- [ ] consola sin errores críticos;
- [ ] desktop principal validado;
- [ ] móvil principal validado;
- [ ] guard de escritura no productiva activo;
- [ ] guard de sync externo activo;
- [ ] no se hicieron mutaciones productivas desde Preview.

Si el cambio requiere probar escrituras reales:

- [ ] Supabase staging confirmado;
- [ ] datos ficticios;
- [ ] Sheet de prueba o sync desactivado;
- [ ] credenciales de staging;
- [ ] smoke E2E mutante completado.

## 5. Antes de producción

### Backup

Requerido para:

- migraciones;
- backfills;
- cambios masivos;
- seating final masivo;
- reconstrucción de sync/Sheets;
- cambios de permisos de alto impacto.

- [ ] backup creado;
- [ ] conteos verificados;
- [ ] punto de restauración registrado;
- [ ] rollback probado o razonado.

### Aprobación

- [ ] alcance comprendido;
- [ ] riesgos conocidos;
- [ ] PR revisado;
- [ ] cambio autorizado para producción.

## 6. Deploy producción

- [ ] deploy corresponde al commit aprobado;
- [ ] deployment `READY`;
- [ ] dominio `gestion.felipeycami.cl` responde;
- [ ] login responde;
- [ ] `/dashboard` carga;
- [ ] `/api/system-health` responde según contrato;
- [ ] no hay aumento evidente de errores runtime;
- [ ] cron/sync mantienen configuración esperada.

## 7. Smoke post-deploy

Realizar lectura de:

- [ ] Inicio;
- [ ] Invitados;
- [ ] Necesita atención;
- [ ] Mesas;
- [ ] Salón;
- [ ] Planificación;
- [ ] Cronograma;
- [ ] Música;
- [ ] Presupuesto/proveedores;
- [ ] Documentos;
- [ ] Actividad;
- [ ] Estado del sistema.

Para un release con mutación, ejecutar sólo una operación controlada y reversible representativa, luego verificar:

- [ ] Supabase;
- [ ] `audit_log`;
- [ ] `sync_outbox` si aplica;
- [ ] Google Sheets si aplica;
- [ ] UI refleja el dato canónico.

## 8. Criterios de rollback

Rollback inmediato o mitigación si ocurre:

- login roto;
- acceso no autorizado;
- pérdida/corrupción de datos;
- duplicación masiva;
- asignaciones inconsistentes;
- sync que sobrescribe datos incorrectamente;
- error crítico repetitivo;
- exposición de secreto/PII;
- regresión que impide operar un módulo P0.

Opciones:

1. feature flag/guard;
2. revert de código;
3. promoción de deployment estable anterior;
4. migración forward correctiva;
5. restauración selectiva de datos.

No revertir datos completos si el incidente afecta sólo un subconjunto y existen cambios válidos posteriores.

## 9. Cierre del release

- [ ] smoke post-deploy verde;
- [ ] métricas/logs revisados;
- [ ] sync sano;
- [ ] documentación coherente;
- [ ] `STATUS_AND_ROADMAP.md` actualizado si cambió una capacidad;
- [ ] `CHANGELOG.md` actualizado para cambios relevantes;
- [ ] deuda o riesgo residual registrado.

## 10. Definition of Done para Felipe & Camila

El caso real puede declararse técnicamente cerrado cuando:

- [ ] todos los confirmados contabilizables tienen ficha individual o una incidencia explícita resuelta/aceptada;
- [ ] relaciones relevantes para seating están validadas o marcadas como probables conscientemente;
- [ ] asignaciones finales respetan capacidad;
- [ ] layout final corresponde al montaje acordado;
- [ ] cronograma operativo está completo;
- [ ] música/cues críticos están completos;
- [ ] proveedores, pagos y documentos críticos están registrados;
- [ ] exportaciones de contingencia del día están disponibles;
- [ ] backup/restore está verificado;
- [ ] suite mínima de calidad está verde;
- [ ] no existen bloqueos de seguridad conocidos de prioridad P0;
- [ ] Wedding Day Runbook ha sido revisado.
