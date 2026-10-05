// Keep Plyr's keyboard and speed selection; supply a themed scroll control.
export function mountSpeedMenu(player,i18n){
 const popup=player.elements.settings.popup,scroll=popup.firstElementChild,events=new AbortController(),{signal}=events;
 scroll.classList.add('media-speed-scroll');const navigation=document.createElement('div');navigation.className='media-speed-navigation';navigation.setAttribute('role','group');navigation.setAttribute('aria-label',i18n.speed||'Playback speed');
 function button(label,down){const node=document.createElement('button');node.type='button';node.setAttribute('aria-label',label);node.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="'+(down?'m6 9 6 6 6-6':'m18 15-6-6-6 6')+'"/></svg>';node.addEventListener('click',()=>scroll.scrollBy({top:(down?1:-1)*Math.max(44,scroll.clientHeight*.6),behavior:'smooth'}),{signal});return node;}
 const up=button(i18n.menuScrollUp||'Scroll speed list up',false),down=button(i18n.menuScrollDown||'Scroll speed list down',true),range=document.createElement('input');range.type='range';range.min='0';range.step='1';range.setAttribute('aria-label',i18n.menuScrollPosition||'Speed list scroll position');range.addEventListener('input',()=>{scroll.scrollTop=Number(range.value);},{signal});range.addEventListener('keydown',event=>event.stopPropagation(),{signal});navigation.append(up,range,down);popup.append(navigation);
 let frame=0,pane=null;
 function update(){frame=0;if(popup.hidden)return;const visible=[...scroll.children].find(node=>!node.hidden),maximum=Math.max(0,scroll.scrollHeight-scroll.clientHeight);navigation.hidden=maximum<1;
  if(visible!==pane){pane=visible;const selected=pane?.querySelector('[aria-checked=true]');if(selected)scroll.scrollTop+=selected.getBoundingClientRect().top-scroll.getBoundingClientRect().top-scroll.clientHeight/2+selected.clientHeight/2;}
  range.max=String(maximum);range.value=String(scroll.scrollTop);up.disabled=scroll.scrollTop<1;down.disabled=scroll.scrollTop>=maximum-1;
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};scroll.addEventListener('scroll',schedule,{signal});
 const changes=new MutationObserver(schedule);changes.observe(scroll,{attributes:true,subtree:true,attributeFilter:['hidden']});changes.observe(popup,{attributes:true,attributeFilter:['hidden']});const resize=new ResizeObserver(schedule);resize.observe(scroll);schedule();
 return ()=>{events.abort();changes.disconnect();resize.disconnect();cancelAnimationFrame(frame);navigation.remove();scroll.classList.remove('media-speed-scroll');};
}
