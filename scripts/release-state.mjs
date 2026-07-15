#!/usr/bin/env node

/**
 * Release state management for autonomous stamped resume.
 *
 * The first invocation of `npm run build:release` stamps once, writes
 * `release.lock`, and runs named stages. A later invocation with a matching
 * lock resumes automatically at the first incomplete stage without stamping.
 * Mismatched/corrupt locks fail closed with exact remediation.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.env.RELEASE_ROOT || path.resolve(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'release.lock');
const DIST_RUBRIC_RUNS = path.join(ROOT, 'dist', 'rubric-runs');

/**
 * Expand a tilde-prefixed path to the home directory.
 * @param {string} value - The path to expand (may start with ~ or ~/)
 * @param {string} [home=os.homedir()] - The home directory to use
 * @returns {string} The expanded absolute path
 * @throws {Error} If the path starts with ~user (user-specific expansion is not supported)
 */
export function expandHomePath(value, home = os.homedir()) {
  if (value === '~') {
    return home;
  }
  if (value.startsWith('~/')) {
    return path.join(home, value.slice(2));
  }
  if (value.startsWith('~')) {
    throw new Error('User-specific path expansion (~user) is not supported');
  }
  return value;
}

/**
 * Version source: version.txt (MAJOR.MINOR.BUILD)
 * @returns {string} The current version string
 */
function readVersion() {
  return fs.readFileSync(path.join(ROOT, 'version.txt'), 'utf-8').trim();
}

/**
 * Get current git HEAD commit hash
 * @returns {string} The current git HEAD commit hash
 */
function getSourceHead() {
  const gitDir = path.join(ROOT, '.git');
  const headPath = path.join(gitDir, 'HEAD');
  let headRef = fs.readFileSync(headPath, 'utf-8').trim();

  if (headRef.startsWith('ref: ')) {
    const refPath = path.join(gitDir, headRef.slice(5));
    return fs.readFileSync(refPath, 'utf-8').trim();
  }
  return headRef;
}

/**
 * Release state lock file structure
 * @typedef {Object} ReleaseState
 * @property {string} version - The version string (MAJOR.MINOR.BUILD)
 * @property {string} sourceHead - The git HEAD commit hash
 * @property {string} startedAt - ISO 8601 timestamp when release started
 * @property {string[]} completedStages - Array of completed stage names
 */

/**
 * Read and parse the release lock file, or return null if not present/invalid
 * @returns {ReleaseState|null} The parsed release state or null
 * @throws {Error} If the lock file exists but contains corrupt JSON
 */
function readLock() {
  if (!fs.existsSync(LOCK_PATH)) {
    return null;
  }

  try {
    const content = fs.readFileSync(LOCK_PATH, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate structure
    if (
      typeof parsed.version !== 'string' ||
      typeof parsed.sourceHead !== 'string' ||
      typeof parsed.startedAt !== 'string' ||
      !Array.isArray(parsed.completedStages) ||
      !parsed.completedStages.every(s => typeof s === 'string')
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      // JSON parse error - corrupt lock
      throw new Error('Lock file contains invalid JSON');
    }
    throw error;
  }
}

/**
 * Atomically write the release lock file
 * @param {ReleaseState} state - The release state to write
 */
function writeLock(state) {
  const tempPath = `${LOCK_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, LOCK_PATH);
}

/**
 * Atomically append a completed stage to the lock
 * @param {string} stage - The stage name to mark complete
 */
function markStageComplete(stage) {
  const lock = readLock();
  if (!lock) {
    throw new Error('Cannot mark stage complete: no valid lock file');
  }

  if (lock.completedStages.includes(stage)) {
    throw new Error(`Stage ${stage} already marked complete`);
  }

  const updated = {
    ...lock,
    completedStages: [...lock.completedStages, stage],
  };

  writeLock(updated);
}

/**
 * Check if lock matches current state
 * @param {ReleaseState} lock - The lock to check
 * @returns {boolean} True if the lock matches current version and sourceHead
 */
function lockMatchesCurrent(lock) {
  const currentVersion = readVersion();
  const currentHead = getSourceHead();

  return lock.version === currentVersion && lock.sourceHead === currentHead;
}

/**
 * Stage commands in execution order
 * @type {Object<string, function(): Promise<void>>}
 */
export const STAGE_COMMANDS = {
  test: async () => {
    console.log('🔧 Stage: test');
    const { execSync } = await import('node:child_process');
    execSync('npm test', { cwd: ROOT, stdio: 'inherit' });
  },

  web: async () => {
    console.log('🔧 Stage: web');
    const { execSync } = await import('node:child_process');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  },

  linux: async () => {
    console.log('🔧 Stage: linux');
    const { execSync } = await import('node:child_process');
    execSync('./node_modules/.bin/tauri build --bundles deb,appimage --ci', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  },

  windows: async () => {
    console.log('🔧 Stage: windows');
    const { execSync } = await import('node:child_process');
    execSync('npm run build:windows:unstamped', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  },

  'android-debug': async () => {
    console.log('🔧 Stage: android-debug');
    const { execSync } = await import('node:child_process');
    execSync('./node_modules/.bin/tauri android build --debug --apk --ci', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  },

  'android-release': async () => {
    console.log('🔧 Stage: android-release');
    const { execSync } = await import('node:child_process');
    process.env.CARGO_PROFILE_RELEASE_STRIP = 'false';
    execSync('./node_modules/.bin/tauri android build --apk --aab --ci', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  },

  symbols: async () => {
    console.log('🔧 Stage: symbols');
    const { execSync } = await import('node:child_process');
    execSync('npm run package:android-symbols', {
      cwd: ROOT,
      stdio: 'inherit',
    });
  },

  collect: async () => {
    console.log('🔧 Stage: collect');
    const { execSync } = await import('node:child_process');
    execSync('npm run collect-artifacts', {
      cwd: ROOT,
      stdio: 'inherit',
    });

    // Archive completed lock to dist/rubric-runs
    const lock = readLock();
    if (!lock) {
      throw new Error('Cannot archive lock: no valid lock file');
    }

    fs.mkdirSync(DIST_RUBRIC_RUNS, { recursive: true });
    const archivePath = path.join(DIST_RUBRIC_RUNS, `release-state-v${lock.version}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(lock, null, 2), 'utf-8');
    fs.unlinkSync(LOCK_PATH);
    console.log(`📦 Archived release state to ${archivePath}`);
  },
};

/**
 * Run a single stage and mark it complete
 * @param {string} stage - The stage name to run
 * @returns {Promise<void>}
 */
export async function runReleaseStage(stage) {
  const command = STAGE_COMMANDS[stage];
  if (!command) {
    throw new Error(`Unknown stage: ${stage}`);
  }

  await command();
  markStageComplete(stage);
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`Usage: node release-state.mjs [options]

Options:
  --help, -h         Show this help message and exit
  --restart          Move existing lock to ~/outbox/standroidsmissal/ and start fresh
  --clean-only       Move existing lock to outbox if it matches current state

Release stages (run automatically):
  test               Run the test suite
  web                Build web/PWA
  linux              Build Linux deb and AppImage
  windows            Build Windows x64 standalone PE
  android-debug      Build Android debug APK
  android-release    Build Android release APK and AAB
  symbols            Package Android native debug symbols
  collect            Collect and validate all release artifacts

The lock file (release.lock) enables resume after interruption:
- First run: stamps version and writes lock with empty completedStages
- Subsequent runs: resume at first incomplete stage (no stamp)
- Mismatched/corrupt locks: fail closed with remediation instructions`);
}

/**
 * Main release orchestration
 * @param {string[]} argv - Command line arguments
 * @param {Object} [deps] - Optional dependency overrides for testing
 * @returns {Promise<void>}
 */
export async function main(argv, deps = {}) {
  const { process: processObj = process, fs: fsObj = fs, path: pathObj = path } = deps;

  const args = argv.slice(2);
  const restartFlag = args.includes('--restart');
  const cleanOnlyFlag = args.includes('--clean-only');
  const helpFlag = args.includes('--help') || args.includes('-h');

  if (helpFlag) {
    printUsage();
    processObj.exit(0);
  }

  if (restartFlag && cleanOnlyFlag) {
    console.error('❌ Cannot specify both --restart and --clean-only');
    processObj.exit(1);
  }

  const outboxDir = expandHomePath('~/outbox/standroidsmissal');

  // Handle --restart: move old lock to outbox and exit
  if (restartFlag) {
    const lock = readLock();
    if (lock) {
      fsObj.mkdirSync(outboxDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedPath = pathObj.join(outboxDir, `release-lock-${timestamp}.json`);
      fsObj.renameSync(LOCK_PATH, archivedPath);
      console.log(`🔄 Moved old lock to ${archivedPath}`);
    } else {
      console.log('ℹ️  No lock file found');
    }
    processObj.exit(0);
  }

  // Handle --clean-only: just move old lock to outbox (for manual intervention)
  if (cleanOnlyFlag) {
    const lock = readLock();
    if (!lock) {
      console.log('ℹ️  No lock file found');
      processObj.exit(0);
    }

    fsObj.mkdirSync(outboxDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivedPath = pathObj.join(outboxDir, `release-lock-${timestamp}.json`);

    if (!lockMatchesCurrent(lock)) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error(`Lock version: ${lock.version}`);
      console.error(`Lock sourceHead: ${lock.sourceHead}`);
      console.error(`Current version: ${readVersion()}`);
      console.error(`Current sourceHead: ${getSourceHead()}`);
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      processObj.exit(1);
    }

    fsObj.renameSync(LOCK_PATH, archivedPath);
    console.log(`🧹 Moved lock to ${archivedPath}`);
    processObj.exit(0);
  }

  // Normal execution path
  let lock;
  try {
    lock = readLock();
  } catch (error) {
    // Corrupt lock file
    if (error instanceof SyntaxError || error.message.includes('invalid JSON')) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error('Lock file contains invalid JSON');
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      process.exit(1);
    }
    throw error;
  }

  if (!lock) {
    // Fresh release: stamp once and write new lock
    console.log('🚀 Starting fresh release');
    const { execSync } = await import('node:child_process');
    execSync('npm run stamp', { cwd: ROOT, stdio: 'inherit' });

    const newLock = {
      version: readVersion(),
      sourceHead: getSourceHead(),
      startedAt: new Date().toISOString(),
      completedStages: [],
    };

    writeLock(newLock);
    console.log(`🔒 Wrote release.lock v${newLock.version}`);
  } else {
    // Existing lock: validate match
    if (!lockMatchesCurrent(lock)) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error(`Lock version: ${lock.version}`);
      console.error(`Lock sourceHead: ${lock.sourceHead}`);
      console.error(`Current version: ${readVersion()}`);
      console.error(`Current sourceHead: ${getSourceHead()}`);
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      processObj.exit(1);
    }

    console.log(`🔄 Resuming release v${lock.version}`);
    console.log(`Started at: ${lock.startedAt}`);
    console.log(`Completed stages: ${lock.completedStages.join(', ') || 'none'}`);
  }

  // Determine stages to run
  const allStages = Object.keys(STAGE_COMMANDS);
  const completedStages = lock?.completedStages || [];
  const pendingStages = allStages.filter(s => !completedStages.includes(s));

  if (pendingStages.length === 0) {
    console.log('✅ All stages already completed');
    processObj.exit(0);
  }

  console.log(`⏭️  Stages to run: ${pendingStages.join(', ')}`);

  // Run pending stages
  for (const stage of pendingStages) {
    await runReleaseStage(stage);
  }

  console.log('✅ Release complete');
}

// Only run main when executed directly (isMain guard)
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv).catch(error => {
    console.error('❌ Release failed:', error);
    process.exit(1);
  });
}