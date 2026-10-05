import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {extname} from 'node:path';
import {chromium} from 'playwright';

test('responsive controls remain clickable and images request originals only inside a closable lightbox',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});await mkdir('.artifacts',{recursive:true});
 try{for(const width of [320,390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];let videoCalls=0,originalCalls=0;
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname==='images.example'){originalCalls++;return route.fulfill({contentType:'image/svg+xml',body:await readFile('demo/sample.svg')});}
   if(url.pathname.endsWith('/preview.webm'))videoCalls++;
   const types={'.js':'text/javascript','.css':'text/css','.webm':'video/webm','.svg':'image/svg+xml','.html':'text/html'};return route.fulfill({contentType:types[extname(url.pathname)]||'text/html',body:await readFile('.'+url.pathname)});
  });await page.goto('https://component.test/demo/index.html');await page.locator('.media-player').waitFor();assert.equal(videoCalls,0);assert.equal(originalCalls,0);
  assert.equal(await page.locator('.plyr__control--overlaid use').evaluate(use=>use.getBBox().width>0),true);
  await page.locator('.plyr__control--overlaid').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.locator('video').evaluate(video=>video.pause());
  await page.locator('[data-plyr=mute]').click();assert.equal(await page.locator('video').evaluate(video=>video.muted),true);
  await page.locator('.media-player').focus();await page.keyboard.press('k');await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);await page.keyboard.press('k');assert.equal(await page.locator('video').evaluate(video=>video.paused),true);assert.equal(videoCalls,1);
  await page.locator('[data-plyr=settings]').first().click();await page.locator('.plyr__menu__container:not([hidden])').waitFor();
  await page.locator('.plyr__control--forward').click();await page.locator('[role=menuitemradio][value="2"]').click();
  if(await page.locator('[data-plyr=settings]').first().getAttribute('aria-expanded')!=='true')await page.locator('[data-plyr=settings]').first().click();if(await page.locator('.plyr__control--forward').isVisible())await page.locator('.plyr__control--forward').click();
  const selected=page.locator('[role=menuitemradio][value="2"]');await selected.waitFor({state:'visible'});assert.equal(await selected.getAttribute('aria-checked'),'true');
  await page.waitForFunction(()=>{const node=document.querySelector('[role=menuitemradio][value="2"]'),box=node.getBoundingClientRect(),list=document.querySelector('.media-speed-scroll').getBoundingClientRect();return box.top>=list.top&&box.bottom<=list.bottom;});
  const navigation=page.locator('.media-speed-navigation');assert.equal(await navigation.isVisible(),true);const slider=navigation.locator('input');await slider.fill('0');await slider.dispatchEvent('input');await page.waitForFunction(()=>document.querySelector('.media-speed-scroll').scrollTop===0&&document.querySelector('.media-speed-navigation button').disabled);assert.equal(await navigation.locator('button').first().isDisabled(),true);
  await navigation.locator('button').last().click();await page.waitForFunction(()=>document.querySelector('.media-speed-scroll').scrollTop>0);await slider.fill(await slider.getAttribute('max'));await slider.dispatchEvent('input');await page.waitForFunction(()=>{const n=document.querySelector('.media-speed-scroll');return n.scrollTop>=n.scrollHeight-n.clientHeight-1;});
  const marker=await selected.evaluate(node=>{const label=node.querySelector('span').getBoundingClientRect(),box=node.getBoundingClientRect(),style=getComputedStyle(node,'::after');return {label:label.x,left:box.x+parseFloat(style.left),width:parseFloat(style.width)};});assert.ok(marker.left+marker.width+8<=marker.label,'Selected speed marker must not overlap the number: '+JSON.stringify(marker));
  const popup=await page.locator('.plyr__menu__container').boundingBox(),playerBox=await page.locator('.media-player').boundingBox();assert.ok(popup.y>=playerBox.y-1,'Menu stays inside the player: '+JSON.stringify({width,popup,playerBox}));
  await page.keyboard.press('Escape');
  await page.locator('[data-plyr=fullscreen]').click();await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('.plyr--fullscreen-fallback'));await page.locator('[data-plyr=fullscreen]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'.artifacts/player-'+width+'.png'});
  await page.locator('[data-next]').click();assert.equal(await page.locator('.plyr').count(),0);await page.waitForFunction(()=>document.querySelector('img[data-media]').naturalWidth>0);await page.locator('img[data-media]').evaluate(image=>{image.dataset.original='https://images.example/original.svg';});assert.equal(originalCalls,0);
  await page.locator('img[data-media]').click();await page.locator('.image-lightbox[open]').waitFor();await page.waitForFunction(()=>document.querySelector('.image-lightbox-photo').naturalWidth>0);assert.equal(originalCalls,1);await page.keyboard.press('+');assert.equal(await page.locator('.image-lightbox-frame').evaluate(frame=>frame.classList.contains('is-zoomed')),true);await page.keyboard.press('0');assert.equal(await page.locator('.image-lightbox-frame').evaluate(frame=>frame.classList.contains('is-zoomed')),false);await page.locator('.image-lightbox-photo').click();assert.equal(await page.locator('.image-lightbox-frame').evaluate(frame=>frame.classList.contains('is-zoomed')),true);await page.screenshot({path:'.artifacts/lightbox-'+width+'.png'});
  await page.getByRole('button',{name:'Close image',exact:true}).click();assert.equal(await page.locator('.image-lightbox').count(),0);assert.equal(await page.locator('img[data-media]').evaluate(image=>image===document.activeElement),true);await page.keyboard.press('Enter');await page.locator('.image-lightbox[open]').waitFor();await page.keyboard.press('Escape');await page.locator('.image-lightbox').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);await context.close();
 }}finally{await browser.close();}
});
