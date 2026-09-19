import { defineConfig } from 'vitest/config';

// Server-side test runner (vitest). Tests use an isolated temp SQLite DB.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
