# Executive Go/No-Go Decision — 2026-07-22

Recommendation on the readiness of the wedding invitation platform for tomorrow's send-out.

---

```text
RECOMMENDATION: NO-GO
```

---

## 1. Justificación Operativa

El estado actual del despliegue en producción (`https://felipeycami.cl`) **no es apto** para ser enviado a los invitados reales debido a fallos estructurales graves e insalvables en el backend de Supabase:

1. **RSVP Inoperativo para Invitados Reales:** La tabla `guest_list` no existe en la base de datos de producción (404). El sistema rechaza cualquier código de validación, imposibilitando que un invitado real acceda al formulario.
2. **Pérdida de Datos en Base de Datos:** La tabla `rsvp_guests` carece de la columna `dietary_restrictions`, lo que provoca que todas las inserciones del formulario RSVP fallen con un error 400. Adicionalmente, las políticas RLS bloquean la escritura pública (401). Ninguna confirmación queda registrada en base de datos.
3. **Redirección de WhatsApp a un Placeholder:** Al completar el RSVP, el sistema abre WhatsApp apuntando al número de prueba `56912345678`. Los invitados intentarán enviar su confirmación a un número inexistente.

---

## 2. Recomendación Operativa

Proponemos la aplicación de un **Hotfix Mínimo y Seguro** en el frontend (sin alterar base de datos, políticas ni estructura del servidor) que permita realizar el envío de la invitación con garantías mañana utilizando un **Vercel Preview**:

*   **Estrategia del Hotfix:**
    1.  **Bypass del validador de códigos:** Si la base de datos no encuentra el código (404/Error), en lugar de bloquear al invitado, se despliega el formulario RSVP permitiéndole ingresar sus datos manualmente.
    2.  **Redirección de WhatsApp y Web3Forms:** Se canalizan todas las confirmaciones mediante correo electrónico (Web3Forms, que sí funciona) y la redirección automática a WhatsApp (se debe configurar el número oficial en lugar de `56912345678`).
