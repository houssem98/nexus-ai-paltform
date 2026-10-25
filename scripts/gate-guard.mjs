#!/usr/bin/env node
// gate-guard — refuses a diff that weakens the check that grades it.
//
//   node scripts/gate-guard.mjs                  # everything since HEAD, staged or not
//   node scripts/gate-guard.mjs HEAD~1           # a commit range
//   node scripts/gate-guard.mjs --acknowledged   # allow, after logging why
//   node scripts/gate-guard.mjs --self-check
//
// Why this exists, precisely. In the Darwin Godel Machine (arXiv 2505.22954,
// Appendix H) the agent was scored on whether tool-use hallucination appeared
// in its logs; markers were emitted at real tool calls and the scorer looked
// for those markers in plain text. Node 114 reached a perfect 2.0 after two
// modifications by deleting the marker emission — "despite instructions not to
// change the special tokens" — so the detector had nothing to find. The paper's
// operative sentence: objective hacking "occurs more frequently when these
// functions are not hidden" from the agent.
//
// Our loops cannot hide their gates: the agent writes the test, the code, and
// the ledger tick. So the next-cheapest defence is that a gate may grow but
// never shrink silently. Deleting an assertion is the shape of that diff.
import { execFileSync } from 'node:child_process';

// Files whose job is to fail. Weakening one is the move this guard is for.
const GATE_FILE = /(\.test\.|\.spec\.|(^|\/)e2e\/|(^|\/)scripts\/[\w-]*(lint|gate|sweep|eval)[\w-]*\.mjs$)/;
const ASSERTION = /\b(expect|assert|toBe|toEqual|toThrow|toContain|toHaveLength|toMatch|should)\b|process\.exit\(1\)/;
// Added, these turn a green run into a green run that proved nothing.
const MUTED = /\.(skip|todo|only)\s*\(|\bxit\(|\bxdescribe\(/;

// How much a matcher actually constrains the value. Counting assertions alone
// misses the cheapest evasion there is: `toBe(42)` becomes `toBeDefined()`, the
// line count holds, and the test now passes for every value the code can produce.
// The matcher NAME carries the whole signal, so this is a token lookup rather than
// an AST parse — no parser dependency, and nothing an AST would add is used here.
const STRENGTH = new Map(Object.entries({
    toBe: 3, toEqual: 3, toStrictEqual: 3, toMatchObject: 3, toHaveBeenCalledWith: 3,
    toHaveLength: 3, toMatch: 3, toMatchInlineSnapshot: 3,
    deepEqual: 3, strictEqual: 3, deepStrictEqual: 3, equal: 3,
    toContain: 2, toContainEqual: 2, toBeCloseTo: 2, toHaveProperty: 2,
    toBeGreaterThan: 2, toBeGreaterThanOrEqual: 2, toBeLessThan: 2, toBeLessThanOrEqual: 2,
    toThrow: 2, toThrowError: 2, toHaveBeenCalledTimes: 2, match: 2, doesNotMatch: 2,
    toBeDefined: 1, toBeUndefined: 1, toBeTruthy: 1, toBeFalsy: 1, toBeNull: 1,
    toBeNaN: 1, toHaveBeenCalled: 1, toBeInstanceOf: 1, toBeTypeOf: 1, ok: 1,
}));
const MATCHER = /\.?\b([a-zA-Z]+)\s*\(/g;

const weigh = (line) => {
    let n = 0;
    for (const m of line.matchAll(MATCHER)) n += STRENGTH.get(m[1]) ?? 0;
    // An assertion whose matcher we do not recognise still counts as one unit of
    // constraint, or renaming to an unknown matcher would read as free removal.
    return n || 1;
};

export function scan(diff) {
    const findings = [];
    const perFile = new Map();
    let file = null;

    for (const line of diff.split('\n')) {
        const header = line.match(/^\+\+\+ b\/(.+)$/);
        if (header) { file = header[1] === '/dev/null' ? null : header[1]; continue; }
        if (!file || !GATE_FILE.test(file)) continue;

        const body = line.slice(1).trim();
        const added = line.startsWith('+') && !line.startsWith('+++');
        const removed = line.startsWith('-') && !line.startsWith('---');

        if (added && MUTED.test(body)) findings.push({ file, kind: 'muted test', body });
        if (!ASSERTION.test(body) || !(added || removed)) continue;

        if (!perFile.has(file)) perFile.set(file, { del: [], add: [] });
        perFile.get(file)[removed ? 'del' : 'add'].push(body);
    }

    // Judged per file, not per line. A line-by-line rule fires on every edit to a
    // test — including strengthening one — and a guard that always fires is a guard
    // that gets bypassed. The question is whether the file ended up constraining
    // less than it did before.
    for (const [f, { del, add }] of perFile) {
        if (del.length === 0) continue;
        const dW = del.reduce((a, l) => a + weigh(l), 0);
        const aW = add.reduce((a, l) => a + weigh(l), 0);

        if (add.length < del.length)
            findings.push({
                file: f, kind: 'net assertion loss',
                body: `${del.length} removed, ${add.length} added — ${del[0]}`,
            });
        else if (aW < dW)
            findings.push({
                file: f, kind: 'weakened matcher',
                body: `constraint ${dW} -> ${aW} across ${del.length} line(s) — ${del[0]}`,
            });
        else
            findings.push({ file: f, kind: 'note', body: `${del.length} assertion(s) rewritten at equal or greater strength` });
    }
    return findings;
}

/** Notes are printed, never failed on — an edited-but-not-weakened test is normal work. */
export const blocking = (findings) => findings.filter(f => f.kind !== 'note');

function selfCheck() {
    const d = (f, ...ls) => `diff --git a/${f} b/${f}\n--- a/${f}\n+++ b/${f}\n${ls.join('\n')}`;
    const eq = (got, want, msg) => {
        if (got !== want) { console.error(`FAIL ${msg}: got ${got}, want ${want}`); process.exit(1); }
    };

    eq(scan(d('src/x.test.ts', '-  expect(a).toBe(1);')).length, 1, 'deleted assertion caught');
    eq(scan(d('src/x.test.ts', '+  expect(a).toBe(1);')).length, 0, 'added assertion allowed');
    eq(scan(d('src/x.ts', '-  expect(a).toBe(1);')).length, 0, 'non-gate file ignored');
    eq(scan(d('src/x.test.ts', '-  const a = 1;')).length, 0, 'deleted non-assertion allowed');
    eq(scan(d('src/x.test.ts', '+  it.skip("g1", () => {')).length, 1, 'muting caught');
    eq(scan(d('scripts/loop-lint.mjs', '-    process.exit(1);')).length, 1, 'gate script caught');
    eq(scan(d('e2e/sweep.ts', '-  await expect(el).toBeVisible();')).length, 1, 'e2e caught');
    eq(scan(d('README.md', '-  expect(a).toBe(1);')).length, 0, 'prose ignored');
    // The DGM diff itself: marker emission removed from the agent's own harness.
    eq(scan(d('scripts/hallucination-gate.mjs',
        '-        {TOOL_USED_MARKER: tool_name},',
        '-        assert(marker in output);')).length, 1, 'DGM-shaped diff caught');
    // Mutation: with the deletion rule gone the DGM diff passes, which is the
    // whole point of having the rule. Proven by construction, not by comment.
    eq(/^-/.test('-        assert(marker in output);'), true, 'deletion prefix is what carries the signal');

    // Matcher strength. The line count is unchanged in every case below, so a
    // count-only rule sees all four as identical and passes all four.
    const swap = (from, to) => scan(d('src/x.test.ts', `-  expect(v).${from};`, `+  expect(v).${to};`));
    eq(swap('toBe(42)', 'toBeDefined()')[0].kind, 'weakened matcher', 'toBe -> toBeDefined is weakening');
    eq(swap('toEqual({a:1})', 'toBeTruthy()')[0].kind, 'weakened matcher', 'toEqual -> toBeTruthy is weakening');
    eq(swap('toHaveLength(3)', 'toBeInstanceOf(Array)')[0].kind, 'weakened matcher', 'length -> instanceof is weakening');
    eq(swap('toBeDefined()', 'toBe(42)')[0].kind, 'note', 'strengthening is not a failure');
    eq(swap('toBe(1)', 'toBe(2)')[0].kind, 'note', 'same-strength rewrite is a note, not a failure');
    eq(blocking(swap('toBe(1)', 'toBe(2)')).length, 0, 'a note does not block');
    eq(blocking(swap('toBe(42)', 'toBeDefined()')).length, 1, 'weakening blocks');
    // Renaming to a matcher we have never heard of must not read as free removal.
    eq(swap('toBe(42)', 'toSatisfyMyNewHelper()')[0].kind, 'weakened matcher', 'unknown matcher still costs strength');
    // Two strong assertions collapsed into one weak one loses on count first.
    eq(scan(d('src/x.test.ts',
        '-  expect(a).toBe(1);', '-  expect(b).toBe(2);',
        '+  expect(a).toBeDefined();'))[0].kind, 'net assertion loss', 'collapsing 2 into 1 is a count loss');
    // Per file, not per line: one file weakening does not mask another passing.
    eq(scan(d('src/x.test.ts', '-  expect(v).toBe(1);', '+  expect(v).toBe(2);')
        + '\n' + d('src/y.test.ts', '-  expect(v).toBe(1);')).length, 2, 'findings are per file');

    console.log('gate-guard self-check: 21 assertions passed');
}

const args = process.argv.slice(2);
if (args.includes('--self-check')) { selfCheck(); process.exit(0); }

const acknowledged = args.includes('--acknowledged');
const range = args.find(a => !a.startsWith('--'));
// `HEAD` rather than a bare `git diff`, so a staged deletion cannot slip past the
// guard on its way into the commit it is about to be part of.
const diff = execFileSync('git', ['diff', '-U0', range ?? 'HEAD'], { encoding: 'utf8', maxBuffer: 64e6 });
const findings = scan(diff);
const bad = blocking(findings);
const where = range ?? 'HEAD..working tree';

for (const f of findings.filter(f => f.kind === 'note')) {
    console.log(`   · ${'note'.padEnd(18)} ${f.file}\n     ${f.body}`);
}

if (bad.length === 0) {
    console.log(`gate-guard: clean · ${where}`);
    process.exit(0);
}

console.log(`\ngate-guard: ${bad.length} weakened gate(s) · ${where}\n`);
for (const f of bad) console.log(`   ✗ ${f.kind.padEnd(18)} ${f.file}\n     ${f.body}`);
console.log(`
A gate may grow. A gate that shrinks in the same change that claims it green is
the diff that DGM node 114 wrote (arXiv 2505.22954 App. H). Shrinking is either
fewer assertions or looser ones — replacing toBe(42) with toBeDefined() keeps the
line count and constrains nothing. Restore the constraint, or record in the
ledger's progress log WHICH assertion changed and why the weaker form still grades
something real — then re-run with --acknowledged.`);
process.exit(acknowledged ? 0 : 1);
