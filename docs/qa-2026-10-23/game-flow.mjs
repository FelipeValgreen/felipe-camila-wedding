// Functional QA of /plot-twist/ against the local mock (same API contract). Real browser (Chromium, mobile viewport).
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:8098';
const b = await chromium.launch();
const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : '')); };
async function newGuest(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...opts });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '/plot-twist/', { waitUntil: 'load' }); await page.waitForTimeout(300);
  return { ctx, page, errs };
}
const text = p => p.locator('#card').innerText();
async function join(page, name, table) {
  await page.fill('#name', name); await page.fill('#table', table); await page.click('#go');
  await page.waitForFunction(() => !document.querySelector('#go') || document.querySelector('#err')?.textContent, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
}
async function answerAll(page, picks, perDelay = 60) {
  for (let i = 0; i < 8; i++) {
    for (let k = 0; k < 40; k++) { const t = await text(page); if (/Ronda \d completada/.test(t)) { await page.click('#continue-round'); await page.waitForTimeout(80); } if (/Terminaste/.test(t)) return; if (await page.$('.ans:not([disabled])')) break; await page.waitForTimeout(100); }
    await page.locator('.ans').nth(picks[i]).click(); await page.waitForTimeout(perDelay);
  }
}
// 1. Registration shows immediately, table validation, novios accepted
{ const g = await newGuest(); const t0 = await text(g.page); ok('Formulario de registro visible de inmediato', /QUIERO JUGAR/i.test(t0));
  await join(g.page, 'Tía Rosa', '99'); ok('Mesa 99 rechazada con mensaje claro', /1 al 23 o Novios/.test(await g.page.locator('#err').innerText()));
  await join(g.page, 'Tía Rosa', 'Mesa 12'); ok('"Mesa 12" (con prefijo) aceptada', /Pregunta 1 de 8/.test(await text(g.page)), (await text(g.page)).slice(0, 60));
  await g.ctx.close(); }
{ const g = await newGuest(); await join(g.page, 'Felipe', 'Novios'); ok('Mesa "Novios" aceptada', /Pregunta 1 de 8/.test(await text(g.page))); await g.ctx.close(); }
// 2. Two people same name same table → second gets a suffix, nobody blocked
{ const a = await newGuest(), c = await newGuest();
  await join(a.page, 'Juan', '5'); await join(c.page, 'Juan', '5');
  ok('Dos "Juan" en mesa 5: ambos entran', /Pregunta 1/.test(await text(a.page)) && /Pregunta 1/.test(await text(c.page)));
  const name2 = await c.page.evaluate(() => localStorage.getItem('fc_guest_name')); ok('Segundo Juan recibe apodo único', name2 !== 'Juan', name2);
  await a.ctx.close(); await c.ctx.close(); }
// 3. Full run: instant transition, interludes, ranking, roulette, double-tap, reload persistence
{ const g = await newGuest(); await join(g.page, 'Abuela Carmen', '7');
  const t1 = performance.now(); await g.page.locator('.ans').nth(1).click(); await g.page.waitForFunction(() => /Pregunta 2 de 8/.test(document.querySelector('#card').innerText), null, { timeout: 3000 }).catch(() => {}); const dt = Math.round(performance.now() - t1);
  ok('Transición a pregunta 2 inmediata (<300ms)', dt < 300, dt + 'ms');
  // double tap on same question: click twice fast on q2
  await g.page.waitForTimeout(500); await g.page.waitForSelector('.ans:not([disabled])'); const bx = await g.page.locator('.ans').nth(0).boundingBox(); await g.page.mouse.click(bx.x + 20, bx.y + 20); await g.page.waitForTimeout(120); await g.page.mouse.click(bx.x + 20, bx.y + 20); await g.page.waitForTimeout(300);
  const after = await text(g.page); ok('Doble toque (120ms, mismo punto) registra una sola respuesta', /Pregunta 3 de 8/.test(after), after.match(/Pregunta \d/)?.[0]);
  await g.page.waitForTimeout(500); await answerAll(g.page, [0, 0, 2, 1, 0, 2, 0, 1], 650); // q1,q2 already answered; picks index by remaining
  await g.page.waitForFunction(() => /Terminaste/.test(document.querySelector('#card').innerText), null, { timeout: 8000 });
  await g.page.waitForFunction(() => document.querySelector('#fun-spin') || /Cargando el ranking/.test(document.querySelector('#card').innerText), null, { timeout: 8000 });
  await g.page.waitForSelector('#fun-spin', { timeout: 8000 }).catch(() => {});
  const fin = await text(g.page); ok('Pantalla final con ranking y ruleta', /Ranking por mesa/.test(fin) && !!(await g.page.$('#fun-spin')));
  const pts = await g.page.evaluate(() => document.querySelector('#status').textContent); ok('Puntos personales mostrados', /puntos/.test(pts), pts);
  await g.page.click('#fun-spin'); await g.page.waitForTimeout(100); const dis = await g.page.$eval('#fun-spin', e => e.disabled); ok('Ruleta: un solo giro (botón se desactiva)', dis);
  await g.page.waitForFunction(() => /\d\d /.test(document.querySelector('#fun-result').textContent) || document.querySelector('#fun-result strong'), null, { timeout: 7000 }).catch(() => {});
  const res = await g.page.locator('#fun-result').innerText(); ok('Ruleta muestra una misión', /\d\d/.test(res), res.slice(0, 50));
  await g.page.reload({ waitUntil: 'load' }); await g.page.waitForTimeout(600);
  const re = await text(g.page); ok('Recarga conserva sesión y resultado final', /Terminaste/.test(re));
  const spinAfter = await g.page.$eval('#fun-spin', e => e.disabled).catch(() => null); ok('Recarga conserva el giro de la ruleta', spinAfter === true);
  ok('Sin errores JS en consola', g.errs.length === 0, g.errs.join(' | ').slice(0, 120));
  await g.ctx.close(); }
// 4. Slow network: answers still advance instantly and sync later
{ const g = await newGuest(); await g.page.route('**/api/plot-twist/express', async r => { if (r.request().method() === 'POST' && /"op":"answer"/.test(r.request().postData() || '')) await new Promise(x => setTimeout(x, 1500)); r.continue(); });
  await join(g.page, 'Lento', '3'); const t1 = performance.now(); await g.page.locator('.ans').nth(1).click(); await g.page.waitForFunction(() => /Pregunta 2/.test(document.querySelector('#card').innerText), null, { timeout: 3000 }).catch(() => {}); const dt = Math.round(performance.now() - t1);
  ok('Red lenta (1.5s): la pregunta avanza igual sin esperar', dt < 400, dt + 'ms');
  await g.page.waitForTimeout(2200); const st = await g.page.locator('#status').innerText(); ok('Estado muestra "respuestas guardadas" tras sincronizar', /guardadas/.test(st), st); await g.ctx.close(); }
// 5. Offline during answer: recovery UI with retry, no false confirmation
{ const g = await newGuest(); await join(g.page, 'SinRed', '4'); await g.ctx.setOffline(true); await g.page.locator('.ans').nth(1).click(); await g.page.waitForTimeout(1500);
  const t = await text(g.page) + ' ' + await g.page.locator('#status').innerText(); ok('Sin conexión: pantalla de reintento, sin confirmación falsa', /Reintentar|Reconectando|Sin conexión/.test(t), t.slice(0, 80));
  await g.ctx.setOffline(false); const btn = await g.page.$('#retry-sync'); if (btn) { await btn.click(); await g.page.waitForTimeout(800); }
  const t2 = await text(g.page); ok('Tras reconectar se recupera el estado del servidor', /Pregunta [12] de 8/.test(t2), t2.match(/Pregunta \d/)?.[0]); await g.ctx.close(); }
await b.close();
const fails = results.filter(r => !r.pass).length; console.log(`\n${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);
