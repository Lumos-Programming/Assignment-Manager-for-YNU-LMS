// ESLint フラット設定
// https://eslint.org/docs/latest/use/configure/configuration-files

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // ビルド成果物と依存関係は lint 対象外。
    ignores: ['build/**', 'node_modules/**', 'pnpm-lock.yaml'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // ソースは Chrome 拡張のコンテンツスクリプト／ポップアップとしてブラウザで動く。
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
  {
    // ビルドツールは CommonJS の Node 環境で動くため require() が正しい。
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
  // Prettier と競合するルールを無効化する（整形は Prettier に任せる）。
  prettier
);
