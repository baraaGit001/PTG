const { base } = require('@ptg/eslint-config');

module.exports = [
  ...base,
  { ignores: ['dist/**'] },
  {
    // `import type` erases the class reference that `emitDecoratorMetadata`
    // needs to emit as a constructor's design:paramtypes, so Nest's injector
    // sees `Function` instead of the provider and fails to resolve it. Autofixing
    // this rule silently breaks every injected dependency in the app.
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    // Lightweight in-memory test doubles (e.g. the fake Prisma client) lean on
    // `any` deliberately to avoid re-typing Prisma's generated client shape.
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];
