# Informe de Auditoría de Seguridad y Plan de Rotación de Credenciales

**Felipe & Camila · “El Umbral Vivo”**
**Versión**: 1.3 (Fase 1B.1 — Hardening Final de Headers Case-Insensitive)
**Fecha**: 22 de Julio de 2026
**Repositorio**: `FelipeValgreen/felipe-camila-wedding`
**Rama**: `feature/unified-rsvp-v3-2026-07-21`
**PR Asociado**: [#6](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/6)
**SHA Autoritativo de Inicio**: `138cf70655fe397bbdc94d60c57acc6e80d4e4a7`

---

## 1. Resumen Ejecutivo

Este documento registra la finalización del hardening de seguridad en la capa de comunicación de backend con Supabase (`api/_lib/supabase-admin.js`), incluyendo el filtrado estricto e insensible a mayúsculas/minúsculas (`case-insensitive`) de headers protegidos de autenticación (`apikey`, `authorization`, `content-type`, `prefer`), asegurando la imposibilidad de inyección o suplantación de credenciales.

---

## 2. Registro de Incidentes Históricos y Estado de Credenciales

1. **Google OAuth Client Secret** (`GOCSPX-...`): Expuesto en transcripciones pasadas. `PENDIENTE DE ELIMINACIÓN MANUAL EN GCP CONSOLE`.
2. **Supabase PAT** (`sbp_de...`): `REVOCADO`.
3. **Supabase Service Role Key** (`service_role` JWT): `CÓDIGO COMPLETO — CONFIGURACIÓN REMOTA PENDIENTE` (Soporte dual en backend y gate en `/api/rsvp.js` completamente integrados).
4. **Google Service Account Keys**: `AUDITORÍA Y PLAN CORREGIDO` (7 claves activas registradas en GCP IAM; clave actualmente usada en Vercel Preview `UNVERIFIED`).

---

## 3. Estado Detallado por Credencial

| Credencial / Secreto | Entorno Usado | Ubicación en Código / Infra | Estado Actual | Acción Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPABASE_URL`** | Preview / Prod | `js/supabase-client.js`, `api/_lib/supabase-admin.js` | `ACTIVO / PÚBLICO` | No requiere rotación (URL pública). |
| **`SUPABASE_ANON_KEY` / Publishable** | Frontend Client | `js/supabase-client.js` | `ACTIVO / PÚBLICO` | No requiere rotación. Uso adecuado en cliente. |
| **`SUPABASE_SECRET_KEY`** | Serverless API | `.env.example`, `api/_lib/supabase-admin.js`, `api/rsvp.js` | `CÓDIGO COMPLETO — CONFIGURACIÓN REMOTA PENDIENTE` | Configurar en Vercel Preview en Fase 1B.2. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Serverless API | `api/_lib/supabase-admin.js`, Vercel Preview | `EXPUESTO / FALLBACK` | Mantener como fallback legacy hasta verificar `SUPABASE_SECRET_KEY`. |
| **`GOOGLE_SERVICE_ACCOUNT_EMAIL`** | Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO` | Identificador público de Service Account. |
| **`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`**| Vercel Preview | `api/_lib/google-sheets.js` | `ACTIVO / UNVERIFIED` | Generar nueva clave dedicada en Fase 1B.2 antes de purga. |
| **Google OAuth Client Secret** | GCP Console | No usado en PR #6 backend | `EXPUESTO / PENDIENTE` | Eliminar cliente OAuth antiguo en GCP Console. |
| **`WHATSAPP_ACCESS_TOKEN`** | Ninguno | `api/_lib/whatsapp-client.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |
| **`META_APP_SECRET`** | Ninguno | `api/whatsapp/webhook.js` | `NO CONFIGURADO` | No conectar a Meta sin autorización humana. |

---

## 4. Endurecimiento de Seguridad en Código (Protected Headers Case-Insensitive)

### 4.1 Normalización y Filtrado de Headers en `buildSupabaseHeaders`
- **Set de Headers Protegidos (`PROTECTED_SUPABASE_HEADERS`)**:
  - `apikey`, `authorization`, `content-type`, `prefer`.
- **Filtrado Case-Insensitive**:
  - Todo header proveniente de `options.headers` se evalúa convirtiendo su nombre a minúsculas (`name.toLowerCase()`).
  - Un caller **no puede** introducir ni sustituir variaciones como `APIKEY`, `ApiKey`, `AUTHORIZATION`, `AuthoriZation`, `CONTENT-TYPE`, `content-type`, `PREFER`, o `prefer`.
- **Garantías de Autenticación**:
  - Para `sb_secret_`: Se genera exactamente un header `apikey`. Cero headers `authorization` bajo cualquier formato.
  - Para `legacy`: Se genera exactamente un header `apikey` y exactamente un header `Authorization: Bearer <key>`.
- **Headers Legítimos Conservados**: Los headers personalizados no protegidos (ej. `X-Custom-Header`) se transfieren limpiamente.

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
*Informe de Auditoría de Seguridad v1.3 generado por Security Engineer / Antigravity.*
