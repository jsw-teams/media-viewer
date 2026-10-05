import Hls from 'hls.js';
import Plyr from 'plyr';
import icons from './icons.js';
import {mediaFeedback} from './image.js';
import {playerLanguage} from './language.js';
import {emptyVideo} from './blank-video.js';
export function mountVideo(video,{labels={},i18n=playerLanguage(document.documentElement.lang),source=()=>video.dataset.source,type=video.dataset.type||'hls'}={}){
 if(!document.getElementById('media-viewer-icons')){const sprite=document.createElement('div');sprite.id='media-viewer-icons';sprite.hidden=true;sprite.innerHTML=icons.replace(/<\?xml[^>]+>|<!DOCTYPE[^>]+>/g,'');document.body.prepend(sprite);}
 let hls=null,failed=false,disposed=false,wantsPlay=false;
 const duration=Number(video.dataset.duration),blank=emptyVideo(),controller=new AbortController(),player=new Plyr(video,{
  controls:['play-large','play','progress','current-time','duration','mute','volume','settings','pip','fullscreen'],
  duration:Number.isFinite(duration)&&duration>0?duration:null,hideControls:false,settings:['speed'],storage:{enabled:false},autoplay:false,
  iconUrl:'',loadSprite:false,blankVideo:blank,
  i18n,keyboard:{focused:true,global:false},
  listeners:{play(){if(video.paused)prepare();}}
 }),container=player.elements.container,feedback=mediaFeedback(container,()=>{failed=false;feedback.ready();prepare();if(!failed)void player.play()?.catch(()=>{});},labels);
 const times=document.createElement('div');times.className='media-player-times';player.elements.display.currentTime.before(times);times.append(player.elements.display.currentTime,player.elements.display.duration);
 const refreshDuration=()=>{video.dispatchEvent(new Event('durationchange'));video.dispatchEvent(new Event('timeupdate'));};
 player.on('ready',refreshDuration);
 refreshDuration();
 container.classList.add('media-player');container.tabIndex=0;container.setAttribute('role','region');container.setAttribute('aria-label',video.getAttribute('aria-label')||'Video');
 function fail(key='videoUnavailable'){
  if(failed||disposed)return;failed=true;wantsPlay=false;video.pause();hls?.destroy();hls=null;
  video.removeAttribute('src');video.load();feedback.failed(key);
 }
 function prepare(){
  if(disposed||failed)return;wantsPlay=true;
  if(hls){hls.startLoad();return;}
  if(video.hasAttribute('src'))return;
  if(type==='native'||video.canPlayType('application/vnd.apple.mpegurl'))video.src=source();
  else if(Hls.isSupported()){
   hls=new Hls({autoStartLoad:false,capLevelToPlayerSize:true,maxDevicePixelRatio:2,maxBufferLength:12,maxMaxBufferLength:24,backBufferLength:15});
   hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(wantsPlay&&!disposed)hls?.startLoad();});
   hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal){const status=data.response?.code||data.networkDetails?.status;fail([404,410].includes(status)?'mediaMissing':'videoUnavailable');}});
   hls.loadSource(source());hls.attachMedia(video);
  }else fail('videoUnsupported');
 }
 container.addEventListener('keydown',event=>{if([' ','k','K'].includes(event.key)&&video.paused&&event.target.tagName!=='INPUT')prepare();},{capture:true,signal:controller.signal});
 video.addEventListener('play',()=>{wantsPlay=true;hls?.startLoad();},{signal:controller.signal});
 video.addEventListener('pause',()=>{wantsPlay=false;hls?.stopLoad();},{signal:controller.signal});
 const updateDuration=()=>{if(player.config.duration!==null&&Number.isFinite(video.duration)&&video.duration>0){player.config.duration=null;refreshDuration();}};
 video.addEventListener('durationchange',updateDuration,{signal:controller.signal});
 video.addEventListener('loadedmetadata',()=>{updateDuration();if(video.videoWidth&&video.videoHeight)container.style.setProperty('--media-aspect',video.videoWidth+'/'+video.videoHeight);},{signal:controller.signal});
 video.addEventListener('loadeddata',()=>{if(!failed&&!disposed)feedback.ready();},{signal:controller.signal});
 video.addEventListener('error',()=>fail(),{signal:controller.signal});
 return ()=>{disposed=true;controller.abort();video.pause();hls?.destroy();hls=null;feedback.destroy();player.destroy(()=>URL.revokeObjectURL(blank));};
}
