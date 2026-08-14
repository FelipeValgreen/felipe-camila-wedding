import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATABASE_MUTATION_ROUTES = [
  'app/api/budget-payments/route.ts',
  'app/api/budget-source/route.ts',
  'app/api/copilot/route.ts',
  'app/api/documents-source/route.ts',
  'app/api/expenses/route.ts',
  'app/api/guests/route.ts',
  'app/api/memory/route.ts',
  'app/api/music-source/route.ts',
  'app/api/payments/route.ts',
  'app/api/relationships/route.ts',
  'app/api/rsvp/reconcile/route.ts',
  'app/api/seating/route.ts',
  'app/api/tables/route.ts',
  'app/api/tasks/route.ts',
  'app/api/timeline-source/route.ts',
  'app/api/vendors/route.ts',
  'app/api/venue-layout/route.ts'
];

const EXTERNAL_SYNC_ROUTES = [
  'app/api/sync/process/route.ts',
  'app/api/cron/sync-outbox/route.ts'
];

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('every database mutation route imports the non-production write guard', () => {
  for (const path of DATABASE_MUTATION_ROUTES) {
    const content = source(path);
    assert.match(
      content,
      /getDatabaseWriteBlock/,
      `${path} must use getDatabaseWriteBlock so Preview/Development fail closed`
    );
  }
});

test('external synchronization routes use an environment guard', () => {
  for (const path of EXTERNAL_SYNC_ROUTES) {
    const content = source(path);
    assert.match(
      content,
      /getExternalSyncBlock|getDatabaseWriteBlock/,
      `${path} must guard external synchronization outside Production`
    );
  }
});
