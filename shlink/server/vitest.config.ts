import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // 沙箱内 node_modules 只读时避免写 results 缓存（EPERM）。
    cache: false,
  },
});
