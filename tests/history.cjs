// Author: wwj
require('node:fs').mkdirSync('work/test-artifacts',{recursive:true});
const {launch,inject}=require('./runtime.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');

(async()=>{
 const browser=await launch(process.env.MINIMAP_TEST_ENGINE || 'chromium');
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1280,height:850},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function setup(gemini){
  await page.route('https://'+(gemini?'gemini.google.com':'chatgpt.com')+'/**',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:`<meta charset="utf-8"><title>历史加载测试</title><style>body{margin:0;font:15px sans-serif;background:#fafafa}.thread-scroll-container,.chat-history{display:block;height:600px;overflow:auto;margin:50px 200px;width:680px}.turn{height:240px;box-sizing:border-box;padding:20px}user-query,model-response{display:block;min-height:55px}.cdk-visually-hidden,.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.bubble{padding:12px;border-radius:14px;background:#eee}</style><div class="${gemini?'chat-history':'thread-scroll-container'}" id="scroll"></div>`}));
  await page.goto('https://'+(gemini?'gemini.google.com':'chatgpt.com')+'/app/history');
  await page.evaluate(gemini=>{
   const scroll=document.querySelector('#scroll');
   const turn=i=>gemini?`<div class="conversation-container turn" id="turn-${i}"><user-query><div class="query-text"><h5 class="cdk-visually-hidden screen-reader-user-query-label"><span>你说</span>重复的提示词</h5><p class="query-text-line bubble">重复的提示词</p></div></user-query><model-response><h6 class="cdk-visually-hidden">Gemini 说</h6><div class="markdown"><p>第 ${i+1} 条 AI 回复</p></div></model-response></div>`:`<div class="turn" data-turn-key="turn-${i}"><div data-content-search-unit-key="turn-${i}:0:user" data-chatgpt-search-unit-key="turn-${i}:0:user"><h4 class="sr-only">你说：</h4><div data-user-message-bubble="true" class="bubble"><div data-search-result-target>重复的提示词</div></div></div><div data-content-search-unit-key="turn-${i}:0:assistant"><h4 class="sr-only">ChatGPT 说：</h4><div><div class="markdown"><p>第 ${i+1} 条 AI 回复</p></div></div></div></div>`;
   if(gemini){
    // Only six turns exist in DOM; spacer preserves the virtual scroll range.
    const render=()=>{const start=Math.min(24,Math.max(0,Math.floor(scroll.scrollTop/240)-1));if(scroll.dataset.start===String(start))return;scroll.dataset.start=start;scroll.innerHTML=`<div style="height:${start*240}px"></div>`+Array.from({length:6},(_,j)=>turn(start+j)).join('')+`<div style="height:${(30-start-6)*240}px"></div>`;};
    scroll.addEventListener('scroll',render);render();scroll.scrollTop=7200;render();
   }else{
    let first=20,busy=false;scroll.innerHTML=Array.from({length:10},(_,j)=>turn(first+j)).join('');scroll.scrollTop=scroll.scrollHeight;
    scroll.addEventListener('scroll',()=>{if(scroll.scrollTop>2||first===0||busy)return;busy=true;const status=document.createElement('div');status.role='status';status.textContent='正在加载更早的消息…';scroll.prepend(status);
     setTimeout(()=>{const before=scroll.scrollHeight;first-=10;status.remove();scroll.insertAdjacentHTML('afterbegin',Array.from({length:10},(_,j)=>turn(first+j)).join(''));scroll.scrollTop+=scroll.scrollHeight-before;busy=false;},600);
    });
   }
  },gemini);
  await inject(page);
  await page.waitForTimeout(250);
 }
 for(const gemini of [false,true]){
  await setup(gemini);
  assert(await page.locator('.rail').isVisible());
  await page.locator('.rail').hover();
  assert(!(await page.locator('.list').innerText()).includes('你说'));
  const initial=await page.locator('.item').count();assert(initial<=10);
  await page.locator('.export-trigger').click();
  await page.locator('.export-history-trigger').click();
  await page.waitForFunction(()=>!ConversationMinimapHistory.state.busy,{},{timeout:60000});
  assert.equal(await page.locator('.export-item').count(),60);
  assert.equal(await page.evaluate(()=>ConversationMinimapHistory.state.reason),'edges');
  await page.locator('[name="format"][value="json"]').check();
  const download=page.waitForEvent('download');await page.locator('.download').click();
  const file=await download;const data=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  assert.equal(data.messages.length,60);
  if(!gemini) await page.locator('.panel').screenshot({path:'work/test-artifacts/minimap-capsule-export.png'});assert.equal(data.collection.reason,'edges');
  assert.equal(data.messages[0].content,'重复的提示词');assert.equal(data.messages[59].content,'第 30 条 AI 回复');
  assert.equal(data.messages.filter(m=>m.role==='user').length,30);
  assert.equal(data.messages.filter(m=>m.content==='重复的提示词').length,30);
  assert(!JSON.stringify(data).includes('你说'));
  assert.deepEqual(data.messages.filter(m=>m.role==='assistant').map(m=>m.content),Array.from({length:30},(_,i)=>`第 ${i+1} 条 AI 回复`));
  await page.locator('.back').click();assert.equal(await page.locator('.item').count(),30);
  if(gemini){
   assert(await page.evaluate(()=>!ConversationMinimapStore.entries()[0].element.isConnected));
   await page.locator('.item').first().click();
   await page.waitForFunction(()=>!ConversationMinimapHistory.state.busy,{},{timeout:30000});
   assert.equal(await page.evaluate(()=>ConversationMinimapHistory.state.reason),'target');
   assert(await page.evaluate(()=>ConversationMinimapStore.entries()[0].element.isConnected));
  }
  // Explicit cancellation keeps collected records and unblocks export.
  await page.locator('.history-trigger').click();await page.locator('.history-trigger').click();
  await page.waitForFunction(()=>!ConversationMinimapHistory.state.busy);
  assert.equal(await page.evaluate(()=>ConversationMinimapHistory.state.reason),'cancelled');
  await page.evaluate(()=>{history.pushState({},'', '/app/different');document.querySelector('#scroll').replaceChildren();});
  await page.waitForTimeout(700);assert.equal(await page.locator('.item').count(),0);
  assert.equal(await page.evaluate(()=>ConversationMinimapStore.entries().length),0);
  assert.equal(await page.locator('.rail').isVisible(),false); // Blank new chats intentionally have no minibar.
  console.log(`${gemini?'Gemini virtual list':'ChatGPT new DOM + delayed pagination'}: 60 messages in order, 30 identical prompts retained, no accessibility labels, cached export, cancellation, route isolation PASS`);
 }
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
