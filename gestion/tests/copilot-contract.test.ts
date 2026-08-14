import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) { return readFileSync(resolve(process.cwd(), path), 'utf8'); }

test('Copiloto keeps all current confirmable backend action types', () => {
  const content = source('app/api/copilot/route.ts');
  const expected = ['guest.create','music.create','timeline.create','task.create','memory.create','table.rename'];
  for (const action of expected) assert.match(content, new RegExp(action.replace('.', '\\.')), `Copiloto must keep action ${action}`);
  assert.match(content, /requiresConfirmation:\s*true/);
});

test('Copiloto keeps the grounded operational review intents that previously failed in UI', () => {
  const normalized = source('app/api/copilot/route.ts').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  assert.match(normalized, /revis[a-z]*\s+lista|lista\s+actualizada/);
  assert.match(normalized, /que\s+cambio|cambios\s+desde|ultima\s+revision/);
  assert.match(normalized, /coordina|coordinacion|requiere\s+atencion/);
});

test('OpenAI tool mode proposes rather than directly mutating data', () => {
  const content = source('app/api/copilot/route.ts');
  for (const tool of ['propose_guest','propose_table_rename','propose_memory','propose_music_item','propose_timeline_block','propose_task']) assert.match(content, new RegExp(tool));
  assert.doesNotMatch(content, /function\s+direct_(?:insert|update|delete)/i);
});

test('external generative AI is explicit opt-in so zero-cost mode cannot call it accidentally', () => {
  const backend = source('app/api/copilot/route.ts');
  const health = source('app/api/system-health/route.ts');
  assert.match(backend, /ENABLE_EXTERNAL_AI/);
  assert.match(backend, /EXTERNAL_AI_ENABLED/);
  assert.match(backend, /if \(EXTERNAL_AI_ENABLED\)/);
  assert.match(backend, /openai\/gpt-5\.6-sol/);
  assert.match(health, /ENABLE_EXTERNAL_AI/);
  assert.match(health, /Motor operacional costo 0/);
});

test('Copiloto UI keeps visible operational shortcuts for list review and attention', () => {
  const normalized = source('components/PlanningCopilot.tsx').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  assert.match(normalized, /revisar lista actualizada/);
  assert.match(normalized, /que cambio desde mi ultima revision|que requiere atencion ahora/);
});

test('Copiloto zero-cost operations cover all editable management domains', () => {
  const component = source('components/PlanningCopilot.tsx');
  const parser = source('lib/copilot-operations.ts');
  const joined = `${component}\n${parser}`;
  const expected = ['guest.create','guest.update','guest.delete','table.rename','table.create','table.update','table.delete','seating.assign','seating.unassign','music.create','music.update','music.delete','timeline.create','timeline.update','timeline.delete','task.create','task.update','task.delete','budget.create','budget.update','budget.delete','vendor.create','vendor.update','vendor.delete','payment.create'];
  for (const action of expected) assert.match(joined, new RegExp(action.replace('.', '\\.')), `Missing operational action ${action}`);
  for (const endpoint of ['/api/guests','/api/tables','/api/seating','/api/music-source','/api/timeline-source','/api/tasks','/api/budget-source','/api/vendors','/api/budget-payments']) assert.match(component, new RegExp(endpoint.replace(/\//g,'\\/')));
  assert.match(component, /Confirmar/);
});

test('Copiloto parser recognizes direct table, seating, planning and finance commands', () => {
  const content = source('lib/copilot-operations.ts').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const term of ['mueve','gira','asigna','bloque','tarea','presupuesto','proveedor','pago']) assert.match(content, new RegExp(term));
  assert.match(content, /cancion|canci\[oo\]n/);
  assert.match(content, /position_x_m/);
  assert.match(content, /position_y_m/);
});

test('Preview CRUD domains use persistent structured state', () => {
  const component = source('components/PlanningCopilot.tsx');
  const music = source('app/dashboard/music/page.tsx');
  const timeline = source('app/dashboard/timeline/page.tsx');
  const tasks = source('components/ManualTasksDock.tsx');
  assert.match(component, /readPreviewEntityState/);
  for (const content of [music,timeline,tasks]) {
    assert.match(content, /readPreviewEntityState/);
    assert.match(content, /mergePreviewEntities/);
    assert.match(content, /upsertPreviewEntity/);
    assert.match(content, /removePreviewEntity/);
  }
});

test('Finance refreshes immediately after confirmed Copilot mutations', () => {
  const component = source('components/PlanningCopilot.tsx');
  const finance = source('app/dashboard/finance/page.tsx');
  assert.match(component, /fc-preview-finance-changed/);
  assert.match(component, /fc-data-finance-changed/);
  assert.match(finance, /fc-preview-finance-changed/);
  assert.match(finance, /fc-data-finance-changed/);
});
