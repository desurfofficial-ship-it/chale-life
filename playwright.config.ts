import { defineConfig } from '@playwright/test';

/**
 * E-005 CI robot playtest config.
 *
 * The built app (vite preview of dist/ — run `npm run build` first, the CI
 * job order guarantees it) is driven end-to-end under Chromium with
 * SOFTWARE WebGL: SwiftShader ANGLE + the unsafe-swiftshader escape hatch
 * Chrome needs for headless software GL. Viewport is the product target
 * 390x844 (iPhone-class). No GPU required anywhere — CI runners have none.
 *
 * `npm run test` (vitest) only picks up *.test.ts, so these *.spec.ts files
 * never double-run in the unit gate; tsconfig covers tests/ so the spec is
 * typechecked like everything else.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  // One ordered robot session — the loop mutates shared store state.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The playtest walks real distance under software rendering (can be
  // ~10-20 fps): generous per-test budget, still bounded.
  timeout: 480_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    viewport: { width: 390, height: 844 },
    baseURL: 'http://localhost:4173',
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    // Serve the BUILD output (same as CI: build gate runs first).
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/chale-life/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  outputDir: 'test-results',
});
