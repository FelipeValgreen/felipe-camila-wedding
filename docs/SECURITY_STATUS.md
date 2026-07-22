# Informe de Auditoría de Seguridad y Plan de Rotación de Credenciales

**Felipe & Camila · “El Umbral Vivo”**
**Versión**: 1.1 (Fase 1B.1 — Compatibilidad Supabase Secret Key y Corrección de Plan)
**Fecha**: 22 de Julio de 2026
**Repositorio**: `FelipeValgreen/felipe-camila-wedding`
**Rama**: `feature/unified-rsvp-v3-2026-07-21`
**PR Asociado**: [#6](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/6)
**SHA Autoritativo de Inicio**: `3f5baf23a0add13df34a965e5bd8ded69a80e58d`

---

## 1. Resumen Ejecutivo

Este documento registra las modificaciones de compatibilidad para claves modernas de servidor Supabase (`SUPABASE_SECRET_KEY`) con fallback a la clave legacy (`SUPABASE_SERVICE_ROLE_KEY`), el endurecimiento de la sanitización de errores en el cliente administrativo de Supabase, y la corrección formal del plan de rotación de claves de Google Service Account.

---

## 2. Registro de Incidentes Históricos de Credenciales

1. **Google OAuth Client Secret** (Patrón `GOCSPX-...`): Expuesto en transcripciones pasadas.
2. **Supabase Personal Access Token (PAT)** (Patrón `sbp_de...`): Expuesto en transcripciones pasadas.
3. **Supabase Service Role Key** (JWT con `role: "service_role"`): Expuesta en transcripciones pasadas.
4. **Google Service Account Keys**: Múltiples claves privadas JSON generadas previamente.

### Estado Actual de Remediación
- **Supabase PAT**: `REVOCADO` (Confirmado por el usuario).
- **Google OAuth Client Secret**: `PENDIENTE DE ELIMINACIÓN EN GCP CONSOLE` (Requiere acción manual del propietario).
- **Supabase Service Role Key**: `COMPATIBILIDAD SOPORTADA / PENDIENTE CONFIGURACIÓN` (Soporte para `SUPABASE_SECRET_KEY` implementado en backend con fallback a `SUPABASE_SERVICE_ROLE_KEY`).
- **Google Service Account Keys**: `AUDITORÍA Y PLAN CORREGIDO` (7 claves activas registradas; clave actualmente utilizada en Vercel Preview `UNVERIFIED`).

---

## 3. Estado Detallado por Credencial

| Credencial / Secreto | Entorno Usado | Ubicación en Código / Infra | Estado Actual | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPABASE_URL`** | Preview / Prod | `js/supabase-client.js`, `api/_lib/supabase-admin.js` | `ACTIVO / PÚBLICO` | No requiere rotación (URL pública). |
| **`SUPABASE_ANON_KEY` / Publishable** | Frontend Client | `js/supabase-client.js` | `ACTIVO / PÚBLICO` | No requiere rotación. Uso adecuado en cliente. |
| **`SUPABASE_SECRET_KEY`** | Serverless API | `.env.example`, `api/_lib/supabase-admin.js` | `CÓDIGO SOPORTADO` | Configurar en Vercel Preview en Fase 1B.2. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Serverless API | `api/_lib/supabase-admin.js`, Vercel Preview | `EXPUESTO / FALLBACK` | Mantener como fallback legacy hasta verificar `SUPABASE_SECRET_KEY`. |
| **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** | Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO` | Identificador público de Service Account. |
| **`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`**| Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO / UNVERIFIED` | Generar nueva clave dedicada en Fase 1B.2 antes de purga. |
| **Google OAuth Client Secret** | GCP Console | No usado en PR #6 backend | `EXPUESTO / PENDIENTE` | Eliminar cliente OAuth antiguo en GCP Console. |
| **`WHATSAPP_ACCESS_TOKEN`** | Ninguno | `api/_lib/whatsapp-client.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |
| **`META_APP_SECRET`** | Ninguno | `api/whatsapp/webhook.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |

---

## 4. Auditoría y Corrección del Plan de Google Service Account

### 4.1 Estado Actual de Claves en GCP IAM
- **Claves User-Managed Activas**: `7` claves registradas.
- **Sufijos de KEY_ID**: `d95f0a`, `5ab757`, `034151`, `75e1e4`, `2e23a5`, `82bfe0`, `ae8e40`.
- **Clave actualmente utilizada en Vercel Preview**: `UNVERIFIED` (No se puede inferir o clasificar como prescindible ninguna clave solo por fecha de creación).
- **Eliminación de claves en esta fase**: `NO AUTORIZADA`.

### 4.2 Plan Técnico de Rotación Segura para Google SA (Fase 1B.2)
1. Crear una nueva clave dedicada para la Service Account en GCP.
2. Registrar únicamente los 6 caracteres finales (sufijo) de su KEY_ID.
3. Configurar esa nueva clave en Vercel Preview de forma segura mediante stdin.
4. Redesplegar ambiente Preview.
5. Ejecutar verificación de autenticación real con Google Sheets API.
6. Ejecutar pruebas E2E de lectura y escritura.
7. Confirmar operatividad completa de la nueva clave.
8. Revisar métricas de uso de las claves anteriores cuando estén disponibles en GCP.
9. Eliminar las claves anteriores únicamente después de validar la nueva clave en producción/Preview.
10. Conservar temporalmente una única clave nueva validada.

---

## 5. Escaneo de Secretos e Historial Git

- **Árbol de Trabajo Escaneado**: `SÍ` (1 coincidencia de prueba unitaria ficticia en `tests/test_rsvp.test.js:110`).
- **Archivos Rastreados Escaneados**: `SÍ` (0 credenciales reales).
- **Historial Git Completo Escaneado**: `NO DEMOSTRADO` (`HISTORY_SECRET_SCAN=UNVERIFIED` por ausencia de binario `gitleaks` local).
- **Secretos Completos Impresos**: `NO`

---

## 6. Implementación Técnica en `api/_lib/supabase-admin.js`

- **Soporte de Clave**: Implementada función `getSupabaseServerKey(env)` con preferencia a `SUPABASE_SECRET_KEY` y fallback a `SUPABASE_SERVICE_ROLE_KEY`.
- **Encabezados HTTP Supabase (`buildSupabaseHeaders`)**:
  - Claves modernas `sb_secret_`: Envío en header `apikey`. Omisión de header `Authorization: Bearer`.
  - Claves legacy `service_role`: Envío en header `apikey` y header `Authorization: Bearer`.
  - Detección: Basada estrictamente en el prefijo `sb_secret_`.
- **Sanitización de Errores (`sanitizeSupabaseError`)**:
  - Retorna únicamente `{ code, status }`.
  - Excluye campos `detail`, `headers`, `request body` y credenciales.

---

## 7. Inventario de Variables de Entorno en Vercel

- **Preview Environment**: 6 variables configuradas (`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEETS_TAB`, `GOOGLE_SHEETS_SPREADSHEET_ID`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`).
- **Production Environment**: `0` variables configuradas.
- **Development Environment**: `0` variables configuradas.
- **Valores Leídos / Descargados**: `NO` (`vercel env pull` no fue ejecutado).

---

## 8. Confirmación de Políticas de Control y Límites

- **Rotaciones / Modificaciones Remotas Ejecutadas**: `NO`
- **Producción modificada**: `NO`
- **Rama `main` modificada**: `NO`
- **PR #5 modificado**: `NO`
- **Supabase remoto modificado**: `NO`
- **Google Cloud IAM modificado en Fase 1B.1**: `NO`
- **Google Sheets modificado**: `NO`
- **Meta / WhatsApp modificado**: `NO`
- **Secretos impresos en reporte**: `NO`

---
*Informe de Auditoría de Seguridad de Fase 1B.1 generado por Security Engineer / Antigravity.*
