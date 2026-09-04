// Shared flat ESLint config for every workspace package.
const tseslint = require('typescript-eslint');
const globals = require('globals');

/** Rules that back the "non-negotiable engineering rules" in the project brief. */
const sharedRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  eqeqeq: ['error', 'smart'],
  'no-empty': ['error', { allowEmptyCatch: false }],
};

const base = [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.generated.ts'] },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: sharedRules,
  },
];

const react = [
  ...base,
  {
    files: ['**/*.tsx'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: {
      'react-hooks': require('eslint-plugin-react-hooks'),
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

module.exports = { base, react, sharedRules };
