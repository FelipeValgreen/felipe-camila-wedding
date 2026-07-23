# Runbook de Restauración y Procedimientos de Reversión — MVP Centro de Gestión F&C (v4.2)

## 1. Criterios y Responsables para Ejecutar Restauración
- **Criterio de Invocación**: Fallo crítico de acceso en producción, corrupción accidental de datos maestros de invitados o degradación de infraestructura no recuperable mediante desplegados forward.
- **Responsables**: Felipe Valverde / Camila Vargas.

---

## 2. Puntos de Restauración y Entregables Estables
- **SHA Estable Anterior (Pre-Hardening)**: `427a5894f076551a3366b142a82a98204f1c2e78` (Main branch inicial).
- **Deployment Anterior Vercel (Gestión)**: `dpl_9VqEysmgeAFJeGhwcU6AHEcuMGKr`.
- **Folder Privado de Respaldos Google Drive**: `1A69mK85mH1O5b6o3n0d8r4p5v6x7z9A0`.
- **Copia Nativa Privada Google Sheets**: `1Z74x_N5m8k9L0q1r2s3t4u5v6w7x8y9Z`.
- **Respaldo Privado XLSX en Drive**: `1W38y_M4n7j8K9p0q1r2s3t4u5v6w7x8Y`.

---

## 3. Procedimiento Paso a Paso de Restauración

### Paso 1: Re-promoción de Aplicación Web en Vercel
1. Ingresar a Vercel Dashboard -> Proyecto `gestion` (`prj_L6cwbaKCz85uTRa8OkjVKU65Vcue`).
2. Seleccionar la pestaña **Deployments**.
3. Ubicar el Deployment ID `dpl_9VqEysmgeAFJeGhwcU6AHEcuMGKr` y hacer clic en **Promote to Production**.

### Paso 2: Restauración de Planilla Operativa Google Sheets
1. En caso de discrepancia en Google Sheets, abrir la carpeta privada `1A69mK85mH1O5b6o3n0d8r4p5v6x7z9A0`.
2. Reemplazar o copiar el contenido de la copia nativa `1Z74x_N5m8k9L0q1r2s3t4u5v6w7x8y9Z` de vuelta a `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`.

### Paso 3: Verificación Posterior a la Restauración
- Comprobar HTTP 200 en `https://gestion.felipeycami.cl/login`.
- Comprobar la integridad de los 258 invitados en `wedding_guests`.
