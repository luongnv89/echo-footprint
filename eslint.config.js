// ESLint 9 flat config (replaces the legacy .eslintrc.cjs).
//
// Mirrors the rule set from the previous .eslintrc.cjs:
//   - extends: eslint:recommended, plugin:react/recommended,
//              plugin:react-hooks/recommended, prettier
//   - parserOptions: ecmaVersion latest, sourceType module, ecmaFeatures.jsx
//   - plugins: react, react-hooks
//   - settings: react.version 'detect'
//   - rules: no-console (warn, allow warn/error),
//            no-unused-vars (error, argsIgnorePattern ^_),
//            react/react-in-jsx-scope off, react/prop-types off
//   - ignorePatterns: dist, node_modules, *.config.js
//
// FlatCompat is the official transitional shim that re-exports legacy
// eslintrc-style configs and plugins as flat-config blocks. Once the upstream
// presets (eslint-config-prettier, plugin:react/recommended,
// plugin:react-hooks/recommended) ship their own flat-config entries we can
// drop FlatCompat; see https://eslint.org/docs/latest/use/configure/migration-guide.

import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Global ignores — equivalent of ignorePatterns from the legacy config.
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', 'coverage/**'],
  },

  // The four legacy extends, translated via FlatCompat. `eslint:recommended`
  // is loaded automatically because `recommendedConfig: js.configs.recommended`
  // is passed to the FlatCompat constructor, so it does not need to be
  // listed here again.
  ...compat.extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ),

  // Project-wide settings. The `files` key is intentionally omitted so the
  // config matches the file detection of the legacy `.eslintrc.cjs` (which
  // had no `files`/`overrides` restriction). In practice that means the
  // `npm run lint` script (which runs `eslint src/`) lints the same `.js`
  // files it did before, and leaves the `.jsx` files alone — fixing the
  // pre-existing JSX errors is a separate task and out of scope here.
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Mirrors env: { browser, webextensions, es2022 } from the legacy
        // .eslintrc.cjs — globals in flat config are an object map, not
        // the short-hand "env" keys the eslintrc format used. The latest
        // ECMAScript globals are pulled in by `ecmaVersion: 'latest'` above.
        ...globals.browser,
        ...globals.webextensions,
        // Node globals for scripts/ and config files.
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          // ESLint 9 flipped the default: catch-clause bindings are now
          // reported by `no-unused-vars`. The legacy .eslintrc.cjs (ESLint 8)
          // didn't flag them, so we mirror the old behavior here.
          caughtErrors: 'none',
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // `eslint-plugin-react` promoted `react/no-unescaped-entities` to the
      // `recommended` set in 7.35.0, but the previous `.eslintrc.cjs` ran
      // against 7.33.2 which did not include it. Disable it here so the
      // migration does not introduce a brand-new error category.
      'react/no-unescaped-entities': 'off',
    },
  },
];
