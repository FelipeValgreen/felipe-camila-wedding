# RSVP End-to-End Audit — 2026-07-22

Security and integration audit of the RSVP submission flow on the release branch.

---

## 1. Flow Breakdown and Results

1. **Bypass de Códigos:** No hay validación de códigos de invitación. El formulario es visible inmediatamente.
2. **Formulario Individual:** El invitado ingresa sus datos directamente (Nombre, Apellido, WhatsApp de Contacto, Selección de asistencia, y Restricción Alimentaria).
3. **Validación de Alergias:** Si selecciona `Alergias`, el campo de texto de detalles se vuelve obligatorio (`required`). Si intenta enviar vacío o con el valor genérico "alergias", se bloquea el envío y se le notifica mediante una alerta.
4. **Preparación de Respuesta:** Al presionar "Preparar respuesta", se desactiva el formulario y se despliega la pantalla intermedia de preparación de confirmación.
5. **No hay escrituras automáticas:** Se desactivó el guardado en Supabase y el envío a Web3Forms.
6. **No hay redirecciones automáticas:** Se eliminó el uso de `window.open` al procesar el envío para prevenir bloqueos de ventanas emergentes.
7. **Acciones de Usuario:**
   - **Enviar confirmación por WhatsApp:** Abre de forma manual la app o web de WhatsApp de destino (`56981393436`) con el texto codificado.
   - **Copiar Mensaje:** Copia el texto formateado al portapapeles con fallback para compatibilidad universal.
   - **Editar Respuesta:** Vuelve a habilitar el formulario para correcciones.

---

## 2. Audit Conclusions

```text
RSVP SAVES IN SUPABASE: NO (Bypassed by design for hotfix launch)
RSVP SYNCS TO GOOGLE SHEETS: NO (Not integrated)
WHATSAPP OPENS AFTER PERSISTENCE: NO (Bypassed, user clicks manually to send)
RSVP READY FOR REAL INVITATIONS: YES (Conditional on Vercel Preview release)
```
