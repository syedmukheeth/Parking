import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import root from '../../eslint.config.mjs';

/**
 * The web app's config is the root config plus the two React-specific rule
 * sets the rest of the monorepo has no use for.
 *
 * `jsx-a11y` is here to make accessibility enforceable rather than asserted —
 * a missing label or a click handler on a `<div>` should fail the build, not a
 * review. `react-hooks` catches stale-closure dependency bugs, which is the
 * failure mode of every effect that reads state it didn't declare.
 */
export default [
  ...root,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    // Wired by hand rather than spreading the plugin's preset: this version
    // still ships its `recommended` in the legacy shape, which flat config
    // rejects with "plugins must be an object".
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Next.js `<Link>` renders a real anchor; the rule can't see through it.
      'jsx-a11y/anchor-is-valid': 'off',
    },
  },
];
