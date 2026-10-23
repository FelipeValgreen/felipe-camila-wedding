// QA visual: captura páginas públicas servidas localmente a varios anchos.
// Uso: node shoot.mjs <label> [baseUrl]
import { chromium } from 'playwright';
import fs from 'node:fs';
const label = process.argv[2] || 'shot';
const base = process.argv[3] || 'http://127.0.0.1:8099';
const pages = ['/fotos/', '/plot-twist/', '/fotos/raspe/', '/fotos/complice/', '/fotos/premios/', '/galeria/', '/'];
const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];
const out = `/home/claude/qa/${label}`; fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on('pageerror', e => consoleErrs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'load', timeout: 30000 }).catch(e => consoleErrs.push('nav ' + p + ': ' + e.message));
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth, vw = innerWidth;
      const over = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).visibility !== 'hidden'; }).slice(0, 5).map(el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
      const small = [...document.querySelectorAll('p,li,label,span,a,button,figcaption,input,h3,h4,small')].filter(el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && parseFloat(cs.fontSize) < 16 && el.textContent.trim().length > 2 && !el.closest('[hidden]'); }).map(el => Math.round(parseFloat(getComputedStyle(el).fontSize)) + 'px ' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ' "' + el.textContent.trim().slice(0, 28) + '"');
      const tiny = [...document.querySelectorAll('a,button,label,input[type=file],[role=button]')].filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && (r.height < 44 || r.width < 44); }).map(el => Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height) + ' ' + el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ' "' + el.textContent.trim().slice(0, 24) + '"');
      return { hOverflow: docW > vw ? docW - vw : 0, over, small: [...new Set(small)].slice(0, 25), tiny: [...new Set(tiny)].slice(0, 25) };
    });
    const file = `${out}/${p.replace(/\//g, '_') || '_root'}-${w}.png`;
    await page.screenshot({ path: file, fullPage: true });
    report.push({ page: p, width: w, ...info, errors: consoleErrs.splice(0) });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) if (r.hOverflow || r.small.length || r.tiny.length || r.errors.length) console.log(`${r.page} @${r.width}: hOverflow=${r.hOverflow}${r.over.length ? ' over=' + r.over.join(',') : ''}\n  small(<16px)=${r.small.length}: ${r.small.slice(0, 6).join(' | ')}\n  tiny(<44px)=${r.tiny.length}: ${r.tiny.slice(0, 6).join(' | ')}${r.errors.length ? '\n  errors: ' + r.errors.slice(0, 3).join(' ; ') : ''}`);
console.log('done ->', out);
