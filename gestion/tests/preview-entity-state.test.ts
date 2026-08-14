import test from 'node:test';
import assert from 'node:assert/strict';
import { mergePreviewEntities, normalizePreviewEntityState, removePreviewEntity, upsertPreviewEntity } from '../lib/preview-entity-state';

type Item = { id: string; value: string };

test('migrates legacy array preview drafts without losing canonical overrides', () => {
  const state = normalizePreviewEntityState<Item>([
    { id: 'canonical-1', value: 'editado' },
    { id: 'preview-2', value: 'nuevo' },
  ]);
  assert.equal(state.overrides['canonical-1'].value, 'editado');
  assert.equal(state.created.length, 1);
  assert.equal(state.created[0].id, 'preview-2');
});

test('canonical preview override replaces base entity', () => {
  const base: Item[] = [{ id: 'canonical-1', value: 'original' }];
  const state = upsertPreviewEntity(normalizePreviewEntityState<Item>(null), { id: 'canonical-1', value: 'editado' });
  const merged = mergePreviewEntities(base, state);
  assert.deepEqual(merged, [{ id: 'canonical-1', value: 'editado' }]);
});

test('canonical delete stays hidden after merge', () => {
  const base: Item[] = [{ id: 'canonical-1', value: 'original' }, { id: 'canonical-2', value: 'visible' }];
  const state = removePreviewEntity(normalizePreviewEntityState<Item>(null), 'canonical-1');
  const merged = mergePreviewEntities(base, state);
  assert.deepEqual(merged, [{ id: 'canonical-2', value: 'visible' }]);
  assert.deepEqual(state.deleted, ['canonical-1']);
});

test('created preview entity survives subsequent edits and can be removed locally', () => {
  let state = upsertPreviewEntity(normalizePreviewEntityState<Item>(null), { id: 'preview-1', value: 'nuevo' });
  state = upsertPreviewEntity(state, { id: 'preview-1', value: 'editado' });
  assert.deepEqual(mergePreviewEntities<Item>([], state), [{ id: 'preview-1', value: 'editado' }]);

  state = removePreviewEntity(state, 'preview-1');
  assert.deepEqual(mergePreviewEntities<Item>([], state), []);
  assert.deepEqual(state.deleted, []);
});
