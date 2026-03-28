import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import i18nextPlugin from 'eslint-plugin-i18next'
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
    plugins: {
      reactHooks,
      reactRefresh,
      i18next: i18nextPlugin
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'i18next/no-literal-string': ['warn', { 
        markupOnly: true, 
        ignoreAttribute: ['className', 'type', 'stroke', 'fill', 'viewBox', 'color', 'size', 'to', 'd', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'target', 'rel'] 
      }]
    },
  },
])
