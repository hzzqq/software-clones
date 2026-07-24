import { test } from '@playwright/test';
import { expectAppMounted } from '../helpers';

test('tvtime 应用成功挂载', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
});
