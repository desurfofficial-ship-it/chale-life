// P3-1: real flat ESLint config. The old one imported
// @firebase/eslint-plugin-security-rules, which was never installed (the
// game does not use Firebase) — so `lint` was an echo stub. This keeps the
// guardrails that matter for this repo: TS + React hooks correctness, plus
// no-undef-ish hygiene via globals. Stylistic formatting is deliberately NOT
// enforced (no churn rule — AGENTS.md #2).
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'salvage/**/*', 'functions/**/*', 'test-results/**/*', 'playwright-report/**/*'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // perf-sensitive codebase: unused vars are repo hygiene (P3-2 handles
      // the existing stock) — warn, don't fail, so lint gates stay green
      // while cleanup lands incrementally.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // browser + worker code (three.js world, engine, UI)
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    rules: {
      // tests seed globalThis shims and use wide numeric tolerances on purpose
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
