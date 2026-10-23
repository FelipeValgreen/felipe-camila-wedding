// Local stand-in for /api/plot-twist/express with the SAME contract as production (no real DB touched).
// Serves the repo statically and emulates: 24 tables, join (nickname collision per table, device already joined),
// answer (order guard, idempotent per (player,question), 100/0), state, health. Adds optional latency via ?lag.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const ROOT = '/home/claude/felipe-camila-wedding';
const correct = [1, 0, 2, 1, 0, 2, 0, 1];
const LAG = Number(process.env.LAG || 0);
const tables = [...Array.from({ length: 23 }, (_, i) => String(i + 1)), 'novios'].map(c => ({ id: 't-' + c, code: c, team_name: c === 'novios' ? 'Novios' : 'Mesa ' + c }));
const players = new Map(); // deviceToken -> {id, nickname, table}
const answers = new Map(); // playerId -> Map(question -> {answer, points})
export const stats = { joins: 0, answers: 0, states: 0, dupAnswerCalls: 0, outOfOrder: 0 };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
function state(token, full = true) {
  const p = players.get(token); if (!p) return { player: null };
  const a = [...(answers.get(p.id) || new Map()).entries()].sort((x, y) => x[0] - y[0]).map(([question, v]) => ({ question, ...v }));
  const personalPoints = a.reduce((n, x) => n + x.points, 0);
  if (!full || a.length < 8) return { player: { nickname: p.nickname }, table: { id: p.table.id, name: p.table.team_name }, answers: a, personalPoints, ranking: [] };
  const per = new Map();
  for (const pl of players.values()) { const m = answers.get(pl.id); if (!m || m.size !== 8) continue; const t = per.get(pl.table.id) || { n: 0, pts: 0 }; t.n++; t.pts += [...m.values()].reduce((s, v) => s + v.points, 0); per.set(pl.table.id, t); }
  const ranking = tables.map(t => { const v = per.get(t.id); const count = v?.n || 0; const isNovios = t.code === 'novios'; return { id: t.id, name: t.team_name, players: count, points: v?.pts || 0, score: count ? Math.round((v.pts) / count) : 0, eligible: count >= 3 && !isNovios, isNovios }; }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || b.players - a.players);
  return { player: { nickname: p.nickname }, table: { id: p.table.id, name: p.table.team_name }, answers: a, personalPoints, ranking };
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/plot-twist/express') {
    if (LAG) await new Promise(r => setTimeout(r, LAG + Math.random() * LAG));
    if (req.method === 'GET') { if (u.searchParams.get('op') === 'health') return json(res, 200, { ok: true, tables: 24, missingCodes: [] }); stats.states++; return json(res, 200, state(u.searchParams.get('device') || '')); }
    let body = ''; for await (const c of req) body += c; let b = {}; try { b = JSON.parse(body || '{}'); } catch { return json(res, 400, { error: 'BAD_JSON' }); }
    const token = String(b.deviceToken || ''); if (!/^[a-zA-Z0-9-]{20,100}$/.test(token)) return json(res, 400, { error: 'INVALID_DEVICE' });
    if (b.op === 'join') {
      stats.joins++;
      const code = String(b.tableCode || '').trim().toLowerCase().replace(/^mesa\s*(?:n[úu]mero\s*)?/, '');
      const table = tables.find(t => t.code === code); if (!table) return json(res, 400, { error: 'TABLE_NOT_FOUND' });
      const name = String(b.nickname || '').trim().replace(/\s+/g, ' ').slice(0, 32); if (!name) return json(res, 400, { error: 'NICKNAME_REQUIRED' });
      let p = players.get(token);
      if (p && p.table.id !== table.id) return json(res, 409, { error: 'DEVICE_ALREADY_JOINED' });
      if (!p) {
        for (const o of players.values()) if (o.table.id === table.id && o.nickname.toLowerCase() === name.toLowerCase()) return json(res, 409, { error: 'NICKNAME_TAKEN' });
        p = { id: crypto.randomUUID(), nickname: name, table }; players.set(token, p);
        return json(res, 200, { player: { nickname: p.nickname }, table: { id: table.id, name: table.team_name }, answers: [], personalPoints: 0, ranking: [] });
      }
      return json(res, 200, state(token));
    }
    if (b.op === 'answer') {
      const p = players.get(token); if (!p) return json(res, 401, { error: 'SESSION_NOT_FOUND' });
      const q = Number(b.question), a = Number(b.answer);
      if (!Number.isInteger(q) || q < 1 || q > 8 || !Number.isInteger(a) || a < 0 || a > 2) return json(res, 400, { error: 'BAD_ANSWER' });
      const m = answers.get(p.id) || new Map(); answers.set(p.id, m);
      if (!m.has(q) && m.size !== q - 1) { stats.outOfOrder++; return json(res, 409, { error: 'ANSWER_OUT_OF_ORDER' }); }
      if (m.has(q)) stats.dupAnswerCalls++; else m.set(q, { answer: a, points: a === correct[q - 1] ? 100 : 0 });
      stats.answers++;
      return json(res, 200, { ok: true, question: q, answer: a, points: m.get(q).points });
    }
    return json(res, 400, { error: 'UNKNOWN_OPERATION' });
  }
  if (u.pathname === '/__stats') return json(res, 200, { ...stats, players: players.size, fullyAnswered: [...answers.values()].filter(m => m.size === 8).length });
  let fp = path.join(ROOT, decodeURIComponent(u.pathname)); if (fp.endsWith('/')) fp += 'index.html';
  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(res);
});
server.listen(Number(process.env.PORT || 8098), '127.0.0.1', () => console.log('mock express on', process.env.PORT || 8098, 'lag', LAG));
