# Informe de Auditoría de Seguridad y Plan de Rotación de Credenciales

**Felipe & Camila · “El Umbral Vivo”**
**Versión**: 1.2 (Fase 1B.1 — Corrección Final de Compatibilidad y Mitigación de Inyección)
**Fecha**: 22 de Julio de 2026
**Repositorio**: `FelipeValgreen/felipe-camila-wedding`
**Rama**: `feature/unified-rsvp-v3-2026-07-21`
**PR Asociado**: [#6](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/6)
**SHA Autoritativo de Inicio**: `d35ab797bf655b2ead59bcddcb9e2ede1fa0def9`

---

## 1. Resumen Ejecutivo

Este documento registra la finalización del código de compatibilidad de claves de servidor Supabase (`SUPABASE_SECRET_KEY`), la actualización del gate de autenticación en `/api/rsvp.js`, el endurecimiento estricto de `buildSupabaseHeaders` contra inyección/sobrescritura de headers de autenticación, y el registro preciso del estado de preparación pre-rotación remota.

---

## 2. Registro de Incidentes Históricos y Estado de Credenciales

1. **Google OAuth Client Secret** (`GOCSPX-...`): Expuesto en transcripciones pasadas. `PENDIENTE DE ELIMINACIÓN MANUAL EN GCP CONSOLE`.
2. **Supabase PAT** (`sbp_de...`): `REVOCADO`.
3. **Supabase Service Role Key** (`service_role` JWT): `CÓDIGO COMPLETO / FALLBACK LEGACY ACTIVO` (Soporte dual en backend y gate en `/api/rsvp.js` completamente integrados).
4. **Google Service Account Keys**: `AUDITORÍA Y PLAN CORREGIDO` (7 claves activas registradas en GCP IAM; clave actualmente usada en Vercel Preview `UNVERIFIED`).

---

## 3. Estado Detallado por Credencial

| Credencial / Secreto | Entorno Usado | Ubicación en Código / Infra | Estado Actual | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPABASE_URL`** | Preview / Prod | `js/supabase-client.js`, `api/_lib/supabase-admin.js` | `ACTIVO / PÚBLICO` | No requiere rotación (URL pública). |
| **`SUPABASE_ANON_KEY` / Publishable** | Frontend Client | `js/supabase-client.js` | `ACTIVO / PÚBLICO` | No requiere rotación. Uso adecuado en cliente. |
| **`SUPABASE_SECRET_KEY`** | Serverless API | `.env.example`, `api/_lib/supabase-admin.js`, `api/rsvp.js` | `CÓDIGO COMPLETO` | Configurar en Vercel Preview en Fase 1B.2. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Serverless API | `api/_lib/supabase-admin.js`, Vercel Preview | `EXPUESTO / FALLBACK` | Mantener como fallback legacy hasta verificar `SUPABASE_SECRET_KEY`. |
| **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** | Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO` | Identificador público de Service Account. |
| **`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`**| Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO / UNVERIFIED` | Generar nueva clave dedicada en Fase 1B.2 antes de purga. |
| **Google OAuth Client Secret** | GCP Console | No usado en PR #6 backend | `EXPUESTO / PENDIENTE` | Eliminar cliente OAuth antiguo en GCP Console. |
| **`WHATSAPP_ACCESS_TOKEN`** | Ninguno | `api/_lib/whatsapp-client.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |
| **`META_APP_SECRET`** | Ninguno | `api/whatsapp/webhook.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |

---

## 4. Endurecimiento de Seguridad en Código (Backend Serverless)

### 4.1 Gate de Autenticación en `/api/rsvp.js`
- **Integración de `getSupabaseServerKey`**: El handler `/api/rsvp.js` valida la presencia de `process.env.SUPABASE_URL` y `getSupabaseServerKey()`.
- **Compatibilidad Dual**: El endpoint responde `200` (o continua procesamiento) tanto con `SUPABASE_SECRET_KEY` como con `SUPABASE_SERVICE_ROLE_KEY`. Si ambas faltan, responde `503 RSVP_NOT_CONFIGURED`.
- **Inexistencia de Gates Exclusivos**: Cero ocurrencias residuales de comprobaciones exclusivas por `SUPABASE_SERVICE_ROLE_KEY` en la API.

### 4.2 Mitigación de Inyección de Headers en `buildSupabaseHeaders`
- **Protección Estricta**: La función `buildSupabaseHeaders(key, options)` elimina explícitamente cualquier intento de inyección en `options.headers` para `apikey`, `Authorization` y `authorization` (minúscula).
- **Control de Formato**:
  - Claves modernas `sb_secret_`: Se envían en `apikey`. **Nunca** en `Authorization: Bearer`.
  - Claves legacy `service_role`: Se envían en `apikey` y `Authorization: Bearer`.
- **Preservación Legítima**: Headers personalizados adicionales (ej. `X-Custom-Header`) y opciones de `Prefer` (vía `options.prefer`) se conservan sin alteración.

### 4.3 Sanitización de Errores Supabase
- **`sanitizeSupabaseError(error)`**: Helper disponible que abstrae y retorna únicamente `{ code, status }`.
- **Respuesta Pública Genérica**: `/api/rsvp.js` responde `{ ok: false, error: "SERVER_ERROR" }` en captura de excepciones sin exponer `err.detail`, payloads, headers ni credenciales al cliente.

---

## 5. Metadata de Claves de Cuenta de Servicio Google

- **Claves User-Managed Activas**: `7` claves registradas en GCP IAM.
- **Sufijos de KEY_ID**: `d95f0a`, `5ab757`, `034151`, `75e1e4`, `2e23a5`, `82bfe0`, `ae8e40`.
- **Clave actualmente utilizada en Vercel Preview**: `UNVERIFIED`.
- **Eliminación de claves**: `NO AUTORIZADA` en esta fase.

---

## 6. Confirmación de Políticas de Control y Límites

- **Rotaciones / Modificaciones Remotas Ejecutadas**: `NO`
- **Producción modificada**: `NO`
- **Rama `main` modificada**: `NO`
- **PR #5 modificado**: `NO`
- **Supabase remoto modificado**: `NO`
- **Google Cloud IAM modificado**: `NO`
- **Google Sheets modificado**: `NO`
- **Meta / WhatsApp modificado**: `NO`
- **Secretos impresos en reporte**: `NO`

---
*Informe de Auditoría de Seguridad v1.2 generado por Security Engineer / Antigravity.*
