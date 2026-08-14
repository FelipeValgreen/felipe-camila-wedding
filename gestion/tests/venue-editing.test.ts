import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('venue separates table interaction from element interaction', () => {
  const page = source('app/dashboard/venue/page.tsx');
  const elements = source('components/VenueEditController.tsx');

  assert.match(page, /fc-venue-interaction-mode/);
  assert.match(page, /detail:'tables'/);
  assert.match(elements, /type InteractionMode='tables'\|'elements'/);
  assert.match(elements, /pointerEvents:interactionMode==='elements'\?'auto':'none'/);
  assert.match(elements, /Mover mesas/);
  assert.match(elements, /Editar elementos/);
});

test('venue table drag and inspector edit metric geometry immediately', () => {
  const page = source('app/dashboard/venue/page.tsx');

  assert.match(page, /onPointerDown=/);
  assert.match(page, /dragRef\.current=table\.id/);
  assert.match(page, /position_x_m/);
  assert.match(page, /position_y_m/);
  assert.match(page, /width_m/);
  assert.match(page, /height_m/);
  assert.match(page, /rotation/);
  assert.match(page, /editSelected\(/);
  assert.match(page, /snapToGrid/);
});

test('Preview persists table moves without writing production', () => {
  const page = source('app/dashboard/venue/page.tsx');

  assert.match(page, /fc-preview-tables-v2/);
  assert.match(page, /persistPreview\(table\)/);
  assert.match(page, /if\(table&&preview\)persistPreview\(table\)/);
  assert.match(page, /Guardar borrador/);
});
