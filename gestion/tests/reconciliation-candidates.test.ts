import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('reconciliation candidates have a dedicated review filter and count', () => {
  const page = source('app/dashboard/issues/page.tsx');

  assert.match(page, /type Filter = 'rsvp' \| 'candidates'/);
  assert.match(page, /resolution_status==='candidate'/);
  assert.match(page, /filter==='candidates'/);
  assert.match(page, /<span>Sugerencias<\/span>/);
  assert.match(page, /\['candidates','Sugerencias'\]/);
});

test('probable evidence is never presented as an automatic reconciliation', () => {
  const page = source('app/dashboard/issues/page.tsx');
  const normalized = page.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  assert.match(normalized, /una sugerencia proviene de evidencia probable y no equivale a una conciliacion/);
  assert.match(normalized, /no se crea ni vincula ninguna ficha hasta que una persona confirme la decision/);
  assert.match(page, /candidate\?'Sugerencia':'Pendiente'/);
  assert.match(page, /onClick=\{\(\)=>resolveMember\(member\)\}/, 'existing-guest link still requires an explicit click');
  assert.match(page, /onClick=\{\(\)=>createGuestAndResolve\(member\)\}/, 'new canonical guest still requires an explicit click');
});

test('candidate members are prioritized visually without changing resolution state', () => {
  const page = source('app/dashboard/issues/page.tsx');
  const css = source('app/dashboard/issues/issues-v2.css');

  assert.match(page, /function memberRank\(member:RsvpMember\)/);
  assert.match(page, /members=\(summary\?\.members\|\|\[\]\)\.slice\(\)\.sort/);
  assert.match(page, /candidate\?'is-candidate':''/);
  assert.match(css, /\.issues-v2__member\.is-candidate/);
  assert.match(css, /\.issues-v2__candidate-note/);
});
