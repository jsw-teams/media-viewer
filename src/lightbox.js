import {watchImage,mediaFeedback} from './image.js';
import {imageLanguage} from './language.js';
import {imageIcons} from './image-icons.js';

export function mountImage(image,{labels={},original=()=>image.dataset.original||image.currentSrc||image.src}={}){
 const text={...imageLanguage(document.documentElement.lang),...labels},controller=new AbortController(),{signal}=controller;
 const trigger=image.closest('a')||image,previousAttributes=Object.fromEntries(['tabindex','role','aria-label'].map(name=>[name,trigger.getAttribute(name)])),feedbackImage=watchImage(image,{labels:text});image.classList.add('image-zoomable');trigger.tabIndex=0;trigger.setAttribute('role','button');trigger.setAttribute('aria-label',text.openImage+': '+image.alt);
 let close=()=>{};
 function open(){
  let source;try{source=new URL(typeof original==='function'?original():original,location.href);if(!['http:','https:','blob:','data:'].includes(source.protocol))return;}catch{return;}
  close();const modal=document.createElement('dialog'),toolbar=document.createElement('div'),title=document.createElement('span'),frame=document.createElement('div'),status=document.createElement('span');
  const events=new AbortController(),pointers=new Map();let maxScale=6,scale=1,x=0,y=0,distance=0,closed=false;
  modal.className='image-lightbox';modal.setAttribute('aria-label',image.alt||text.openImage);toolbar.className='image-lightbox-toolbar';title.className='image-lightbox-title';title.textContent=image.alt;frame.className='image-lightbox-frame';status.className='image-lightbox-status';status.textContent=text.loading;status.setAttribute('role','status');
  const button=(icon,label,action)=>{const node=document.createElement('button');node.type='button';node.innerHTML=imageIcons[icon];node.setAttribute('aria-label',label);node.title=label;node.addEventListener('click',action,{signal:events.signal});toolbar.append(node);return node;};
  toolbar.append(title);const out=button('zoomOut',text.zoomOut,()=>zoom(scale/1.4)),inside=button('zoomIn',text.zoomIn,()=>zoom(scale*1.4));
  const save=document.createElement('a');save.href=source.href;save.download=image.alt||'image';save.innerHTML=imageIcons.save;save.className='image-lightbox-save';save.setAttribute('aria-label',text.saveOriginal);save.title=text.saveOriginal;if(source.origin!==location.origin){save.target='_blank';save.rel='noopener noreferrer';}toolbar.append(save);const dismiss=button('close',text.closeImage,()=>{modal.close();cleanup();});
  modal.append(toolbar,frame,status);document.body.append(modal);const previousOverflow=document.body.style.overflow,previousGutter=document.documentElement.style.scrollbarGutter;if(innerWidth>document.documentElement.clientWidth)document.documentElement.style.scrollbarGutter='stable';document.body.style.overflow='hidden';modal.showModal();dismiss.focus();
  const full=new Image();full.alt=image.alt;full.className='image-lightbox-photo';full.draggable=false;frame.append(full);
  const feedback=mediaFeedback(full,()=>{status.hidden=false;full.removeAttribute('src');full.src=source.href;},text);
  full.addEventListener('load',()=>{if(closed)return;status.hidden=true;feedback.ready();update();},{signal:events.signal});
  full.addEventListener('error',()=>{if(closed)return;status.hidden=true;feedback.failed('imageUnavailable');},{signal:events.signal});
  full.loading='eager';full.decoding='async';full.src=source.href;
  function update(){if(scale===1)x=y=0;const ratio=(full.naturalWidth||image.naturalWidth||frame.clientWidth)/(full.naturalHeight||image.naturalHeight||frame.clientHeight),width=Math.min(frame.clientWidth,frame.clientHeight*ratio),height=width/ratio,maxX=Math.max(0,(width*scale-frame.clientWidth)/2),maxY=Math.max(0,(height*scale-frame.clientHeight)/2);maxScale=Math.max(6,(full.naturalWidth||image.naturalWidth||width)/width);x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));for(const photo of frame.querySelectorAll('.image-lightbox-photo'))photo.style.transform=`translate(${x}px,${y}px) scale(${scale})`;frame.classList.toggle('is-zoomed',scale>1);out.disabled=scale===1;inside.disabled=scale>=maxScale;}
  function zoom(value){scale=Math.max(1,Math.min(maxScale,value));update();}
  frame.addEventListener('dblclick',()=>zoom(scale===1?2:1),{signal:events.signal});
  frame.addEventListener('wheel',event=>{event.preventDefault();zoom(scale*(event.deltaY<0?1.15:1/1.15));},{passive:false,signal:events.signal});
  frame.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});frame.setPointerCapture(event.pointerId);distance=0;},{signal:events.signal});
  frame.addEventListener('pointermove',event=>{const previous=pointers.get(event.pointerId);if(!previous)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],current=Math.hypot(a.x-b.x,a.y-b.y);if(distance)zoom(scale*current/distance);distance=current;}else if(scale>1){x+=event.clientX-previous.x;y+=event.clientY-previous.y;update();}},{signal:events.signal});
  for(const name of ['pointerup','pointercancel'])frame.addEventListener(name,event=>{pointers.delete(event.pointerId);distance=0;},{signal:events.signal});
  const cleanup=()=>{if(closed)return;closed=true;events.abort();full.removeAttribute('src');modal.remove();document.body.style.overflow=previousOverflow;document.documentElement.style.scrollbarGutter=previousGutter;if(trigger.isConnected)trigger.focus();if(close===cleanup)close=()=>{};};close=cleanup;
  modal.addEventListener('close',cleanup,{once:true});window.addEventListener('resize',update,{signal:events.signal});update();
  modal.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const targets=[...modal.querySelectorAll('button:not(:disabled),a[href]')].filter(node=>node.getClientRects().length);const first=targets[0],last=targets.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}},{signal:events.signal});
 }
 trigger.addEventListener('click',event=>{event.preventDefault();open();},{signal});
 trigger.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();open();}},{signal});
 return ()=>{controller.abort();close();feedbackImage.destroy();image.classList.remove('image-zoomable');for(const [name,value] of Object.entries(previousAttributes))if(value===null)trigger.removeAttribute(name);else trigger.setAttribute(name,value);};
}
