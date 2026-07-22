# Estado del Proyecto y Plan de Cierre · “El Umbral Vivo”

**Felipe & Camila · Matrimonio Viernes 23 de Octubre de 2026**
**Versión**: 1.4
**Fecha de Actualización**: 22 de Julio de 2026
**Repositorio**: `FelipeValgreen/felipe-camila-wedding`
**Rama activa**: `feature/unified-rsvp-v3-2026-07-21`
**SHA inicial de Fase 0**: `2a62e4f15da6ee6876831c2ef1ff4bbc230b3dfe`
**Pull Request activo**: [PR #6](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/6)
**Pull Request Release Candidate**: [PR #5](https://github.com/FelipeValgreen/felipe-camila-wedding/pull/5)
**Informe de Seguridad de Fase 1B.1**: [docs/SECURITY_STATUS.md](docs/SECURITY_STATUS.md)
**Producción intacta**: `https://felipeycami.cl/` (Sin modificar)

---

## 1. Declaración de Bloqueadores

### 1.1 Bloqueadores para la ejecución de Fase 1B.1 (Compatibilidad Supabase Keys)
- **Ninguno**. Se completó la implementación del soporte dual para `SUPABASE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, la sanitización de errores Supabase y la corrección del plan de rotación para Google SA.

### 1.2 Bloqueadores del Proyecto para el Lanzamiento a Producción
1. **Seguridad**: Confirmación de rotación de la `SUPABASE_SERVICE_ROLE_KEY` expuesta en el historial previo mediante `SUPABASE_SECRET_KEY`.
2. **Seguridad**: Confirmación de eliminación del cliente OAuth comprometido en Google Cloud Console.
3. **Seguridad**: Creación de nueva clave dedicada y posterior revocación de claves redundantes en GCP IAM.
4. **Google Sheets**: Verificación y restricción del acceso general "Cualquiera con el enlace" en Google Drive por parte del propietario.
5. **Infraestructura**: Verificación y re-adición limpia de variables en Vercel Preview tras la rotación formal de credenciales.
6. **E2E**: Prueba E2E real Web → Supabase → Google Sheets en ambiente Preview previa al release.
7. **Google Sheets**: Reparación de zona horaria (cambio a `America/Santiago`), corrección de fórmulas `#REF!`, parametrización y estructura operacional.
8. **QA**: Verificación funcional y visual en matriz de navegadores y dispositivos reales.

---

## 2. Verificación de Git, PR #6 y Mergeabilidad

### 2.1 Comando de Verificación Ejecutado
```bash
git fetch origin
git rev-parse origin/release/final-wedding-rc-2026-07-21
git rev-parse origin/feature/unified-rsvp-v3-2026-07-21
gh pr view 6 --repo FelipeValgreen/felipe-camila-wedding --json baseRefName,baseRefOid,headRefName,headRefOid,state,mergeable,mergeStateStatus
```

### 2.2 Metadatos Reales de Git y PR #6
- **Base real (`origin/release/final-wedding-rc-2026-07-21`)**: `724f8561be87e4c61cdfbdcdc4fe646796672b7c`
- **PR #6 BaseRefName**: `release/final-wedding-rc-2026-07-21` (`724f8561be87e4c61cdfbdcdc4fe646796672b7c`)
- **PR #6 HeadRefName**: `feature/unified-rsvp-v3-2026-07-21`
- **PR #6 State**: `OPEN`
- **PR #6 Mergeable Status**: `MERGEABLE`
- **PR #6 MergeStateStatus**: `CLEAN`
- **Simulación Local (`git merge-tree`)**: `0` marcadores de conflicto (`PR6_LOCAL_MERGE_SIMULATION=PASS`).
- **Candidatos Obsoletos Identificados**: PR #2, PR #3, PR #4 (Sin cerrar ni modificar en esta fase).

---

## 3. Infraestructura y Despliegues en Vercel

### 3.1 Historial de Despliegues Registrados
- **Deployment de Referencia**:
  - **Proyecto Vercel**: `felipeycamila`
  - **Scope Vercel**: `filipovalverde-5673s-projects`
  - **Estado**: `Ready` (HTTP 200 verificado en `/api/public-config`)

### 3.2 Estado del Ambiente Vercel Preview
- **Estado General**: `DESPLEGADO — ROTACIÓN DE CREDENCIALES Y E2E PENDIENTES`
- **Variables de Entorno en Preview**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - `GOOGLE_SHEETS_TAB`
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- **Variables en Ambiente Production**: `0` (Ambiente de Producción limpio e intacto).

---

## 4. Estado Actual vs. Estado Objetivo por Componente

| Componente | Estado Formal | Estado Actual (Baseline) | Estado Objetivo |
| :--- | :--- | :--- | :--- |
| **Experiencia Editorial** | `CÓDIGO RELEASE CANDIDATE — QA VISUAL PENDIENTE` | Integrado en PR #5 / PR #6 con assets locales. | Auditado en dispositivos reales sin regresiones CLS/LCP. |
| **RSVP Web API** | `CÓDIGO COMPLETO — E2E REAL PENDIENTE` | Endpoint `/api/rsvp` con soporte dual `SUPABASE_SECRET_KEY`. | Validado mediante prueba E2E de ciclo completo con reintentos. |
| **Supabase DB** | `PARCIAL` | Esquema funcional; 0 registros ficticios (`COUNT = 0`). | Migración aplicada con `search_path` corregido e índice en `rsvp_events`. |
| **Google Sheets** | `PARCIAL / REQUIERE REPARACIÓN` | Hoja vinculada; reintentos persistentes y backoff pendientes. | Timezone `America/Santiago`, 0 `#REF!`, estructura normalizada. |
| **Vercel Preview** | `DESPLEGADO — ROTACIÓN DE CREDENCIALES Y E2E PENDIENTES` | 6 variables en Preview; deployment `Ready`. | Variables re-añadidas limpiamente tras la rotación final de secretos. |
| **Seguridad** | `BLOQUEADO` | Secretos expuestos en transcripciones pasadas; Fase 1B.1 lista. | Rotación de Service Role y revocación OAuth confirmadas por humano. |
| **WhatsApp Meta** | `CÓDIGO BASE PREPARADO — CONEXIÓN NO AUTORIZADA` | Máquina de estados lista; sin webhook activo. | Documentado en `docs/WHATSAPP_RUNBOOK.md` sin conectar a Meta. |
| **Producción (`felipeycami.cl`)** | `NO MODIFICADA` | Sitio en vivo intacto; sin variables producidas. | Despliegue a producción solo con autorización humana explícita. |

---

## 5. Auditoría de Google Sheets (Estado Actual vs. Objetivo)

### 5.1 Estado Actual Registrado
- **Spreadsheet ID**: `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`
- **Zona Horaria Actual**: `America/Los_Angeles`
- **Cuenta de Servicio Integrada**: `matrimonio-rsvp-sheets@claude-498820.iam.gserviceaccount.com` (Rol: Editor).
- **Pestañas Actuales en la Hoja**:
  1. `BD_MAESTRA_INVITADOS`
  2. `PRESUPUESTO_IGLESIA`
  3. `CIVIL_GASTO`
  4. `RSVP_WEB_IGLESIA`
  5. `LOGISTICA_STAFF`
  6. `DASHBOARD_Matri`
  7. `PARAMETROS`
  8. `SEATING_PLAN`
  9. `TIMELINE`
  10. `LISTAS_VALIDACION`
  11. `README_AUDITORIA`
  12. `CONFIRMACIONES_RSVP_TEST`
- **Fila de Prueba `test_uuid_12345`**: `UNVERIFIED` (Sin modificaciones a la hoja de cálculo).

### 5.2 Estado Objetivo (Fase 8)
- **Zona Horaria**: `America/Santiago`
- **Estructura Objetivo**: Futuras pestañas `MESAS`, `ASIGNACIONES_MESA`, y `CONFIRMACIONES_RSVP` de producción.
- **Calidad de Datos**: Cero errores `#REF!`, `#VALUE!`, o `#N/A`.

---

## 6. Estado de Datos en Supabase (Solo Lectura)

- **Proyecto Supabase**: `fyc` (Ref: `mwumnywbvjxekskfrlms`)
- **Consulta Ejecutada**: `GET /rest/v1/rsvp_responses?select=id` con header `Prefer: count=exact`.
- **Recuento Exacto de Registros**: `SUPABASE_RSVP_RESPONSES_COUNT = 0` (`CONTENT_RANGE: */0`).
- **Privacidad**: Cero PII expuesta o almacenada.

---

## 7. Registro de Seguridad y Credenciales

- Ver informe completo detallado en [docs/SECURITY_STATUS.md](docs/SECURITY_STATUS.md).
- **Google Service Account Keys**: 7 claves activas registradas en GCP IAM. Plan de rotación corregido para generar clave dedicada antes de purga.
- **Auditoría de Archivos Temporales y Secretos**:
  - Secretos completos impresos: `NO`
  - Limpieza local de temporales: Confirmada.

---

## 8. Datos Canónicos del Evento

- **Pareja**: Felipe & Camila
- **Fecha del Matrimonio**: Viernes 23 de Octubre de 2026
- **Zona Horaria Canónica**: `America/Santiago`
- **Ceremonia**: Santuario de la Divina Misericordia (Llegada recomendada: 17:25 | Inicio ceremonia: 17:50)
- **Celebración**: Centro de Eventos Arboleda, Chicureo (Cóctel: 18:30 | Cena: 21:00)
- **Dress Code**: Formal / Black Tie
- **Lista de Regalos**: Paris (Código `21030724`)
- **Decisiones Humanas Pendientes**: Direcciones exactas finales para Google Maps/Waze, fecha límite de RSVP (deadline), número oficial de WhatsApp para asistencia.

---

## 9. Backlog Completo Priorizado (P0 — P3)

| ID | Descripción | Prioridad | Estado | Dependencia | Agente Responsable | Criterio de Aceptación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0-01** | Confirmar rotación de Service Role Key expuesta | P0 | BLOQUEADO | Decisión Humana | Security Engineer | Clave previa rechazada por Supabase API. |
| **P0-02** | Confirmar eliminación de cliente OAuth expuesto en GCP | P0 | BLOQUEADO | Decisión Humana | Security Engineer | Cliente OAuth inexistente en GCP Console. |
| **P0-03** | Revocar claves de Service Account Google redundantes | P0 | PENDIENTE | GCP Access | Security Engineer | Máximo 1 clave activa por Service Account. |
| **P0-04** | Verificación/restricción de acceso a Google Sheet en Drive | P0 | PENDIENTE | Drive Owner | Security Engineer | Acceso general por enlace desactivado. |
| **P0-05** | Corregir ID duplicado HTML (`rsvp-support-wa`) | P0 | PENDIENTE | Código | UX / Frontend Lead | 0 IDs duplicados validados por HTML linter. |
| **P0-06** | Soporte para `SUPABASE_SECRET_KEY` con fallback legacy | P0 | COMPLETO | Ninguna | Backend Engineer | Pruebas pasan con ambas variables. |
| **P0-07** | Corregir `search_path` en función `update_updated_at_column()` | P0 | PENDIENTE | Migración SQL | Supabase Architect | Alerta resuelta en linter Supabase. |
| **P0-08** | Crear índice explícito `idx_rsvp_events_rsvp_id` | P0 | PENDIENTE | Migración SQL | Supabase Architect | Alerta de índice resuelta en linter. |
| **P0-09** | Limpiar registros de prueba ficticios en Supabase y Sheets | P0 | PARCIAL | P0-11 | QA Lead | Supabase COUNT 0 confirmado; Sheets `test_uuid_12345` UNVERIFIED. |
| **P0-10** | Configurar y verificar variables únicamente en Preview | P0 | PARCIAL | P0-01/03 | DevOps Engineer | 6 variables en Preview, 0 en Production. |
| **P0-11** | Prueba E2E Create | P0 | PENDIENTE | Preview | QA Lead | HTTP 200, 1 fila Supabase, 1 fila Sheets. |
| **P0-12** | Prueba E2E Read (Token válido e inválido) | P0 | PENDIENTE | P0-11 | QA Lead | Token válido muestra RSVP sin hash, token inválido 401. |
| **P0-13** | Prueba E2E Update (Misma fila en Supabase y Sheets) | P0 | PENDIENTE | P0-12 | QA Lead | Misma fila actualizada, `first_response_at` intacto, 0 duplicados. |
| **P0-14** | Centralizar configuración canónica en `config/event.js` | P0 | PENDIENTE | Código | Frontend Engineer | Cero datos hardcodeados en UI o plantillas. |
| **P0-15** | Corregir zona horaria Google Sheets a `America/Santiago` | P0 | PENDIENTE | Sheets API | Sheets/Data Engineer | Metadatos de Sheet muestran `America/Santiago`. |
| **P0-16** | Reparar fórmulas `#REF!` en Google Sheets | P0 | PENDIENTE | Sheets API | Sheets/Data Engineer | 0 errores `#REF!`, `#VALUE!`, `#N/A`. |
| **P0-17** | Consolidar fuente única de invitados (F&C Centro Comandos) | P0 | PENDIENTE | Sheets Admin | Sheets/Data Engineer | Un solo libro de trabajo operacional activo. |
| **P1-01** | Auditoría y optimización de las 21 fotografías curadas | P1 | PENDIENTE | Código | Photo Curator | `docs/PHOTO_AUDIT.md` completo con responsive tags. |
| **P1-02** | Configurar atributos `objectPosition`, `width`, `height` en imágenes | P1 | PENDIENTE | P1-01 | Photo Curator / Frontend | Cero CLS por carga diferida de imágenes. |
| **P1-03** | Implementar reintentos persistentes y backoff en Google Sheets | P1 | PENDIENTE | Código | Backend Engineer | Manejo de colas y reintentos ante fallos HTTP 429/500. |
| **P1-04** | Implementar Rate Limiting persistente en servidor | P1 | PENDIENTE | Código | Backend Engineer | Máximo 5 crea / 10 edita por ventana de tiempo. |
| **P1-05** | Establecer taxonomía estricta de imágenes | P1 | PENDIENTE | P1-01 | Photo Curator | Categorías asignadas sin inferencias ambiguas. |
| **P1-06** | Auditoría y cierre formal de PRs obsoletos (#2, #3, #4) | P1 | PENDIENTE | GitHub | DevOps Engineer | `docs/BRANCH_STRATEGY.md` creado, PRs evaluados. |
| **P1-07** | Construir vistas operacionales de Seating Plan y Timeline | P1 | PENDIENTE | Sheets | Sheets/Data Engineer | Pestañas de mesas y programa listas. |
| **P1-08** | Auditoría de Accesibilidad (WCAG 2.1 AA) | P1 | PENDIENTE | Frontend | UX/Accessibility Lead | Atrapado de foco en lightbox, navegable por teclado. |
| **P1-09** | Matriz de Pruebas de QA en dispositivos físicos | P1 | PENDIENTE | QA | QA Lead | `docs/QA_MATRIX.md` verificado en iOS y Android. |
| **P1-10** | Establecer respaldos y política de retención de datos | P1 | PENDIENTE | Documentos | Supabase Architect | `docs/DATA_RETENTION.md` redactado. |
| **P2-01** | Definición de número oficial de WhatsApp para soporte | P2 | Decisión Humana | Product Lead | Variable `WEDDING_WHATSAPP_NUMBER` aprobada. |
| **P2-02** | Elaborar Runbook técnico de integración WhatsApp Meta | P2 | PENDIENTE | Documentos | WhatsApp Specialist | `docs/WHATSAPP_RUNBOOK.md` creado. |
| **P2-03** | Máquina de estados para reconfirmaciones por WhatsApp | P2 | PENDIENTE | P2-02 | WhatsApp Specialist | Manejo idempotente de mensajes sin Meta activo. |
| **P3-01** | Optimización de bundle CSS y eliminación de dependencias | P3 | PENDIENTE | Frontend | Frontend Engineer | Reducción de bytes sin afectación visual. |
| **P3-02** | Configuración de headers de seguridad CSP | P3 | PENDIENTE | Vercel | Security Engineer | Content-Security-Policy probado en Preview. |
| **P3-03** | Elaboración de Runbooks de Release y Rollback | P3 | PENDIENTE | Documentos | DevOps Engineer | `docs/RELEASE_RUNBOOK.md` redactado. |

---

## 10. Confirmación de Modificaciones Remotas y Políticas de Control

- **Producción modificada**: `NO`
- **Rama `main` modificada**: `NO`
- **PR #5 modificado**: `NO`
- **Supabase remoto modificado**: `NO`
- **Google Sheets modificado**: `NO`
- **Google Cloud IAM modificado en Fase 1B.1**: `NO`
- **Meta / WhatsApp modificado**: `NO`
- **Secretos impresos en consola/logs**: `NO`

---
*Documento de Baseline v1.4 actualizado bajo el protocolo de ejecución estricto de Antigravity.*
