export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: [
    'dist/**/*',
    'lib/**/*',
    'node_modules/**/*',
    'public/js/**/*',
  ],
  rules: {
    'alpha-value-notation': null,
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'value-keyword-case': null,
  },
};
