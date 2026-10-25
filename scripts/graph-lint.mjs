#!/usr/bin/env node
// graph-lint — fails when the loop graph, a ledger, or a doc cites something that does not exist.
//
//   node scripts/graph-lint.mjs              # NEXUS_LOOP.md and docs/**/*.md
//   node scripts/graph-lint.mjs --self-check
//
// A citation is an inline code span shaped like a repo path:
//   `path`           the file exists
//   `path:12-30`     the file exists and has at least 30 lines (weak: lines drift)
//   `path#literal`   the file exists and contains literal (strong: the check fails when the code changes)
// A citation followed by " (new)" names a file a task will create; it is only counted.
// Ticked items and everything under "## Journal" are history and are not re-checked.
//
// Structure: docs/LOOP_GRAPH.md lists loops (`- [ ] L0 ... ledger: `x.md` ... needs: none.`), each
// ledger lists tasks (`- [ ] T0 ... needs: none. ... Evidence: ...`). Needs must exist, be acyclic,
// and a ticked item may not need an unticked one. The mermaid diagram must match the needs exactly.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CITE = /^([A-Za-z0-9_.][A-Za-z0-9_.\-/]*\.(?:ts|tsx|mjs|js|json|md|html|css))(?::(\d+)(?:-(\d+))?|#(.+))?$/;
const ITEM = /^- \[( |x)\] ([LT]\d+[a-z]?)\b(.*)$/;
const NEEDS = /needs: (none|[LT]\d+[a-z]?(?:, [LT]\d+[a-z]?)*)/;
const lines = (text) => text.replace(/\r\n/g, '\n').split('\n');

export function citations(text) {
    const out = [];
    let fenced = false, history = false;
    for (const line of lines(text)) {
        if (/^```/.test(line)) { fenced = !fenced; continue; }
        if (/^## Journal\b/.test(line)) history = true;
        if (fenced || history || /^\s*- \[x\]/.test(line)) continue;
        for (const m of line.matchAll(/`([^`\n]+)`( \(new\))?/g)) {
            const c = m[1].match(CITE);
            if (!c) continue;
            out.push({ raw: m[1], file: c[1], to: c[3] ? +c[3] : c[2] ? +c[2] : 0, literal: c[4], planned: !!m[2] });
        }
    }
    return out;
}

/** null when the citation holds; otherwise why it does not. `read` returns file text or null. */
export function checkCitation(c, read) {
    const text = read(c.file);
    if (text === null) return c.planned ? null : 'file does not exist';
    if (c.literal !== undefined && !text.includes(c.literal)) return 'literal not found in file';
    if (c.to && lines(text).length < c.to) return `file has fewer than ${c.to} lines`;
    return null;
}

export function items(text) {
    const out = [];
    for (const line of lines(text)) {
        const m = line.match(ITEM);
        if (!m) continue;
        const n = m[3].match(NEEDS);
        out.push({
            id: m[2],
            done: m[1] === 'x',
            needs: n ? (n[1] === 'none' ? [] : n[1].split(', ')) : null,
            ledger: m[3].match(/ledger: `([^`]+)`/)?.[1] ?? null,
            evidence: /Evidence:/.test(m[3]),
        });
    }
    return out;
}

export function cycle(list) {
    const g = new Map(list.map(i => [i.id, i.needs ?? []]));
    const state = new Map();
    const stack = [];
    const visit = (id) => {
        if (state.get(id) === 2) return null;
        if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
        state.set(id, 1); stack.push(id);
        for (const n of g.get(id) ?? []) { const c = visit(n); if (c) return c; }
        stack.pop(); state.set(id, 2);
        return null;
    };
    for (const id of g.keys()) { const c = visit(id); if (c) return c; }
    return null;
}

export function checkItems(list, where) {
    const errs = [];
    const ids = new Map();
    for (const it of list) {
        if (ids.has(it.id)) errs.push(`${where}: duplicate ${it.id}`);
        ids.set(it.id, it);
        if (!it.needs) errs.push(`${where}: ${it.id} has no "needs:"`);
    }
    for (const it of list) for (const n of it.needs ?? []) {
        if (!ids.has(n)) errs.push(`${where}: ${it.id} needs unknown ${n}`);
        else if (it.done && !ids.get(n).done) errs.push(`${where}: ${it.id} is ticked but needs unticked ${n}`);
    }
    const c = cycle(list);
    if (c) errs.push(`${where}: cycle ${c.join(' -> ')}`);
    return errs;
}

export function mermaidEdges(text) {
    const edges = new Set();
    let inside = false;
    for (const line of lines(text)) {
        if (/^```mermaid/.test(line)) { inside = true; continue; }
        if (inside && /^```/.test(line)) { inside = false; continue; }
        if (!inside) continue;
        for (const m of line.matchAll(/(L\d+)(?:\[[^\]]*\])?\s*-->\s*(L\d+)/g)) edges.add(`${m[1]}->${m[2]}`);
    }
    return edges;
}

export function lintGraph(graphText, read, where = 'docs/LOOP_GRAPH.md') {
    const errs = [];
    const loops = items(graphText).filter(i => i.id.startsWith('L'));
    if (loops.length === 0) errs.push(`${where}: no loops`);
    errs.push(...checkItems(loops, where));
    const want = new Set(loops.flatMap(l => (l.needs ?? []).map(n => `${n}->${l.id}`)));
    const have = mermaidEdges(graphText);
    for (const e of want) if (!have.has(e)) errs.push(`${where}: diagram is missing edge ${e}`);
    for (const e of have) if (!want.has(e)) errs.push(`${where}: diagram has edge ${e} that no "needs:" declares`);
    for (const l of loops) {
        if (!l.ledger) { errs.push(`${where}: ${l.id} names no ledger`); continue; }
        const t = read(l.ledger);
        if (t === null) { errs.push(`${where}: ${l.id} ledger ${l.ledger} does not exist`); continue; }
        const tasks = items(t).filter(i => i.id.startsWith('T'));
        if (tasks.length === 0) errs.push(`${l.ledger}: no tasks`);
        errs.push(...checkItems(tasks, l.ledger));
        for (const k of tasks) if (!k.evidence) errs.push(`${l.ledger}: ${k.id} has no "Evidence:"`);
        if (l.done && tasks.some(k => !k.done)) errs.push(`${where}: ${l.id} is ticked but ${l.ledger} has open tasks`);
    }
    return errs;
}

function selfCheck() {
    const assert = (got, want, msg) => {
        if (JSON.stringify(got) !== JSON.stringify(want)) {
            console.error(`FAIL ${msg}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
            process.exit(1);
        }
    };
    const files = { 'a.ts': 'one\nconst x = 42;\nthree\n' };
    const read = (f) => files[f] ?? null;
    const one = (s) => citations(s)[0];

    assert(one('see `a.ts#const x = 42;`').literal, 'const x = 42;', 'literal citation parsed');
    assert(one('see `a.ts:2-3`').to, 3, 'line range parsed');
    assert(one('make `b.md` (new)').planned, true, 'planned citation parsed');
    assert(citations('`npm run gate` and `- [x]` and `x-user-id`').length, 0, 'non-path code spans ignored');
    assert(citations('- [x] T1 done `missing.ts`').length, 0, 'ticked lines are history');
    assert(citations('## Journal\n`missing.ts`').length, 0, 'journal is history');
    assert(citations('```\n`missing.ts`\n```').length, 0, 'fenced blocks skipped');
    assert(checkCitation(one('`a.ts#const x = 42;`'), read), null, 'present literal holds');
    assert(checkCitation(one('`a.ts#const x = 43;`'), read), 'literal not found in file', 'absent literal fails');
    assert(checkCitation(one('`gone.ts`'), read), 'file does not exist', 'missing file fails');
    assert(checkCitation(one('`gone.ts` (new)'), read), null, 'planned missing file is allowed');
    assert(checkCitation(one('`a.ts:2-99`'), read), 'file has fewer than 99 lines', 'line range past end fails');

    const t = items('- [x] T0 a. needs: none. Evidence: x\n- [ ] T1 b. needs: T0. Evidence: y\n- [ ] T2 c. needs: T0, T1.');
    assert(t.map(i => i.needs), [[], ['T0'], ['T0', 'T1']], 'needs parsed');
    assert(t[2].evidence, false, 'missing Evidence detected');
    assert(checkItems(items('- [x] T1 a. needs: T2.\n- [ ] T2 b. needs: none.'), 'x'), ['x: T1 is ticked but needs unticked T2'], 'ticked item cannot need an open one');
    assert(checkItems(items('- [ ] T1 a. needs: T9.'), 'x'), ['x: T1 needs unknown T9'], 'unknown need fails');
    assert(checkItems(items('- [ ] T1 a.'), 'x'), ['x: T1 has no "needs:"'], 'missing needs fails');
    assert(cycle(items('- [ ] T1 a. needs: T2.\n- [ ] T2 b. needs: T1.')), ['T1', 'T2', 'T1'], 'cycle found');
    assert(cycle(t), null, 'acyclic graph has no cycle');

    const ledger = { 'l.md': '- [ ] T0 a. needs: none. Evidence: x' };
    const g = (diagram) => '- [ ] L0 a. ledger: `l.md` · needs: none.\n- [ ] L1 b. ledger: `l.md` · needs: L0.\n```mermaid\n' + diagram + '\n```';
    assert(lintGraph(g('  L0[a] --> L1[b]'), (f) => ledger[f] ?? null), [], 'matching diagram passes');
    assert(lintGraph(g('  L1 --> L0'), (f) => ledger[f] ?? null).length, 2, 'diagram drift fails both ways');
    assert(lintGraph('- [x] L0 a. ledger: `l.md` · needs: none.\n```mermaid\n```', (f) => ledger[f] ?? null),
        ['docs/LOOP_GRAPH.md: L0 is ticked but l.md has open tasks'], 'loop cannot close with open tasks');

    console.log('graph-lint self-check: 22 assertions passed');
}

if (process.argv.includes('--self-check')) { selfCheck(); process.exit(0); }

const walk = (dir) => readdirSync(dir).flatMap(f => {
    const p = join(dir, f).replace(/\\/g, '/');
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
});
const cache = new Map();
const read = (f) => {
    if (!cache.has(f)) cache.set(f, existsSync(f) && statSync(f).isFile() ? readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null);
    return cache.get(f);
};

const docs = ['NEXUS_LOOP.md', ...(existsSync('docs') ? walk('docs') : [])].filter(f => read(f) !== null);
const errs = [];
const mix = { file: 0, 'line range': 0, literal: 0, planned: 0 };
for (const f of docs) for (const c of citations(read(f))) {
    mix[c.planned ? 'planned' : c.literal !== undefined ? 'literal' : c.to ? 'line range' : 'file']++;
    const e = checkCitation(c, read);
    if (e) errs.push(`${f}: \`${c.raw}\` ${e}`);
}
const graph = read('docs/LOOP_GRAPH.md');
if (graph === null) errs.push('docs/LOOP_GRAPH.md does not exist');
else errs.push(...lintGraph(graph, read));

const total = Object.values(mix).reduce((a, b) => a + b, 0);
console.log(`graph-lint: ${docs.length} docs · ${total} citations (${Object.entries(mix).map(([k, v]) => `${v} ${k}`).join(', ')})`);
if (errs.length === 0) { console.log('graph-lint: clean'); process.exit(0); }
for (const e of errs) console.log(`   ✗ ${e}`);
console.log(`\ngraph-lint: ${errs.length} problem(s). A citation that does not resolve is a claim nothing backs: fix the doc or the code, never the check.`);
process.exit(1);
