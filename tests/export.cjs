// Author: wwj
require('node:fs').mkdirSync('work/test-artifacts',{recursive:true});
const {launch,inject}=require('./runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const browser=await launch(process.env.MINIMAP_TEST_ENGINE || 'chromium');
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1280,height:900},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const answer='<h2>实现方案</h2><p>使用 <strong>本地导出</strong>，参考 <a href="https://example.com/guide">文档</a>。</p><ol><li>选择消息</li><li>下载文件</li></ol><pre><div class="code-block-decoration">Python<button>复制代码</button></div><code class="language-python">print("你好")\n# ``` 保留代码围栏\n</code></pre><table><tr><th>格式</th><th>用途</th></tr><tr><td>JSON</td><td>数据</td></tr></table><button>复制</button><p style="display:none">隐藏工具文本</p>';
 for(const gemini of [false,true]){
  const domain=gemini?'gemini.google.com':'chatgpt.com';
  await page.route(`https://${domain}/**`,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<html><head><meta charset="utf-8"><title>示例对话 / 导出测试</title></head><body style="margin:0;background:#fafafa;font:15px sans-serif;color:#222"><main style="max-width:680px;margin:70px auto">${[1,2,3].map(i=>gemini?`<user-query style="display:block;padding:24px;background:#eee;border-radius:12px"><div class="query-text">第${i}条提示词\n请用中文解释，并保留代码。</div></user-query><model-response style="display:block;padding:24px"><div class="markdown">${answer}</div><div class="markdown">追加回复段落</div></model-response>`:`<article style="padding:24px;background:#eee;border-radius:12px"><div data-message-author-role="user"><div class="whitespace-pre-wrap">第${i}条提示词\n请用中文解释，并保留代码。</div></div></article><article style="padding:24px"><div data-message-author-role="assistant"><div class="markdown">${answer}</div><div class="markdown">追加回复段落</div><button>重新生成</button></div></article>`).join('')}<div hidden data-message-author-role="assistant">隐藏分支不能导出</div></main></body></html>`}));
  await page.goto(`https://${domain}/app/example`);
  await inject(page);
  await page.locator('.rail').hover();await page.locator('.export-trigger').click();
  assert.equal(await page.locator('.export-item').count(),6);
  async function getDownload(format){
   await page.locator(`[name="format"][value="${format}"]`).check();
   const event=page.waitForEvent('download');await page.locator('.download').click();const file=await event;
   assert(file.suggestedFilename().endsWith('.'+format));assert(!file.suggestedFilename().includes('/'));
   return fs.readFile(await file.path(),'utf8');
  }
  const json=JSON.parse(await getDownload('json'));
  assert.equal(json.messages.length,6);assert.deepEqual(json.messages.map(m=>m.role),['user','assistant','user','assistant','user','assistant']);
  assert(json.messages[1].content.includes('print("你好")'));
  assert(!json.messages[1].content.includes('复制'));assert(!json.messages[1].content.includes('Python'));
  const md=await getDownload('md');assert(md.includes('## 实现方案'));assert(md.includes('**本地导出**'));
  assert(md.includes('````python'));assert(md.includes('1. 选择消息'));assert(md.includes('| 格式 | 用途 |'));
  assert(md.includes('[文档](<https://example.com/guide>)'));assert(!md.includes('隐藏分支'));assert(!md.includes('隐藏工具文本'));assert(md.includes('追加回复段落'));
  await page.locator('[name="role"][value="assistant"]').uncheck();
  assert.equal(await page.locator('.export-item').count(),3);
  const txt=await getDownload('txt');assert(txt.includes('【用户 · 1】'));assert(!txt.includes('【AI'));assert(!txt.includes('实现方案'));
  await page.locator('[name="role"][value="assistant"]').check();
  await page.locator('[name="role"][value="user"]').uncheck();
  await page.locator('.export-item input').nth(1).uncheck();
  assert(await page.locator('.select-all').evaluate(el=>el.indeterminate));
  const partial=JSON.parse(await getDownload('json'));assert.deepEqual(partial.messages.map(m=>m.index),[2,6]);
  await page.locator('.select-all').check();await page.locator('.select-all').uncheck();assert(await page.locator('.download').isDisabled());
  await page.locator('[name="role"][value="assistant"]').uncheck();assert.equal(await page.locator('.export-item').count(),0);
  assert(await page.locator('.download').isDisabled());
  await page.locator('.back').click();await page.locator('.export-trigger').click();
  // The panel uses a snapshot: subsequent streaming text does not silently change selected export.
  await page.evaluate(()=>document.querySelector('.markdown p').append(' 后续生成内容'));
  assert(!JSON.parse(await getDownload('json')).messages[1].content.includes('后续生成内容'));
  await page.locator('.back').click();await page.locator('.export-trigger').click();
  await page.screenshot({path:`work/test-artifacts/${gemini?'gemini-export':'minimap-export'}-preview.png`});
  if(!gemini){
   await page.locator('.panel').screenshot({path:'work/test-artifacts/minimap-export-panel.png'});
   await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:'work/test-artifacts/minimap-export-dark.png'});
   await page.setViewportSize({width:390,height:640});
   const box=await page.locator('.export-view').boundingBox();assert(box.x>=0 && box.y>=0 && box.y+box.height<=640);
   assert(await page.locator('.download').isVisible());
   await page.setViewportSize({width:1280,height:900});await page.emulateMedia({colorScheme:'light'});
  }
  await page.evaluate(()=>history.pushState({},'', '/app/other'));
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.export-view').isVisible(),false);
  assert.equal(await page.evaluate(()=>ConversationMinimapStore.entries().length),0);
  console.log(`${gemini?'Gemini':'ChatGPT'}: 3 format downloads, content, ordering, roles, individual selection, empty selection, snapshot, route guard PASS`);
 }
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
