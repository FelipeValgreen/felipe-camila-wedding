import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const isotypeSource = '/Users/valgreen/.gemini/antigravity/brain/94ea7098-d7d9-44f3-9e42-962542303365/.user_uploaded/media__1784843759284.jpg';

const imagesDir = path.join(rootDir, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Copy main isotype to /images/
const mainIsotypeJpg = path.join(imagesDir, 'isotype-fc.jpg');
const mainIsotypePng = path.join(imagesDir, 'isotype-fc.png');

fs.copyFileSync(isotypeSource, mainIsotypeJpg);
console.log('Copied isotype to images/isotype-fc.jpg');

// Convert to PNG via sips
execSync(`sips -s format png "${mainIsotypeJpg}" --out "${mainIsotypePng}"`, { stdio: 'ignore' });
console.log('Created images/isotype-fc.png');

// Generate favicons
const faviconSizes = [
  { name: 'favicon-fc-16x16.png', size: 16 },
  { name: 'favicon-fc-32x32.png', size: 32 },
  { name: 'apple-touch-icon-fc.png', size: 180 },
  { name: 'android-chrome-fc-192x192.png', size: 192 },
  { name: 'android-chrome-fc-512x512.png', size: 512 }
];

for (const fav of faviconSizes) {
  const outPath = path.join(rootDir, fav.name);
  execSync(`sips -z ${fav.size} ${fav.size} "${mainIsotypePng}" --out "${outPath}"`, { stdio: 'ignore' });
  console.log(`Generated ${fav.name} (${fav.size}x${fav.size})`);
}

// Copy 32x32 as favicon.ico
fs.copyFileSync(path.join(rootDir, 'favicon-fc-32x32.png'), path.join(rootDir, 'favicon.ico'));
console.log('Created favicon.ico');
