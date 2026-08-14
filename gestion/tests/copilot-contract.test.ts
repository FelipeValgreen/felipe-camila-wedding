import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('Copiloto keeps all current confirmable backend action types', () => {
  const content = source('app/api/copilot/route.ts');
  const expected = [
    'guest.create',
    'music.create',
    'timeline.create',
    'task.create',
    'memory.create',
    'table.rename'
  ];

  for (const action of expected) {
    assert.match(content, new RegExp(action.replace('.', '\\.')), `Copiloto must keep action ${action}`);
  }
  assert.match(content, /requiresConfirmation:\s*true/, 'Copiloto mutations must remain confirmable, never silent');
});

test('Copiloto keeps the grounded operational review intents that previously failed in UI', () => {
  const content = source('app/api/copilot/route.ts');
  const normalized = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  assert.match(normalized, /revis[a-z]*\s+lista|lista\s+actualizada/, 'Copiloto must recognize updated guest-list review');
  assert.match(normalized, /que\s+cambio|cambios\s+desde|ultima\s+revision/, 'Copiloto must support delta review');
  assert.match(normalized, /coordina|coordinacion|requiere\s+atencion/, 'Copiloto must keep operational coordination fallback');
});

test('OpenAI tool mode proposes rather than directly mutating data', () => {
  const content = source('app/api/copilot/route.ts');
  const toolNames = [
    'propose_guest',
    'propose_table_rename',
    'propose_memory',
    'propose_music_item',
    'propose_timeline_block',
    'propose_task'
  ];

  for (const tool of toolNames) {
    assert.match(content, new RegExp(tool), `OpenAI tool ${tool} must remain available`);
  }
  assert.doesNotMatch(content, /function\s+direct_(?:insert|update|delete)/i, 'LLM tool layer must not expose silent direct mutation helpers');
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
  const content = source('components/PlanningCopilot.tsx');
  const normalized = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  assert.match(normalized, /revisar lista actualizada/);
  assert.match(normalized, /que cambio desde mi ultima revision|que requiere atencion ahora/);
});

test('Copiloto UI can prepare cost-zero create update delete and seating actions', () => {
  const content = source('components/PlanningCopilot.tsx');
  const expected = [
    'guest.create',
    'guest.update',
    'guest.delete',
    'table.rename',
    'table.create',
    'table.update',
    'table.delete',
    'seating.assign',
    'seating.unassign'
  ];

  for (const action of expected) {
    assert.match(content, new RegExp(action.replace('.', '\\.')), `Copiloto UI must keep operational action ${action}`);
  }
  assert.match(content, /\/api\/guests/);
  assert.match(content, /\/api\/tables/);
  assert.match(content, /\/api\/seating/);
  assert.match(content, /fc-preview-guests-v1/);
  assert.match(content, /fc-preview-tables-v2/);
  assert.match(content, /Confirmar/, 'Mutations must remain behind explicit confirmation');
});

test('Copiloto UI recognizes direct guest table seating and venue-position commands', () => {
  const content = source('components/PlanningCopilot.tsx');
  const normalized = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  assert.match(normalized, /mueve|posiciona/);
  assert.match(normalized, /gira|rota/);
  assert.match(normalized, /asigna|sienta/);
  assert.match(normalized, /elimina|borra/);
  assert.match(normalized, /confirmad|no asiste|pendiente/);
  assert.match(normalized, /position_x_m/);
  assert.match(normalized, /position_y_m/);
});
