import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  { ignores: ['lib/**', 'generated/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: { 'import/no-unresolved': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parserOptions: { project: ['tsconfig.json', 'tsconfig.dev.json'] },
    },
    rules: {
      quotes: ['error', 'double'],
      indent: ['error', 2],
    },
  },
);
