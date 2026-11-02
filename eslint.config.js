import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Everything outside the physics core. Those layers read from physics; physics never
// reads from them.
const NON_PHYSICS_FOLDERS = ['engine', 'models', 'instruments', 'overlays', 'glossary', 'review'];

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'blob-report']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // Spec, Physics accuracy: "All physics lives in a pure TypeScript module with no
    // rendering code." This rule is that boundary. Do not relax it to get code through.
    files: ['src/physics/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-*',
                'three',
                'three/*',
                '@react-three/*',
                'zustand',
                'zustand/*',
              ],
              message:
                'The physics core is pure TypeScript: no rendering, React or app-state imports.',
            },
            {
              group: [
                '@/*',
                '!@/physics',
                '!@/physics/*',
                '@content/*',
                '**/content/*',
                ...NON_PHYSICS_FOLDERS.flatMap((folder) => [
                  `@/${folder}`,
                  `@/${folder}/*`,
                  `**/${folder}`,
                  `**/${folder}/*`,
                ]),
              ],
              message:
                'The physics core must not import UI or content code. Those layers read from physics, never the reverse.',
            },
          ],
        },
      ],
    },
  },
  prettier,
]);
