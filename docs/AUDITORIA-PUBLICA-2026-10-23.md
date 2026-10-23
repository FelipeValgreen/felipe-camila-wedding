# Auditoría páginas públicas — felipeycami.cl
Repo `/home/claude/felipe-camila-wedding`, rama `audit/felipeycami-20261023` = `dc53c13`. Solo lectura. Fecha: 2026-10-23 (día del matrimonio). Rutas citadas son relativas a la raíz del repo.

## 0. Hallazgo transversal: producción NO es el commit auditado

- `dc53c13` (HEAD) está en `origin/fix/plot-twist-entry-20261022` y `origin/audit/…`; `origin/main` quedó en `8fb71ee` (2026-09-02). Ni `38124fc` ni `50c20a9` están en main.
- Lo que sirve **https://felipeycami.cl/fotos/ hoy coincide con `50c20a9`** (`origin/release/wedding-experiences-20261022`, 22-oct 22:04): WebFetch de la página muestra el bloque "Bienvenidos a nuestra noche" con nombre + mesa y botón "Entrar al juego" (`#landing-game-form`, eliminado en `38124fc`) y el texto "Escribe tu nombre y elige las fotos que quieras compartir" (reemplazado en `549e8d1`). WebFetch de `/js/feature/upload.js` en producción: **no contiene** `fc_guest_name`, `chooseFiles` ni `confirm-photo-upload`; el listener de `camera-input` llama a `handleFiles` (flujo viejo). `/css/fotos-responsive-fix.css` y `/css/wedding-readable.css` devuelven error (no existen en prod); `/css/wedding-atelier.css` sí.
- Consecuencia: todo lo que HEAD arregló entre 23:38 y 00:07 (identidad progresiva, tipografía accesible, tarjeta de recuerdos, CTA flotante) **no está desplegado**. Los invitados hoy ven el flujo viejo (ver P0-1).
- Especulación: el deploy salió de la rama release vía Vercel (no hay workflow para main en `.github/workflows`; el que existe apunta a `feat/plot-twist-v1`, línea 63).

---

## A. `/fotos/index.html` — cascada CSS efectiva

Orden de carga (`fotos/index.html:20-24`): tailwind → icons → wedding-experiences → wedding-minimal → wedding-atelier → wedding-art-direction → fc-brand-preview → fotos-final-20261022 → wedding-readable → global-readable → fotos-responsive-fix.

### `!important` por archivo (en el orden de carga)
| Archivo | líneas | `!important` |
|---|---|---|
| css/tailwind.min.css | 1 | 0 |
| css/icons.css | 85 | 0 |
| css/wedding-experiences.css | 178 | 29 |
| css/wedding-minimal.css | 135 | **246** |
| css/wedding-atelier.css | 89 | 67 |
| css/wedding-art-direction.css | 1 | 34 |
| css/fc-brand-preview.css | 44 | 53 |
| css/fotos-final-20261022.css | 15 | 0 |
| css/wedding-readable.css | 18 | 21 |
| css/global-readable.css | 12 | 6 |
| css/fotos-responsive-fix.css | 63 | 70 |
| **Total** | | **526** |

Siete capas se pisan entre sí: `wedding-experiences.css` solo tiene 6 "re-direcciones" internas (`:root` redefinido en líneas 1, 54, 93, 128; `.wedding-hero` padding-top en líneas 1, 4, 59). El ganador casi siempre es el que llega último con mayor especificidad, que en la práctica es `fotos-responsive-fix.css` (selectores `body.wedding-editorial .x`, especificidad 0,2,1).

### Cascada efectiva por selector (HEAD)

**`html` / `body`** — `font-size:18px` (`wedding-readable.css:2-3` y `global-readable.css:2-3`, idénticos; duplicado). Efecto colateral: toda utilidad Tailwind en `rem` escala ×1.125 (`mt-8` = 36px, `text-xs` = 13.5px, luego `global-readable.css:5` lo sube a 16px!important).

**`.wedding-hero`** — padding: 9 reglas compiten. Ganan `wedding-minimal.css:59` (`65px 0 77px!important`) en desktop y `wedding-minimal.css:94` (`54px 0 64px!important`, ≤520px). Las de `wedding-experiences.css:1,4,59,90,135,159` y `wedding-minimal.css:10,55` quedan muertas. `position:relative` (`wedding-experiences.css:4`, `wedding-atelier.css:5`). `::before` anulado (`wedding-minimal.css:11`), `::after` "✦" de `wedding-atelier.css:6` sí se renderiza.

**`.wedding-portrait-hero`** — `max-width:100%; margin:28px auto 22px` (`fotos-final-20261022.css:2`, pisa `wedding-atelier.css:60,66` y los media de `:63,:81`). `img`: `height:auto; aspect-ratio:3/2; object-fit:contain` (`fotos-final-20261022.css:3`, pisa `wedding-atelier.css:61,67` que recortaban a 290/345px). Correcto: foto completa.

**`figcaption`** — `wedding-atelier.css:62` 16px / `:63` 14px (≤520) → `wedding-readable.css:7` 16px!important → **gana `fotos-responsive-fix.css:61`: 18px!important, lh 1.55, color #4d3a34**. En HEAD está bien. **En producción (50c20a9) es 16px desktop / 14px móvil**: demasiado pequeño para adultos mayores.

**`.wedding-hero-tagline`** — font-size: `fotos-responsive-fix.css:62` `clamp(22px,5.5vw,28px)!important` (0,2,1) gana sobre `wedding-experiences.css:138`, `wedding-minimal.css:14`, `wedding-atelier.css:8`. A 390px = 22px. **Conflicto de color**: `wedding-minimal.css:15` `.wedding-hero p{color:#625d58!important}` (0,1,1) le gana al `color:#5C1D24!important` de `.wedding-hero-tagline` (0,1,0) en `experiences:138` y `minimal:14` → el tagline sale **gris, no vino**, pese a tres reglas que lo quieren vino.

**`.wedding-hero p` (párrafo, línea 40)** — `wedding-experiences.css:1` 15px → `wedding-minimal.css:15` 14px!important → **gana `wedding-readable.css:6` 18px!important** (misma especificidad, posterior). `max-width:340px!important` de `wedding-minimal.css:61`. HEAD OK; **producción = 14px** (demasiado pequeño).

**`.wedding-feature` (tarjeta recuerdos)** — `display:flex!important; flex-direction:column!important; overflow:visible!important; margin:24px 0 44px!important; border-radius:6px!important; background:#f4eee3!important` (`fotos-responsive-fix.css:3-8`). Esto deja muertas las 7 definiciones de `grid-template-columns` (`minimal:62,95,129`, `atelier:9,28,53,58`). Borde: `wedding-atelier.css:9` `1px solid #d6c8b6!important` le gana a `wedding-minimal.css:62` `border:0!important` (posterior, misma especificidad). `position:relative` (`atelier:9`). Pseudo-elementos `::before/::after`: `content:none!important` de `wedding-minimal.css:19` gana → no se generan.

**`.wedding-feature-body`** — padding `26px clamp(20px,5vw,34px) 30px!important` (`fotos-responsive-fix.css:26`), `22px 20px 26px!important` ≤640 (`:47`), `padding-inline:20px!important` ≤430 (`:63`). 12 reglas anteriores (`experiences:1,9,103`, `minimal:25,63,96`, `atelier:11,28,58`) muertas.

**`.wedding-feature-body h2` ("La noche, a través<br>de tus ojos.")** — cadena: `experiences:1,9,71,105` → `minimal:26,64,97,131` → `atelier:13,28` → `readable:8` → `fix:28,48` → **gana `fotos-responsive-fix.css:59`** `clamp(32px,7vw,43px)!important; lh 1.16; letter-spacing -.025em; overflow-wrap:normal; word-break:normal` y **`:63` ≤430px `clamp(31px,7.7vw,36px)!important`**. `<br>` forzado visible (`:60` pisa `:32`). Resultado: **31px entre 320 y 402px**, 33px a 430px.
Riesgo de desborde 320–390px: línea más larga "La noche, a través" (18 caracteres). Ancho disponible a 320px = 320−36 (wrap) −40 (padding) = **244px**; estimación Newsreader 400 ≈ 0.45em/carácter → 18×0.45×31 ≈ 251 − tracking (−14) ≈ **237px: cabe por ~7px** (especulación: depende de métricas reales; con la fuente de respaldo Georgia, más ancha, pasa a 3 líneas durante el FOUT). Como `overflow-wrap:normal` y no hay palabras >244px, no hay desborde horizontal: el peor caso es 3 líneas, no corte. A 390px cabe con holgura.
En producción (50c20a9): `wedding-atelier.css:28` gana con `clamp(37px,10vw,48px)` → 39px a 390px, 37px a 320px con 236px útiles → **se va a 3 líneas a 320px**.

**`.wedding-feature-photo` / `.wedding-feature-letter`** — `fotos-responsive-fix.css:9-15` (0,2,1): `order:-1; width:100%; height:auto; min-height:0; max-height:none; padding:18px (14px ≤640); display:flex; align-items/justify-content:center; background:#e9ddcb` todo `!important`; pisa `wedding-atelier.css:54,58,85,89` (min-height 290/300, height 130/180). Queda `flex-direction:column` y `border-left:1px solid #d4c2ac` de `atelier:85` → un borde izquierdo huérfano en una franja apilada (cosmético). Monograma: `fotos-responsive-fix.css:16-19` `width:clamp(80px,22vw,132px); max-height:120px` → `:46` ≤640 `width:90px; max-height:86px`, pisando el `style` inline de `fotos/index.html:49` (gracias al `!important`). Altura estimada de la franja en móvil ≈ 14+16+86+16+14 ≈ **146px**; desktop ≈ 190px. Compacto y razonable. Textos "FELIPE & CAMI"/"23 · 10 · 2026" a 12px (`fix:20-23`): decorativos (`aria-hidden`), aceptable.

**`.wedding-action` (CTA inline "Compartir mis fotos", línea 47)** — dentro de `.wedding-feature`: `display:flex; width:100%; min-height:56px; font-size:18px; text-align:center` todo `!important` (`fotos-responsive-fix.css:34-37`). Color fondo: `fc-brand-preview.css:37` `#5b1521!important`. **Pero `justify-content:space-between!important` de `wedding-minimal.css:68` sigue vigente** (nadie lo pisa) → con un único hijo (texto) equivale a `flex-start`: **el texto queda alineado a la izquierda dentro de un botón de ancho completo**. `text-align:center` no afecta a un ítem flex anónimo. Hover `translateY(-2px)` (`atelier:15`) pisa `transform:none!important` (`minimal:28`).
El botón dinámico `#confirm-photo-upload` (`js/feature/upload.js:34-40`, clase `wedding-action`) está fuera de `.wedding-feature`: hereda `min-height:49px!important`/`padding:14px 19px!important` (`minimal:28`), `font-size:18px!important` (`readable:12`), y el mismo `space-between` → texto a la izquierda; sus estilos inline (`upload.js:39,65-67`) pierden contra los `!important`.

**`.wedding-mobile-cta` (CTA fijo, línea 113)** — `wedding-experiences.css:19,22,23,49` lo definen (fixed, ≤600px, z-index 40, `[hidden]→display:none!important`), `minimal:53,124`, `fc-brand:37`, `readable:12` lo decoran… y **`fotos-responsive-fix.css:38` `display:none!important` (0,2,1) lo apaga en todos los anchos**. En HEAD el CTA flotante **nunca se muestra**: líneas 113-124 de `fotos/index.html` (markup + IntersectionObserver) son código muerto. No puede solapar nada.
**IntersectionObserver (`fotos/index.html:119-124`)**: observa `#subir-fotos`, un `div` de altura 0, con `rootMargin:'-80px 0px -55% 0px'`. `isIntersecting` es `true` solo mientras ese marcador esté en la banda [80px, 45% viewport]. Al seguir bajando (marcador por encima de 80px) vuelve a `false` → **el CTA reaparece encima de los botones "Tomar una foto"/"Elegir de mi galería", la cola de subida y la nota de privacidad**. Además `wedding-minimal.css:125` deja el footer con `padding-bottom:45px+safe-area` mientras el CTA mide ≥50px + 12px → tapa el footer, y tapa los últimos ~62px de las tarjetas de experiencias al pasar. **En producción (sin fix.css) este bug está vivo.** Lógica correcta sería observar toda `.wedding-upload-section` (o esconder definitivamente al primer `isIntersecting`).

**Duplicidad de CTAs "subir fotos"**: inline (`:47`), flotante (`:113`), más el enlace de nav "Las experiencias ↓" no lleva a subir. En HEAD queda solo el inline (bien); el flotante debería eliminarse del HTML en vez de ocultarse por CSS.

**`.wedding-tile`** — Pelea a tres bandas: `wedding-art-direction.css` (0,1,0, 34 `!important`) carga después de `wedding-atelier.css` pero **pierde** contra `.wedding-experience-list .wedding-tile` (0,2,0) de `atelier:32,44`: display/padding/min-height/fondo/borde los decide atelier (`display:flex column; padding:22px; min-height:285px; bg #f3eadd`; ≤520 `display:grid 90px 1fr; min-height:160px; padding:18px`). `wedding-readable.css:18` `min-height:230px!important` (0,1,0) también pierde. `fotos-responsive-fix.css:41,49` fija columnas (2 / 1 ≤640).
Lo que **sí** aporta `wedding-art-direction.css`: `.wedding-experience-list` `gap:18px!important; margin-top:36px!important` (gana a `atelier:31`); `.wedding-experience-art` `display:block; width:96px; height:96px; margin:0 auto 22px; transform:rotate(-5deg)` (76px ≤560) y `svg{width:100%;height:100%;stroke-width:1.7}` (gana a `atelier:36,71,73`). **No es inerte**, pero crea un artefacto: el sello `::before` de `wedding-atelier.css:72` (círculo 116px, `position:absolute` sin offsets) queda anclado a la esquina superior izquierda de una caja ahora de 96px → el "sello" se descentra respecto al icono (especulación sin render; en ≤520 el círculo baja a 78px, `atelier:81`, y el svg a 76px, menos visible). Títulos h3: `wedding-readable.css:9` `clamp(30px,6vw,38px)!important` → 30px en móvil; p: `fotos-responsive-fix.css:43` 17px!important; "Entrar a la experiencia": `readable:11` 16px!important. Correcto.

**`.wedding-upload-section`** — `wedding-minimal.css:81` `padding-top:0!important` → pisado por `wedding-atelier.css:23` `padding-top:46px!important` (posterior). `#subir-fotos` `scroll-margin-top:32px` (`minimal:121`) pisa `experiences:15` (82px); nav sticky mide ~62px → al hacer click en "#subir-fotos" el destino queda ~30px bajo la nav (menor).
**Conflicto `#subir-fotos+div`** (`wedding-minimal.css:48`, especificidad 1,0,1): el hermano siguiente es `.wedding-identity-field` (`fotos/index.html:70`) → recibe fondo blanco, borde y `padding:25px!important`, mientras `wedding-minimal.css:85` intenta `padding:0; background:transparent; border:0` con `!important` pero especificidad 0,1,0 → **pierde**. Resultado: campo nombre dentro de una caja con borde (aceptable visualmente, pero la línea 85 es código muerto para esas propiedades). Esta regla fue escrita para un DOM anterior.

**`.wedding-name-input` / `#guest-name-input`** — font-size: `wedding-readable.css:14` 18px!important (0,1,0) **pierde** contra `#guest-name-input{font-size:16px!important}` (`wedding-minimal.css:46`, 1,0,0) → 16px (evita zoom iOS, aceptable). Radio: `fc-brand-preview.css:19` 4px!important gana a los `0!important` de minimal. min-height 54px (`minimal:87`).

**`.wedding-upload-button`** — `wedding-minimal.css:89` (0,2,0) `justify-content:flex-start; padding:18px 21px; min-height:60px; font-size:14px` `!important` gana a `readable:12` (0,1,0); el texto visible `.wedding-upload-label` sí toma 18px!important (`readable:12`). Fondo/radio: `fc-brand-preview.css:28-29` `body:has(#guest-name-input) label:has(#camera-input)` (especificidad 2,0,2) manda. OK.
**Iconos: `.fa-camera`, `.fa-images` NO existen en `css/icons.css`** (solo define arrow-*, bars, whatsapp, pen-to-square, map-location-dot, waze, chevron-*, calendar-check, circle-exclamation, circle-check, xmark; `icons.css:17-82`). La regla base `icons.css:2-14` pone `width:1em;height:1em;background-color:currentColor` con máscara → sin `mask-image` se pinta **un cuadrado sólido de 17px** en vez del icono, en ambos botones (`fotos/index.html:82,89`). Lo mismo en la cola: `fa-spinner`/`fa-spin` (cuadrado vino estático, `upload.js:138`), `fa-check-circle` (el definido es `fa-circle-check`; cuadrado verde, `upload.js:260`), `fa-triangle-exclamation` (cuadrado rojo, `upload.js:184`). Y en `index.html:680` (`fa-camera`). `icons.css` no cambia desde `6f3595a` (23-jul) → **también en producción**.

**Reglas para elementos que ya no existen** (DOM actual de `fotos/index.html`): `.wedding-game-entry*`, `.game-photo-link`, `.game-return`, `.game-gallery-link`, `#game-entry-error` (`fotos-final-20261022.css:4-14`, 11 de 15 líneas); `.wedding-grid`, `.wedding-card-illustration`, `.wedding-feature-art/-lettering/-quote/-divider/-signature`, `.wedding-feature-signoff`, `.wedding-portrait-pair`, `.wedding-real-logo`, `.wedding-typographic-mark`, `.wedding-letter-monogram`, `.wedding-experience-index`, `.wedding-arrow`, `.wedding-wide`, `.wedding-notice`, `.wedding-back`, `.wedding-brand-monogram` (en /fotos/): ninguna aparece en HTML público. `js/feature/fotos-game-entry-20261022.js` ya no lo carga ninguna página (`#landing-game-form` eliminado en `38124fc`). `fc-brand-preview.css:23-27` (`body:has(#guest-name-input) main>h1`, `main>p`…) apuntan a una estructura `main>` que ya no existe.

---

## B. `css/tailwind.min.css`

**La premisa es falsa.** `wc -c css/tailwind.min.css` = **23.640 bytes** en `dc53c13`. Historia completa del archivo: `6f3595a` (22.730 B), `1a97a32` (23.578 B), `a5bd725` 2026-07-23 (23.640 B). Nunca estuvo vacío en git. Contiene `.hidden{display:none}`, `.grid{display:grid}`, `.gap-4`, `.mt-8`, `.flex`, `.w-full` (y `.hidden` está después de `.flex`/`.grid` en el archivo, por lo que `class="hidden flex"` en `#view-photos-btn` oculta correctamente).
Producción: `curl` fue bloqueado por el proxy (403 a felipeycami.cl), pero **WebFetch de https://felipeycami.cl/css/tailwind.min.css devolvió ~30.000 caracteres** con todos esos selectores presentes. No hay build en Vercel: `package.json:9` define `build:css` pero `vercel.json` no tiene `buildCommand`; el archivo va precompilado al repo.
Clases usadas que **sí** faltan en el build (`tailwind.config.js` purga por contenido):
- `scroll-mt-24` (`fotos/index.html:68`): sin efecto práctico, `#subir-fotos` ya tiene `scroll-margin-top` por CSS.
- `bg-sage`, `text-sage`, `text-charcoal` (`js/feature/upload.js:133,135,138`): paleta legacy. **La barra de progreso no se ve** (el relleno `bg-sage` es transparente sobre la pista `bg-gray-200`) hasta que termina y cambia a `bg-green-500`/`bg-red-500`. El spinner `text-sage` hereda vino de `fc-brand-preview.css:22`.
Todas las demás (150 en galería, 79 en fotos) existen.

---

## C. Flujo de subida (HEAD: `js/feature/upload.js` + `js/supabase-client.js` + `api/gallery.js` + `api/public-config.js`)

1. `DOMContentLoaded` (`upload.js:3`): lee `?guest=`/`?t=` y pre-rellena el nombre "bonito" + muestra `#guest-greeting` (`:22-28`); genera `fc_session_id` en sessionStorage (`:16-20`, **no se usa después**); crea `#confirm-photo-upload` oculto tras `.wedding-identity-field` (`:34-40`); **pre-rellena desde `localStorage['fc_guest_name']`** (`:41-42`); **oculta el campo nombre** (`:43`, `hidden` + `fotos-responsive-fix.css:54`).
2. El invitado toca "Tomar una foto" (`#camera-input`, `accept="image/*" capture="environment"` → cámara trasera directa en iOS/Android) o "Elegir de mi galería" (`multiple`). `change` → `chooseFiles` (`:281-282, :60-70`): guarda la selección, **muestra el campo nombre**, cambia el hint a "N foto(s) seleccionada(s). Confirma tu nombre…", muestra el botón, hace `scrollIntoView` y enfoca el nombre si está vacío.
3. "Subir las fotos seleccionadas" (`:44-58`): valida nombre con `reportValidity`, **persiste `fc_guest_name`**, llama `handleFiles`.
4. `handleFiles` (`:96-173`): filtra `type.startsWith('image/')`, muestra `#upload-queue`, por archivo inserta fila con preview (FileReader) y lanza **Compressor.js 1.2.1 `quality:0.8, maxWidth/Height:1920`** (`:156-167`; `convertSize` por defecto 5MB → PNG >5MB pasan a JPEG). **Si la compresión falla no hay fallback a subir el original**: la foto se marca fallida (`:163-166`). Si Compressor no cargó (CDN) sube el original (`:152-155`).
5. `uploadToSupabase` (`:208-278`): ruta `guest_uploads/guest_<uuid>.<ext>` (ext por MIME, default jpg; `:223-225`), bucket **`wedding-photos`**, `upsert:false`. Política de storage (`supabase/migrations/20260723050000_…sql:9-16`): INSERT público solo si carpeta `guest_uploads`, extensión jpg/jpeg/png/webp y nombre >14 chars. `heic/heif` del mapa (`:224`) serían rechazados, pero Compressor recomprime vía canvas → JPEG/PNG (`toBlob` no soporta HEIC), caso marginal.
6. `getPublicUrl` + `?source=qr` → `insert guest_photos {url, uploader_name}` (`:246-251`). Política `Validated Insert guest_photos` (`…20260723020000…sql:73-76`): **`uploader_name` ≤100 chars** y url http(s). **`#guest-name-input` no tiene `maxlength`** (`fotos/index.html:72`) → un nombre >100 chars falla en el INSERT **después** de haber subido el archivo (archivo huérfano + error al invitado).
7. Progreso **simulado** 30%→70%→100% (`:221,236,257`); supabase-js no expone progreso real.
8. Confirmación (`onUploadFinished`, `:175-206`): título "¡Subida Exitosa! 🎉" / "Subida completada con algunas observaciones." / "Error en la subida. Revisa los detalles arriba."; muestra `#view-photos-btn` → `/galeria/?filtro=civil&refresh=1` (`fotos/index.html:100`). **El éxito depende de ambas respuestas del servidor** (storage y DB): no hay confirmación falsa. Las filas exitosas quedan visibles (`:264`).
9. Errores: solo icono rojo (cuadrado, ver A) y título genérico; **sin mensaje de causa ni botón reintentar**; hay que volver a seleccionar. `console.error` únicamente.
10. Duplicados: **ninguna prevención** (nombres por UUID; misma foto dos veces = dos filas). Límite de tamaño: **ninguno** en `upload.js` (el check de 5MB está en `supabase-client.js:28-31`, función `uploadGuestPhoto` que **nadie llama**); el recorte a 1920px/q0.8 deja normalmente <1MB. MIME: `image/*` en cliente + whitelist de extensión en storage.

**Comparación con el flujo esperado**: en HEAD el nombre se pide **después** de elegir fotos y se reutiliza (`localStorage.fc_guest_name`) ✔. **En producción (50c20a9)** el nombre se exige **antes** (`handleFiles` directo; si está vacío → `showUploadToast` → `alert()` nativo porque `showToast` vive en `js/main.js`, que `/fotos/` no carga), y no se persiste ✘.

**Clave anon**: hardcodeada en `js/supabase-client.js:4` (`sb_publishable_…`, pública por diseño) y como fallback en `api/gallery.js:8`. No hay `service_role`/`sb_secret` en el árbol público (solo `sb_secret_TEST_ONLY_NOT_REAL` en `tests/`). `api/public-config.js` solo expone `WEDDING_WHATSAPP_NUMBER`. Dentro de `supabase-client.js:141-169` queda una función muerta con un `access_key` de Web3Forms y el correo `felipevalverde5673@gmail.com` (`:145,148`); no es un secreto crítico pero es PII y código muerto.

---

## D. `/galeria/index.html` + `api/gallery.js`

- **Filtros**: `todas` / `historia` / `civil` (`galeria/index.html:50-58`); `getFilterFromUrl` acepta esos tres y traduce `despues→civil` (`:131-140`). **`?filtro=civil&refresh=1` cae en "Nuestro civil"** ✔ y `refresh=1` fuerza `cache:'no-store'` + `refresh=<ts>` (`:158-179`); la API responde `Cache-Control: no-store` (`api/gallery.js:86-88`); luego limpia `refresh` de la URL (`:218-224`).
- **Categoría de las fotos de invitados**: `api/gallery.js:65-71`: `created_at >= '2026-03-28'` → `civil`, si no `historia`. **Todo lo subido esta noche aparece bajo "Nuestro civil"** (el civil fue el 28-mar). Etiqueta incorrecta para el invitado y el badge del lightbox dice "Nuestro civil (n de N)".
- **Orden**: `order=created_at.asc` (`api/gallery.js:19`) y render en ese orden → **la foto recién subida es la ÚLTIMA** del filtro civil; con `BATCH_SIZE=24` (`:125`) el invitado tiene que pulsar "Cargar más fotografías" varias veces para encontrarla.
- **Carga**: descarga **todas** las páginas (100/página) en serie antes de pintar nada (`:166-197`); con cientos de fotos son 5–10 round-trips (cada uno a Supabase con timeout 10s, `api/gallery.js:21-22`) con el texto "Cargando fotografías..."; si una página falla, falla todo ("No se pudieron cargar…", `:226-230`), sin botón reintentar. `has_more = rawData.length === limit` (`:84`). `img loading="lazy" decoding="async"` ✔ (`:291-292`), fallback `onerror` ✔.
- **Lightbox**: `role=dialog aria-modal`, foco inicial en cerrar, trampa de Tab, Esc/flechas, cierre al click fuera, devuelve foco a la tarjeta (`:334-414`) ✔. Botones 44px ✔.
- **Estados**: vacío "No hay fotografías en esta categoría." (`:259-262`); error (`:228-229`).
- **Caché**: API `public, s-maxage=60, stale-while-revalidate=300` (`:89`) salvo refresh; HTML `max-age=0, must-revalidate` (`vercel.json`); `/css/tailwind.min.css|icons.css` `max-age=0` (`vercel.json`); los demás CSS usan `?v=` o el default de Vercel.
- `html{font-size:18px}` (`global-readable.css:2`) escala todas las utilidades rem de la galería ×1.125 y `.text-xs→16px!important` (`:5`): filtros y pies legibles ✔.
- `BLOCKED_PHOTO_FILES` y `NORMALIZED_MAP` hardcodeados (`api/gallery.js:46-61`): funcionan pero son moderación por código.

---

## E. `/fotos/raspe/`, `/fotos/complice/`, `/fotos/premios/`

Las tres cargan tailwind, icons, `wedding-experiences`, `wedding-minimal`, `fc-brand-preview`, `global-readable` (**no** `wedding-readable.css` ni `wedding-atelier.css`). Rutas verificadas: `/fotos/`, `/fotos/#experiencias`, `/fotos/#subir-fotos`, `/js/wedding-request.js` (existe), `/api/wedding/request` (POST, `api/wedding/request.js`), `/images/wedding-card-icons.svg#scratch|#secret|#prize` (ids existen: `scratch, secret, twist, prize`). Todo resuelve. Sin "Lorem", TODO ni nombres ficticios (grep limpio).

**Tipografía (las tres)**: `html 18px`, h1 `clamp(48px,9vw,66px)!important` (`minimal:41`), lead **15px!important** (`minimal:42`), **cuerpo de paneles 14px!important** (`.wedding-panel p/li`, `wedding-minimal.css:45`), **labels 13px** (`wedding-experiences.css:1` `.wedding-panel label`, 0,1,1, le gana a `global-readable.css:8` `label{18px}` 0,0,1), inputs 16px!important (`minimal:46`), footer inline 13px, clase `.muted` **no definida en ningún CSS**. Es decir: **la capa accesible no se aplicó a las páginas de juegos** aunque los commits `1a7648d`/`b09c1bf` digan "Apply accessible type sizes" — `global-readable.css` no toca `.wedding-panel`. Para 230 invitados, muchos mayores, 13–15px es insuficiente. El arte `.wedding-page-art` está oculto por `wedding-minimal.css:40` (`display:none!important`) → el `<use>` del sprite es markup muerto. El monograma de nav es texto "F&C" (`.wedding-brand-monogram`), distinto al SVG floral del resto del sitio.

**Navegación atrás**: "← Volver a los recuerdos" → `/fotos/` y "Los juegos ↓" → `/fotos/#experiencias` en la nav sticky ✔; no hay enlace de regreso al final de página (3 paneles + formulario: hay que volver arriba). Formularios: `js/wedding-request.js` POST JSON, deshabilita botón, mensaje de éxito "Recibimos tu solicitud. Quedó pendiente de revisión…", `form.reset()` ✔; API valida `kind`, nombre ≥2, mesa 1–23, y escribe `wedding_experience_requests` con `status:'pending'` vía service key del servidor ✔.

**Consistencia con los juegos reales**
- **Raspe** (`fotos/raspe/index.html`): tarjetas físicas ✔ ("Raspa tu tarjeta: solo una esconde al verdadero Felipe"); premio si sale Felipe ✔ ("hay un único raspe ganador y deberá verificarse"); compartir la foto en la web ✔ (enlace a `/fotos/#subir-fotos`). Desvío: la instrucción 1 dice "busca a esa persona y tómense una foto juntos", mientras la mecánica real es **fotografiarse mostrando el resultado**. El aviso "**Por ahora**, subir una foto no registra automáticamente una participación…" suena a producto inacabado el día del evento. El formulario "Registrar mi raspe" es extra razonable (cola de revisión).
- **Cómplice** (`fotos/complice/index.html`): un cómplice por mesa identificado en una tarjeta de agradecimiento ✔, los demás adivinan ✔, se resuelve al postre ✔, gana la mesa si lo descubren, si no el cómplice invita shots con opción sin alcohol ✔. **No revela identidades** ✔ (no hay nombres ni datos por mesa). Correcto.
- **Premios** (`fotos/premios/index.html`): **no lista categorías ni ganadores** (lo esperado); pide al invitado escribir su "Categoría ganada" a mano. Texto "**el canje digital está en preparación**" y "Esta página no aprueba solicitudes" transmiten obra en construcción el día del matrimonio. Las advertencias de no entregar dirección a garzones son correctas y prudentes.

---

## F. `index.html` (invitación) e imágenes

- Fechas/lugares consistentes: "Viernes 23 de octubre de 2026" (`:313`; el 23-oct-2026 es viernes ✔), ceremonia 17:30 Santuario de la Divina Misericordia (`:549-556`), Arboleda Chicureo 18:30 cóctel / 19:30 cena (`:586-607`), JSON-LD `startDate 2026-10-23T17:30:00-03:00`, `endDate 2026-10-24T05:00:00-03:00` (`:70-71`) ✔. Civil "28 de marzo de 2026" (`:361`) ✔.
- **Obsoleto hoy**: "Confirma tu asistencia antes del 23 de septiembre de 2026" (`:387`) y el CTA fijo "Confirmar" `#rsvp-cta` (`:751`) siguen activos; el enlace "← La invitación" de /fotos/ lleva aquí con `?open=1#hero` (salta el sobre: `js/main.js:55-58` ✔).
- Nav (`:269-272, :283-286`): Historia, Información, Confirmar, Galería (`/galeria/?filtro=todas`). **No hay enlace a `/fotos/` en la nav**; el único es el botón "Subir mis fotos del matri" (`href="/fotos"` sin barra final → redirección 308 de Vercel a `/fotos/`, salto extra; id `open-upload-modal-btn` heredado de un modal que ya no existe).
- RSVP: `POST /api/rsvp` (`js/main.js:199,402`), `GET /api/public-config` (`:585`), WhatsApp `wa.me/56981393436` (`:510, :734`). `api/rsvp.js` usa `process.env.SUPABASE_URL` + secret server-side ✔.
- Sin ids duplicados ni secciones repetidas (verificado con `uniq -d`).
- `img src/srcset` de `index.html`, `fotos/**`, `galeria/`: **todos existen** (hero_1_480/768/1080/1440, santuario webp/jpg, felipe-cami-atardecer 768/1536, fc-monogram.svg, isotype-fc-200w.png, favicons).
- Imágenes: `images/` **46 MB** (90 archivos raíz), `images/responsive/` **21 MB** (175), `images/normalized/` 1,5 MB. 10 más pesados: `isotype-fc.png` 1,2 MB, `isotype-fc-full.png` 1,2 MB, `envelope_liner.png` 1,0 MB, `arboleda_main.jpg` 0,8, `responsive/arboleda_main_1080w.jpg` 0,8, `dried_flowers.png` 0,7, `felipe_editorial.png` 0,7, `iglesia_bw.jpg` 0,6, `cami_editorial.png` 0,6, `responsive/arboleda_jardin_1080w.jpg` 0,6. Los 8 de la raíz **no se referencian** en ningún HTML/JS/CSS público (solo `scripts/process_isotype.js`): peso muerto en el deploy, sin impacto en carga de página.
- Archivo basura versionado: `'` (nombre = apóstrofe, 0 bytes) en la raíz.

---

## G. Seguridad (pasada rápida)

- Grep `sb_secret|service_role|eyJ…|GOCSPX` en html/js del árbol público: **nada real** (solo tests). Clave publishable en `js/supabase-client.js:4` y `api/gallery.js:8` (aceptable). Web3Forms key + email personal en código muerto (`supabase-client.js:145,148`).
- **`admin/index.html` es público** y su "login" es `const APP_PASS = 'bodorrio2026'` en claro (`admin/index.html:70`). Con el anon key hace `select('*')` sobre `guest_photos` (`:92-95`), cuya política SELECT es `USING(true)` (`…20260723020000…sql:72`) → **cualquiera puede leer `uploader_name` de todas las fotos vía REST** (la API pública solo expone url/created_at, pero la tabla no). El `.delete()` (`:141`) no tiene política anon → falla; el panel es inútil y a la vez una vitrina. Debería retirarse del deploy o protegerse con Supabase Auth (hay RLS de `admin_profiles` en `gestion`).
- `plot-twist/operator.html`: pide la clave al operador y la envía como `x-plot-twist-key`; el servidor la compara con `PLOT_TWIST_OPERATOR_KEY` con `timingSafeEqual` y devuelve 401 (`api/plot-twist/operator.js:5-8`, `api/wedding/operator.js:3-6`) ✔. Página pública pero inerte sin clave.
- `plot-twist/showcase.html` y `plot-twist/demo.html`: demos con "DATOS FICTICIOS · NO SE CONECTA A SUPABASE" ✔; sin `noindex`.
- `plot-twist/game-v1.json` no contiene respuestas (grep `answer|correct|respuesta` → solo copy de reveal) ✔.
- **No hay `.vercelignore`**: en hosting estático Vercel sirve todo lo versionado → `docs/` (incl. `SECURITY_STATUS.md` que narra la fuga de un `GOCSPX-…` y el inventario de secretos), `reports/`, `tests/`, `supabase/migrations/*.sql`, `.env.example`, `scripts/`, `*.py`, `debug_env/`, `gestion/` (1,5 MB; ¿debe ser público? sin verificar). No exponen credenciales, sí arquitectura y políticas.

---

## H. Hallazgos priorizados y fix mínimo

### P0
**P0-1. Producción sirve `50c20a9`, no el código auditado.** Hoy los invitados ven: formulario de juego en la landing, nombre obligatorio antes de elegir fotos con `alert()` nativo, CTA flotante que tapa la zona de subida, párrafo del hero a 14px y pie de foto a 14–16px. Evidencia en §0.
Fix: desplegar `dc53c13` a producción (promover el deploy de `fix/plot-twist-entry-20261022` o mergear a la rama que Vercel publica) **antes de las 17:30**, idealmente con P0-2 y P1-1..3 encima. Si no se despliega, aplicar al menos P1-4 como hotfix sobre la rama release.

**P0-2. Iconos del uploader se pintan como cuadrados sólidos** (`fa-camera`, `fa-images`, `fa-spinner`, `fa-check-circle`, `fa-triangle-exclamation` no existen en `css/icons.css`; la base `icons.css:2-14` rellena `currentColor` sin máscara). Afecta HEAD y producción, en el primer botón que todo invitado toca.
Fix mínimo (sin tocar HTML): añadir al final de `css/icons.css`:
```css
.fa-camera,.fa-images,.fa-spinner,.fa-check-circle,.fa-triangle-exclamation{background-color:transparent}
```
(los botones conservan su texto). Mejor: añadir máscaras SVG para esos cinco nombres siguiendo el patrón de `icons.css:17-20`, y en `js/feature/upload.js:184,260` cambiar `fa-triangle-exclamation`→`fa-circle-exclamation` y `fa-check-circle`→`fa-circle-check` (ya definidos).

### P1
**P1-1. Páginas de juegos con texto de 13–15px.** `fotos/raspe|complice|premios/index.html` no cargan `wedding-readable.css`.
Fix: en las tres, tras `<link rel="stylesheet" href="/css/wedding-minimal.css">`, añadir `<link rel="stylesheet" href="/css/wedding-readable.css">` (sus líneas 16-17 llevan `.wedding-panel p/li/label` e inputs a 18px). Añadir también `.muted{font-size:16px;color:#625d58}` a `wedding-readable.css`.

**P1-2. La foto recién subida queda al final de la galería.** `api/gallery.js:19` `order=created_at.asc`.
Fix: cambiar a `order=created_at.desc`. (Efecto: "Todas"/"Civil" muestran lo más nuevo primero; "Historia" también se invierte, aceptable hoy.)

**P1-3. Fotos del matrimonio etiquetadas "Nuestro civil".** `api/gallery.js:68-71`.
Fix mínimo de copy: `galeria/index.html:57` "Nuestro civil" → "Civil y matrimonio" y `:235` `return 'Civil y matrimonio'`; en `api/gallery.js:70` `alt = 'Recuerdo de nuestro civil y matrimonio'`. (Un filtro nuevo "Matrimonio" requiere tocar HTML+JS+API; no hoy.)

**P1-4 (solo producción, si NO se despliega HEAD). CTA flotante tapa el uploader.** `fotos/index.html:119-124` observa un div de 0px con `rootMargin:'-80px 0px -55% 0px'` → reaparece al bajar.
Fix: en el observer reemplazar `upload` por `document.querySelector('.wedding-upload-section')` y `rootMargin` por `'0px 0px -30% 0px'`; o añadir en `fotos-final-20261022.css` `.wedding-mobile-cta{display:none!important}` (lo que HEAD ya hace en `fotos-responsive-fix.css:38`).

### P2
**P2-1. `#guest-name-input` sin `maxlength`**; la política DB rechaza >100 chars después de subir el archivo. Fix: `fotos/index.html:72` añadir `maxlength="100"`.
**P2-2. Barra de progreso invisible** (`bg-sage`/`text-sage`/`text-charcoal` no están en el build). Fix: `js/feature/upload.js:133,135,138` → `text-dark`, `bg-gold`, `text-gold`; `:183,258` `classList.replace('bg-gold', …)`.
**P2-3. Sin fallback si Compressor falla.** Fix: en `upload.js:163-166` llamar `uploadToSupabase(file, file.name, guestName, itemId)` en lugar de `onUploadFinished(itemId,false)`.
**P2-4. Error de subida sin causa ni reintento.** Fix mínimo: en `onUploadFinished` cuando `isSuccess===false`, poner `queueTitle.textContent = 'No pudimos subir alguna foto. Vuelve a elegirla e inténtalo de nuevo.'` y en `uploadToSupabase` catch mostrar `error.message` bajo la fila (`:274-277`).
**P2-5. Texto de CTAs alineado a la izquierda** por `justify-content:space-between!important` (`wedding-minimal.css:68`). Fix: en `fotos-responsive-fix.css:34` añadir `justify-content:center!important` y una regla `body.wedding-editorial #confirm-photo-upload{justify-content:center!important}`.
**P2-6. `admin/index.html` público con contraseña en claro y `guest_photos.uploader_name` legible por anon.** Fix hoy: retirar `admin/` del deploy (`.vercelignore`) o mover la página fuera; tras el evento, política SELECT restringida y panel con Auth.
**P2-7. Copy "en obra" el día del evento**: `fotos/raspe/index.html` "Por ahora, subir una foto no registra…" → "Subir la foto no reemplaza la verificación de la tarjeta ganadora."; `fotos/premios/index.html` "el canje digital está en preparación" → "El retiro se coordina en persona con Felipe y Cami." y añadir la lista de categorías (contenido que debe entregar la pareja; no inventar).
**P2-8. Archivos internos servidos públicamente** (`docs/`, `reports/`, `tests/`, `supabase/`, `.env.example`, `scripts/`, `debug_env/`, `*.py`). Fix: crear `.vercelignore` con esas rutas (confirmar antes si `gestion/` debe seguir público).
**P2-9. Tagline gris en vez de vino** (`wedding-minimal.css:15` gana a tres reglas). Fix: `fotos-responsive-fix.css:62` añadir `color:#5C1D24!important`.

### P3
- Eliminar markup/JS muerto del CTA flotante (`fotos/index.html:113-134`), el `fotos-game-entry-20261022.js` sin uso, `fc-brand-preview.css:23-27`, `fotos-final-20261022.css:4-14`, y las clases huérfanas listadas en §A; después del evento, consolidar los 11 CSS (526 `!important`) en uno.
- Artefacto del sello `::before` descentrado (`wedding-atelier.css:72` vs `wedding-art-direction.css` width 96px): añadir `inset:0;margin:auto` al `::before` (especulación sin render).
- Invitación: ocultar `#rsvp-cta` y la frase del plazo de RSVP (`index.html:387,751`); añadir enlace "Fotos" a `/fotos/` en la nav (`:272,:286`); `href="/fotos"` → `/fotos/` (`:689`).
- Galería: pintar el primer lote tras la primera página en lugar de esperar todas; botón "Reintentar" en el estado de error.
- Borrar el archivo `'` de la raíz; borrar la función Web3Forms y el correo de `js/supabase-client.js:140-169`; eliminar originales no referenciados en `images/` (~7 MB).
- `noindex` en `plot-twist/showcase.html` y `demo.html`.
- Enlace "Volver" al pie de las tres páginas de juegos.

---

### Verificaciones que no pude hacer
- Render real en dispositivo (todo lo tipográfico de §A son cálculos de cascada; los anchos de línea del h2 son estimaciones).
- `curl` directo a felipeycami.cl fue bloqueado por el proxy; la verificación de producción se hizo con WebFetch (contenido textual, no HTML crudo).
- Estado real de políticas en el proyecto Supabase (se leyeron las migraciones del repo, no la base).
