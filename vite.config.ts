import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed dev port; `clearScreen: false` keeps Rust errors visible.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // The vendored corpus snapshot is ~90k flat-text files; watching it
      // exhausts the OS inotify limit (ENOSPC) and it is never a dev input —
      // the app only ever reads the ingested missal.db.
      ignored: ['**/VENDORED/**', '**/src-tauri/**', '**/assets/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // `dist/` is the durable, versioned release-artifact archive.  Vite empties
    // its outDir by default, so sharing that directory caused every Tauri
    // beforeBuildCommand to delete already-built APK/AAB/deb/AppImage files.
    // Keep disposable web staging physically separate from release artifacts.
    outDir: 'build/web',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
});
