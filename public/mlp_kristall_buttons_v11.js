/* MLP Battle Cards V11 – nur Kristall-Visualisierung und sichtbare Spezialkarten-Steuerung.
   Keine Serverevents senden außer über den originalen Ausspielen-Knopf per click(). */
(function(){
  'use strict';
  if(window.__mlpCrystalButtonsV11)return;
  window.__mlpCrystalButtonsV11=true;
  const $=id=>document.getElementById(id);
  const C={strength:['🏋️','STÄRKE'],speed:['⚡','SCHNELLIGKEIT'],energy:['🔋','ENERGIE'],magic:['⭐','MAGIE']};
  const testMode=new URLSearchParams(location.search).get('kristalltest')==='1';
  let overlay=null, badge=null, timer=0, revealTimer=0, activeKey='', lastKey='';
  let selectedCard=null, dock=null, raf=0;
  function isGame(){return !!($('game')?.classList.contains('active')&&document.body.classList.contains('scene-game'));}
  function normalize(v){return C[String(v||'').toLowerCase()]?String(v).toLowerCase():null;}
  function ensureCrystal(){
    if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='mlpCrystalV11';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="v11-box"><div class="v11-title" id="v11Round">RUNDE 1</div><small>✦ DER KRISTALL WÄHLT DIE KATEGORIE ✦</small><div class="v11-magic-circle"><div class="v11-ring"></div><div class="v11-gem"><i></i><i></i><i></i><i></i></div></div><div class="v11-result" id="v11Result"><span id="v11Icon">⭐</span><strong id="v11Label">MAGIE</strong></div></div>';
    document.body.append(overlay);
    badge=document.createElement('div');badge.id='mlpCrystalV11Badge';badge.setAttribute('aria-label','Kategorie-Kristall');
    badge.innerHTML='<div class="v11-mini-gem" aria-hidden="true"></div><div class="v11-mini-caption">KRISTALL</div>';
    const category=$('category');
    if(category)category.append(badge);
    return overlay;
  }
  function updateBadge(cat){
    ensureCrystal();
    // Sichtbar, sobald eine Kategorie feststeht. Während der Kartenwahl bleibt
    // der kleine drehende Kristall erkennbar; große Animation nur beim Wechsel.
    const c=normalize(cat);
    if(badge)badge.style.display=(isGame()&&c)?'grid':'none';
    if(c){badge.title='Aktuelle Kategorie: '+C[c][1];}
  }
  function close(){clearTimeout(timer);clearTimeout(revealTimer);activeKey='';if(overlay){overlay.classList.remove('v11-open');overlay.setAttribute('aria-hidden','true');}}
  function play(e,force=false){
    const cat=normalize(e?.category);if(!cat)return;
    updateBadge(cat);
    if(!force&&!isGame())return;
    // Die zuletzt gültige Runde nicht mehrfach durch roomState/roundIntro neu starten.
    const key=String(e?.round??'?')+'|'+cat+'|'+String(e?.until??e?.roundIntroUntil??'');
    if(!force&&(key===lastKey||key===activeKey))return;
    close();lastKey=key;activeKey=key;
    const el=ensureCrystal();
    $('v11Round').textContent='RUNDE '+(e?.round||1);
    $('v11Icon').textContent=e?.icon||C[cat][0];
    $('v11Label').textContent=e?.label||C[cat][1];
    $('v11Result').classList.remove('revealed');
    el.classList.remove('v11-open');void el.offsetWidth;
    el.classList.add('v11-open');el.setAttribute('aria-hidden','false');
    const current=key;
    revealTimer=setTimeout(()=>{if(activeKey===current)$('v11Result')?.classList.add('revealed')},2150);
    if(!testMode)timer=setTimeout(()=>{if(activeKey===current)close()},3850);
  }
  function fromState(s){
    if(!s)return;
    if(s.phase==='roundintro')play({round:s.round,category:s.category,until:s.roundIntroUntil});
    else{
      if(s.phase==='select')updateBadge(s.category);
      if(['select','reveal','tie','result','rewardchoice','gameover','lobby'].includes(s.phase) && activeKey)close();
    }
  }
  function initDiagnostic(){
    if(!testMode)return;
    const box=document.createElement('div');box.id='mlpV11Test';
    box.innerHTML='<strong>💎 Kristall V11 geladen</strong><button type="button">Kristall erneut anzeigen</button>';
    box.querySelector('button').addEventListener('click',()=>play({round:1,category:'magic'},true));
    document.body.append(box);
    setTimeout(()=>play({round:1,category:'magic'},true),360);
  }
  function ensureDock(){
    if(dock)return dock;
    dock=document.createElement('div');dock.id='mlpV11SpecialDock';dock.setAttribute('aria-label','Spezialkarte lesen oder ausspielen');
    const title=document.createElement('strong');title.className='v11-dock-title';
    const descr=document.createElement('span');descr.className='v11-dock-desc';
    const buttons=document.createElement('div');buttons.className='v11-dock-buttons';
    const read=document.createElement('button');read.type='button';read.className='v11-read';read.textContent='🔍 Lesen';
    const use=document.createElement('button');use.type='button';use.className='v11-use';use.textContent='✨ Ausspielen';
    read.addEventListener('click',()=>selectedCard?.querySelector('.special-actions .special-read')?.click());
    use.addEventListener('click',()=>selectedCard?.querySelector('.special-actions .special-use')?.click());
    buttons.append(read,use);dock.append(title,descr,buttons);document.body.append(dock);
    return dock;
  }
  function updateDock(){
    raf=0;const node=ensureDock(),hand=$('hand');
    if(!isGame()||!hand){node.classList.remove('visible');return;}
    const cards=Array.from(hand.querySelectorAll('.hand-card.special'));
    if(!cards.length){selectedCard=null;node.classList.remove('visible');return;}
    if(!selectedCard||!cards.includes(selectedCard))selectedCard=cards[0];
    const ref=selectedCard.getBoundingClientRect();
    if(ref.width<10||ref.bottom<0||ref.top>innerHeight){node.classList.remove('visible');return;}
    const title=selectedCard.querySelector('.special-text-strip strong')?.textContent?.trim()||'Spezialkarte';
    const desc=selectedCard.querySelector('.special-text-strip span')?.textContent?.trim()||'';
    node.querySelector('.v11-dock-title').textContent=title;
    node.querySelector('.v11-dock-desc').textContent=desc;
    const originalUse=selectedCard.querySelector('.special-actions .special-use');
    const originalRead=selectedCard.querySelector('.special-actions .special-read');
    node.querySelector('.v11-use').disabled=!!(!originalUse||originalUse.disabled);
    node.querySelector('.v11-read').disabled=!originalRead;
    const width=Math.min(240, Math.max(160,innerWidth-14));
    const x=Math.min(Math.max(ref.left+ref.width/2-width/2,8),Math.max(8,innerWidth-width-8));
    // Die Steuerung steht ÜBER der Kartenhand statt unterhalb des Viewports.
    const desiredTop=ref.top-110;
    const y=Math.max(55, Math.min(desiredTop,innerHeight-118));
    node.style.left=Math.round(x)+'px';node.style.top=Math.round(y)+'px';node.style.width=width+'px';
    node.classList.add('visible');
    for(const c of cards)c.classList.toggle('v11-chosen',c===selectedCard);
  }
  function queueDock(){if(raf)return;raf=requestAnimationFrame(updateDock);}
  function setupDock(){
    ensureDock();const hand=$('hand');if(!hand)return;
    hand.addEventListener('pointerover',e=>{const el=e.target.closest('.hand-card.special');if(el&&el!==selectedCard){selectedCard=el;queueDock()}});
    hand.addEventListener('focusin',e=>{const el=e.target.closest('.hand-card.special');if(el){selectedCard=el;queueDock()}});
    // Spiel-eigene Klicks auf Spezialkarten bleiben unverändert.
    const observer=new MutationObserver(queueDock);
    observer.observe(hand,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','class']});
    window.addEventListener('resize',queueDock,{passive:true});
    window.addEventListener('scroll',queueDock,{passive:true});
    setInterval(queueDock,700);
    queueDock();
  }
  function start(){
    ensureCrystal();initDiagnostic();setupDock();
    if(typeof socket!=='undefined'&&socket&&typeof socket.on==='function'){
      socket.on('roundIntro',e=>play(e));
      socket.on('roomState',fromState);
      socket.on('roundSync',fromState);
      socket.on('roundStart',e=>{close();updateBadge(e?.category)});
      socket.on('roomLeft',()=>{close();updateBadge(null)});
    }
    // Sicherheitsnetz, falls ein Ereignis durch Reconnect verloren ging.
    setInterval(()=>{
      if(testMode)return;
      try{if(typeof state!=='undefined'&&state){
        if(state.phase==='roundintro')play({round:state.round,category:state.category,until:state.roundIntroUntil});
        else updateBadge(state.category);
      }}catch(_){}
    },500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
