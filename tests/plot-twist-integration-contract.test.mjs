import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('alliance resolver awards secret points to both sides with distinct idempotency keys',()=>{
 const sql=file('supabase/migrations/20261010163000_plot_twist_alliances.sql');
 assert.match(sql,/alliance_verified',md5\(a\.id::text\|\|':source'\)::uuid/);
 assert.match(sql,/alliance_verified',md5\(a\.id::text\|\|':target'\)::uuid/);
 assert.match(sql,/for update/);
});
test('unreviewed transactional features remain gated by default',()=>{
 const engine=file('api/_lib/plot-twist-engine.js');
 assert.match(engine,/PLOT_TWIST_ATOMIC_SPIN!=='enabled'/);
 assert.match(engine,/PLOT_TWIST_ATOMIC_POWERS!=='enabled'/);
 assert.match(engine,/PLOT_TWIST_ALLIANCES!=='enabled'/);
});
test('projection hides finale until reveal or ended',()=>{
 const screen=file('api/plot-twist/screen.js');
 assert.match(screen,/\['reveal','ended'\]\.includes\(g\.status\)/);
});

test('individual vote snapshot scopes query to current player',()=>{
 const engine=file('api/_lib/plot-twist-engine.js');
 assert.match(engine,/stage\.type==='individual_callback'\?'&player_id=eq\.'\+player\.id/);
});
