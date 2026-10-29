import Hls from 'hls.js';
import '@videojs/html/video/player';
import '@videojs/html/ui/container';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/pip-button';
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/slider-track';
import '@videojs/html/ui/slider-buffer';
import '@videojs/html/ui/slider-fill';
import '@videojs/html/ui/slider-thumb';
import '@videojs/html/i18n';
import '@videojs/html/i18n/locales/zh-CN/register';
import '@videojs/html/i18n/locales/zh-TW/register';
import {mediaFeedback} from './image.js';
import {playerLanguage} from './language.js';
import {mountSpeedMenu} from './speed-menu.js';
import {videoIcons} from './video-icons.js';

export function mountVideo(video,{labels={},i18n=playerLanguage(document.documentElement.lang),source=()=>video.dataset.source,type=video.dataset.type||'hls'}={}){
 const events=new AbortController(),{signal}=events,player=document.createElement('video-player'),container=document.createElement('media-container');
 let hls=null,failed=false,disposed=false,wantsPlay=false;
 player.className='media-player';container.className='media-player-frame';container.tabIndex=0;container.setAttribute('aria-label',video.getAttribute('aria-label')||'Video');
 const language=document.createElement('media-i18n');language.lang=/^zh-(TW|HK|Hant)/i.test(document.documentElement.lang)?'zh-TW':/^zh/i.test(document.documentElement.lang)?'zh-CN':'en';
 video.before(language);language.append(player);player.append(container);container.append(video);video.controls=false;video.preload='none';
 const width=Number(video.getAttribute('width')),height=Number(video.getAttribute('height'));if(width>0&&height>0)player.style.setProperty('--media-aspect',width+'/'+height);
 const control=(tag,name,icon)=>{const node=document.createElement(tag);node.className='media-button';node.dataset.action=name;node.innerHTML=videoIcons[icon];return node;};
 const overlay=control('media-play-button','play-large','play');overlay.classList.add('media-play-large');
 const controls=document.createElement('div');controls.className='media-controls';
 const progress=document.createElement('media-time-slider');progress.className='media-seek';progress.setAttribute('aria-label',i18n.seek||'Seek');progress.innerHTML='<media-slider-track><media-slider-buffer></media-slider-buffer><media-slider-fill></media-slider-fill></media-slider-track><media-slider-thumb></media-slider-thumb>';
 const play=control('media-play-button','play','play'),mute=control('media-mute-button','mute','volume'),pip=control('media-pip-button','pip','pip'),fullscreen=control('button','fullscreen','fullscreen');fullscreen.type='button';fullscreen.setAttribute('aria-label',i18n.enterFullscreen||'Enter fullscreen');
 const times=document.createElement('div');times.className='media-player-times';
 const current=document.createElement('span'),total=document.createElement('span');current.className='media-time-current';total.className='media-time-duration';times.append(current,total);
 const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value=String(video.volume);volume.className='media-volume';volume.setAttribute('aria-label',i18n.volume||'Volume');volume.addEventListener('input',()=>{player.store.setVolume(Number(volume.value));},{signal});
 controls.append(progress,play,times,mute,volume,pip,fullscreen);container.append(overlay,controls);
 const feedback=mediaFeedback(container,()=>{failed=false;feedback.ready();playVideo();},labels);
 const poster=video.poster?document.createElement('img'):null;if(poster){poster.className='media-poster-preview';poster.alt='';poster.src=video.poster;container.prepend(poster);}
 const format=seconds=>{seconds=Math.max(0,Math.floor(seconds||0));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=String(seconds%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${String(m).padStart(2,'0')}:${s}`;};
 function refresh(){const duration=Number.isFinite(video.duration)&&video.duration>0?video.duration:Number(video.dataset.duration)||0;current.textContent=format(video.currentTime);total.textContent=format(duration);play.innerHTML=video.paused?videoIcons.play:videoIcons.pause;mute.innerHTML=video.muted||video.volume===0?videoIcons.muted:videoIcons.volume;volume.value=String(video.volume);overlay.hidden=!video.paused||video.currentTime>0;if(poster)poster.hidden=video.currentTime>0;}
 for(const event of ['durationchange','timeupdate','play','pause','volumechange','loadedmetadata'])video.addEventListener(event,refresh,{signal});refresh();
 const disposeMenu=mountSpeedMenu(controls,video,player,i18n);
 function fail(key='videoUnavailable'){if(failed||disposed)return;failed=true;wantsPlay=false;video.pause();hls?.destroy();hls=null;video.removeAttribute('src');video.load();feedback.failed(key);}
 function prepare(){
  if(disposed||failed)return;wantsPlay=true;if(hls){resumeLoad();return;}if(video.hasAttribute('src'))return;
  if(type==='native')video.src=source();
  else if(Hls.isSupported()){
   hls=new Hls({autoStartLoad:false,startLevel:0,capLevelToPlayerSize:true,capLevelOnFPSDrop:true,maxDevicePixelRatio:2,maxBufferLength:30,maxMaxBufferLength:30,backBufferLength:10});tunePlayback();
   hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(wantsPlay&&!disposed){resumeLoad();void video.play().catch(()=>{});}});
   hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal){const status=data.response?.code||data.networkDetails?.status;fail([404,410].includes(status)?'mediaMissing':'videoUnavailable');}});
   hls.loadSource(source());hls.attachMedia(video);
  }else if(video.canPlayType('application/vnd.apple.mpegurl'))video.src=source();else fail('videoUnsupported');
 }
 function resumeLoad(position=-1){if(hls&&!hls.loadingEnabled)hls.startLoad(position);}
 function tunePlayback(){if(!hls)return;const rate=Math.max(1,Math.abs(video.playbackRate)||1),ahead=Math.min(90,30*rate);hls.config.maxBufferLength=hls.config.maxMaxBufferLength=ahead;hls.config.abrBandWidthFactor=Hls.DefaultConfig.abrBandWidthFactor/rate;hls.config.abrBandWidthUpFactor=Hls.DefaultConfig.abrBandWidthUpFactor/rate;}
 function playVideo(){prepare();if(!failed)void video.play().catch(error=>{if(!disposed&&error.name!=='AbortError'&&!hls)fail();});}
 container.addEventListener('click',event=>{if(event.target.closest('media-play-button')&&video.paused)prepare();},{capture:true,signal});
 container.addEventListener('keydown',event=>{if(event.defaultPrevented||event.target.closest('input,button,[role=button],[role=slider],[role=menuitemradio]'))return;if([' ','k','K'].includes(event.key)){event.preventDefault();event.stopPropagation();if(video.paused)playVideo();else video.pause();}if(event.key==='Escape')player.classList.remove('is-fullscreen');},{signal});
 fullscreen.addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else if(player.classList.contains('is-fullscreen'))player.classList.remove('is-fullscreen');else try{await container.requestFullscreen();}catch{player.classList.add('is-fullscreen');}},{signal});
 document.addEventListener('fullscreenchange',()=>{fullscreen.setAttribute('aria-label',document.fullscreenElement?i18n.exitFullscreen||'Exit fullscreen':i18n.enterFullscreen||'Enter fullscreen');},{signal});
 video.addEventListener('ratechange',tunePlayback,{signal});
 video.addEventListener('play',()=>{wantsPlay=true;resumeLoad();},{signal});
 video.addEventListener('pause',()=>{wantsPlay=false;hls?.stopLoad();},{signal});
 video.addEventListener('seeking',()=>{if(hls&&!disposed&&!failed)resumeLoad(video.currentTime);},{signal});
 video.addEventListener('loadedmetadata',()=>{if(video.videoWidth&&video.videoHeight)player.style.setProperty('--media-aspect',video.videoWidth+'/'+video.videoHeight);},{signal});
 video.addEventListener('loadeddata',()=>{if(!failed&&!disposed)feedback.ready();},{signal});
 video.addEventListener('error',()=>fail(),{signal});
 return()=>{disposed=true;events.abort();disposeMenu();video.pause();hls?.destroy();hls=null;feedback.destroy();video.removeAttribute('src');video.load();language.before(video);language.remove();};
}
