// Staged concurrency test against the LOCAL mock (identical API contract). No production data touched.
const BASE = process.env.BASE || 'http://127.0.0.1:8098';
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
async function session(i) {
  const device = crypto.randomUUID(); const t = { join: 0, answer: [], state: 0, err: 0 };
  const call = async (body) => { const t0 = performance.now(); const r = await fetch(BASE + '/api/plot-twist/express' + (body ? '' : '?device=' + device), { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify({ ...body, deviceToken: device }) : undefined }); const j = await r.json(); if (!r.ok) t.err++; return [j, performance.now() - t0]; };
  let [, d] = await call({ op: 'join', nickname: 'Load' + i, tableCode: String(1 + (i % 23)) }); t.join = d;
  for (let q = 1; q <= 8; q++) { const [, da] = await call({ op: 'answer', question: q, answer: q % 3 }); t.answer.push(da); }
  // one deliberate duplicate submit of q8 (retry simulation)
  await call({ op: 'answer', question: 8, answer: 1 });
  [, d] = await call(); t.state = d; return t;
}
for (const n of [10, 25, 50, 100, 150, 250, 300]) {
  const t0 = performance.now(); const rs = await Promise.all(Array.from({ length: n }, (_, i) => session(i + n * 1000)));
  const joins = rs.map(r => r.join), answers = rs.flatMap(r => r.answer), states = rs.map(r => r.state), errs = rs.reduce((s, r) => s + r.err, 0);
  console.log(`${String(n).padStart(3)} sesiones | total ${Math.round(performance.now() - t0)}ms | join p50 ${pct(joins,.5).toFixed(0)} p95 ${pct(joins,.95).toFixed(0)} p99 ${pct(joins,.99).toFixed(0)}ms | answer p50 ${pct(answers,.5).toFixed(0)} p95 ${pct(answers,.95).toFixed(0)} p99 ${pct(answers,.99).toFixed(0)}ms | ranking p50 ${pct(states,.5).toFixed(0)} p95 ${pct(states,.95).toFixed(0)}ms | errores ${errs}`);
}
const st = await (await fetch(BASE + '/__stats')).json(); console.log('mock stats:', JSON.stringify(st));
