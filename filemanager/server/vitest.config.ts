import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置：仅运行 server/test 下的用例，使用 node 环境。
 * 测试通过 DB_PATH / FM_ROOT 指向临时目录，绝不触碰真实数据。
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
