import { rmSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(root, '.test-dist');
const tsc = process.platform === 'win32'
  ? join(root, 'node_modules', '.bin', 'tsc.cmd')
  : join(root, 'node_modules', '.bin', 'tsc');

rmSync(outDir, { recursive: true, force: true });

const compile = spawnSync(tsc, ['-p', 'tsconfig.test.json'], {
  cwd: root,
  stdio: 'inherit',
});

if (compile.status !== 0) process.exit(compile.status ?? 1);

function collectTests(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...collectTests(full));
    else if (entry.endsWith('.test.js')) files.push(full);
  }
  return files;
}

const testsDir = join(outDir, 'tests');
const testFiles = collectTests(testsDir);

if (testFiles.length === 0) {
  console.error('No compiled test files were found.');
  process.exit(1);
}

const run = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: root,
  stdio: 'inherit',
});

rmSync(outDir, { recursive: true, force: true });
process.exit(run.status ?? 1);
