/**
 * TypeScript declarations for release-state.mjs.
 *
 * This is the exact, hand-authored declaration companion to the production module.
 * All public symbols are declared with strict explicit types.
 */

/**
 * Release state lock file structure
 */
export interface ReleaseState {
  version: string;
  sourceHead: string;
  startedAt: string;
  completedStages: string[];
}

/**
 * Dependency injection interface for hermetic testing
 */
export interface ReleaseDeps {
  /**
   * Unified command runner for stamp and stages.
   * Injected in tests to avoid real builds.
   * Returns exit code or void (0 implied).
   */
  runCommand?: (name: string) => Promise<number | void>;
  /**
   * Environment variables override
   */
  env?: Record<string, string | undefined>;
  /**
   * Current working directory override
   */
  cwd?: string;
  /**
   * Hermetic fixture directory for lock/outbox/log root
   */
  fixtureDir?: string;
  /**
   * Process object override
   */
  process?: NodeJS.Process;
  /**
   * File system module override
   */
  fs?: typeof import('node:fs');
  /**
   * Path module override
   */
  path?: typeof import('node:path');
}

/**
 * Expand a tilde-prefixed path to the home directory.
 * @param value - The path to expand (may start with ~ or ~/)
 * @param home - The home directory to use (defaults to os.homedir())
 * @returns The expanded absolute path
 * @throws Error if the path starts with ~user (user-specific expansion is not supported)
 */
export function expandHomePath(value: string, home?: string): string;

/**
 * Canonical stage order
 */
export const STAGE_ORDER: readonly string[];

/**
 * Print usage information
 */
export function printUsage(): void;

/**
 * Run a single release stage and mark it complete.
 * @param stage - The stage name to run
 * @param deps - Optional dependency overrides
 * @param root - Root directory
 * @param lockPath - Lock file path
 * @returns Exit code (0 for success)
 * @throws Error if stage is unknown or lock file is invalid
 */
export function runReleaseStage(stage: string, deps?: ReleaseDeps, root?: string, lockPath?: string): Promise<number>;

/**
 * Main release orchestration entry point.
 * @param argv - Command line arguments (typically process.argv)
 * @param deps - Optional dependency overrides for hermetic testing
 * @returns Exit code (0 for success, non-zero for failure)
 */
export function main(argv: readonly string[], deps?: ReleaseDeps): Promise<number>;