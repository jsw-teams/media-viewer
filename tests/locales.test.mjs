import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{extname}from'node:path';import{chromium}from'playwright';
test('Video.js controls use local English and both Chinese locales without external requests',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 try{for(const[locale,play,mute,settings]of[['en','Play','Mute','Settings'],['zh-CN','播放','静音','设置'],['zh-TW','播放','靜音','設定']]){
  const page=await browser.newPage(),external=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='component.test'){external.push(url.hostname);return route.abort();}const body=await readFile('.'+url.pathname),types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webm':'video/webm'};return route.fulfill({contentType:types[extname(url.pathname)]||'text/html',body:url.pathname.endsWith('/index.html')?body.toString().replace('lang="en"',`lang="${locale}"`):body});});
  await page.goto('https://component.test/demo/index.html');await page.getByRole('button',{name:play,exact:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:mute,exact:true}).count(),1);await page.getByRole('button',{name:settings,exact:true}).click();assert.equal(await page.locator('[role=menuitemradio]').count(),12);await page.keyboard.press('Escape');assert.equal(await page.locator('[data-action=settings]').evaluate(node=>node===document.activeElement),true);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
});
