import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Prisma refuses `select` and `include` on the same object at runtime
 * ("Please either use `include` or `select`, but not both at the same time"),
 * and neither `tsc` nor ESLint catches it: the offending shape sat in
 * members.service.ts - twice in typed calls, once behind an `as any` delegate -
 * and turned every tree and member-directory read into a 500.
 *
 * The relation's own fields belong *inside* the parent select:
 *   include: { member: { select: { ...MEMBER_SELECT, partnerProfile: { select: PARTNER_SELECT } } } }
 */

const SRC = join(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

/** Blanks out string and comment bodies so their braces don't skew the scan. */
function stripLiterals(source: string): string {
  const pattern = /(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*')|("(?:[^"\\\n]|\\.)*")|(`(?:[^`\\]|\\.)*`)/g;
  return source.replace(pattern, (match) => match.replace(/[^\n]/g, ' '));
}

/**
 * Line numbers of object literals that name both keys directly - a key inside a
 * nested literal belongs to that literal, not this one.
 */
function selectAndIncludeTogether(source: string): number[] {
  const text = stripLiterals(source);
  const hits: number[] = [];
  const open: Array<{ index: number; keys: Set<string> }> = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') {
      open.push({ index: i, keys: new Set() });
      continue;
    }
    if (char === '}') {
      const literal = open.pop();
      if (literal && literal.keys.has('select') && literal.keys.has('include')) {
        hits.push(text.slice(0, literal.index).split('\n').length);
      }
      continue;
    }
    if (open.length === 0) continue;
    const key = /^(select|include)\s*:/.exec(text.slice(i, i + 12));
    // Only when it starts a token, so `mySelect:` never counts.
    if (key && !/[A-Za-z0-9_$.]/.test(text[i - 1] ?? '')) {
      open[open.length - 1].keys.add(key[1]);
      i += key[0].length - 1;
    }
  }

  return hits;
}

describe('prisma query shapes', () => {
  const files = sourceFiles(SRC);

  it('finds the API sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never passes select and include on the same object', () => {
    const offenders = files.flatMap((file) =>
      selectAndIncludeTogether(readFileSync(file, 'utf8')).map((line) => `${file}:${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('detects the shape it is guarding against', () => {
    const bad = 'const args = { include: { member: { select: MEMBER_SELECT, include: { partnerProfile: true } } } };';
    const good = 'const args = { include: { member: { select: { ...MEMBER_SELECT, partnerProfile: true } } } };';

    expect(selectAndIncludeTogether(bad)).toEqual([1]);
    expect(selectAndIncludeTogether(good)).toEqual([]);
    // A comment or a string naming both keys is not a call.
    expect(selectAndIncludeTogether('// { select: x, include: y }')).toEqual([]);
  });
});
