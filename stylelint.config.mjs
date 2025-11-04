import stylelintScss from 'stylelint-scss';
import stylelintSelectorBemPattern from 'stylelint-selector-bem-pattern';

/** @type {import('stylelint').Config} */
export default {
  plugins: [stylelintScss, stylelintSelectorBemPattern],
  extends: [
    // 'stylelint-config-html',
    'stylelint-config-tailwindcss',
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-scss',
    'stylelint-config-sass-guidelines',
  ],
  overrides: [
    {
      files: ['**/*.component.ts'],
      customSyntax: 'postcss-angular',
    },
    {
      files: ['*.html', '**/*.html'],
      customSyntax: 'postcss-html',
    },
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
      rules: {
        'selector-class-pattern': null,
        'plugin/selector-bem-pattern': {
          preset: 'bem',
        },
      },
    },
  ],
  ignoreFiles: ['node_modules/**/*', 'dist/**/*'],
  rules: {
    'no-empty-source': null,
    'max-nesting-depth': 5,
    'selector-max-compound-selectors': 5,
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['ng-deep'],
      },
    ],
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variant',
          'custom-variant',
          'layer',
          'utility',
          'theme',
          'config',
        ],
      },
    ],
  },
};
