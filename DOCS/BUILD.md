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

- Android SDK (cmdline-tools, platform-tools, platforms;android-34, build-tools;34.0.0)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` environment variables
- `cargo-ndk` (`cargo install cargo-ndk`)
- Rust Android targets:
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```

If the Android SDK is not yet installed, the kickstart script handles it:
```bash
~/Admin-Manual/scripts/kickstart-tauri-build.sh android
```

### Windows (NSIS)

Cross-compiled from Linux using `cargo-xwin`. Not yet tested for this project.
Will be documented when first built.

## Build steps

### 1. Install dependencies

```bash
npm install
```

### 2. Rebuild the corpus database (optional — `assets/missal.db` is committed)

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
- `src-tauri/target/release/bundle/deb/St. Android's Missal_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/St. Android's Missal_0.1.0_amd64.AppImage`

#### Android (APK)

```bash
./node_modules/.bin/tauri android build
```

Artifact: `src-tauri/gen/android/app/build/outputs/apk/`

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

## Version

One version string (`0.1.0`) across `package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml` — keep them in lock-step.

## Verified builds

| Date | Version | Target | Result | Compile time |
|------|---------|--------|--------|--------------|
| 2026-07-11 | 0.1.0 | deb + AppImage | ✅ | 2m28s |
| 2026-07-11 | 0.1.0 | web (tsc + vite) | ✅ | <1s + 738ms |
| 2026-07-11 | 0.1.0 | tests (37/37) | ✅ | 269ms |
