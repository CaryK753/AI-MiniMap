// Author: wwj
require('node:fs').mkdirSync('work/test-artifacts',{recursive:true});
const {launch,inject}=require('./runtime.cjs');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');

(async()=>{
 for(const engine of [process.env.MINIMAP_TEST_ENGINE || 'chromium']){
  const browser=await launch(engine);
  for(const locale of ['en-US','zh-CN','fr-FR']){
   const context=await browser.newContext({locale,colorScheme:'light',acceptDownloads:true,viewport:{width:1100,height:850}});
   await context.addInitScript(()=>{
    window.browser={storage:{local:{
      async get(key){return {[key]:JSON.parse(localStorage.getItem(key)||'null')};},
      async set(value){for(const [key,data] of Object.entries(value))localStorage.setItem(key,JSON.stringify(data));}
    }}};
   });
   await context.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:'<meta charset="utf-8"><title>Original chat title</title><body style="background:linear-gradient(130deg,#d9e9fd,#ece0ff);font:16px sans-serif"><main style="padding:50px"><div data-content-search-unit-key="1:0:user"><div data-user-message-bubble="true">正文保留中文：please do not translate me.</div></div><div data-content-search-unit-key="1:0:assistant"><div class="markdown"><h2>Reply title</h2><p>Unchanged reply 正文</p></div></div></main></body>'}));
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   async function load(){await page.goto('https://chatgpt.com/c/preferences');await inject(page);await page.evaluate(()=>ConversationMinimapPreferences.ready);}
   await load();const chinese=locale.startsWith('zh');
   assert.equal(await page.locator('.rail').getAttribute('aria-label'),chinese?'展开对话导航':'Open conversation navigation');
   await page.locator('.rail').hover();await page.waitForTimeout(250);
   assert.equal(await page.locator('.heading').first().innerText(),chinese?'对话导航':'Conversation');
   assert.equal(await page.locator('.settings-trigger').innerText(),chinese?'设置':'Settings');
   assert.equal(await page.locator('.settings-trigger svg').count(),1);
   assert.equal(await page.locator('.panel').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
   await page.locator('.settings-trigger').click();
   assert.equal(await page.locator('[name="glass"]').isChecked(),false);
   await page.locator('[name="glass"]').check();
   await page.locator('.settings-back').click();
   if(engine==='webkit'){
    assert.equal(await page.locator('.panel').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(255, 255, 255, 0.48)');
    if(chinese) await page.locator('.panel').screenshot({path:'work/test-artifacts/webkit-settings-entry.png'});
   }
   assert.equal(await page.locator('.shell').evaluate(el=>getComputedStyle(el).color),'rgb(23, 23, 23)');
   await page.emulateMedia({colorScheme:'dark'});
   assert.equal(await page.locator('.shell').evaluate(el=>getComputedStyle(el).color),'rgb(237, 237, 237)');
   await page.locator('.settings-trigger').click();await page.locator('[name="theme"]').selectOption('light');
   await page.waitForTimeout(50);assert.equal(await page.locator('.shell').evaluate(el=>getComputedStyle(el).color),'rgb(23, 23, 23)');
   await page.locator('[name="theme"]').selectOption('dark');await page.emulateMedia({colorScheme:'light'});
   assert.equal(await page.locator('.shell').evaluate(el=>getComputedStyle(el).color),'rgb(237, 237, 237)');
   await page.locator('[name="language"]').selectOption(chinese?'en':'zh-CN');
   assert.equal(await page.locator('.settings-view .heading').innerText(),chinese?'Preferences':'偏好设置');
   await page.locator('[name="language"]').selectOption('en');await page.locator('.settings-back').click();
   assert.equal(await page.locator('.settings-trigger svg').count(),1);
   assert.equal(await page.locator('.settings-trigger').innerText(),'Settings');
   assert.equal(await page.locator('.item .label').innerText(),'正文保留中文：please do not translate me.');
   await page.locator('.export-trigger').click();
   assert.equal(await page.locator('.selected-count').innerText(),'2 / 2 selected');
   await page.locator('[name="format"][value="txt"]').check();
   const event=page.waitForEvent('download');await page.locator('.download').click();const file=await event;
   const text=await fs.readFile(await file.path(),'utf8');assert(text.includes('【User · 1】'));assert(text.includes('正文保留中文'));assert(text.includes('Exported at'));
   await load();assert.equal(await page.locator('#conversation-minimap-extension').getAttribute('data-glass'),'true');assert.equal(await page.locator('.shell').getAttribute('lang'),'en');
   assert.equal(await page.locator('#conversation-minimap-extension').getAttribute('data-theme'),'dark');
   await page.locator('.rail').hover();await page.locator('.settings-trigger').click();
   await page.locator('[name="glass"]').uncheck();
   assert.equal(await page.locator('.panel').evaluate(el=>getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter),'none');
   await page.locator('[name="theme"]').selectOption('system');await page.locator('[name="language"]').selectOption('auto');
   assert.equal(await page.locator('.settings-view .heading').innerText(),chinese?'偏好设置':'Preferences');
   if(locale==='en-US'){
    await page.locator('[name="theme"]').selectOption('light');await page.locator('.settings-back').click();await page.locator('.export-trigger').click();
    await page.locator('.panel').screenshot({path:`work/test-artifacts/${engine}-english-light.png`});
    await page.locator('.back').click();await page.locator('.settings-trigger').click();await page.locator('[name="theme"]').selectOption('dark');
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.settings-back').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(23, 23, 23)');
    await page.locator('.panel').screenshot({path:`work/test-artifacts/${engine}-preferences-dark.png`});
   }
   assert.deepEqual(errors,[]);await context.close();
   console.log(`${engine} ${locale}: auto language, untranslated content, runtime switch, system theme, explicit overrides, preference persistence, English TXT download PASS`);
  }
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
