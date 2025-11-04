import stylelintScss from 'stylelint-scss';

/** @type {import('stylelint').Config} */
export default {
  plugins: stylelintScss,
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
      files: ['**/*.component.ts  '],
      customSyntax: 'postcss-angular',
    },
    {
      files: ['*.html', '**/*.html'],
      customSyntax: 'postcss-html',
    },
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
    },
  ],
  ignoreFiles: ['node_modules/**/*', 'dist/**/*'],
  rules: {
    'no-empty-source': null,
  },
};
