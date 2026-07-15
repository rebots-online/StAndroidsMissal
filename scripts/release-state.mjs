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
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOCK_PATH = path.join(ROOT, 'release.lock');
const DIST_RUBRIC_RUNS = path.join(ROOT, 'dist', 'rubric-runs');

/**
 * Version source: version.txt (MAJOR.MINOR.BUILD)
 */
function readVersion(): string {
  return fs.readFileSync(path.join(ROOT, 'version.txt'), 'utf-8').trim();
}

/**
 * Get current git HEAD commit hash
 */
function getSourceHead(): string {
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
 */
export interface ReleaseState {
  version: string;
  sourceHead: string;
  startedAt: string; // ISO 8601 timestamp
  completedStages: string[];
}

/**
 * Read and parse the release lock file, or return null if not present/invalid
 */
function readLock(): ReleaseState | null {
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
    
    return parsed as ReleaseState;
  } catch {
    return null;
  }
}

/**
 * Atomically write the release lock file
 */
function writeLock(state: ReleaseState): void {
  const tempPath = `${LOCK_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tempPath, LOCK_PATH);
}

/**
 * Atomically append a completed stage to the lock
 */
function markStageComplete(stage: string): void {
  const lock = readLock();
  if (!lock) {
    throw new Error('Cannot mark stage complete: no valid lock file');
  }
  
  if (lock.completedStages.includes(stage)) {
    throw new Error(`Stage ${stage} already marked complete`);
  }
  
  const updated: ReleaseState = {
    ...lock,
    completedStages: [...lock.completedStages, stage],
  };
  
  writeLock(updated);
}

/**
 * Check if lock matches current state
 */
function lockMatchesCurrent(lock: ReleaseState): boolean {
  const currentVersion = readVersion();
  const currentHead = getSourceHead();
  
  return lock.version === currentVersion && lock.sourceHead === currentHead;
}

/**
 * Stage commands in execution order
 */
export const STAGE_COMMANDS: Record<string, () => Promise<void>> = {
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
 */
export async function runReleaseStage(stage: string): Promise<void> {
  const command = STAGE_COMMANDS[stage];
  if (!command) {
    throw new Error(`Unknown stage: ${stage}`);
  }
  
  await command();
  markStageComplete(stage);
}

/**
 * Main release orchestration
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const restartFlag = args.includes('--restart');
  const cleanOnlyFlag = args.includes('--clean-only');
  
  if (restartFlag && cleanOnlyFlag) {
    console.error('❌ Cannot specify both --restart and --clean-only');
    process.exit(1);
  }
  
  // Handle --restart: move old lock to outbox and exit
  if (restartFlag) {
    const lock = readLock();
    if (lock) {
      const outboxDir = path.expanduser('~/outbox/standroidsmissal');
      fs.mkdirSync(outboxDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivedPath = path.join(outboxDir, `release-lock-${timestamp}.json`);
      fs.renameSync(LOCK_PATH, archivedPath);
      console.log(`🔄 Moved old lock to ${archivedPath}`);
    } else {
      console.log('ℹ️  No lock file found');
    }
    process.exit(0);
  }
  
  // Handle --clean-only: just move old lock to outbox (for manual intervention)
  if (cleanOnlyFlag) {
    const lock = readLock();
    if (!lock) {
      console.log('ℹ️  No lock file found');
      process.exit(0);
    }
    
    const outboxDir = path.expanduser('~/outbox/standroidsmissal');
    fs.mkdirSync(outboxDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivedPath = path.join(outboxDir, `release-lock-${timestamp}.json`);
    
    if (!lockMatchesCurrent(lock)) {
      console.error('❌ Lock mismatch or corruption detected');
      console.error(`Lock version: ${lock.version}`);
      console.error(`Lock sourceHead: ${lock.sourceHead}`);
      console.error(`Current version: ${readVersion()}`);
      console.error(`Current sourceHead: ${getSourceHead()}`);
      console.error('');
      console.error('Remediation: run `npm run build:release --restart` to move this lock');
      console.error('to the outbox and start a fresh stamp, or manually inspect and resolve.');
      process.exit(1);
    }
    
    fs.renameSync(LOCK_PATH, archivedPath);
    console.log(`🧹 Moved lock to ${archivedPath}`);
    process.exit(0);
  }
  
  // Normal execution path
  const lock = readLock();
  
  if (!lock) {
    // Fresh release: stamp once and write new lock
    console.log('🚀 Starting fresh release');
    const { execSync } = await import('node:child_process');
    execSync('npm run stamp', { cwd: ROOT, stdio: 'inherit' });
    
    const newLock: ReleaseState = {
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
      process.exit(1);
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
    process.exit(0);
  }
  
  console.log(`⏭️  Stages to run: ${pendingStages.join(', ')}`);
  
  // Run pending stages
  for (const stage of pendingStages) {
    await runReleaseStage(stage);
  }
  
  console.log('✅ Release complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Release failed:', error);
    process.exit(1);
  });
}