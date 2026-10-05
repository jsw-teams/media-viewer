import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {chromium} from 'playwright';

test('HLS starts on demand, follows live theme colors and sustains double-speed on a constrained connection',async()=>{
 let chunkSize=7000;
 const transfers=[],errors=[],server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://fixture.test').pathname;
   if(path==='/')return res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Playback fixture</title><link rel="stylesheet" href="/dist/styles.css"><style>:root{--accent:#6040be;--paper:#faf9ff;--ink:#20172c}body{margin:16px;font-family:system-ui}main{max-width:720px;margin:auto}</style><main><h1>Playback</h1><video playsinline preload="none" data-source="/tests/fixtures/hls/master.m3u8" data-duration="64" aria-label="Generated test video"></video></main><script type="module">import {mountVideo} from "/dist/video.js";window.dispose=mountVideo(document.querySelector("video"));</script></html>');
   const body=await readFile('.'+path),range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/),start=Number(range?.[1]||0),end=range?.[2]?Math.min(Number(range[2]),body.length-1):body.length-1,content=body.subarray(start,end+1),types={'.js':'text/javascript','.css':'text/css','.m3u8':'application/vnd.apple.mpegurl','.mp4':'video/mp4'};
   const transfer=path.includes('/hls/')?{kind:extname(path),level:path.includes('_1.')?1:0,start,bytes:content.length,time:Date.now()}:null;
   if(transfer)transfers.push(transfer);
   // The connection drops from 1.12 Mbps to .56 Mbps when speed doubles.
   await new Promise(resolve=>setTimeout(resolve,transfer?80:0));
   if(res.destroyed)return;
   res.writeHead(range?206:200,{'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':content.length,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${body.length}`}:{})});
   if(transfer&&extname(path)==='.mp4'){
    const size=chunkSize;for(let offset=0;offset<content.length&&!res.destroyed;offset+=size){res.write(content.subarray(offset,offset+size));await new Promise(resolve=>setTimeout(resolve,50));}
    res.end();
   }else res.end(content);
  }catch{res.writeHead(404);res.end();}
 }),browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>{if(request.url().startsWith('blob:')&&/NOT_FOUND/i.test(request.failure()?.errorText||''))errors.push('A revoked blob was requested');});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.media-player').waitFor();assert.equal(transfers.length,0);
  const theme=()=>page.evaluate(()=>{const root=document.querySelector('.plyr'),menu=root.querySelector('.plyr__menu__container');return {accent:getComputedStyle(root.querySelector('.plyr__control--overlaid')).backgroundColor,surface:getComputedStyle(menu).backgroundColor,ink:getComputedStyle(menu).color};});
  await page.waitForTimeout(350);
  assert.deepEqual(await theme(),{accent:'rgb(96, 64, 190)',surface:'rgb(250, 249, 255)',ink:'rgb(32, 23, 44)'});
  await page.evaluate(()=>{const s=document.documentElement.style;s.setProperty('--accent','#367bd6');s.setProperty('--surface','#191b24');s.setProperty('--bg','#10121b');s.setProperty('--ink','#f0f2fa');});
  await page.waitForTimeout(350);
  assert.deepEqual(await theme(),{accent:'rgb(54, 123, 214)',surface:'rgb(25, 27, 36)',ink:'rgb(240, 242, 250)'});
  await page.locator('video').evaluate(v=>{window.samples=[];window.events=[];window.start=performance.now();for(const event of ['playing','waiting','ended'])v.addEventListener(event,()=>events.push({event,elapsed:performance.now()-start,current:v.currentTime}));window.timer=setInterval(()=>samples.push({time:performance.now()-start,current:v.currentTime,ahead:v.buffered.length?v.buffered.end(v.buffered.length-1)-v.currentTime:0}),200);});
  await page.locator('.plyr__control--overlaid').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>8,{},{timeout:20000});
  assert.ok(await page.locator('video').evaluate(v=>v.getAttribute('src').startsWith('blob:')),'Use managed HLS when MSE is supported, including browsers that advertise native HLS');
  const switched=Date.now();chunkSize=3500;await page.locator('video').evaluate(v=>{v.plyr.speed=2;});
  await page.waitForFunction(()=>document.querySelector('video').currentTime>42,{},{timeout:25000});
  const metrics=await page.evaluate(()=>{clearInterval(timer);const v=document.querySelector('video');return {events,samples,current:v.currentTime,rate:v.playbackRate,width:v.videoWidth,height:v.videoHeight};});
  await mkdir('.artifacts',{recursive:true});await writeFile('.artifacts/playback.json',JSON.stringify({metrics,transfers,switched},null,2));
  assert.equal(metrics.rate,2);assert.ok(metrics.events[0].event==='waiting');assert.ok(metrics.events.find(x=>x.event==='playing').elapsed<5000);
  const waits=metrics.events.flatMap((event,index)=>event.event==='waiting'&&event.current>1?[metrics.events.slice(index+1).find(next=>next.event==='playing')?.elapsed-event.elapsed]:[]);assert.ok(waits.every(wait=>Number.isFinite(wait)&&wait<200)&&waits.reduce((sum,wait)=>sum+wait,0)<300,'No material playback stalls: '+JSON.stringify(metrics.events));
  assert.ok(Math.max(...metrics.samples.map(x=>x.ahead))>24,'The player builds enough forward buffer for a connection dip at 2x');
  assert.ok(transfers.some(x=>x.level===1&&x.kind==='.mp4'),'1x can select the detailed rendition');
  const later=transfers.filter(x=>x.time>switched+6000&&x.kind==='.mp4');assert.ok(later.length>0&&later.every(x=>x.level===0),'2x uses a sustainable bitrate: '+JSON.stringify(later));
  await page.locator('video').evaluate(v=>v.pause());await page.waitForTimeout(300);const paused=transfers.length;await page.waitForTimeout(1300);assert.equal(transfers.length,paused,'Pause stops new media requests');
  const manifests=transfers.filter(x=>x.kind==='.m3u8').length;await page.locator('.plyr__controls [data-plyr=play]').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>46,{},{timeout:6000});
  assert.equal(transfers.filter(x=>x.kind==='.m3u8').length,manifests,'Resume retains the current playback pipeline');
  await page.evaluate(()=>dispose());await page.waitForTimeout(300);const disposed=transfers.length;await page.waitForTimeout(1000);assert.equal(transfers.length,disposed);
  await page.evaluate(async()=>{const {mountVideo}=await import('/dist/video.js');window.disposeAgain=mountVideo(document.querySelector('video'));});assert.equal(await page.locator('video').getAttribute('src'),null);await page.locator('.plyr__control--overlaid').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.1,{},{timeout:15000});assert.ok(transfers.filter(x=>x.kind==='.m3u8').length>manifests,'Reopening creates a fresh playback pipeline');await page.evaluate(()=>disposeAgain());await page.waitForTimeout(500);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
