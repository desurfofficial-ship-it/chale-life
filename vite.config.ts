import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: '/chale-life/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 3000, host: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    // E-009 bundle split — the v6 Accra map landed as ONE 2,243 kB chunk
    // (533 kB gzip) because everything is statically imported and
    // startup-critical. No code can be deferred (the game boots straight
    // into the 3D world), so the win here is the transport/parse shape:
    //   - colliders chunk: src/world/accra/data/colliders.json is ~780 kB
    //     of captured AABBs (36% of the bundle!) that only change when the
    //     map is re-captured — isolating it keeps the code chunks
    //     cache-stable across map regens and lets it download in parallel.
    //   - vendor-three: three + R3F + their runtime deps (~1/3 of bytes),
    //     stable across app-code edits.
    //   - vendor-react: react + react-dom + scheduler, ditto.
    //   - index: the game (engine/rules/world/UI code).
    // Browsers fetch the four chunks in parallel; per-chunk parse cost
    // drops accordingly on the iPhone-class target. Values are unchanged —
    // this is purely how the same bytes are packaged.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'colliders',
              test: /src\/world\/accra\/data\/colliders\.json/,
            },
            {
              name: 'vendor-three',
              test: /node_modules\/(three|@react-three|three-stdlib|its-fine|react-use-measure|suspend-react|zustand|use-sync-external-store)\//,
            },
            {
              name: 'vendor-react',
              test: /node_modules\/(react|react-dom|scheduler)\//,
            },
          ],
        },
      },
    },
  },
  test: {
    // movementStep + perf tests are pure math — node is faster than jsdom.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
