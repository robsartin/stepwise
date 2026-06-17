import { defineConfig } from 'vitest/config';

// Coverage is measured only on the pure/testable layers. The SDK glue
// (src/sdk/**), the composition root (main.ts), and static recipe data are
// verified in the simulator / on-device, so they're excluded — see CLAUDE.md.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/core/**', 'src/adapters/**'],
      exclude: [
        '**/*.test.ts',
        'src/sdk/**',
        'src/main.ts',
        'src/**/*.d.ts',
        'src/content/recipes/**',
        'src/core/recipe.ts',
        'src/core/command.ts',
        'src/core/clock.ts',
        'src/core/ports.ts',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 60,
      },
    },
  },
});
