#!/usr/bin/env node
// npm test — runs server/**/*.test.ts with node:test through tsx.
//
// Test processes start in a fresh temporary working directory, so storage (DATA_DIR = cwd/data) never opens the
// repository's store in data/. Fails when zero tests ran: node:test alone exits 0 when no file matches.
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { globSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let ran = 0;
// A file with no test() calls is reported as one test named after the file; it is not a test.
const count = (e) => { if (e.details.type === 'test' && e.name !== e.file) ran++; };

run({
    files: globSync('server/**/*.test.ts').map((f) => resolve(f)),
    cwd: mkdtempSync(join(tmpdir(), 'nexus-test-')),
    execArgv: ['--import', import.meta.resolve('tsx')],
})
    .on('test:pass', count)
    .on('test:fail', (e) => { count(e); process.exitCode = 1; })
    .compose(spec)
    .pipe(process.stdout);

process.on('exit', () => {
    if (ran === 0) {
        console.error('npm test: zero tests ran');
        process.exitCode = 1;
    }
});
