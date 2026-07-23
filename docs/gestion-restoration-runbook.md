# Runbook de Restauración y Procedimientos de Reversión — MVP Centro de Gestión F&C (v4.2)

## 1. Criterios y Responsables para Ejecutar Restauración
- **Criterio de Invocación**: Fallo crítico de acceso en producción, corrupción accidental de datos maestros de invitados o degradación de infraestructura no recuperable mediante desplegados forward.
- **Responsables**: Felipe Valverde / Camila Vargas.

---

## 2. Puntos de Restauración y Entregables Estables
- **SHA Estable Anterior (Pre-Hardening)**: `427a5894f076551a3366b142a82a98204f1c2e78` (Main branch inicial).
- **Spreadsheet ID Operacional**: `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`.
- **Despliegue Productivo Anterior Vercel (Gestión)**: `https://gestion.felipeycami.cl/login`.
- **Despliegue Productivo Anterior Vercel (Público)**: `https://felipeycami.cl/`.
- **Exportación XLSX Local (Gitignored)**: `backups/FC_Centro_Comandos_Backup_Official.xlsx` (268 KB).

---

## 3. Procedimiento Paso a Paso de Restauración

### Paso 1: Re-promoción de Aplicación Web en Vercel
1. Ingresar a Vercel Dashboard -> Proyecto `gestion` (`prj_L6cwbaKCz85uTRa8OkjVKU65Vcue`).
2. Seleccionar la pestaña **Deployments**.
3. Promover el despliegue de producción anterior de ser necesario.

### Paso 2: Restauración de Planilla Operativa Google Sheets
1. Abrir la planilla maestra `1bbzTemOTWdE-QSy2L1u_B6Oc4s3j4o3oSOLBAdTl7F0`.
2. Restaurar el contenido desde las pestañas nativas de respaldo `BK_MAESTRA_OFFICIAL_...` creadas dentro del archivo oficial.

### Paso 3: Verificación Posterior a la Restauración
- Comprobar HTTP 200 en `https://gestion.felipeycami.cl/login`.
- Comprobar la integridad de los 258 invitados en `wedding_guests`.
