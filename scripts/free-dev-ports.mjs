// Dev-server preflight: reclaim the ports `pnpm dev` is about to bind.
//
// Both Vite configs set `strictPort: true` on purpose (a silent fallback to
// 5174/5175 lets two dev servers for the same app clobber the shared
// node_modules/.vite/deps cache), and `pnpm -r --parallel` fails fast - so one
// orphaned watcher from a previous run takes down the whole stack with "Port
// 5173 is already in use". The orphan is always ours, so kill it here instead
// of making that a manual step.
//
// Deliberately conservative: only a listener whose image is node is killed.
// Anything else holding a dev port is somebody else's process, and the right
// answer is to say so and stop.
//
// Usage: node scripts/free-dev-ports.mjs [api|web|admin|<port> ...]  (default: all)
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const KILLABLE = /^node(\.exe)?$/i;

/** Ports live in .env (API_PORT, APP_URL, ADMIN_URL); these are the fallbacks. */
const ROLES = {
  api: { env: 'API_PORT', fallback: 3001 },
  web: { env: 'APP_URL', fallback: 5173 },
  admin: { env: 'ADMIN_URL', fallback: 5174 },
};

function readEnvFile() {
  const values = {};
  for (const name of ['.env', '.env.example']) {
    let text;
    try {
      text = readFileSync(resolve(repoRoot, name), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!(match[1] in values) && value) values[match[1]] = value;
    }
  }
  return values;
}

function portFor(role, env) {
  const raw = env[ROLES[role].env];
  const port = /^\d+$/.test(raw ?? '') ? Number(raw) : Number(parseUrlPort(raw));
  return Number.isInteger(port) && port > 0 ? port : ROLES[role].fallback;
}

function parseUrlPort(raw) {
  try {
    return new URL(raw).port;
  } catch {
    return '';
  }
}

/** Each target is a [label, port] pair; the label is what the log calls it. */
function roleTarget(role, port) {
  return [`${role} port ${port}`, port];
}

function isFree(port) {
  return new Promise((done) => {
    const probe = createServer();
    probe.once('error', () => done(false));
    probe.once('listening', () => probe.close(() => done(true)));
    probe.listen(port, '0.0.0.0');
  });
}

function run(file, args) {
  try {
    return execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** PIDs listening on `port`, as [{ pid, name }]. */
function listeners(port) {
  const pids = new Set();
  if (isWindows) {
    for (const line of run('netstat', ['-a', '-n', '-o', '-p', 'TCP']).split(/\r?\n/)) {
      const columns = line.trim().split(/\s+/);
      if (columns.length < 5 || columns[3] !== 'LISTENING') continue;
      if (Number(columns[1].slice(columns[1].lastIndexOf(':') + 1)) !== port) continue;
      const pid = Number(columns[4]);
      if (pid > 0) pids.add(pid);
    }
  } else {
    for (const line of run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']).split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (pid > 0) pids.add(pid);
    }
  }
  return [...pids].map((pid) => ({ pid, name: imageName(pid) }));
}

function imageName(pid) {
  if (isWindows) {
    // tasklist CSV: "node.exe","1234",...
    const row = run('tasklist', ['/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV']).trim();
    return /^"([^"]+)"/.exec(row)?.[1] ?? 'unknown';
  }
  return run('ps', ['-p', String(pid), '-o', 'comm=']).trim().split('/').pop() || 'unknown';
}

function kill(pid) {
  if (isWindows) {
    run('taskkill', ['/PID', String(pid), '/T', '/F']);
    return;
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}

/** Windows releases a socket a beat after the process dies. */
async function waitUntilFree(port) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await isFree(port)) return true;
    await new Promise((done) => setTimeout(done, 200));
  }
  return false;
}

async function reclaim(label, port) {
  if (await isFree(port)) return true;

  const holders = listeners(port);
  if (holders.length === 0) {
    console.error(`[dev] ${label} is in use but no listener could be identified - free it manually.`);
    return false;
  }

  const foreign = holders.filter((holder) => !KILLABLE.test(holder.name));
  if (foreign.length > 0) {
    const described = foreign.map((holder) => `${holder.name} (pid ${holder.pid})`).join(', ');
    console.error(`[dev] ${label} is held by ${described}. Not killing that - stop it yourself and re-run.`);
    return false;
  }

  for (const holder of holders) kill(holder.pid);
  if (!(await waitUntilFree(port))) {
    console.error(`[dev] ${label} is still busy after killing ${holders.map((h) => h.pid).join(', ')}.`);
    return false;
  }
  console.log(`[dev] freed ${label} (killed orphaned node ${holders.map((h) => h.pid).join(', ')}).`);
  return true;
}

const env = readEnvFile();
const args = process.argv.slice(2);
const named = args.filter((arg) => arg in ROLES).map((role) => roleTarget(role, portFor(role, env)));
// A bare port number is accepted too, which is what makes this testable without
// aiming it at a stack somebody is using.
const numeric = args.filter((arg) => /^\d+$/.test(arg)).map((arg) => [`port ${arg}`, Number(arg)]);
const targets =
  named.length + numeric.length > 0
    ? [...named, ...numeric]
    : Object.keys(ROLES).map((role) => roleTarget(role, portFor(role, env)));

let ok = true;
for (const [target, port] of targets) {
  // Sequential on purpose: a bind probe per port is cheap, and interleaving the
  // output of a kill with the next probe makes the log hard to read.
  // eslint-disable-next-line no-await-in-loop
  ok = (await reclaim(target, port)) && ok;
}
process.exit(ok ? 0 : 1);
