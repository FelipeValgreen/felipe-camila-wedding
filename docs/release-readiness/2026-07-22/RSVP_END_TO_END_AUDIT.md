# RSVP End-to-End Audit — 2026-07-22

Security and integration audit of the RSVP submission flow on the live website.

---

## 1. Flow Breakdown and Results

1. **Ingreso del código:** El invitado ingresa su código (ej. `FAM2026`).
2. **Consulta a base de datos:** El cliente llama a `getGuestByCode(code)`, el cual consulta `/rest/v1/guest_list` en Supabase.
3. **Fallo de consulta (404):** Debido a que la tabla `guest_list` **no existe** en la base de datos de producción, la consulta falla y retorna 404.
4. **Fallback local:** Al fallar la base de datos, el cliente recurre a un diccionario local hardcodeado en `js/main.js` (`GUEST_CODES_FALLBACK`). 
   - Códigos permitidos locales: `FAM2026`, `AMI2026`, `VIP2026`, `COLE2026`.
   - Códigos de invitados reales: **Rechazados por completo** (retornan error de código no válido).
5. **Formulario de confirmación:** El invitado ve el número de pases pre-cargados (del fallback local) y puede seleccionar si asiste, sus restricciones alimentarias y su número de WhatsApp.
6. **Guardado en Supabase:** Al enviar el formulario, se invoca `window.saveRSVP(rsvpData)`.
   - **Fallo Catastrófico 1 (400 Bad Request):** El objeto enviado contiene las propiedades `dietary_restrictions` y `partner_dietary`, pero la tabla `rsvp_guests` en producción no tiene estas columnas.
   - **Fallo Catastrófico 2 (401 Unauthorized):** Incluso sin esas columnas, no hay políticas de seguridad RLS en Supabase que permitan inserciones públicas anónimas. El servidor rechaza la consulta con un error de violación de RLS.
7. **Notificación por Web3Forms:** Se envía un correo electrónico en paralelo a `camilayfelipe.v@gmail.com` usando la API gratuita de Web3Forms. (Esto funciona si la clave de acceso de Web3Forms es válida).
8. **Swallow de errores (Promise.allSettled):** El frontend utiliza `Promise.allSettled` para envolver la promesa del mail y del guardado en Supabase. Esto significa que **ignora si Supabase falló**. El cliente ve confeti y pasa a la pantalla de éxito.
9. **Redirección a WhatsApp:** Se abre automáticamente WhatsApp con un mensaje pre-formateado redirigiendo al número de teléfono placeholder `56912345678`.

---

## 2. Audit Conclusions

```text
RSVP SAVES IN SUPABASE: NO (Blocks on 400 missing columns and 401 RLS policy)
RSVP SYNCS TO GOOGLE SHEETS: NO (No sync logic in frontend, and DB writes fail)
WHATSAPP OPENS AFTER PERSISTENCE: NO (Opens instead of persistence, ignoring DB failures)
RSVP READY FOR REAL INVITATIONS: NO
```

---

## 3. Detailed Risks Identified

- **Pérdida de datos total en la base de datos:** Ningún registro de confirmación queda guardado en Supabase.
- **Dependencia exclusiva del mensaje de WhatsApp:** Si el invitado cierra la pestaña de WhatsApp sin enviar el mensaje pre-cargado, su confirmación se pierde por completo (salvo por el respaldo del correo Web3Forms).
- **Falta de escalabilidad por códigos locales:** Solo 4 códigos demo hardcodeados funcionan. Ninguno de los invitados reales podrá acceder al formulario.
