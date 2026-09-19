import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置：仅运行 server/test 下的用例，使用 node 环境。
 * 测试通过 DB_PATH 指向临时库，绝不触碰真实 data 文件。
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
