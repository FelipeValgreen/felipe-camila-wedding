import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const rootDir = process.cwd();
const origDir = path.join(rootDir, 'images', 'originals');
const respDir = path.join(rootDir, 'images', 'responsive');

if (!fs.existsSync(origDir)) fs.mkdirSync(origDir, { recursive: true });
if (!fs.existsSync(respDir)) fs.mkdirSync(respDir, { recursive: true });

const heroStory = JSON.parse(fs.readFileSync('js/hero_story.json', 'utf8'));
const civil = JSON.parse(fs.readFileSync('js/civil_featured.json', 'utf8'));
const shared = JSON.parse(fs.readFileSync('js/guest_shared.json', 'utf8'));

const allPhotos = [];

// Hero
heroStory.hero.forEach((h, i) => allPhotos.push({ cat: 'hero', id: `hero_${i + 1}`, src: h.src, item: h }));
// Historia
heroStory.historia.forEach((h, i) => allPhotos.push({ cat: 'historia', id: `historia_${i + 1}`, src: h.src, item: h, sizes: '(max-width: 767px) calc(100vw - 48px), 480px' }));
// Civil
civil.forEach((c, i) => allPhotos.push({ cat: 'civil', id: `civil_${i + 1}`, src: c.src, item: c, sizes: '(max-width: 767px) 84vw, (max-width: 1023px) 65vw, 440px' }));
// Shared
shared.forEach((s, i) => allPhotos.push({ cat: 'shared', id: `shared_${i + 1}`, src: s.src, item: s, sizes: '(max-width: 767px) 84vw, (max-width: 1023px) 65vw, 440px' }));

console.log('Processing photos via Sharp:', allPhotos.length);

async function downloadAndProcess() {
  const beforeTable = [];

  for (const p of allPhotos) {
    const cleanUrl = p.src.split('?')[0];
    const ext = path.extname(cleanUrl) || '.jpg';
    const localOrigName = `${p.id}_orig${ext}`;
    const localOrigPath = path.join(origDir, localOrigName);

    // Download if not cached locally
    if (!fs.existsSync(localOrigPath)) {
      console.log(`Downloading: ${p.id} (${p.src})`);
      const res = await fetch(p.src);
      if (!res.ok) {
        console.error(`HTTP Error ${res.status} downloading ${p.id}`);
        continue;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('image')) {
        console.error(`Invalid Content-Type "${contentType}" for ${p.id}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(localOrigPath, buffer);
    }

    const origStats = fs.statSync(localOrigPath);
    const meta = await sharp(localOrigPath).metadata();
    const width = meta.width || 1200;
    const height = meta.height || 900;

    beforeTable.push({
      id: p.id,
      cat: p.cat,
      url: p.src,
      format: (meta.format || ext.replace('.', '')).toUpperCase(),
      sizeBytes: origStats.size,
      width,
      height,
      aspectRatio: (width / height).toFixed(2)
    });

    const targetWidths = p.cat === 'hero' ? [480, 768, 1080, 1440] : [480, 768, 1080];
    const webpVariants = [];
    const jpgVariants = [];

    for (const tw of targetWidths) {
      if (width && tw > width) continue; // DO NOT upscale above original width

      const outWebpName = `${p.id}_${tw}w.webp`;
      const outJpgName = `${p.id}_${tw}w.jpg`;
      const outWebpPath = path.join(respDir, outWebpName);
      const outJpgPath = path.join(respDir, outJpgName);

      // Generate WebP
      await sharp(localOrigPath)
        .resize({ width: tw, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outWebpPath);

      // Generate JPG
      await sharp(localOrigPath)
        .resize({ width: tw, withoutEnlargement: true })
        .jpeg({ quality: 82, progressive: true })
        .toFile(outJpgPath);

      webpVariants.push(`/images/responsive/${outWebpName} ${tw}w`);
      jpgVariants.push(`/images/responsive/${outJpgName} ${tw}w`);
    }

    p.item.width = width;
    p.item.height = height;
    p.item.srcset = webpVariants.join(', ');
    p.item.srcsetJpg = jpgVariants.join(', ');
    if (p.sizes) p.item.sizes = p.sizes;
  }

  // Save updated JSON manifests
  fs.writeFileSync('js/hero_story.json', JSON.stringify(heroStory, null, 2));
  fs.writeFileSync('js/civil_featured.json', JSON.stringify(civil, null, 2));
  fs.writeFileSync('js/guest_shared.json', JSON.stringify(shared, null, 2));

  console.log('Manifests successfully updated with WebP & JPG responsive variants!');
}

downloadAndProcess().catch(err => {
  console.error('Error processing images:', err);
});
