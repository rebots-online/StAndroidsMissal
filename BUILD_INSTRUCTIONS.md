# St. Android's Missal — Build and Release Instructions

This is the canonical project-root recipe for a coherent St. Android's Missal
release. Operator-specific credential locations and verifier commands are kept
in `~/Admin-Manual/PROJECTS/BUILD-INSTRUCTIONS-StAndroidsMissal.md`.

## Identity and authority

- App ID: `mba.robin.standroidsmissal`
- Product title: `St. Android's Missal`
- Artifact slug: `standroidsmissal`
- Canonical version source: `version.txt`
- Runtime/build mirror: `version.json`
- Release driver: `npm run build:release`
- Artifact directory: tracked, Forgejo-LFS-backed `dist/`

Manual local builds are authoritative. The checked-in workflows remain dormant
until the operator explicitly activates CI.

## Prerequisites

### Common

- Node.js 22.6 or newer and npm
- Rust stable via rustup
- Git and Git LFS
- `zip`, `sha256sum`, and binutils (`readelf`)

### Linux desktop

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  build-essential \
  pkg-config \
  libssl-dev
```

### Android

- Android SDK platform 36
- Android build-tools 36.1.0 (`apksigner`, `aapt2`, `zipalign`)
- Android NDK 27.0.12077973
- A compatible JDK with `jarsigner`/`keytool`
- `cargo-ndk`
- Rust targets `aarch64-linux-android`, `armv7-linux-androideabi`,
  `i686-linux-android`, and `x86_64-linux-android`

The checked-in `src-tauri/tauri` symlink is intentional: the generated Android
Gradle Rust plugin resolves the Tauri CLI relative to `src-tauri/`.

Set:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
```

### Windows x64 cross-build

Install `cargo-xwin`. The current Linux-hosted recipe emits a standalone PE
`.exe`; it does not emit NSIS, MSI, or MSIX packages.

## Production signing

The production keystore remains under Admin-Manual credential custody. The
repo consumes an ignored `src-tauri/gen/android/keystore.properties` pointing
to it. Never copy a password, alias secret, private key, or keystore into this
repository or a transcript.

The release produces both a retained debug APK and production-signed APK/AAB.
The debug APK is diagnostic inventory only: release acceptance always installs
and exercises the production APK, and validates the production APK/AAB upload
certificate. Native debug symbols are preserved separately while user-facing
release binaries remain production builds.

## Version contract

Versions are `MAJOR.MINOR.BUILD`, not SemVer PATCH numbering.

- MAJOR is edited manually only when the operator declares a milestone.
- `npm run build:release` calls the stamper exactly once.
- The stamper increments MINOR unconditionally and stamps BUILD.
- Android `versionCode = MAJOR * 100000 + MINOR`; it is never user-facing.
- Do not chain the stamping `build:web`, `build:desktop`, `build:android`, or
  `build:all` entry points for one release.

### Autonomous stamped resume

The release driver automatically manages stamped resume via `release.lock`:

- **First invocation**: stamps once, writes ignored `release.lock` JSON
  `{version, sourceHead, startedAt, completedStages:[]}`, and runs all stages.
- **Stage completion**: after each successful stage, its name is atomically
  appended to `completedStages`.
- **Interrupted release**: a later plain `npm run build:release` with a matching
  lock resumes automatically at the first incomplete stage without stamping.
- **Restart**: `npm run build:release --restart` explicitly moves the old lock to
  `~/outbox/standroidsmissal/` and starts a new stamp.
- **Mismatched/corrupt locks**: fail closed with exact remediation instructions.
  Version or sourceHead mismatches, corrupted JSON, or missing required fields
  trigger explicit error messages and the `--restart` path.
- **Completion**: successful collection moves the completed lock into versioned
  `dist/rubric-runs/release-state-v<version>.json`.
- **No manual steps**: normal resume is fully automatic; `--restart` is only
  for intentional restarts or after manual remediation.

The lock file is gitignored and never committed. It lives only in the worktree.

## Coherent release

```bash
npm ci
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npm run build:release
```

The driver executes this order:

1. Stamp once (fresh release only).
2. Run the complete test suite.
3. Build web/PWA first.
4. Build Linux deb and AppImage.
5. Cross-build the Windows x64 standalone PE.
6. Build and retain the Android debug APK.
7. Build the production release APK and AAB with Rust debug information
   available for symbol packaging.
8. Package native symbols for all four Android ABIs.
9. Collect and validate the complete set into `dist/`.

After each successful stage, its name is atomically recorded in `release.lock`.
If the driver is interrupted, re-running `npm run build:release` resumes at the
first incomplete stage without stamping. Use `--restart` to begin a fresh stamp.

Web must precede collection because Vite empties its output directory. Never
place collected native release artifacts in `dist/` before the final web build.

The Admin-Manual kickstart script can provision toolchains and build individual
targets. It does not replace the coherent release driver: it does not own the
single stamp, Windows artifact, production signing, symbol archive, or final
manifest-governed collection.

## Canonical artifact set

Every successful release contains:

1. `standroidsmissal-v<version>-web-pwa.zip`
2. `standroidsmissal-v<version>-linux-amd64.deb`
3. `standroidsmissal-v<version>-linux-amd64.AppImage`
4. `standroidsmissal-v<version>-windows-x64-standalone.exe`
5. `standroidsmissal-v<version>-android-universal-debug.apk`
6. `standroidsmissal-v<version>-android-universal-release.apk`
7. `standroidsmissal-v<version>-android-universal-release.aab`
8. `standroidsmissal-v<version>-android-native-debug-symbols.zip`

JSON/XML manifests, release notes, and runtime-verification evidence accompany
the set. MSI/MSIX/NSIS and Snap packages are currently absent and must not be
claimed as release outputs.

## Verification gates

A release is accepted only after direct checks establish:

- tests and all build stages succeeded;
- manifest byte sizes and SHA-256 values match every artifact;
- all filenames and embedded package versions match the stamped version;
- package ID is `mba.robin.standroidsmissal`;
- the production APK and AAB share the expected upload certificate;
- the production APK, not the debug APK, passes the runtime/browser rubric;
- the Linux AppImage launches; and
- the Windows PE is structurally valid until Windows-host runtime testing is
  available.

The operator's acceptance seat is a fresh GLM-5.2 verifier. Its verbatim CLI
transcript is written contemporaneously to the PostgreSQL session archive.

## Artifact hygiene and handback

- All persisted artifacts use slug-first, fully stamped names.
- Wrong-version or stale bundles move to `~/outbox/standroidsmissal/`; never
  delete them.
- `dist/` is tracked. Large artifacts use Forgejo LFS only; never GitHub LFS.
- Commit stamped source/tooling first with a `v<version>:` prefix.
- Make manifest `source.commit` point to that exact source commit, then obtain
  independent manifest verification.
- Commit `dist/` separately with a `v<version>:` prefix.
- Push Forgejo first, then the GitHub code mirror:

```bash
git push origin master
git push github master
```

Before a large push, confirm `.lfsconfig` and `remote.github.lfsurl` both route
LFS objects to Forgejo. GitHub receives commits and LFS pointers only.

## Store packaging gaps

- Google Play: production AAB is available.
- Microsoft Store: tile/listing assets exist, but MSI/MSIX Store packaging does
  not yet exist.
- Ubuntu/Snap Store: listing assets exist, but a `.snap` does not yet exist.
