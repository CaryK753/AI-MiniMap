// Author: wwj
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { launch, inject, storage } = require('./runtime.cjs');
const { fixture, sites } = require('./fixtures.cjs');
(async () => {
  const engine = process.env.MINIMAP_TEST_ENGINE || 'chromium';
  const browser = await launch(engine);
  for (const site of Object.keys(sites)) {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1200, height: 900 }, acceptDownloads: true });
    await storage(context);
    await context.route('**/*', route => route.fulfill({ contentType: 'text/html;charset=utf-8', body: fixture(site) }));
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(sites[site]); await inject(page);
    await page.locator('.rail').hover();
    assert.equal(await page.locator('.item').count(), 6);
    if (site === 'scheduled') {
      assert.equal(await page.locator('.count').getAttribute('aria-label'), '6 replies');
      assert((await page.locator('.item').first().innerText()).includes('Task update 1'));
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.item').nth(2).click(); await page.waitForTimeout(150);
    assert.equal(await page.locator('.item').nth(2).getAttribute('aria-current'), 'location');
    await page.locator('.export-trigger').click();
    assert.equal(await page.locator('.export-item').count(), site === 'scheduled' ? 6 : 12);
    await page.locator('[name="format"][value="json"]').check();
    const event = page.waitForEvent('download'); await page.locator('.download').click();
    const file = await event; const data = JSON.parse(await fs.readFile(await file.path(), 'utf8'));
    assert.equal(data.messages.length, site === 'scheduled' ? 6 : 12);
    assert(!JSON.stringify(data).includes('Tool output must stay out'));
    assert(!JSON.stringify(data).includes('Hidden branch'));
    assert(!JSON.stringify(data).includes('Sidebar decoy'));
    assert.equal(data.platform, site === 'claude' ? 'Claude' : site === 'gemini' ? 'Gemini' : ['work', 'codex'].includes(site) ? 'ChatGPT Work / Codex' : 'ChatGPT');
    await page.locator('.back').click(); await page.locator('.settings-trigger').click();
    await page.locator('[name="side"]').selectOption('left'); await page.waitForTimeout(100);
    const edge = async () => (await page.locator('.rail').boundingBox()).x;
    assert(Math.abs(await edge() - 90) <= 2);
    await page.locator('.settings-back').click(); await page.locator('.rail').click();
    await page.locator('#toggle').click(); await page.waitForTimeout(100);
    assert(Math.abs(await edge() - 264) <= 2);
    await page.locator('#toggle').click(); await page.waitForTimeout(100);
    assert(Math.abs(await edge() - 90) <= 2);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.locator('#toggle').click(); await page.waitForTimeout(100);
    assert.equal(await page.locator('.shell').getAttribute('data-obstructed'), 'true');
    assert.equal(await page.locator('.rail').isVisible(), false);
    await page.locator('#toggle').click(); await page.waitForTimeout(100);
    assert.equal(await page.locator('.rail').isVisible(), true);
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.reload(); await inject(page);
    assert.equal(await page.locator('.shell').getAttribute('data-side'), 'left');
    if (site === 'work') {
      await page.evaluate(() => document.querySelector('[data-thread-find-target]').setAttribute('data-thread-id', 'first'));
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.item').count(), 6); // Late identity discovery must retain this conversation.
      await page.evaluate(() => document.querySelector('[data-thread-find-target]').setAttribute('data-thread-id', 'second'));
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.item').count(), 0);
      await page.evaluate(() => history.pushState({}, '', '/work?threadId=different'));
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.item').count(), 0);
    }
    if (site === 'claude') {
      await page.evaluate(() => history.pushState({}, '', '/login'));
      await page.waitForTimeout(650);
      assert.equal(await page.locator('.shell').isVisible(), false);
    }
    // A fresh blank conversation hides the rail, then first content restores it.
    await page.goto(sites[site]);
    await page.evaluate(() => document.querySelector('.thread-scroll-container').replaceChildren());
    await inject(page);
    assert.equal(await page.locator('.rail').isVisible(), false);
    await page.evaluate(() => {
      const message = document.createElement('div');
      if (location.hostname === 'claude.ai') message.dataset.testid = 'assistant-message';
      else message.setAttribute('data-message-author-role', 'assistant');
      message.textContent = 'The first reply';
      document.querySelector('.thread-scroll-container').append(message);
    });
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.rail').isVisible(), true);
    assert.equal(await page.locator('.item').count(), 1);
    assert.deepEqual(errors, []); await context.close();
    console.log(`${engine} ${site}: message roles, navigation, export, sidebar-aware position, persistence and route boundaries PASS`);
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
