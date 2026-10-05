import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {chromium} from 'playwright';

test('mobile controls and image dialogs pass axe, preserve keyboard focus and keep delayed media stable',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})}),axe=await readFile('node_modules/axe-core/axe.min.js','utf8'),results=[];
 const quality=page=>page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});
 try{for(const viewport of [{width:320,height:844},{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,hasTouch:true}),page=await context.newPage();await page.addInitScript(()=>{window.shifts=[];new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)shifts.push(entry.value);}).observe({type:'layout-shift',buffered:true});});
  await context.route('**/*',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/original.svg'){await new Promise(resolve=>setTimeout(resolve,1200));return route.fulfill({contentType:'image/svg+xml',body:await readFile('demo/sample.svg')});}const types={'.js':'text/javascript','.css':'text/css','.webm':'video/webm','.svg':'image/svg+xml','.html':'text/html'};return route.fulfill({contentType:types[extname(path)]||'text/html',body:await readFile('.'+path)});});
  await page.goto('https://component.test/demo/index.html');await page.locator('.media-player').waitFor();await page.addScriptTag({content:axe});assert.deepEqual(await quality(page),[]);
  const box=await page.locator('.gallery-stage').boundingBox();await page.locator('.plyr__control--overlaid').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.locator('video').evaluate(v=>v.pause());
  await page.locator('[data-next]').click();await page.waitForFunction(()=>document.querySelector('img[data-media]').naturalWidth>0);const imageBox=await page.locator('.gallery-stage').boundingBox();assert.ok(Math.abs(box.height-imageBox.height)<1);await page.locator('img[data-media]').evaluate(image=>{image.dataset.original='/original.svg';});
  await page.locator('img[data-media]').click();await page.locator('.image-lightbox[open]').waitFor();await page.waitForFunction(()=>document.querySelector('.image-lightbox-status').hidden);assert.deepEqual(await quality(page),[]);assert.equal(await page.locator('.image-lightbox-toolbar button').count(),3);
  for(const button of await page.locator('.image-lightbox-toolbar button,.image-lightbox-save').all()){const rect=await button.boundingBox();assert.ok(rect.width>=44&&rect.height>=44&&rect.x>=0&&rect.x+rect.width<=viewport.width);assert.equal(await button.locator('svg[aria-hidden=true]').count(),1);}
  await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('.image-lightbox')));await page.keyboard.press('Escape');await page.locator('.image-lightbox').waitFor({state:'detached'});assert.equal(await page.locator('img[data-media]').evaluate(img=>img===document.activeElement),true);
  const cls=await page.evaluate(()=>shifts.reduce((sum,x)=>sum+x,0));assert.ok(cls<=.01,'Delayed media layout shift '+cls);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({viewport,cls,violations:0});await context.close();
 }}finally{await browser.close();await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/quality.json',JSON.stringify(results,null,2));}
});
