import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PANELS = [
  'components/PlanningCopilot.tsx',
  'components/GuestQuickEditorDock.tsx',
  'components/RelationshipEditorDock.tsx',
  'components/SeatingIntelligenceDock.tsx',
  'components/TableNamingDock.tsx',
  'components/ManualTasksDock.tsx',
  'components/VenueEditController.tsx',
  'components/VenueSeatingDraftDock.tsx'
];

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('all floating workspaces participate in the exclusive-panel protocol', () => {
  for (const path of PANELS) {
    const content = source(path);
    assert.match(content, /fc-workspace-panel-open/, `${path} must participate in exclusive panel coordination`);
  }
});

test('every floating workspace has a stable unique panel id', () => {
  const ids = new Map<string, string>();

  for (const path of PANELS) {
    const content = source(path);
    const match = content.match(/const\s+PANEL_ID\s*=\s*['\"]([^'\"]+)['\"]/);
    assert.ok(match?.[1], `${path} must define PANEL_ID`);
    const id = match[1];
    assert.equal(ids.has(id), false, `${path} reuses PANEL_ID “${id}” from ${ids.get(id)}`);
    ids.set(id, path);
  }
});
