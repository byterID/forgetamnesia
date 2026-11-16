import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'scripts/**',
      'eslint.config.js',
      'vite.config.ts',
      'dist',
      'dev-dist',
      'coverage',
      'private',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  // src/domain is pure TypeScript: no React, no Dexie, no network, no other layer (CLAUDE.md).
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom', 'react-router', 'dexie', 'dexie-react-hooks', 'zustand'],
          patterns: [
            {
              group: ['@/db/*', '@/sync/*', '@/services/*', '@/features/*', '@/ui/*', '@/i18n/*'],
              message: 'src/domain must not depend on other layers.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'fetch',
        'indexedDB',
        'localStorage',
        'window',
        'document',
      ],
    },
  },
  // shadcn convention: ui files co-export variants/helpers with components.
  { files: ['src/ui/**'], rules: { 'react-refresh/only-export-components': 'off' } },
  prettier,
);
