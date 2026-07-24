import fs from 'fs';
import path from 'path';

console.log('--- RUNNING PUBLIC SITE REGRESSION GUARD AUDIT ---');

let failures = 0;
function assertInvariant(condition, description) {
  if (!condition) {
    console.error(`❌ REGRESSION FAILURE: ${description}`);
    failures++;
  } else {
    console.log(`✓ OK: ${description}`);
  }
}

const indexHtml = fs.readFileSync('index.html', 'utf8');
const mainJs = fs.readFileSync('js/main.js', 'utf8');
const galleryApi = fs.readFileSync('api/gallery.js', 'utf8');
const galeriaHtml = fs.readFileSync('galeria/index.html', 'utf8');
const fotosHtml = fs.readFileSync('fotos/index.html', 'utf8');
const civilFeaturedJson = fs.readFileSync('js/civil_featured.json', 'utf8');
const guestSharedJson = fs.readFileSync('js/guest_shared.json', 'utf8');

// 1. Schedule checks
assertInvariant(indexHtml.includes('17:30'), 'index.html contains 17:30 ceremony start time');
assertInvariant(!indexHtml.includes('17:50'), 'index.html does not contain old 17:50 ceremony time');
assertInvariant(mainJs.includes('T17:30:00-03:00'), 'js/main.js contains 2026-10-23T17:30:00-03:00 ISO event date');
assertInvariant(indexHtml.includes('18:30') && indexHtml.includes('19:30'), 'index.html maintains cocktail 18:30 and dinner 19:30');

// 2. Dress code checks
assertInvariant(!indexHtml.includes('Una noche formal, elegante y celebratoria'), 'Old dress code phrase does not exist');
assertInvariant(indexHtml.includes('Una noche para celebrar con elegancia y estilo.'), 'New dress code phrase exists in index.html');

// 3. Layout structure & WhatsApp block checks
const rsvpWaPos = indexHtml.indexOf('id="rsvp-tab-wa"');
const noviosBlockPos = indexHtml.indexOf('id="codigo-novios-block"');
assertInvariant(rsvpWaPos !== -1 && noviosBlockPos !== -1 && noviosBlockPos > rsvpWaPos, 'codigo-novios-block appears after rsvp-tab-wa in index.html');

assertInvariant(!indexHtml.includes('¿Ya habías confirmado y necesitas modificar tu respuesta?'), 'Old redundant WhatsApp text in form is removed');
assertInvariant(!indexHtml.includes('¿Necesitas ayuda? Escríbenos por WhatsApp.'), 'Discrete support phrase is removed from index.html');
assertInvariant(!indexHtml.includes('ESCRIBIR AL WHATSAPP DEL MATRIMONIO'), 'Old full-width green WhatsApp button is removed');
assertInvariant(indexHtml.includes('O CONFIRMA POR WHATSAPP'), 'WhatsApp separator text O CONFIRMA POR WHATSAPP exists');
assertInvariant(indexHtml.includes('CONFIRMAR POR WHATSAPP'), 'WhatsApp card title CONFIRMAR POR WHATSAPP exists');
assertInvariant(indexHtml.includes('Abriremos una conversación para registrar tu respuesta personalmente.'), 'WhatsApp card subtitle exists');
assertInvariant(indexHtml.includes('ABRIR WHATSAPP →'), 'WhatsApp card action ABRIR WHATSAPP → exists');
assertInvariant(indexHtml.includes('id="rsvp-whatsapp-alternative-block"'), 'rsvp-whatsapp-alternative-block wrapper exists in index.html');
const waCardCount = (indexHtml.match(/id="rsvp-tab-wa"/g) || []).length;
assertInvariant(waCardCount === 1, `Exactly 1 WhatsApp card exists in index.html (found ${waCardCount})`);

const historiaSectionPos = indexHtml.indexOf('id="historia"');
const rsvpSectionPos = indexHtml.indexOf('id="rsvp"');
assertInvariant(historiaSectionPos !== -1 && rsvpSectionPos !== -1 && rsvpSectionPos > historiaSectionPos, 'Section #rsvp is placed after #historia (not nested)');

// 4. Hero mobile focal window check
assertInvariant(indexHtml.includes('hero-photo-window'), 'index.html contains hero-photo-window element');

// 5. Internal navigation & back button checks
assertInvariant(!indexHtml.includes('href="/galeria/?filtro=todas" target="_blank"'), 'Internal nav link to galeria does not have target="_blank"');
assertInvariant(galeriaHtml.includes('href="/?open=1#hero"'), 'galeria/index.html back links point to /?open=1#hero');
assertInvariant(fotosHtml.includes('href="/?open=1#hero"'), 'fotos/index.html back links point to /?open=1#hero');

// 5b. Post-upload view photos button & instant refresh checks
assertInvariant(fotosHtml.includes('href="/galeria/?filtro=despues&refresh=1"'), 'fotos/index.html view-photos-btn points to /galeria/?filtro=despues&refresh=1');
assertInvariant(fotosHtml.includes('VER FOTOS EN LA GALERÍA'), 'fotos/index.html view-photos-btn displays VER FOTOS EN LA GALERÍA');
assertInvariant(!fotosHtml.includes('href="/#galeria-compartidas"'), 'fotos/index.html no longer points to old /#galeria-compartidas');
assertInvariant(!fotosHtml.includes('target="_blank"'), 'fotos/index.html contains no target="_blank" links');
assertInvariant(galeriaHtml.includes('isRefreshRequest'), 'galeria/index.html contains isRefreshRequest cache bypass logic');
assertInvariant(galleryApi.includes('isRefresh'), 'api/gallery.js supports isRefresh no-store cache header');

// 6. Photo orientation & clean architecture checks
assertInvariant(guestSharedJson.includes('shared_4_v3') && guestSharedJson.includes('shared_5_v3') && guestSharedJson.includes('shared_6_v3'), 'guest_shared.json items 4, 5, 6 use v3 variants');
assertInvariant(!galleryApi.includes('ROTATION_MAP'), 'api/gallery.js does not contain ROTATION_MAP');
assertInvariant(!galeriaHtml.includes('rotate(${photo.rotation}deg)'), 'galeria/index.html does not apply CSS rotate to images');

// 7. Sensitive civil photo removal & blocking checks
assertInvariant(!civilFeaturedJson.includes('guest_540688d7-62a4-43a4-9308-0471a05155d6'), 'Old removed photo is absent from civil_featured.json');
assertInvariant(!civilFeaturedJson.includes('guest_803abb01-f60a-4136-82de-0621ac183099'), 'Sensitive photo 1 (guest_803abb01) is absent from civil_featured.json');
assertInvariant(!civilFeaturedJson.includes('guest_07940307-055c-4529-9b89-f74b41537849'), 'Sensitive photo 2 (guest_07940307) is absent from civil_featured.json');
assertInvariant(galleryApi.includes('BLOCKED_PHOTO_FILES'), 'api/gallery.js contains BLOCKED_PHOTO_FILES set');
assertInvariant(galleryApi.includes('guest_803abb01-f60a-4136-82de-0621ac183099.jpeg'), 'api/gallery.js explicitly blocks guest_803abb01');
assertInvariant(galleryApi.includes('guest_07940307-055c-4529-9b89-f74b41537849.jpeg'), 'api/gallery.js explicitly blocks guest_07940307');

// 8. Disk existence of v3/v4 image variants
const requiredImageFiles = [
  'images/responsive/shared_4_v3_768w.jpg',
  'images/responsive/shared_5_v3_768w.jpg',
  'images/responsive/shared_6_v3_768w.jpg',
  'images/responsive/civil_4_v4_768w.jpg',
  'images/responsive/civil_5_v4_768w.jpg',
  'images/normalized/shared_4_v3_1600w.jpg'
];
for (const f of requiredImageFiles) {
  assertInvariant(fs.existsSync(f), `Required image file exists on disk: ${f}`);
}

const deletedSensitiveFiles = [
  'images/responsive/civil_5_v3_768w.jpg',
  'images/responsive/civil_6_768w.jpg'
];
for (const f of deletedSensitiveFiles) {
  assertInvariant(!fs.existsSync(f), `Sensitive image file is absent from disk: ${f}`);
}

// 9. Favicons check
assertInvariant(indexHtml.includes('favicon.ico?v=4'), 'Favicons in index.html use ?v=4');

if (failures > 0) {
  console.error(`\n❌ REGRESSION GUARD AUDIT FAILED WITH ${failures} FAILURE(S).`);
  process.exit(1);
} else {
  console.log('\n✅ ALL PUBLIC SITE INVARIANTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
