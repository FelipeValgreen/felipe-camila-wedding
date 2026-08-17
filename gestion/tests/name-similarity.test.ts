import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nameSimilarity, suggestNameMatches } from '../lib/name-similarity';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('name similarity catches conservative typo and two-token containment cases', () => {
  assert.ok(nameSimilarity('Verónica Oyarce', 'Verónica Oyarze') >= 0.85);
  assert.ok(nameSimilarity('Jorge Faltin Villalobos', 'Jorge Faltin') >= 0.84);
  assert.ok(nameSimilarity('Paulo Olate S', 'Paulo Olate') >= 0.84);
});

test('name similarity avoids broad first-name-only suggestions', () => {
  assert.ok(nameSimilarity('Virginia Figuetoa', 'Virginia') < 0.8);
  assert.ok(nameSimilarity('Marcela Tapia', 'Cristóbal Bernstein') < 0.5);
});

test('suggestions exclude exact matches and return only the strongest approximate options', () => {
  const guests = [
    { id: 'exact', name: 'Verónica Oyarce' },
    { id: 'typo', name: 'Verónica Oyarze' },
    { id: 'other', name: 'Marcelo Vargas' }
  ];
  const matches = suggestNameMatches('Verónica Oyarce', guests, guest => guest.name, 0.8, 3);
  assert.deepEqual(matches.map(match => match.item.id), ['typo']);
});

test('issues UI only preselects a possible ficha and still requires explicit Vincular', () => {
  const page = source('app/dashboard/issues/page.tsx');
  const normalized = page.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  assert.match(page, /suggestNameMatches\(member\.display_name,guestOptions,fullGuestName,0\.8,3\)/);
  assert.match(normalized, /posibles fichas por similitud de nombre/);
  assert.match(normalized, /esto solo preselecciona una ficha posible/);
  assert.match(page, /onClick=\{\(\)=>setSelectedGuestByMember/);
  assert.match(page, /onClick=\{\(\)=>resolveMember\(member\)\}/);
  assert.match(page, /disabled=\{!selected\|\|Boolean\(busyKey\)\}/);
});
