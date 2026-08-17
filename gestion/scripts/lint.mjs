import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(new URL('..', import.meta.url).pathname);
const sourceRoots = ['app', 'components', 'lib', 'tests', 'scripts']
  .map((dir) => join(root, dir))
  .filter((dir) => {
    try { return statSync(dir).isDirectory(); } catch { return false; }
  });

const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const violations = [];

function extension(path) {
  const match = path.match(/(\.[^.\/]+)$/);
  return match?.[1] || '';
}

function visit(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.test-build') continue;
      visit(join(path, entry));
    }
    return;
  }

  if (!extensions.has(extension(path))) return;
  const text = readFileSync(path, 'utf8');
  const rel = relative(root, path);

  const rules = [
    { pattern: /^<<<<<<< |^=======\s*$|^>>>>>>> /m, message: 'unresolved merge-conflict marker' },
    { pattern: /\bdebugger\s*;/, message: 'debugger statement' },
    { pattern: /\b(?:test|it|describe)\.only\s*\(/, message: 'focused test (.only)' },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) violations.push(`${rel}: ${rule.message}`);
  }
}

for (const dir of sourceRoots) visit(dir);

if (violations.length) {
  console.error('Repository hygiene lint failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Repository hygiene lint passed. TypeScript semantics are enforced separately by npm run typecheck.');
