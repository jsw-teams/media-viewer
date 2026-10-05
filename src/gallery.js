import {mountImage} from './lightbox.js';
import {imageLanguage} from './language.js';
import {imageIcons} from './image-icons.js';
export function mountGallery(gallery,{labels=imageLanguage(document.documentElement.lang),mountVideo,onChange=()=>{}}={}){
 const controller=new AbortController(),signal=controller.signal;
 const stage=gallery.querySelector('.gallery-stage'),slides=[...gallery.querySelectorAll('template')],previous=gallery.querySelector('[data-previous]'),next=gallery.querySelector('[data-next]'),counter=gallery.querySelector('.gallery-count');let index=0,dispose=()=>{},touch=null;
 previous.setAttribute('aria-label',labels.previousAttachment||'Previous attachment');next.setAttribute('aria-label',labels.nextAttachment||'Next attachment');stage.setAttribute('aria-label',labels.attachments||'Attachments');
 previous.innerHTML=imageIcons.previous;next.innerHTML=imageIcons.next;
 function mount(){const image=stage.querySelector('img[data-media]'),video=stage.querySelector('video');let active=true,cleanup=image?mountImage(image,{labels}):()=>{};if(video){if(typeof mountVideo!=='function')throw new TypeError('A video mount function is required');void Promise.resolve(mountVideo(video,{labels,isCurrent:()=>active})).then(fn=>{if(active)cleanup=typeof fn==='function'?fn:()=>{};else if(typeof fn==='function')fn();}).catch(()=>{if(active){const message=document.createElement('p');message.className='media-feedback';message.textContent=labels.videoUnavailable||'This video is unavailable.';video.replaceWith(message);}});}dispose=()=>{active=false;cleanup();};previous.disabled=index===0;next.disabled=index===slides.length-1;counter.textContent=(index+1)+' / '+slides.length;onChange({index,stage});}
 function show(value){if(value<0||value>=slides.length||value===index)return;dispose();index=value;stage.replaceChildren(slides[index].content.cloneNode(true));stage.getAnimations().forEach(animation=>animation.cancel());stage.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:180});mount();}
 previous.addEventListener('click',()=>show(index-1),{signal});next.addEventListener('click',()=>show(index+1),{signal});
 stage.addEventListener('keydown',event=>{if(event.target!==stage||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();show(index+(event.key==='ArrowLeft'?-1:1));},{signal});
 stage.addEventListener('touchstart',event=>{touch=null;if(event.target.closest('.plyr__controls,button,input,a'))return;const point=event.touches[0];touch={x:point.clientX,y:point.clientY};},{passive:true,signal});
 stage.addEventListener('touchend',event=>{if(!touch)return;const point=event.changedTouches[0],dx=point.clientX-touch.x,dy=point.clientY-touch.y;touch=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4)show(index+(dx<0?1:-1));},{passive:true,signal});
 mount();return ()=>{controller.abort();dispose();};
}
