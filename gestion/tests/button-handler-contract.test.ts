import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';

function files(root: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(root)) {
    const path = resolve(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...files(path));
    else if (['.tsx','.jsx'].includes(extname(path))) result.push(path);
  }
  return result;
}

test('explicit type=button controls are wired to an interaction handler', () => {
  const roots = ['app/dashboard','components'].map(path => resolve(process.cwd(), path));
  const offenders: string[] = [];
  for (const file of roots.flatMap(files)) {
    const content = readFileSync(file, 'utf8');
    const buttons = content.match(/<button\b[^>]*type=["']button["'][^>]*>/g) || [];
    buttons.forEach(button => {
      if (!/onClick=|onPointerDown=|onSubmit=/.test(button)) offenders.push(`${file.replace(process.cwd(),'')}: ${button.slice(0,140)}`);
    });
  }
  assert.deepEqual(offenders, [], `Explicit buttons without handlers:\n${offenders.join('\n')}`);
});
