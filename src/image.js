import {imageLanguage} from './language.js';
export function mediaFeedback(element,retry,labels={}){
 const dictionary={...imageLanguage(document.documentElement.lang),...labels},t=key=>dictionary[key]||key;
 const box=document.createElement('div'),icon=document.createElement('span'),message=document.createElement('p'),button=document.createElement('button');
 box.className='media-feedback';box.hidden=true;box.setAttribute('role','status');icon.className='media-feedback-icon';icon.textContent='!';icon.setAttribute('aria-hidden','true');button.type='button';button.textContent=t('retryMedia');box.append(icon,message,button);element.after(box);
 button.addEventListener('click',()=>{button.disabled=true;message.textContent=t('loading');retry();});
 return {failed(key){element.hidden=true;element.setAttribute('aria-invalid','true');box.hidden=false;message.textContent=t(key);button.disabled=false;},ready(){element.hidden=false;element.removeAttribute('aria-invalid');box.hidden=true;button.disabled=false;},destroy(){box.remove();element.hidden=false;element.removeAttribute('aria-invalid');}};
}
export function watchImage(image,{labels={}}={}){
 const controller=new AbortController(),{signal}=controller;
 // Keep the retry button outside the attachment's share link.
 const link=image.closest('a'),source=image.getAttribute('src'),anchor=link||image;
 const feedback=mediaFeedback(anchor,()=>{image.loading='eager';image.removeAttribute('src');image.src=source;},labels);
 image.addEventListener('error',()=>feedback.failed('imageUnavailable'),{signal});
 image.addEventListener('load',()=>feedback.ready(),{signal});
 if(image.complete&&image.naturalWidth===0)feedback.failed('imageUnavailable');
 return {...feedback,destroy(){controller.abort();feedback.destroy();}};
}
