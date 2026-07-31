// Dev with the Firebase Emulator Suite: starts the Auth + Firestore emulators
// and the Vite dev server together, then tears both down on exit.
//
//   npm run dev:emu
//
// Pair with VITE_FIREBASE_EMULATOR=1 in .env.local so the app routes Auth /
// Firestore at the local emulators (see src/lib/firebase.ts). The emulators need
// a Java runtime; if `java` isn't already on PATH we probe the common Homebrew
// openjdk locations (a no-op when java is already found), so `brew install
// openjdk` is enough — no shell-profile edit required.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Ensure a Java runtime is reachable, augmenting PATH from Homebrew if needed. */
function ensureJavaOnPath() {
  const hasJava = spawnSync('java', ['-version'], { stdio: 'ignore' }).status === 0;
  if (hasJava) return;
  const candidates = [
    '/opt/homebrew/opt/openjdk/bin', // Apple Silicon Homebrew
    '/usr/local/opt/openjdk/bin', // Intel Homebrew
  ];
  const found = candidates.find((dir) => existsSync(`${dir}/java`));
  if (found) {
    process.env.PATH = `${found}:${process.env.PATH}`;
    return;
  }
  console.error(
    '\n✖ No Java runtime found — the Firebase emulators need one.\n' +
      '  Install it with:  brew install openjdk\n',
  );
  process.exit(1);
}

ensureJavaOnPath();

const children = [];
function run(cmd, args, name) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: false, env: process.env });
  child.on('exit', (code) => {
    // If either side dies, bring the whole dev session down.
    if (!shuttingDown) {
      console.log(`\n[dev:emu] ${name} exited (${code}); shutting down.`);
      shutdown(code ?? 0);
    }
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) c.kill('SIGINT');
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// The emulators own the foreground first so their "All emulators ready" banner is
// visible before the app starts making calls.
run('npx', ['firebase', 'emulators:start', '--only', 'auth,firestore'], 'emulators');
run('npx', ['vite'], 'vite');
