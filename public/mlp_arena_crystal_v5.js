/* Arena + native crystal V5 — cosmetic-only. Does not touch server, cards or Smolder. */
(function installArenaCrystalV5(){
  'use strict';
  if(window.__arenaCrystalV5)return;
  window.__arenaCrystalV5=true;
  const game=document.getElementById('game');
  const arena=game?.querySelector('.arena');
  const vfx=document.getElementById('arenaVfx');
  const hud=document.getElementById('deckHud');
  const normal=document.getElementById('normalDeckHud');
  const gold=document.getElementById('rewardDeckHud');
  const shelf=document.getElementById('artifactShelf');
  if(!game||!arena||!hud||!normal||!gold||!shelf)return;
  // Legacy deck fix used position:fixed in a separate layer. Restore just the original DOM nodes.
  hud.classList.remove('mlp-decks-fixed','hud-visible');
  if(hud.parentElement!==arena)arena.appendChild(hud);
  const setPx=(el,prop,num)=>{
    const val=Math.round(num)+'px';
    if(el.style.getPropertyValue(prop)!==val || el.style.getPropertyPriority(prop)!=='important')
      el.style.setProperty(prop,val,'important');
  };
  function repairBackground(){
    const approved=arena.dataset.approvedScene==='yes';
    // buildArenaVfx writes inline !important contain, which normal CSS cannot override.
    if(approved){
      ['background-size','background-position','background-repeat'].forEach((prop,i)=>{
        const val=['cover','center center','no-repeat'][i];
        if(arena.style.getPropertyValue(prop)!==val)arena.style.setProperty(prop,val,'important');
      });
      const img=arena.querySelector('.approved-arena-overlay');
      if(img){
        if(img.style.getPropertyValue('object-fit')!=='cover')img.style.setProperty('object-fit','cover','important');
        if(img.style.getPropertyValue('object-position')!=='center center')img.style.setProperty('object-position','center center','important');
      }
    }else if(vfx){
      if(vfx.style.getPropertyValue('background-size')!=='cover')vfx.style.setProperty('background-size','cover','important');
      if(vfx.style.getPropertyValue('background-position')!=='center center')vfx.style.setProperty('background-position','center center','important');
      if(vfx.style.getPropertyValue('background-color')!=='transparent')vfx.style.setProperty('background-color','transparent','important');
    }
  }
  function layout(){
    if(!game.classList.contains('active')||!document.body.classList.contains('scene-game'))return;
    repairBackground();
    const box=arena.getBoundingClientRect();
    if(!box.width||!box.height)return;
    const compact=box.width<820;
    const top=Math.max(compact?206:150,Math.min(box.height*(compact?.29:.28),216));
    setPx(shelf,'top',top);
    setPx(shelf,'right',compact?5:8);
    shelf.style.setProperty('bottom','auto','important');
    setPx(shelf,'width',compact?122:146);
    // Always place the GOLD deck beneath the actual artifact shelf, never beneath its headline.
    const sh=shelf.getBoundingClientRect().height;
    setPx(gold,'top',Math.min(box.height-70,top+Math.max(128,sh)+12));
    setPx(gold,'right',compact?5:8);
    gold.style.setProperty('bottom','auto','important');
    gold.style.setProperty('left','auto','important');
    setPx(normal,'left',compact?5:8);
    setPx(normal,'top',Math.max(compact?153:145,Math.min(top-63,185)));
    normal.style.setProperty('right','auto','important');
    normal.style.setProperty('bottom','auto','important');
  }
  let scheduled=false;
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;layout()});}
  window.addEventListener('resize',queue,{passive:true});
  document.addEventListener('visibilitychange',queue);
  // Observe only relevant states: no observers on the decks/Smolder or UI child nodes.
  new MutationObserver(queue).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(queue).observe(arena,{attributes:true,attributeFilter:['class','data-approved-scene']});
  if(typeof ResizeObserver==='function')new ResizeObserver(queue).observe(shelf);
  queue();setTimeout(queue,150);setTimeout(queue,900);

  // Use the EXISTING categoryCrystalPortal from public/client.js, not a second crystal overlay.
  // The fallback opens the very same portal only when the original handler missed a transition.
  const MAP={strength:['🏋️','STÄRKE'],speed:['⚡','SCHNELLIGKEIT'],energy:['🔋','ENERGIE'],magic:['⭐','MAGIE']};
  let fallbackKey='',fallbackTimers=[];
  const clearFallback=()=>{for(const timer of fallbackTimers)clearTimeout(timer);fallbackTimers=[];};
  const later=(fn,ms)=>fallbackTimers.push(setTimeout(fn,ms));
  function ensurePortal(){
    if(typeof categoryCrystalPortal==='function')return categoryCrystalPortal();
    return document.getElementById('categoryCrystalPortal');
  }
  function showFallback(e,force=false){
    const cat=String(e?.category||'').toLowerCase(),ui=MAP[cat];
    if(!ui)return;
    if(!force && !document.body.classList.contains('scene-game'))return;
    if(!force && e.until && e.until<Date.now()+500)return;
    const key=`${e?.round||1}:${e?.until||'none'}`;
    const portal=ensurePortal();
    if(!portal || (!force && portal.classList.contains('active')) || (!force && key===fallbackKey))return;
    fallbackKey=key;clearFallback();
    const fill=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    fill('portalRoundLabel',`RUNDE ${e.round||1}`);
    fill('portalCrystalIcon',e.icon||ui[0]);
    fill('portalCrystalLabel',e.label||ui[1]);
    const crystal=document.getElementById('battleCategoryCrystal');
    const result=document.getElementById('portalCrystalResult');
    result?.classList.remove('show');crystal?.classList.remove('spinning');
    portal.classList.remove('leaving');portal.classList.add('active');
    portal.setAttribute('aria-hidden','false');
    void crystal?.offsetWidth;crystal?.classList.add('spinning');
    later(()=>{crystal?.classList.remove('spinning');result?.classList.add('show')},2550);
    later(()=>{portal.classList.add('leaving');later(()=>{
      portal.classList.remove('active','leaving');portal.setAttribute('aria-hidden','true');
    },220)},3850);
  }
  const sock=typeof socket!=='undefined'?socket:null;
  if(sock&&typeof sock.on==='function'){
    sock.on('roundIntro',e=>requestAnimationFrame(()=>showFallback(e)));
    sock.on('roomState',e=>{queue();if(e?.phase==='roundintro')requestAnimationFrame(()=>showFallback({category:e.category,round:e.round,until:e.roundIntroUntil}))});
    sock.on('roundSync',e=>{queue();if(e?.phase==='roundintro')requestAnimationFrame(()=>showFallback({category:e.category,round:e.round,until:e.roundIntroUntil}))});
    sock.on('roundStart',()=>{clearFallback();const el=document.getElementById('categoryCrystalPortal');if(el){el.classList.remove('active','leaving');el.setAttribute('aria-hidden','true')}});
  }
  // Visual-only test; no game/socket actions. In normal matches only the server decides category.
  const test=new URLSearchParams(location.search).get('kristalltest')==='1';
  if(test)setTimeout(()=>showFallback({category:'magic',round:1},true),350);
  window.MLPArenaCrystalV5={testCrystal:()=>showFallback({category:'magic',round:1},true),layout:queue};
})();
