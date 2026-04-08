#!/bin/bash
# Script para copiar imágenes generadas al proyecto de la boda
# Ejecuta esto UNA VEZ desde tu Terminal: bash copy_images.sh

BRAIN="/Users/valgreen/.gemini/antigravity/brain/0b587046-0962-4e5d-bf75-6625a7446d14"
DEST="$(dirname "$0")/images"

echo "📸 Copiando imágenes al proyecto..."

# Retratos (versiones con cara real)
cp "$BRAIN/cami_sunglasses_1775531916536.png" "$DEST/cami_sunglasses.png" && echo "✅ Cami (retrato)" || echo "❌ Cami falló"
cp "$BRAIN/felipe_editorial_1775531931843.png" "$DEST/felipe_editorial.png" && echo "✅ Felipe (retrato)" || echo "❌ Felipe falló"

# Iglesia B&W
cp "$BRAIN/iglesia_divina_misericordia_bw_1775531369009.png" "$DEST/iglesia_bw.jpg" && echo "✅ Iglesia (B&W)" || echo "❌ Iglesia falló"

# Arboleda venue
cp "$BRAIN/media__1775529943120.png" "$DEST/arboleda_main.jpg" && echo "✅ Arboleda (principal)" || echo "❌ Arboleda main falló"
cp "$BRAIN/media__1775529936063.jpg" "$DEST/arboleda_coctel.jpg" && echo "✅ Arboleda (cóctel)" || echo "❌ Arboleda cóctel falló"
cp "$BRAIN/media__1775529806758.png" "$DEST/arboleda_jardin.jpg" && echo "✅ Arboleda (jardín)" || echo "❌ Arboleda jardin falló"

echo ""
echo "🚀 Listo. Ahora ejecuta: git add . && git push origin main"
