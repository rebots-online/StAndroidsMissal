#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -e release.lock ]]; then
  echo "release.lock is present; refusing an ambiguous frozen stamp" >&2
  exit 1
fi

# The only stamp in the complete multiplatform release invocation.
npm run stamp
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('version.json','utf8')).version")"
echo "Building coherent release v${VERSION}"

npm test
npm run build
./node_modules/.bin/tauri build --bundles deb,appimage --ci
npm run build:windows:unstamped

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

./node_modules/.bin/tauri android build --debug --apk --ci
CARGO_PROFILE_RELEASE_STRIP=false \
  ./node_modules/.bin/tauri android build --apk --aab --ci
npm run package:android-symbols

npm run collect-artifacts
