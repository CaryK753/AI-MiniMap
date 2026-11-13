// Author: wwj. DeepSeek virtual list, DeepThink isolation and code-block export.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { launch, inject } = require('./runtime.cjs');
(async () => {
  const browser = await launch(process.env.MINIMAP_TEST_ENGINE || 'chromium');
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1280, height: 850 }, acceptDownloads: true });
  // 1.4.x persisted the resolved side; 'right' was its built-in default and must
  // not override the DeepSeek left default after upgrading.
  await context.addInitScript(() => {
    const legacy = { glass: false, language: 'auto', side: 'right', theme: 'system' };
    window.browser = { storage: { local: {
      async get(key) { return { [key]: JSON.parse(localStorage.getItem(key) || JSON.stringify(legacy)) }; },
      async set(values) { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value)); }
    } } };
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://chat.deepseek.com/**', route => route.fulfill({ contentType: 'text/html;charset=utf-8',
    body: `<meta charset="utf-8"><title>DeepSeek 历史测试</title><style>
      body{margin:0;font:15px sans-serif;background:#fafafa}#root{display:flex;height:100vh}
      ._5a4b1c0{flex:0 0 260px;box-sizing:border-box;background:#f0f0f2;border-right:1px solid #e6e6e8;padding:10px}
      main{flex:1;min-width:0;display:flex;flex-direction:column}.ds-virtual-list{height:100%;overflow:auto}
      .turn{height:200px;box-sizing:border-box;padding:10px 16px;border-bottom:1px solid #eee;overflow:hidden}
      .fbb737a4{background:#ecebed;border-radius:14px;padding:8px 12px;margin:0 0 6px}
      .ds-assistant-message-main-content,.ds-think-content,.md-code-block{margin:4px 0}
      .ds-think-content{color:#999;font-size:12px}.md-code-block{background:#f4f4f6;border-radius:10px;padding:6px}
    </style><div id="root"><div class="_5a4b1c0 hash-sidebar">会话列表</div><main><div class="ds-virtual-list" id="scroll"></div></main></div>` }));
  await page.goto('https://chat.deepseek.com/a/chat/s/demo');
  await page.evaluate(() => {
    const scroll = document.querySelector('#scroll'), ITEM = 200, TOTAL = 30, WINDOW = 6;
    const turn = i => `<div class="turn" data-virtual-list-item-key="${i * 2}"><div class="ds-message">
      <div class="fbb737a4"><div class="ds-collapsible-text"><div class="md-user-markdown ds-markdown"><p class="ds-markdown-paragraph">重复的提示词</p></div></div>
      <div class="ds-flex"><div role="button" class="ds-button"><div class="ds-icon"></div></div></div></div>
      <div class="_74c0879"><div class="ds-think-content"><div class="ds-markdown"><p class="ds-markdown-paragraph">思考过程 ${i + 1}</p></div></div></div>
      <div class="ds-markdown ds-assistant-message-main-content"><p class="ds-markdown-paragraph">第 ${i + 1} 条 AI 回复</p>
      <div class="md-code-block"><div class="md-code-block-banner-wrap"><div class="md-code-block-banner"><span class="d813de27">python</span><button>复制</button></div></div>
      <pre><span>print("你好")</span></pre></div></div></div></div>`;
    let start = -1;
    // DeepSeek keeps every message in memory but mounts only a window of rows.
    const render = () => {
      const next = Math.max(0, Math.min(TOTAL - WINDOW, Math.floor(scroll.scrollTop / ITEM) - 1));
      if (next === start) return;
      start = next;
      scroll.innerHTML = `<div style="height:${start * ITEM}px"></div>` +
        Array.from({ length: WINDOW }, (_, j) => turn(start + j)).join('') +
        `<div style="height:${(TOTAL - start - WINDOW) * ITEM}px"></div>`;
    };
    scroll.addEventListener('scroll', render); render();
  });
  await inject(page);
  await page.locator('.rail').hover();
  const initial = await page.locator('.item').count();
  assert(initial > 0 && initial <= 6, `virtual window mounts only rendered prompts (${initial})`);
  await page.locator('.rail').click();
  // A legacy saved 'right' migrates to "automatic", so DeepSeek opens on the left
  // and the hashed sidebar is avoided through the conversation column edge.
  const offset = value => `document.querySelector('#conversation-minimap-extension').shadowRoot.querySelector('.shell').style.getPropertyValue('--left-offset') === '${value}'`;
  assert.equal(await page.locator('.shell').getAttribute('data-side'), 'left');
  await page.waitForFunction(offset('274px'));
  await page.evaluate(() => document.querySelector('.hash-sidebar').remove());
  await page.waitForFunction(offset('14px'));
  await page.locator('.export-trigger').click();
  await page.locator('.export-history-trigger').click();
  await page.waitForFunction(() => !ConversationMinimapHistory.state.busy, {}, { timeout: 60000 });
  assert.equal(await page.evaluate(() => ConversationMinimapHistory.state.reason), 'edges');
  assert.equal(await page.locator('.export-item').count(), 60);
  async function download(format) {
    await page.locator(`[name="format"][value="${format}"]`).check();
    const event = page.waitForEvent('download'); await page.locator('.download').click();
    return fs.readFile(await (await event).path(), 'utf8');
  }
  const data = JSON.parse(await download('json'));
  assert.equal(data.platform, 'DeepSeek');
  assert.equal(data.messages.length, 60);
  assert.equal(data.messages.filter(m => m.role === 'user').length, 30);
  assert.equal(data.messages.filter(m => m.content === '重复的提示词').length, 30);
  assert.deepEqual(data.messages.filter(m => m.role === 'assistant').map(m => m.content.match(/第 \d+ 条 AI 回复/)[0]),
    Array.from({ length: 30 }, (_, i) => `第 ${i + 1} 条 AI 回复`));
  assert(!JSON.stringify(data).includes('思考过程')); // DeepThink reasoning is not part of the reply.
  assert(!JSON.stringify(data).includes('复制')); // Code-block controls are not exported.
  const md = await download('md');
  assert(md.includes('```python')); assert(md.includes('print("你好")')); assert(!md.includes('复制'));
  await page.locator('.back').click();
  assert.equal(await page.locator('.item').count(), 30);
  await page.evaluate(() => { const list = document.querySelector('#scroll'); list.scrollTop = list.scrollHeight; });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => !ConversationMinimapStore.entries()[0].element.isConnected));
  await page.locator('.item').first().click();
  await page.waitForFunction(() => !ConversationMinimapHistory.state.busy, {}, { timeout: 30000 });
  assert.equal(await page.evaluate(() => ConversationMinimapHistory.state.reason), 'target');
  assert(await page.evaluate(() => ConversationMinimapStore.entries()[0].element.isConnected));
  // An explicit side still wins over the platform default.
  const side = () => page.locator('.shell').getAttribute('data-side');
  await page.evaluate(() => ConversationMinimapPreferences.set({ side: 'right' }));
  await page.waitForFunction(() => document.querySelector('#conversation-minimap-extension').shadowRoot.querySelector('.shell').dataset.side === 'right');
  await page.evaluate(() => ConversationMinimapPreferences.set({ side: 'auto' }));
  await page.waitForFunction(() => document.querySelector('#conversation-minimap-extension').shadowRoot.querySelector('.shell').dataset.side === 'left');
  assert.equal(await side(), 'left');
  assert.deepEqual(errors, []); await browser.close();
  console.log('DeepSeek: virtual window, column-edge sidebar offset, 60 ordered messages, DeepThink exclusion, code fence, recycled-node jump PASS');
})().catch(e => { console.error(e); process.exit(1); });
