# Live Visual Audit — 2026-07-22

Visual analysis of the live deployment at `https://felipeycami.cl/` across viewports.

---

## 1. Section Visual Assessment

| Sección | Qué se ve | Problema | Gravedad | Bloquea envío | Corrección |
|---|---|---|---|---|---|
| **Apertura del sobre** | Sobre lacrado interactivo (`#envelope-overlay`). | Ninguno. Al hacer clic se desvanece correctamente y activa el audio. | Leve | No | N/A |
| **Portada / Hero** | Editorial blanca con nombres, insignia "Por la iglesia" y cuenta regresiva. | Ninguno. Tipografía serif elegante y espaciado consistente. | Leve | No | N/A |
| **Cuenta regresiva** | Temporizador dinámico con Días, Horas, Minutos, Segundos. | Ninguno. Los contadores calculan y se actualizan dinámicamente en tiempo real. | Leve | No | N/A |
| **Nuestra Historia** | Carrusel horizontal con 3 fotos e hitos cronológicos. | Ninguno. Navegación fluida y óptima visualización de fotos. | Leve | No | N/A |
| **Ceremonia Religiosa** | Tarjeta de información del Santuario de la Divina Misericordia (17:50 Hrs). | Ninguno. Contiene enlaces directos a Google Maps y Waze. | Leve | No | N/A |
| **Gala (Arboleda)** | Información del Centro de Eventos Arboleda con fotos y Waze. | Ninguno. La foto incorrecta de la iglesia fue eliminada de la sección en `main`. | Leve | No | N/A |
| **Dress Code** | Sección "Black Tie / Etiqueta". | Ninguno. Contraste óptimo y tipografía legible. | Leve | No | N/A |
| **RSVP** | Formulario interactivo por código y datos personales. | **Crítico backend silencioso.** El formulario aparenta éxito pero falla silenciosamente. | **Crítica (P0)** | **Sí** | Requiere habilitar inserción anónima (RLS) y crear las columnas correspondientes en la base. |
| **Lista de Novios** | Sección con enlace a Novios Paris (Código `21030724`). | Ninguno. El enlace redirige correctamente al catálogo oficial. | Leve | No | N/A |
| **Galería / Paparazzi** | Mosaico de fotos y botón para subir archivos. | **Error RLS de Storage.** La subida falla en vivo debido a políticas restrictivas de Storage. | **Crítica (P0)** | **Sí** | Corregir las políticas de inserción en el bucket `wedding-photos`. |
| **Música** | Reproductor y control de volumen flotante. | Ninguno. Reproduce la balada de James Arthur correctamente en `main`. | Leve | No | N/A |
| **Navegación / Footer** | Barra de pestañas y pie de página editorial. | Ninguno. | Leve | No | N/A |

---

## 2. Guest Journey Under 20 Seconds

A normal guest loading the site will immediately understand:
1. **Quiénes se casan:** Felipe & Camila (visible in the Hero and Title).
2. **Cuándo:** Viernes 23 de Octubre de 2026 a las 17:50 Hrs.
3. **Dónde:** Santuario de la Divina Misericordia (Ceremonia) y Centro de Eventos Arboleda (Gala).
4. **Cómo confirmar:** Mediante la sección de RSVP ingresando su código.
5. **Cómo saber si quedó confirmado:** El sistema muestra una pantalla de confirmación exitosa y abre WhatsApp (aunque en realidad la persistencia en base de datos falla).
6. **Cómo pedir ayuda:** El botón de WhatsApp redirige al teléfono oficial configurado.
