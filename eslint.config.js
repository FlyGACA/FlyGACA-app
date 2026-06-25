import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'ios', 'android', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node-side files: Playwright E2E and config files run under Node, not the
    // browser, so expose Node globals (process, etc.).
    files: ['e2e/**/*.ts', 'playwright.config.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // The Cloudflare Worker runs in a service-worker-like runtime (no DOM/window),
    // so expose worker globals (self, fetch, Response, caches, etc.) instead of
    // the browser set.
    files: ['worker/**/*.ts'],
    languageOptions: { globals: globals.serviceworker },
  },
);
