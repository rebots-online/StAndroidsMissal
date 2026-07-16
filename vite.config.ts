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
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    // Web output lives in a clean, disposable `dist-web/` (gitignored via the
    // `dist-*/` rule) so Tauri's `frontendDist` embeds ONLY the web surface —
    // not the multi-GB native release artifacts that accumulate in `dist/`.
    // `dist/` stays append-only (I-0/CC12); `dist-web/` is cleared each build.
    outDir: 'dist-web',
    emptyOutDir: true,
  },
});
