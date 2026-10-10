/* MLP Battle Cards V7 – reine UI-Korrektur (Arena + sichtbarer Kristall).
   Keine Socket-Emits, keine Karten-/Server-/Smolder-Änderungen. */
(function(){
  'use strict';
  if(window.__mlpFullscreenV7)return;
  window.__mlpFullscreenV7=true;
  const $=id=>document.getElementById(id);
  const game=$('game'), arena=game?.querySelector('.arena');
  if(!game||!arena)return;
  const shelf=$('artifactShelf'),gold=$('rewardDeckHud'),normal=$('normalDeckHud'),hud=$('deckHud');
  const body=document.body;
  const setImportant=(el,key,value)=>{if(el && el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value,'important')};
  function repairArena(){
    if(!body.classList.contains('scene-game')||!game.classList.contains('active'))return;
    // Das arena-eigene inline '!important contain' kommt aus client.js.
    // Wir überschreiben nur die reine Grafik, nicht die Arena-Engine.
    if(arena.dataset.approvedScene==='yes'){
      setImportant(arena,'background-size','cover');
      setImportant(arena,'background-position','center center');
      setImportant(arena,'background-repeat','no-repeat');
      const overlay=arena.querySelector('img.approved-arena-overlay');
      if(overlay){setImportant(overlay,'object-fit','cover');setImportant(overlay,'object-position','center center');}
    }else {
      const vfx=$('arenaVfx');
      if(vfx){setImportant(vfx,'background-size','cover');setImportant(vfx,'background-position','center center');setImportant(vfx,'background-color','transparent');}
    }
    if(hud && hud.parentElement!==arena)arena.appendChild(hud);
    const h=arena.getBoundingClientRect().height;
    const sh=shelf?.getBoundingClientRect().height||148;
    // Die Stapel werden anhand der tatsächlichen Artefakt-Höhe angeordnet.
    if(normal){setImportant(normal,'top',Math.round(Math.max(92,Math.min(126,h*.23)))+'px');setImportant(normal,'left','5px');setImportant(normal,'right','auto');setImportant(normal,'bottom','auto');}
    if(gold){const shelfTop=Math.max(138,Math.min(175,h*.27));const y=Math.min(h-62,shelfTop+sh+10);setImportant(gold,'top',Math.round(y)+'px');setImportant(gold,'right','5px');setImportant(gold,'left','auto');setImportant(gold,'bottom','auto');}
  }
  let frame=0;
  function queue(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;repairArena()})}
  window.addEventListener('resize',queue,{passive:true});
  window.visualViewport?.addEventListener('resize',queue,{passive:true});
  new MutationObserver(queue).observe(body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(queue).observe(arena,{attributes:true,attributeFilter:['class','data-approved-scene']});
  if(shelf && typeof ResizeObserver==='function')new ResizeObserver(queue).observe(shelf);
  queue();setTimeout(queue,150);setTimeout(queue,1100);

  // Vollständig eigenständige Kristall-Grafik. Sie kann nicht von den früheren
  // Overlays oder durch ein 'overflow:hidden' im Spielfeld verdeckt werden.
  const catUI={strength:['🏋️','STÄRKE'],speed:['⚡','SCHNELLIGKEIT'],energy:['🔋','ENERGIE'],magic:['⭐','MAGIE']};
  let key='', timerReveal=0,timerHide=0,active=false;
  const ensureCrystal=()=>{
    let el=$('mlpCrystalV6');
    if(el)return el;
    el=document.createElement('div');el.id='mlpCrystalV6';el.setAttribute('aria-hidden','true');
    el.innerHTML='<div class="v6-panel"><div class="v6-round" id="mlpV6Round">RUNDE 1</div><small class="v6-hint">Der Kristall bestimmt die nächste Kategorie …</small><div class="v6-crystal-wrap"><div class="v6-aura"></div><div class="v6-gem"><i></i><i></i><i></i><i></i></div></div><div id="mlpV6Result" class="v6-reveal"><span id="mlpV6Icon">⭐</span><strong id="mlpV6Label">MAGIE</strong></div></div>';
    document.body.append(el);return el;
  };
  function close(){clearTimeout(timerReveal);clearTimeout(timerHide);active=false;const el=$('mlpCrystalV6');if(el){el.classList.remove('visible');el.setAttribute('aria-hidden','true')} }
  function play(e,force=false){
    const cat=String(e?.category||'').toLowerCase(),ui=catUI[cat];if(!ui)return;
    if(!force && (!body.classList.contains('scene-game')||!game.classList.contains('active')))return;
    if(!force && e.until && e.until<Date.now()-150)return;
    const nextKey=`${e?.round||1}:${e?.until||'no-until'}:${cat}`;
    if(!force && key===nextKey)return;
    key=nextKey;close();
    const el=ensureCrystal();
    $('mlpV6Round').textContent='RUNDE '+(e?.round||1);
    $('mlpV6Icon').textContent=e?.icon||ui[0];
    $('mlpV6Label').textContent=e?.label||ui[1];
    $('mlpV6Result').classList.remove('shown');
    // Reflow startet die Kristallrotation bei einer neuen Runde neu.
    void el.offsetWidth;
    active=true;el.classList.add('visible');el.setAttribute('aria-hidden','false');
    timerReveal=setTimeout(()=>{if(active)$('mlpV6Result')?.classList.add('shown')},2600);
    timerHide=setTimeout(()=>{if(active)close()},3800);
  }
  if(typeof socket!=='undefined' && typeof socket.on==='function'){
    socket.on('roundIntro',e=>play(e));
    socket.on('roomState',e=>{queue();if(e?.phase==='roundintro')play({round:e.round,category:e.category,until:e.roundIntroUntil})});
    socket.on('roundSync',e=>{queue();if(e?.phase==='roundintro')play({round:e.round,category:e.category,until:e.roundIntroUntil})});
    socket.on('roundStart',()=>{close();key=''});
    socket.on('roomLeft',()=>{close();key=''});
  }
  // Direkter visueller Test, ohne Kartenaktion, Gegner oder Rundenwechsel.
  if(new URLSearchParams(location.search).get('kristalltest')==='1'){
    setTimeout(()=>play({category:'magic',round:1},true),450);
  }
  window.MLPArenaV7={testKristall:()=>play({category:'magic',round:1},true),layout:queue};
  if(new URLSearchParams(location.search).get('layouttest')==='1'){
    const info=document.createElement('div');info.id='mlpLayoutV7Diag';
    info.textContent='Arena V7 geladen';document.body.append(info);
    const update=()=>{
      const box=arena.getBoundingClientRect();
      info.textContent=`Arena V7 geladen · Arena ${Math.round(box.width)}×${Math.round(box.height)} · Fenster ${innerWidth}×${innerHeight}`;
    };
    update();window.addEventListener('resize',update);
    setTimeout(update,600);
  }
})();
