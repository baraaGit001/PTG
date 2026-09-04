import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards ADR 0004. `import type` is erased before `emitDecoratorMetadata` runs,
 * so a type-only imported class lands in `design:paramtypes` as `Function`:
 * Nest's injector then has no provider token, and `ValidationPipe` validates
 * against a class with no metadata, so `forbidNonWhitelisted` rejects every
 * field ("property page should not exist"). Both failures are silent at compile
 * time - only a request or a boot surfaces them.
 */

const SRC = join(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

/** Every name pulled in as a type - both `import type {A}` and `import {type A}`. */
function typeOnlyImports(source: string): Set<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s*from/gs)) {
    const isTypeOnlyClause = Boolean(match[1]);
    for (const raw of match[2].split(',')) {
      const specifier = raw.trim();
      if (!specifier) continue;
      if (isTypeOnlyClause) names.add(specifier.replace(/\s+as\s+.*$/, '').trim());
      else if (specifier.startsWith('type ')) names.add(specifier.slice(5).replace(/\s+as\s+.*$/, '').trim());
    }
  }
  return names;
}

describe('runtime imports (ADR 0004)', () => {
  const files = sourceFiles(SRC);

  it('finds the API sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('never type-imports a DTO used as a @Body/@Query/@Param parameter', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const types = typeOnlyImports(source);
      for (const match of source.matchAll(/@(Body|Query|Param)\([^)]*\)\s*\w+\s*:\s*([A-Za-z0-9_]+)/g)) {
        if (types.has(match[2])) offenders.push(`${file}: @${match[1]}() ... : ${match[2]}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('never type-imports a class injected through a constructor', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const types = typeOnlyImports(source);
      for (const constructorMatch of source.matchAll(/constructor\(([^)]*)\)/gs)) {
        for (const param of constructorMatch[1].matchAll(/(?:private|public|protected|readonly)\s[^,]*?:\s*([A-Za-z0-9_]+)/g)) {
          if (types.has(param[1])) offenders.push(`${file}: constructor(... : ${param[1]})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
