// Internal packages emit CommonJS to dist/ (what apps/api requires) and ESM to
// dist/esm/ (what Vite/Rollup import). Node decides which module system a .js
// file is by the nearest package.json "type", and the package root has none -
// so the ESM output needs its own marker or Node would read it as CommonJS.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), process.argv[2] ?? 'dist/esm');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');
