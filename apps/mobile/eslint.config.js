// @ts-check

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import rnA11y from 'eslint-plugin-react-native-a11y';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, project: false },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        // Web APIs
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        RequestInit: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // React Native globals
        NodeJS: 'readonly',
        // Other globals
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-native': reactNative, 'react-native-a11y': rnA11y, '@typescript-eslint': tsPlugin },
    rules: {
      'react/prop-types': 'off',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Disable unused variables globally
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // Disable empty block statements globally
      'no-empty': 'off',
      // Accessibility rules
      'react-native-a11y/has-accessibility-hint': 'warn',
      'react-native-a11y/has-accessibility-props': 'warn',
      'react-native-a11y/has-valid-accessibility-actions': 'warn',
      'react-native-a11y/has-valid-accessibility-ignores-invert-colors': 'warn',
      'react-native-a11y/no-nested-touchables': 'warn',
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]',
          message: 'Use design tokens instead of inline hex colors.'
        }
      ]
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  {
    files: ['src/screens/Auth/CreateEvent.tsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        // Browser globals for CreateEvent.tsx
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
      },
    },
    plugins: { 'react-native-a11y': rnA11y },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
      'react-native-a11y/has-accessibility-hint': 'warn',
      'react-native-a11y/has-accessibility-props': 'warn',
      'react-native-a11y/has-valid-accessibility-actions': 'warn',
      'react-native-a11y/no-nested-touchables': 'warn',
    },
  }
];
