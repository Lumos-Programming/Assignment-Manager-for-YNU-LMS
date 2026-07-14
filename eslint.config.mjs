// ESLint flat config
// https://eslint.org/docs/latest/use/configure/configuration-files

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Artifacts and dependencies are never linted.
    ignores: ['build/**', 'node_modules/**', 'pnpm-lock.yaml'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Source runs in the browser as a Chrome extension content script / popup.
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      // The current JS entrypoints share implicit globals across content
      // scripts (LANGUAGE, the *_TXT constants, A_TYPE, getLanguage, ...) and
      // use `var` re-declaration inside if/else branches. This is legacy debt
      // that the TypeScript migration (PR2) removes module-by-module. Until
      // then, surface these as warnings so CI stays green while keeping the
      // debt visible. PR2 restores each of these to "error".
      'no-undef': 'warn',
      'no-redeclare': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    // Build tooling runs in Node with CommonJS, where require() is correct.
    files: ['config/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Turn off rules that conflict with Prettier; Prettier owns formatting.
  prettier
);
