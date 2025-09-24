/* Legacy ESLint config for CLI runs (ESLint v8). The repo also includes a flat config,
 * but this file ensures targeted lint commands work reliably on Windows.
 */
module.exports = {
  root: true,
  env: { browser: true, node: true, jest: true, es2022: true },
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: [
    'react',
    'react-hooks',
    'react-native',
    'react-native-a11y',
    '@typescript-eslint',
  ],
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
  ],
  settings: { react: { version: 'detect' } },
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      rules: {
        'react-native/no-inline-styles': 'warn',
        'react-native/no-color-literals': 'warn',
        'react-native-a11y/has-accessibility-hint': 'warn',
        'react-native-a11y/has-accessibility-props': 'warn',
        'react-native-a11y/has-valid-accessibility-actions': 'warn',
        'react-native-a11y/no-nested-touchables': 'warn',
      },
    },
  ],
};


