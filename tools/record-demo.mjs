/** Real browser and native pointer capture in the existing isolated recording VM. */
import assert from 'node:assert/strict';import{mkdir,writeFile,rm}from'node:fs/promises';import{createRequire}from'node:module';import{resolve}from'node:path';import{pathToFileURL}from'node:url';
import{spawn}from'node:child_process';
const root=resolve(import.meta.dirname,'..'),recorder=resolve(process.argv[2]||'../edgepress'),require=createRequire(resolve(recorder,'package.json')),{chromium}=require('playwright');
const {guest,pointAt,activate}=await import(pathToFileURL(resolve(recorder,'tools/recordings/vm-desktop.mjs'))),{recordingContext,record,closeRecording}=await import(pathToFileURL(resolve(recorder,'tools/recordings/desktop-recording.mjs')));
const artifact=resolve(root,'.artifacts/videojs-recording');await mkdir(artifact,{recursive:true});
const mounted=root.replaceAll('\\','/').replace(/^([a-z]):/i,(_,drive)=>`/mnt/${drive.toLowerCase()}`);
const server=spawn('wsl.exe',['-d','CodexRecordingVM','--exec','bash','-s'],{windowsHide:true});
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
server.stdin.end(`echo $$\nexec python3 -u -m http.server 8798 --bind 127.0.0.1 --directory ${quote(mounted)}\n`);
let output='';server.stdout.on('data',part=>{output+=part;});server.stderr.resume();
for(let attempt=0;attempt<30;attempt++){if(server.exitCode!==null)throw Error('Recording static server failed');try{await guest(['curl','-fsS','http://127.0.0.1:8798/demo/']);break;}catch{if(attempt===29)throw Error('Recording static server readiness timeout');await new Promise(done=>setTimeout(done,200));}}
const pid=output.split(/\r?\n/)[0];assert.match(pid,/^\d+$/);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222'),context=await recordingContext(browser,{locale:'en'},artifact);let closed=false;
try{
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:8798/demo/');await page.locator('.media-player').waitFor();
 await page.locator('video').evaluate(video=>{video.loop=true;});
 const click=async locator=>{await pointAt(page,locator);await locator.click();await page.waitForTimeout(1200);};
 await record(page,'media-videojs10',async()=>{
  await page.waitForTimeout(1600);await click(page.locator('[data-action=play-large]'));await page.waitForFunction(()=>document.querySelector('video').currentTime>.1);
  await page.waitForTimeout(2300);await click(page.locator('[data-action=settings]'));await click(page.locator('[role=menuitemradio][value="2"]'));assert.equal(await page.locator('video').evaluate(video=>video.playbackRate),2);
  await click(page.locator('.media-speed-navigation button').last());await page.waitForTimeout(1100);await page.keyboard.press('Escape');
  await click(page.locator('[data-action=play]'));await click(page.locator('[data-next]'));await page.waitForFunction(()=>document.querySelector('img[data-media]').naturalWidth>0);
  await click(page.locator('img[data-media]'));await page.locator('.image-lightbox-photo').waitFor();await page.keyboard.press('+');await page.waitForTimeout(1300);await page.keyboard.press('0');await page.waitForTimeout(1400);await click(page.getByRole('button',{name:'Close image',exact:true}));
  await click(page.locator('[data-previous]'));await page.locator('.media-player').waitFor();await page.waitForTimeout(1300);
 });
 assert.deepEqual(errors,[]);const entries=await closeRecording(context,{artifact,output:resolve(root,'docs'),source:'tools/record-demo.mjs',kind:'Real isolated VM Chromium capture: Video.js 10, native local playback, speed 2x and scroll controls, gallery disposal, original image zoom and keyboard controls'});closed=true;
 for(const entry of entries){await rm(resolve(root,'docs',entry.movie));await rm(resolve(root,'docs',entry.poster));}
 await writeFile(resolve(artifact,'result.json'),JSON.stringify(entries,null,2)+'\n');
}finally{if(!closed)await context.close().catch(()=>{});await guest(['kill','-TERM',pid]).catch(()=>{});server.kill();await browser.close();}
