# Executive Go/No-Go Decision — 2026-07-22

Recommendation on the readiness of the wedding invitation platform for tomorrow's send-out.

---

```text
RECOMMENDATION: CONDITIONAL GO
```

---

## 1. Justificación Operativa

El estado actual del despliegue en producción (`https://felipeycami.cl`) **no es apto** para ser enviado a los invitados debido a fallos estructurales en el backend de Supabase:

1. **Inexistencia de `guest_list` (404):** Impide que invitados reales puedan validar códigos.
2. **Incompatibilidad en `rsvp_guests` (400/401):** La tabla carece de las columnas de restricciones alimentarias requeridas por el frontend, y el RLS bloquea escrituras públicas.
3. **WhatsApp de prueba:** El enlace final de WhatsApp apunta al número de prueba `56912345678`.

---

## 2. Recomendación Operativa (Hotfix Directo)

Para garantizar un envío seguro mañana, implementamos una solución minimalista y 100% cliente en la rama `release/safe-rsvp-whatsapp-2026-07-22`:

*   **Flujo del RSVP Seguro:**
    *   Se eliminó por completo el paso de códigos de invitación y referencias a pases/acompañantes de la experiencia pública.
    *   El formulario de RSVP ahora es **individual y directo**. Solicita: Nombre, Apellido, WhatsApp de contacto, Selección de asistencia y restricción alimentaria.
    *   **Bypass de Base de Datos y Web3Forms:** No se realizan llamadas a Supabase ni Web3Forms.
    *   **Confirmación transparente:** Al presionar "Preparar respuesta", se presenta una pantalla intermedia con el resumen del RSVP y dos botones claros: **"Enviar confirmación por WhatsApp"** (redirige al WhatsApp oficial `56981393436` con el texto codificado) y **"Copiar Mensaje"** (con fallback robusto). Esto evita popups automáticos molestos y le aclara al invitado que el proceso finaliza al enviar el mensaje de chat.
