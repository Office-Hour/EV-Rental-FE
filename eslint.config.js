// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.min.js',
      'node_modules/**',
      'src/contract/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '.angular/cache/**',
      '.bazel/**',
      'public/**',
      'docs/**',
      'pnpm-lock.yaml',
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    ignores: [
      '**/*.spec.ts',
      '**/*.min.js',
      'node_modules/**',
      'src/contract/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '.angular/cache/**',
      '.bazel/**',
      'public/**',
      'docs/**',
      'pnpm-lock.yaml',
    ],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);
