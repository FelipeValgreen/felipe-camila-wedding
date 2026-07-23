import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
heroStory.historia.forEach((h, i) => allPhotos.push({ cat: 'historia', id: `historia_${i + 1}`, src: h.src, item: h }));
// Civil
civil.forEach((c, i) => allPhotos.push({ cat: 'civil', id: `civil_${i + 1}`, src: c.src, item: c }));
// Shared
shared.forEach((s, i) => allPhotos.push({ cat: 'shared', id: `shared_${i + 1}`, src: s.src, item: s }));

console.log('Total remote photos to process:', allPhotos.length);

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
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(localOrigPath, buffer);
    }

    const origStats = fs.statSync(localOrigPath);
    
    // Get dimensions via sips
    let width = 0;
    let height = 0;
    try {
      const sipsOut = execSync(`sips -g pixelWidth -g pixelHeight "${localOrigPath}"`, { encoding: 'utf8' });
      const wMatch = sipsOut.match(/pixelWidth:\s*(\d+)/);
      const hMatch = sipsOut.match(/pixelHeight:\s*(\d+)/);
      if (wMatch) width = parseInt(wMatch[1], 10);
      if (hMatch) height = parseInt(hMatch[1], 10);
    } catch (e) {
      console.warn(`sips error on ${p.id}:`, e.message);
    }

    beforeTable.push({
      id: p.id,
      cat: p.cat,
      url: p.src,
      format: ext.replace('.', '').toUpperCase(),
      sizeBytes: origStats.size,
      width,
      height,
      aspectRatio: (width && height) ? (width / height).toFixed(2) : '1.33'
    });

    // Target widths
    const targetWidths = p.cat === 'hero' ? [480, 768, 1080, 1440] : [480, 768, 1080];
    const variants = {};

    for (const tw of targetWidths) {
      const outName = `${p.id}_${tw}w.jpg`;
      const outPath = path.join(respDir, outName);

      try {
        execSync(`sips --resampleWidth ${tw} "${localOrigPath}" --out "${outPath}"`, { stdio: 'ignore' });
        variants[`${tw}w`] = `/images/responsive/${outName}`;
      } catch (e) {
        console.warn(`Error resizing ${p.id} to ${tw}w:`, e.message);
      }
    }

    p.item.width = width || 1200;
    p.item.height = height || 900;
    p.item.variants = variants;
    p.item.srcset = Object.entries(variants).map(([w, url]) => `${url} ${w}`).join(', ');
  }

  // Also process key local images in /images/
  const localImagesToProcess = [
    { name: 'santuario_divina_misericordia.jpg', id: 'santuario' },
    { name: 'arboleda_main.jpg', id: 'arboleda_main' },
    { name: 'arboleda_jardin.jpg', id: 'arboleda_jardin' },
    { name: 'arboleda_coctel.jpg', id: 'arboleda_coctel' },
    { name: 'iglesia_bw.jpg', id: 'iglesia_bw' }
  ];

  for (const loc of localImagesToProcess) {
    const locPath = path.join(rootDir, 'images', loc.name);
    if (fs.existsSync(locPath)) {
      const targetWidths = [480, 768, 1080];
      for (const tw of targetWidths) {
        const outName = `${loc.id}_${tw}w.jpg`;
        const outPath = path.join(respDir, outName);
        try {
          execSync(`sips --resampleWidth ${tw} "${locPath}" --out "${outPath}"`, { stdio: 'ignore' });
        } catch (e) {
          console.warn(`Error resizing local image ${loc.name}:`, e.message);
        }
      }
    }
  }

  // Save updated JSON manifests
  fs.writeFileSync('js/hero_story.json', JSON.stringify(heroStory, null, 2));
  fs.writeFileSync('js/civil_featured.json', JSON.stringify(civil, null, 2));
  fs.writeFileSync('js/guest_shared.json', JSON.stringify(shared, null, 2));

  console.log('Manifests updated with responsive variants and dimensions!');
  fs.writeFileSync('images/before_inventory.json', JSON.stringify(beforeTable, null, 2));
  console.log('Saved images/before_inventory.json');
}

downloadAndProcess();
