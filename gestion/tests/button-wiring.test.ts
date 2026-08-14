import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function tsxFiles(root: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...tsxFiles(path));
    else if (name.endsWith('.tsx')) result.push(path);
  }
  return result;
}

test('explicit type=button controls are wired to an interaction handler', () => {
  const roots = [resolve(process.cwd(), 'components'), resolve(process.cwd(), 'app/dashboard')];
  const dead: string[] = [];

  for (const root of roots) {
    for (const path of tsxFiles(root)) {
      const content = readFileSync(path, 'utf8');
      const tags = content.match(/<button\b[^>]*>/g) || [];
      tags.forEach((tag, index) => {
        if (!/type=["']button["']/.test(tag)) return;
        if (/onClick=|onPointerDown=|form=/.test(tag)) return;
        dead.push(`${relative(process.cwd(), path)} button#${index + 1}: ${tag.slice(0, 160)}`);
      });
    }
  }

  assert.deepEqual(dead, [], `Explicit buttons without an interaction handler:\n${dead.join('\n')}`);
});
