import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['scripts/**/*.js', 'scripts/**/*.{cjs,mjs}', 'server/**/*.js', 'server/**/*.{cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
    },
    rules: {
      // Local utility scripts are operational tooling, not app runtime code.
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
    },
  },
  {
    files: ['pocketbase/pb_migrations/**/*.js', 'pb_migrations/**/*.js'],
    languageOptions: {
      globals: {
        migrate: 'readonly',
        Collection: 'readonly',
      },
      sourceType: 'script',
    },
    rules: {
      // PocketBase migration runtime provides globals and has generated shapes.
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
])
