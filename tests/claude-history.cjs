// Author: wwj. Tests recycled DOM nodes with real Claude-style role and body hooks.
const assert = require('node:assert/strict');
const { launch, inject } = require('./runtime.cjs');
(async () => {
  const browser = await launch(process.env.MINIMAP_TEST_ENGINE || 'chromium');
  const page = await browser.newPage({ locale: 'en-US', viewport: { width: 1200, height: 800 } });
  await page.route('https://claude.ai/**', route => route.fulfill({ contentType: 'text/html;charset=utf-8', body: '<main><div id="scroll" style="height:600px;overflow:auto"></div></main>' }));
  await page.goto('https://claude.ai/chat/virtual-demo');
  await page.evaluate(() => {
    const scroll = document.querySelector('#scroll');
    scroll.innerHTML = '<div id="before"></div><div id="pool"></div><div id="after"></div>';
    const pool = document.querySelector('#pool');
    for (let slot = 0; slot < 6; slot++) {
      const row = document.createElement('div'); row.style.height = '240px';
      row.innerHTML = '<div data-testid="user-message"></div><div data-testid="assistant-message"><div class="standard-markdown" data-perf-reply-text></div></div>';
      pool.append(row);
    }
    const render = () => {
      const start = Math.min(24, Math.max(0, Math.floor(scroll.scrollTop / 240) - 1));
      document.querySelector('#before').style.height = `${start * 240}px`;
      document.querySelector('#after').style.height = `${(30 - start - 6) * 240}px`;
      [...pool.children].forEach((row, offset) => {
        const index = start + offset;
        row.querySelector('[data-testid="user-message"]').setAttribute('data-turn-key', `user-${index}`);
        row.querySelector('[data-testid="user-message"]').textContent = 'The same repeated prompt';
        row.querySelector('[data-testid="assistant-message"]').setAttribute('data-turn-key', `assistant-${index}`);
        row.querySelector('[data-perf-reply-text]').textContent = `Reply ${index}`;
      });
    };
    scroll.addEventListener('scroll', render); render(); scroll.scrollTop = 7200; render();
  });
  await inject(page);
  await page.evaluate(() => ConversationMinimapHistory.scan());
  const records = await page.evaluate(() => ConversationMinimapStore.entries().map(({ key, role, text }) => ({ key, role, text })));
  assert.equal(records.length, 60);
  assert.equal(records.filter(entry => entry.role === 'user').length, 30);
  assert.equal(records[0].key, 'user:user-0');
  assert.equal(records[59].text, 'Reply 29');
  const oldRef = await page.evaluate(() => {
    const entry = ConversationMinimapStore.entries()[0];
    return { connected: entry.element.isConnected, live: ConversationMinimapAdapter.isLive(entry) };
  });
  assert.equal(oldRef.connected, true); assert.equal(oldRef.live, false);
  await page.locator('.rail').hover(); await page.locator('.item').first().click();
  await page.waitForFunction(() => !ConversationMinimapHistory.state.busy);
  assert.equal(await page.evaluate(() => ConversationMinimapHistory.state.reason), 'target');
  assert(await page.evaluate(() => ConversationMinimapAdapter.isLive(ConversationMinimapStore.entries()[0])));
  await page.evaluate(() => history.pushState({}, '', '/chat/different'));
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(() => ConversationMinimapStore.entries().length), 0);
  console.log('Claude recycled nodes: 60 distinct records, repeated prompts, correct historical jump and route isolation PASS');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
