import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the Pomodoro server.
 * Tests live in `test/**` and run against an isolated temp SQLite database.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
