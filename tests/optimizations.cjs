// Author: wwj
const assert = require('node:assert/strict');
const { launch, inject, storage } = require('./runtime.cjs');
const { sites, fixture } = require('./fixtures.cjs');
(async () => {
  const browser = await launch(process.env.MINIMAP_TEST_ENGINE || 'chromium');
  const context = await browser.newContext({ viewport: { width: 1100, height: 850 }, reducedMotion: 'reduce' });
  await storage(context);
  await context.addInitScript(() => {
    const Observer = window.ResizeObserver;
    window.unobserved = [];
    window.ResizeObserver = class extends Observer {
      unobserve(element) { window.unobserved.push(element.id); super.unobserve(element); }
    };
  });
  let count = 1;
  await context.route('https://chatgpt.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture('work', count) }));
  const page = await context.newPage();
  for (const [messages, height] of [[1, 52], [6, 108], [30, 220]]) {
    count = messages;
    await page.goto(sites.work); await inject(page);
    assert.equal(await page.locator('.rail').evaluate(el => el.getBoundingClientRect().height), height);
    assert.equal(await page.locator('.navigation-view>header .history-trigger').count(), 1);
    assert.equal(await page.locator('.history-status').innerText(), '');
    assert.equal(await page.locator('.navigation-title .count').count(), 1);
    assert(await page.locator('.history-trigger').getAttribute('aria-label'));
    assert.equal(await page.locator('.history-trigger svg').count(), 1);
  }
  await page.setViewportSize({ width: 1100, height: 300 });
  assert.equal(await page.locator('.rail').evaluate(el => el.getBoundingClientRect().height), 180);
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.evaluate(() => ConversationMinimapPreferences.set({ side: 'left' }));
  await page.waitForFunction(() => document.querySelector('#conversation-minimap-extension').shadowRoot.querySelector('.shell').style.getPropertyValue('--left-offset') === '90px');
  await page.evaluate(() => document.querySelector('#sidebar').remove());
  await page.waitForFunction(() => window.unobserved.includes('sidebar'));
  await page.evaluate(() => {
    document.querySelector('[data-thread-find-target]').dataset.threadId = 'old-thread';
    ConversationMinimapStore.ensureRoute();
  });
  const downloads = []; page.on('download', file => downloads.push(file));
  await page.locator('.rail').click(); await page.locator('.export-trigger').click();
  // Change the identity synchronously after starting the deferred file preparation.
  await page.evaluate(() => {
    const root = document.querySelector('#conversation-minimap-extension').shadowRoot;
    root.querySelector('.download').click();
    document.querySelector('[data-thread-find-target]').dataset.threadId = 'new-thread';
    ConversationMinimapStore.ensureRoute();
  });
  await page.waitForTimeout(350);
  assert.equal(downloads.length, 0);
  assert.equal(await page.locator('.download').getAttribute('data-processing'), 'false');
  await browser.close();
  console.log('Adaptive rail, compact history, sidebar cleanup and stale export cancellation PASS');
})().catch(error => { console.error(error); process.exit(1); });
