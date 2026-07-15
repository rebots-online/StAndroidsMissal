# Build Instructions

All builds are **local** — CI is not triggered until a public working release
exists (TC14). The `.github/workflows/build-all-platforms.yml` is checked in
for future use but dormant.

## Prerequisites

### Common (all platforms)

- **Node.js ≥ 22.6** (required for `--experimental-strip-types`)
- **npm** (comes with Node)
- **Rust** (stable, via [rustup](https://rustup.rs))
- **Git** (to clone the repo)

### Linux (deb + AppImage)

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

### Android (APK)

Already present on the operator workstation:
- Android SDK at `~/Android/Sdk` (platforms 35/36, build-tools 34/35/36, platform-tools, NDK 27.0.12077973)
- Rust Android targets: `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`

Installed during this build:
- `cargo-ndk` v4.1.2 (`cargo install cargo-ndk`)
- `src-tauri/tauri` symlink → `../node_modules/.bin/tauri` (Gradle's Rust plugin calls `node tauri ...` from `src-tauri/`; the symlink makes the CLI resolvable)

Environment variables required:
```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
```

The kickstart script handles all of this:
```bash
~/Admin-Manual/scripts/kickstart-tauri-build.sh android
```

### Windows 11 x64

Cross-compiled from Linux using `cargo-xwin`. The verified artifact is the
standalone PE executable. NSIS remains a Windows-host packaging layer because
Ubuntu NSIS 3.09 cannot expand Tauri's generated `NSISCOMCALL` macro.

## Build steps

### 1. Install dependencies

```bash
npm install
```

### 2. Stamp version (exactly once per release invocation)

Version follows the `MAJOR.MINOR.BUILD` scheme per `BUILD_CONVENTIONS.md`.
Canonical source is `version.txt`. `version.json` is the runtime/build mirror.
MINOR increments unconditionally and BUILD is computed as
`epoch_minutes % 100000` at stamp time.

```bash
npm run stamp
```

This updates `version.json`, `package.json`, `package-lock.json`,
`tauri.conf.json` (including `bundle.android.versionCode`), and `Cargo.toml`.
`prebuild` only syncs the corpus; it never stamps.

Never hand-edit version in a platform manifest. Change only MAJOR in
`version.txt` at a milestone; the stamper owns MINOR and BUILD.

### 3. Rebuild the corpus database (optional — `assets/missal.db` is committed)

```bash
npm run ingest
```

This reads `VENDORED/divinum-officium/` and produces `assets/missal.db`
(graph + vector + FTS5 + concept taxonomy). Output is also copied to
`public/missal.db` for the web build. See `DOCS/CORPUS-SCHEMA.md` for the
full pipeline.

### 3. Run tests

```bash
npm test
```

Tests use the built-in `node:test` runner — no test framework dependency.
Covers: computus (Easter dates), embeddings (determinism, similarity),
mass ordo (section order, chant switching), corpus ingestion, text
normalization, and concept taxonomy validation.

### 4. Web build

```bash
npm run build
```

Runs `tsc -b` (TypeScript compile) then `vite build` (bundle to `dist/`).
The `prebuild` step syncs `assets/missal.db` → `public/missal.db`.

### 5. Native builds (Tauri 2)

#### Linux (deb + AppImage)

```bash
./node_modules/.bin/tauri build --bundles deb,appimage
```

Artifacts:
- `src-tauri/target/release/bundle/deb/St. Android's Missal_<version>_amd64.deb`
- `src-tauri/target/release/bundle/appimage/St. Android's Missal_<version>_amd64.AppImage`

#### Windows 11 x64 standalone

```bash
npm run build:windows:unstamped
```

Artifact: `src-tauri/target/x86_64-pc-windows-msvc/release/st-androids-missal.exe`.

#### Android (production APK/AAB + preserved debug APK + symbols)

The release driver signs production APK/AAB outputs from the Admin-Manual
production keystore, preserves a separately signed debug APK, disables Cargo
stripping only for the release-symbol pass, and packages all four ABI symbol
tables.

```bash
npm run build:release
```

#### All platforms via kickstart script

```bash
~/Admin-Manual/scripts/kickstart-tauri-build.sh linux    # deb + AppImage
~/Admin-Manual/scripts/kickstart-tauri-build.sh android  # APK
~/Admin-Manual/scripts/kickstart-tauri-build.sh all      # both
```

The kickstart script is idempotent — it skips already-installed prerequisites
and only installs what's missing. Build logs are saved to
`~/.tauri-build-logs/`.

### 6. Development server

```bash
npm run dev           # web dev server (port 5173, strictPort)
npm run tauri dev     # desktop shell (launches Vite + Tauri window)
```

The dev port is fixed at 5173 because Tauri's `devUrl` expects it.

### 7. Collect artifacts to `dist/`

After building, collect all artifacts with compliant filenames:

```bash
npm run collect-artifacts
```

This copies a complete build set to tracked, LFS-backed `dist/` with
`standroidsmissal-v<MAJOR.MINOR.BUILD>-<qualifier>.<ext>` filenames. It fails
closed on a missing member, validates embedded Android versions/signatures,
hashes every final file, and emits JSON/XML release manifests.

| Artifact | Filename pattern | Size |
|----------|------------------|------|
| deb | `standroidsmissal-v<ver>-linux-amd64.deb` |
| AppImage | `standroidsmissal-v<ver>-linux-amd64.AppImage` |
| Windows PE | `standroidsmissal-v<ver>-windows-x64-standalone.exe` |
| Debug APK | `standroidsmissal-v<ver>-android-universal-debug.apk` |
| Production APK | `standroidsmissal-v<ver>-android-universal-release.apk` |
| Production AAB | `standroidsmissal-v<ver>-android-universal-release.aab` |
| Native symbols | `standroidsmissal-v<ver>-android-native-debug-symbols.zip` |
| Web/PWA | `standroidsmissal-v<ver>-web-pwa.zip` |

## Version

Follows `MAJOR.MINOR.BUILD` scheme per `BUILD_CONVENTIONS.md`.
Canonical source: `version.txt`; `version.json` is the mirror. Run
`npm run build:release` for the one-stamp complete artifact set. Never chain
the stamping per-target entrypoints for one release.

`versionCode` (Android) = `MAJOR * 100000 + MINOR` — never user-facing (CC7).

## Verified builds

| Date | Version | Target | Result | Compile time |
|------|---------|--------|--------|--------------|
| 2026-07-11 | 1.0.30227 | web (tsc + vite) | ✅ | <1s + 738ms |
| 2026-07-11 | 1.0.30227 | tests (37/37) | ✅ | 269ms |
| 2026-07-11 | 1.0.30227 | deb + AppImage | ✅ | 2m28s |
| 2026-07-11 | 1.0.30227 | APK (universal, unsigned) | ✅ | ~10m (4 ABIs) |
| 2026-07-11 | 1.0.30227 | AAB (universal) | ✅ | (same build) |
| 2026-07-14 | 1.16.34594 | web + deb + AppImage + Windows x64 exe + debug APK + production APK/AAB + native symbols | ✅ | complete coherent set |
| 2026-07-14 | 1.16.34594 | production APK on Android 35 emulator; 49.997s automated screencast | ✅ | cold launch 294ms |
