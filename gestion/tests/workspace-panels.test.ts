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

function panelId(content: string) {
  return content.match(/const\s+(?:PANEL_ID|OVERLAY_ID)\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1] ||
    content.match(/(?:PANEL_ID|OVERLAY_ID)\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1] ||
    null;
}

test('all floating workspaces participate in both exclusive-panel event protocols', () => {
  const missing: string[] = [];

  for (const path of PANELS) {
    const content = source(path);
    if (!content.includes('fc-workspace-panel-open')) missing.push(`${path}: fc-workspace-panel-open`);
    if (!content.includes('fc-management-overlay-open')) missing.push(`${path}: fc-management-overlay-open`);
  }

  assert.deepEqual(missing, [], `Missing exclusive-panel coordination:\n${missing.join('\n')}`);
});

test('every floating workspace has a stable unique panel id', () => {
  const ids = new Map<string, string>();
  const missing: string[] = [];
  const duplicated: string[] = [];

  for (const path of PANELS) {
    const content = source(path);
    const id = panelId(content);
    if (!id) {
      missing.push(path);
      continue;
    }
    if (ids.has(id)) duplicated.push(`${path} reuses “${id}” from ${ids.get(id)}`);
    else ids.set(id, path);
  }

  assert.deepEqual(missing, [], `Panels without stable id:\n${missing.join('\n')}`);
  assert.deepEqual(duplicated, [], `Duplicate panel ids:\n${duplicated.join('\n')}`);
});
