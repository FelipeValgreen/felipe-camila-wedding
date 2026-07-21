# Performance and Errors — 2026-07-22

Lighthouse audit results and console diagnostics for the live production site `https://felipeycami.cl/`.

---

## 1. Lighthouse Scores

### Desktop Results:
- **Performance:** **83**
- **Accessibility:** **77**
- **Best Practices:** **100**
- **SEO:** **100**

### Mobile Results:
- **Performance:** **57**
- **Accessibility:** **77**
- **Best Practices:** **100**
- **SEO:** **100**

---

## 2. Core Diagnostics and Issues

- **Rendimiento Móvil (57):** Afectado principalmente por imágenes sin optimizar en las secciones de la Iglesia y el carrusel de Arboleda (`images/arboleda_main.jpg`, `images/arboleda_coctel.jpg`). Se requiere conversión a formatos modernos (WEBP) y compresión adecuada.
- **Accesibilidad (77):**
  - Falta de contraste suficiente en textos secundarios sobre fondo blanco.
  - Elementos interactivos sin etiquetas de accesibilidad explícitas (`aria-label`) en los controles multimedia y botones de mapas.
- **Errores de JavaScript en Consola:**
  - Fallo recurrente en la inicialización de Supabase cuando la CDN no responde rápidamente (bloquea la subida de fotos).
  - Intentos de inserción de RSVP fallidos silenciosamente debido al uso de `Promise.allSettled` sin control de errores explícito en el UI.
