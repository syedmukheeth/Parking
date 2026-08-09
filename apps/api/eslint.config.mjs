import root from '../../eslint.config.mjs';

/**
 * The api's config is the root config plus one exception.
 *
 * `consistent-type-imports` is incompatible with NestJS dependency injection.
 * A constructor parameter like `private readonly prisma: PrismaService` is
 * syntactically a type-only position, so the rule rewrites the import to
 * `import type`, which erases it at compile time. Nest resolves constructor
 * dependencies from the `design:paramtypes` metadata `emitDecoratorMetadata`
 * writes from that same runtime reference, so the container ends up unable to
 * construct anything, and it fails at boot rather than in the type checker.
 *
 * The override lives here rather than in the root config because each
 * workspace runs eslint with its own cwd, so a repo-relative `files` glob in
 * the root never matches. Every other workspace keeps the rule.
 */
export default [
  ...root,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
