// Author: wwj
require('node:fs').mkdirSync('work/test-artifacts',{recursive:true});
const {launch,inject}=require('./runtime.cjs');
const path=require('node:path');const assert=require('node:assert/strict');

(async()=>{
 const browser=await launch(process.env.MINIMAP_TEST_ENGINE || 'chromium');
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1100,height:800},acceptDownloads:true});
 await page.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:'<meta charset="utf-8"><main><div data-content-search-unit-key="turn:0:user"><div data-user-message-bubble="true">请测试界面</div></div><div data-content-search-unit-key="turn:0:assistant"><p>回复内容</p></div></main>'}));
 await page.goto('https://chatgpt.com/c/motion');
 await inject(page);
 assert.equal(await page.locator('.panel').isVisible(),false);
 const rail=await page.locator('.rail').boundingBox();
 await page.mouse.move(rail.x-150,rail.y+100);await page.waitForTimeout(300);
 assert.equal(await page.locator('.panel').isVisible(),false);
 await page.locator('.rail').hover();await page.waitForTimeout(250);
 assert.equal(await page.locator('.panel').isVisible(),true);
 assert((await page.locator('.panel').evaluate(el=>getComputedStyle(el).transitionProperty)).includes('opacity'));
 await page.mouse.move(10,10);await page.waitForTimeout(260);assert.equal(await page.locator('.panel').isVisible(),false);
 await page.locator('.rail').click();await page.locator('.export-trigger').click();
 const event=page.waitForEvent('download');await page.locator('.download').click();
 assert.equal(await page.locator('.download').getAttribute('data-processing'),'true');
 assert(await page.locator('.download').isDisabled());await event;
 assert.equal(await page.locator('.download').getAttribute('data-processing'),'false');
 await page.locator('.export-history-trigger').click();
 assert.equal(await page.locator('.shell').getAttribute('data-busy'),'true');
 assert.equal(await page.locator('.export-history-trigger').evaluate(el=>getComputedStyle(el,'::before').animationName),'minimap-spin');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.export-history-trigger').evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
 assert.equal(await page.locator('.panel').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.locator('.export-history-trigger').click();
 await page.waitForFunction(()=>!ConversationMinimapHistory.state.busy);
 await page.setViewportSize({width:390,height:640});
 const box=await page.locator('.panel').boundingBox();assert(box.x>=0&&box.y>=0&&box.y+box.height<=640);
 console.log('Panel enter/exit, no invisible hover zone, file processing state, loading spinner, reduced motion, narrow viewport PASS');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
