// Author: wwj. All screenshots use synthetic conversations.
const path = require('node:path');
const fs = require('node:fs/promises');
const { launch, inject, storage } = require('./runtime.cjs');
const { sites, fixture } = require('./fixtures.cjs');
(async () => {
  const engine = process.env.MINIMAP_TEST_ENGINE || 'chromium';
  const browser = await launch(engine);
  await fs.mkdir(path.resolve('docs/images'), { recursive: true });
  const plans = engine === 'firefox' ? ['navigation', 'export'] : engine === 'webkit' ? ['settings'] : ['scheduled', 'left-sidebar'];
  for (const plan of plans) {
    const site = plan === 'scheduled' ? 'scheduled' : plan === 'left-sidebar' ? 'work' : 'claude';
    const context = await browser.newContext({ locale: plan === 'left-sidebar' ? 'zh-CN' : 'en-US', viewport: { width: 1280, height: 860 }, colorScheme: plan === 'settings' ? 'dark' : 'light' });
    await storage(context);
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html;charset=utf-8', body: fixture(site) }));
    const page = await context.newPage(); await page.goto(sites[site]); await inject(page);
    if (plan === 'left-sidebar') {
      await page.locator('#toggle').click();
      await page.evaluate(() => ConversationMinimapPreferences.set({ side: 'left' }));
    }
    await page.locator('.rail').hover(); await page.waitForTimeout(250);
    if (plan === 'export') {
      await page.locator('.export-trigger').click();
      await page.locator('.export-item input').nth(1).uncheck();
      await page.locator('.export-item input').nth(3).uncheck();
      await page.locator('[name="format"][value="json"]').check();
    }
    if (plan === 'settings') {
      await page.locator('.settings-trigger').click();
      await page.locator('[name="theme"]').selectOption('dark');
    }
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.resolve(`docs/images/${engine}-${plan}.png`) });
    await context.close();
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
