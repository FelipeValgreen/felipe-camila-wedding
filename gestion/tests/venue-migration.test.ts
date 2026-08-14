import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  '..',
  'supabase',
  'migrations',
  '20260814020000_gestion_atomic_venue_layout_version.sql'
);

const sql = readFileSync(migrationPath, 'utf8');

test('venue migration: version creation is serialized and privileged', () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /security\.get_my_role\(\)/i);
  assert.match(sql, /editor.*owner/i);
  assert.match(sql, /lock table public\.event_venue_layouts/i);
});

test('venue migration: function does not remain executable by PUBLIC', () => {
  assert.match(sql, /revoke all on function public\.create_venue_layout_version[\s\S]*from public/i);
  assert.match(sql, /grant execute[\s\S]*to authenticated/i);
});

test('venue migration: archive and insert occur inside one transaction', () => {
  assert.match(sql, /^begin;/im);
  assert.match(sql, /update public\.event_venue_layouts[\s\S]*status = 'archived'/i);
  assert.match(sql, /insert into public\.event_venue_layouts/i);
  assert.match(sql, /commit;/i);
});
