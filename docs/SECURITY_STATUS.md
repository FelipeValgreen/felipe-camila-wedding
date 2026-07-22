# Informe de Auditoría de Seguridad y Plan de Rotación de Credenciales

**Felipe & Camila · “El Umbral Vivo”**
**Versión**: 1.0 (Fase 1A — Auditoría No Destructiva)
**Fecha**: 22 de Julio de 2026
**Repositorio**: `FelipeValgreen/felipe-camila-wedding`
**Rama**: `feature/unified-rsvp-v3-2026-07-21`
**PR Asociado**: [#6](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/6)
**SHA Base Autorizativo**: `74b72fd3c32c8690b63cf20459b0bd2783aaf115`

---

## 1. Resumen Ejecutivo

Este documento establece la auditoría técnica de seguridad no destructiva del repositorio `felipe-camila-wedding`. Su propósito es identificar el estado exacto de todas las credenciales del proyecto, evaluar riesgos históricos de exposición en transcripciones anteriores, definir el orden estricto de rotación sin romper producción ni Preview, y preparar los controles de endurecimiento del repositorio.

---

## 2. Registro de Incidentes Históricos de Credenciales

Durante conversaciones e iteraciones pasadas del desarrollo, las siguientes credenciales quedaron registradas en historiales/logs:

1. **Google OAuth Client Secret** (Patrón `GOCSPX-...`): Expuesto en transcripciones pasadas.
2. **Supabase Personal Access Token (PAT)** (Patrón `sbp_de...`): Expuesto en transcripciones pasadas.
3. **Supabase Service Role Key** (JWT con `role: "service_role"`): Expuesta en transcripciones pasadas.
4. **Google Service Account Keys**: Múltiples claves privadas JSON generadas previamente.

### Estado Actual de Remediación
- **Supabase PAT**: `REVOCADO` (Confirmado por el usuario).
- **Google OAuth Client Secret**: `PENDIENTE DE ELIMINACIÓN EN GCP CONSOLE` (Requiere acción manual del propietario).
- **Supabase Service Role Key**: `PENDIENTE DE ROTACIÓN FORMAL` (Sigue activa para Preview).
- **Google Service Account Keys**: `PENDIENTE DE LIMPIEZA DE CLAVES REDUNDANTES` (7 claves activas registradas en GCP IAM).

---

## 3. Estado Detallado por Credencial

| Credencial / Secreto | Entorno Usado | Ubicación en Código / Infra | Estado Actual | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPABASE_URL`** | Preview / Prod | `js/supabase-client.js`, `api/_lib/supabase-admin.js` | `ACTIVO / PÚBLICO` | No requiere rotación (URL pública). |
| **`SUPABASE_ANON_KEY` / Publishable** | Frontend Client | `js/supabase-client.js` | `ACTIVO / PÚBLICO` | No requiere rotación. Uso adecuado en cliente. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Serverless API | `api/_lib/supabase-admin.js`, Vercel Preview | `EXPUESTO / PENDIENTE` | Sustituir por `SUPABASE_SECRET_KEY` y rotar en Dashboard. |
| **`SUPABASE_SECRET_KEY`** | Serverless API | `.env.example`, `api/_lib/supabase-admin.js` | `PENDIENTE SOPORTE` | Agregar soporte dual en backend (Fase 1B). |
| **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** | Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO` | Identificador público de Service Account. |
| **`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`**| Vercel Preview | `api/_lib/google-sheets.js` | `EXPUESTO / PENDIENTE` | Prunar 6 claves redundantes en GCP y mantener 1 limpia. |
| **Google OAuth Client Secret** | GCP Console | No usado en PR #6 backend | `EXPUESTO / PENDIENTE` | Eliminar cliente OAuth antiguo en GCP Console. |
| **`WHATSAPP_ACCESS_TOKEN`** | Ninguno | `api/_lib/whatsapp-client.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |
| **`META_APP_SECRET`** | Ninguno | `api/whatsapp/webhook.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |

---

## 4. Análisis de Riesgo e Impacto Potencial

- **Riesgo por `SUPABASE_SERVICE_ROLE_KEY` expuesta**:
  - *Impacto*: Acceso administrativo completo a Supabase DB (bypassa RLS).
  - *Nivel de Riesgo*: `ALTO` en Producción si estuviera configurada (Actualmente 0 variables en Production Vercel).
  - *Mitigación*: Implementar `SUPABASE_SECRET_KEY` en backend, re-añadir limpia en Vercel Preview y rotar clave expuesta.

- **Riesgo por Google OAuth Client Secret expuesto**:
  - *Impacto*: Intentos de autenticación no autorizados si el cliente estuviera activo.
  - *Nivel de Riesgo*: `MEDIO`.
  - *Mitigación*: Desactivar/eliminar cliente OAuth en GCP Console tras verificar que Supabase Auth no dependa de él.

- **Riesgo por claves de Service Account redundantes (7 claves activas)**:
  - *Impacto*: Superficie de ataque ampliada inútilmente.
  - *Nivel de Riesgo*: `MEDIO`.
  - *Mitigación*: Eliminar 6 claves obsoletas en GCP IAM, manteniendo únicamente la clave activa vinculada a Preview.

---

## 5. Escaneo de Secretos del Repositorio (Resultados)

### 5.1 Escaneo de Patrones de Secretos
- **Comando**: `git grep -nE "sbp_|GOCSPX|BEGIN PRIVATE KEY|eyJhbGciOiJIUzI1NiI"`
- **Coincidencias en Árbol de Trabajo**: `1` (Línea 110 en `tests/test_rsvp.test.js` correspondiente a un string ficticio de prueba unitaria `'-----BEGIN PRIVATE KEY-----\nFAKE_KEY...'`).
- **Coincidencias de Credenciales Reales en Código**: `0`.

### 5.2 Inventario de Archivos Sensibles Rastreados y Locales
- **Archivos Sensibles Rastreados en Git**: `0`
- **Archivos Locales Auditados**:
  - `./.env.example` (Plantilla de ejemplo sin valores reales).
  - `./.gitignore` (Endurecido para ignorar `.env*`, `*.pem`, `*.key`, `*service-account*.json`).
- **Archivos Temporales Borrados**: Confirmada la eliminación de `/tmp/matrimonio-rsvp-sheets-key.json` y `.env.preview.local`.

---

## 6. Metadata de Claves en Google Cloud IAM

Inspección efectuada mediante `gcloud iam service-accounts keys list` para `matrimonio-rsvp-sheets@claude-498820.iam.gserviceaccount.com`:

| Sufijo del KEY_ID | Fecha de Creación | Estado de Clave | Clasificación de Auditoría |
| :--- | :--- | :--- | :--- |
| `...d95f0a` | `2026-07-22T04:10:16Z` | `USER_MANAGED` | Clave redundante a prunar en Fase 1B. |
| `...5ab757` | `2026-07-22T04:12:07Z` | `USER_MANAGED` | Clave redundante a prunar en Fase 1B. |
| `...034151` | `2026-07-22T04:40:32Z` | `USER_MANAGED` | Clave redundante a prunar en Fase 1B. |
| `...75e1e4` | `2026-07-22T04:42:44Z` | `USER_MANAGED` | Clave redundante a prunar en Fase 1B. |
| `...2e23a5` | `2026-07-22T04:44:26Z` | `USER_MANAGED` | Clave redundante a prunar en Fase 1B. |
| `...82bfe0` | `2026-07-22T04:47:27Z` | `USER_MANAGED` | Clave redundante a prunar en Fase 1B. |
| `...ae8e40` | `2026-07-22T04:50:36Z` | `USER_MANAGED` | Clave activa asociada a Vercel Preview. |

- **`GOOGLE_KEYS_ROTATION_REQUIRED`**: `YES` (7 claves activas, 6 redundantes a revocar).
- **`OAUTH_CONSOLE_VERIFICATION_REQUIRED`**: `YES` (Eliminación manual en GCP Console).

---

## 7. Inventario de Variables de Entorno en Vercel

Inspección no destructiva de nombres realizada vía `vercel env ls`:

- **Preview Environment**: 6 variables configuradas (`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEETS_TAB`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`).
- **Production Environment**: `0` variables configuradas.
- **Development Environment**: `0` variables configuradas.
- **Valores Leídos / Descargados**: `NO` (`vercel env pull` no fue ejecutado).

---

## 8. Verificación de Mergeabilidad de PR #6

Metadatos reales de GitHub CLI (`gh pr view 6`):
- **BaseRefOid**: `724f8561be87e4c61cdfbdcdc4fe646796672b7c`
- **HeadRefOid**: `74b72fd3c32c8690b63cf20459b0bd2783aaf115`
- **Mergeable Status**: `MERGEABLE`
- **MergeStateStatus**: `CLEAN`
- **Simulación Local (`git merge-tree`)**: `0` marcadores de conflicto (`PR6_LOCAL_MERGE_SIMULATION=PASS`).

---

## 9. Plan Técnico de Rotación de Credenciales (Fase 1B)

El orden estricto de rotación en Fase 1B será:

1. **Paso 1: Implementar soporte dual en backend**:
   - Modificar `api/_lib/supabase-admin.js` para dar preferencia a `process.env.SUPABASE_SECRET_KEY` manteniendo `SUPABASE_SERVICE_ROLE_KEY` como fallback.
2. **Paso 2: Configurar nueva `SUPABASE_SECRET_KEY` en Vercel Preview**:
   - Generar clave de servidor limpia en Supabase Dashboard y añadirla a Preview.
3. **Paso 3: Prunar 6 claves de Google Service Account redundantes**:
   - Eliminar las 6 claves redundantes en GCP IAM dejando solo 1 clave activa.
4. **Paso 4: Verificación E2E en Preview**:
   - Redesplegar Preview y validar funcionamiento del RSVP.
5. **Paso 5: Retirar clave expuesta y confirmación manual OAuth**:
   - Eliminar `SUPABASE_SERVICE_ROLE_KEY` expuesta de Vercel Preview y confirmar eliminación del cliente OAuth en GCP Console.

---

## 10. Confirmación de Políticas de Control y Límites

- **Rotación ejecutada en Fase 1A**: `NO` (Fase exclusivamente auditiva/no destructiva).
- **Producción modificada**: `NO`
- **Rama `main` modificada**: `NO`
- **PR #5 modificado**: `NO`
- **Supabase remoto modificado**: `NO`
- **Google Cloud IAM modificado en Fase 1A**: `NO`
- **Google Sheets modificado**: `NO`
- **Meta / WhatsApp modificado**: `NO`
- **Secretos impresos en reporte**: `NO`

---
*Informe de Auditoría de Seguridad de Fase 1A generado por Security Engineer / Antigravity.*
